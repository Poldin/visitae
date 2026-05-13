#!/usr/bin/env node
/**
 * Import batch from Italian MoH RDM JSON into manufacturers + master_catalog.
 *
 * Sul progetto Supabase: indice unico su (metadata->>'ministry_italy_rdm_key'),
 * colonna + indice unico manufacturers(legal_name_norm), RPC upsert_manufacturers_rdm_batch,
 * upsert_master_catalog_rdm_batch, upsert_master_catalog_rdm_batch_insert_only.
 *
 * Resume: dopo ogni gruppo-batch catalogo OK viene scritto <jsonPath>.rdm-checkpoint.json.
 * Con --resume si salta il passaggio catalogo fino a nextSourceIndex (stesso file, stessa size).
 * Pass fabbricanti: usa --skip-mf-pass solo se i manufacturer sono già stati importati (es. resume dopo crash).
 *
 * Nota: le SELECT con .in('legal_name_norm', [...]) usano GET e URL lunghe; con nomi molto lunghi
 * usare --mf-lookup-batch più basso (default 20) se compare HeadersOverflowError.
 *
 * Env:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) — bypass RLS
 *
 * Options:
 *   --batch=N                 (default 1000)
 *   --catalog-concurrency=N   RPC catalog in parallelo (default 4)
 *   --mf-lookup-batch=N       (default 20)
 *   --stats-every=N           (default 5000)
 *   --limit=N                 test: solo prime N righe (disattiva resume su file intero)
 *   --resume                  continua da checkpoint accanto al JSON
 *   --reset-checkpoint        elimina checkpoint prima di partire
 *   --skip-mf-pass            non rifare pass fabbricanti; carica mappa manufacturer da DB (con --resume)
 *   --insert-only             ON CONFLICT DO NOTHING invece di DO UPDATE (re-import veloci: salta già importati)
 *   --dry-run
 */

import { createClient } from "@supabase/supabase-js";
import { createReadStream, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chain } from "stream-chain";
import streamJson from "stream-json";
import streamArray from "stream-json/streamers/stream-array.js";

const argv = process.argv.slice(2);
const BATCH = Number.parseInt(argv.find((a) => a.startsWith("--batch="))?.split("=", 2)[1] ?? "1000", 10);
const CATALOG_CONCURRENCY = Math.max(
  1,
  Number.parseInt(argv.find((a) => a.startsWith("--catalog-concurrency="))?.split("=", 2)[1] ?? "4", 10) || 4,
);
const MF_LOOKUP_CHUNK_RAW = argv.find((a) => a.startsWith("--mf-lookup-batch="))?.split("=", 2)[1];
const MF_LOOKUP_CHUNK = Math.max(5, Number.parseInt(MF_LOOKUP_CHUNK_RAW ?? "20", 10) || 20);
const DRY = argv.includes("--dry-run");
const RESUME = argv.includes("--resume");
const RESET_CHECKPOINT = argv.includes("--reset-checkpoint");
const SKIP_MF_PASS = argv.includes("--skip-mf-pass");
const INSERT_ONLY = argv.includes("--insert-only");
const LIMIT_RAW = argv.find((a) => a.startsWith("--limit="))?.split("=", 2)[1];
const LIMIT = LIMIT_RAW ? Number.parseInt(LIMIT_RAW, 10) : null;
const STATS_EVERY_RAW = argv.find((a) => a.startsWith("--stats-every="))?.split("=", 2)[1];
const STATS_EVERY = Math.max(1, Number.parseInt(STATS_EVERY_RAW ?? "5000", 10) || 5000);
const positional = argv.filter((a) => !a.startsWith("--"));
const pathArg =
  positional.find((p) => /\.json$/i.test(p)) ?? (positional[0] && !positional[0].includes("import-rdm") ? positional[0] : undefined);

/** @param {unknown} v */
function normStr(v) {
  if (v == null) return "";
  return String(v).trim();
}

/** @param {unknown} v */
function normCf(v) {
  const t = normStr(v).toUpperCase().replace(/\s+/g, "");
  return t || null;
}

/** @param {unknown} v */
function normalizeLegalName(v) {
  const s = normStr(v).replace(/\s+/g, " ").trim().toLowerCase();
  return s || null;
}

/** @param {unknown} v */
function parseMoHDate(v) {
  const s = normStr(v);
  if (!s) return null;
  const d = s.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  return d;
}

/** @param {Record<string, unknown>} row */
function ministryItalyRdmKey(row) {
  const tipo = normStr(row.tipologia_dm);
  const prog = normStr(row.progressivo_dm_ass);
  const cf = normCf(row.cod_fiscale) ?? "__NO_CF__";
  const cat = normStr(row.cod_catalogo_fabbr_ass);
  const mf = normalizeLegalName(row.fabbricante_assemblatore) ?? "__NO_MF_NAME__";
  return `IT-RDM|${tipo}|${prog}|${cf}|${cat}|${mf}`;
}

/** @param {Record<string, unknown>} row */
function manufacturerFromRow(row) {
  const full_legal_name = normStr(row.fabbricante_assemblatore) || null;
  const legal_name_norm = normalizeLegalName(row.fabbricante_assemblatore);
  const fiscal_code = normCf(row.cod_fiscale);
  const VAT = normStr(row.PARTITAIVA_VATNUMBER_MAND) || null;
  if (!legal_name_norm) return null;
  return {
    legal_name_norm,
    full_legal_name,
    fiscal_code: fiscal_code ?? null,
    VAT: VAT || null,
    metadata: {
      source: "it_moh_rdm_json",
      imported_at: new Date().toISOString(),
    },
  };
}

/**
 * @param {Record<string, unknown>} row
 * @param {string} manufacturerId
 */
function catalogFromRow(row, manufacturerId) {
  const name =
    normStr(row.denominazione_commerciale) ||
    normStr(row.descrizione_cnd) ||
    "Dispositivo senza denominazione";
  const sku = normStr(row.cod_catalogo_fabbr_ass) || null;
  const default_description = normStr(row.descrizione_cnd) || null;

  const metadata = {
    source: "it_moh_rdm_json",
    ministry_italy_rdm_key: ministryItalyRdmKey(row),
    tipologia_dm: normStr(row.tipologia_dm) || null,
    progressivo_dm_ass: normStr(row.progressivo_dm_ass) || null,
    data_prima_pubblicazione: parseMoHDate(row.data_prima_pubblicazione),
    dm_riferimento: normStr(row.dm_riferimento) || null,
    gruppo_dm_simili: normStr(row.gruppo_dm_simili) || null,
    iscrizione_repertorio: normStr(row.iscrizione_repertorio) || null,
    data_inizio_validita: parseMoHDate(row.data_inizio_validita),
    data_fine_validita: parseMoHDate(row.data_fine_validita),
    data_fine_commercio: parseMoHDate(row.data_fine_commercio),
    classificazione_cnd: normStr(row.classificazione_cnd) || null,
    cod_catalogo_fabbr_ass: normStr(row.cod_catalogo_fabbr_ass) || null,
  };

  return {
    manufacturer_id: manufacturerId,
    name,
    sku,
    default_description,
    metadata,
  };
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** @param {string} msg */
function isTransientSupabaseError(msg) {
  if (!msg) return false;
  const m = msg.toLowerCase();
  return (
    m.includes("fetch failed") ||
    m.includes("525") ||
    m.includes("ssl handshake") ||
    m.includes("502") ||
    m.includes("503") ||
    m.includes("504") ||
    m.includes("cloudflare") ||
    m.includes("econnreset") ||
    m.includes("etimedout") ||
    m.includes("socket hang up") ||
    m.includes("headersoverflow") ||
    m.includes("<!doctype html")
  );
}

/**
 * @template T
 * @param {string} label
 * @param {() => Promise<{ data: T; error: { message?: string } | null }>} fn
 * @param {(msg: string) => void} logFn
 */
async function supabaseWithRetry(label, fn, logFn, { maxAttempts = 10 } = {}) {
  let lastMsg = "";
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { data, error } = await fn();
    if (!error) return { data, error: null };
    lastMsg = error.message ?? String(error);
    if (attempt === maxAttempts || !isTransientSupabaseError(lastMsg)) {
      return { data, error };
    }
    const backoff = Math.min(180_000, 4000 * 2 ** (attempt - 1) + Math.random() * 1500);
    logFn(
      `retry ${attempt}/${maxAttempts - 1} (${label}) tra ${Math.round(backoff / 1000)}s: ${lastMsg.slice(0, 120).replace(/\s+/g, " ")}…`,
    );
    await sleep(backoff);
  }
  return { data: null, error: { message: lastMsg } };
}

/**
 * @param {string} jsonPath
 * @param {number | null} limit
 */
async function* iterateRootJsonArray(jsonPath, limit) {
  const pipeline = chain([createReadStream(jsonPath), streamJson.parser(), streamArray()]);
  let count = 0;
  try {
    for await (const data of pipeline) {
      yield data.value;
      count++;
      if (limit != null && Number.isFinite(limit) && limit > 0 && count >= limit) {
        if (typeof pipeline.destroy === "function") pipeline.destroy();
        break;
      }
    }
  } finally {
    if (typeof pipeline.destroy === "function") pipeline.destroy();
  }
}

/**
 * @param {string} jsonPath
 * @param {number | null} limit
 * @param {{ statsEvery: number; log: (msg: string) => void }} [progress]
 */
async function loadRootJsonArray(jsonPath, limit, progress) {
  /** @type {Record<string, unknown>[]} */
  const records = [];
  let nextParseLog = progress?.statsEvery ?? Infinity;
  let n = 0;
  for await (const row of iterateRootJsonArray(jsonPath, limit)) {
    records.push(row);
    n++;
    if (progress && progress.statsEvery > 0 && n >= nextParseLog) {
      progress.log(`parse JSON: ${n.toLocaleString("it-IT")} record letti…`);
      while (nextParseLog <= n) nextParseLog += progress.statsEvery;
    }
  }
  return records;
}

/** @param {string} checkpointPath */
function readCheckpoint(checkpointPath) {
  try {
    const raw = readFileSync(checkpointPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * @param {object} cp
 * @param {string} jsonPathAbs
 * @param {{ size: number; mtimeMs: number }} st
 */
function validateCheckpoint(cp, jsonPathAbs, st) {
  if (!cp || cp.version !== 1) return { resumeFrom: 0 };
  if (resolve(cp.jsonPath) !== resolve(jsonPathAbs)) {
    throw new Error(`Checkpoint jsonPath non coincide. Usa --reset-checkpoint o il file giusto.`);
  }
  if (cp.size !== st.size) {
    throw new Error(
      `File JSON cambiato (size ${st.size} vs checkpoint ${cp.size}). Elimina il checkpoint con --reset-checkpoint o usa file originale.`,
    );
  }
  const resumeFrom = Number(cp.nextSourceIndex ?? 0);
  return { resumeFrom: Number.isFinite(resumeFrom) && resumeFrom > 0 ? resumeFrom : 0 };
}

/**
 * @param {string} checkpointPath
 * @param {string} jsonPath
 * @param {{ size: number; mtimeMs: number }} st
 * @param {number} nextSourceIndex
 */
function writeCheckpointFile(checkpointPath, jsonPath, st, nextSourceIndex) {
  writeFileSync(
    checkpointPath,
    JSON.stringify(
      {
        version: 1,
        jsonPath,
        size: st.size,
        mtimeMs: st.mtimeMs,
        nextSourceIndex,
        updatedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
    "utf8",
  );
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {(msg: string) => void} log
 */
async function loadManufacturerMapFromDb(supabase, log) {
  /** @type {Map<string, { id: string; fiscal_code: string | null }>} */
  const mfByLegalNameNorm = new Map();
  const page = 800;
  let from = 0;
  for (;;) {
    const { data, error } = await supabaseWithRetry(
      "manufacturers full map",
      () =>
        supabase
          .from("manufacturers")
          .select("id, legal_name_norm, fiscal_code")
          .not("legal_name_norm", "is", null)
          .order("id", { ascending: true })
          .range(from, from + page - 1),
      log,
    );
    if (error) throw error;
    if (!data?.length) break;
    for (const row of data) {
      if (row.legal_name_norm) {
        mfByLegalNameNorm.set(row.legal_name_norm, {
          id: row.id,
          fiscal_code: row.fiscal_code ?? null,
        });
      }
    }
    from += data.length;
    if (data.length < page) break;
  }
  log(`mappa fabbricanti da DB: ${mfByLegalNameNorm.size.toLocaleString("it-IT")} righe con legal_name_norm`);
  return mfByLegalNameNorm;
}

/**
 * Processa un singolo batch di righe sorgente e chiama la RPC catalogo.
 * Restituisce i delta (non i totali cumulativi).
 *
 * @param {Record<string, unknown>[]} batchRows
 * @param {Map<string, { id: string; fiscal_code: string | null }>} mfByLegalNameNorm
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {(msg: string) => void} log
 * @param {boolean} insertOnly
 */
async function flushCatalogBatch(batchRows, mfByLegalNameNorm, supabase, log, insertOnly) {
  /** @type {Map<string, ReturnType<typeof catalogFromRow>>} */
  const catalogByKey = new Map();
  let deltaSkippedNoMf = 0;
  let deltaSkippedCfMismatch = 0;

  for (const row of batchRows) {
    const nn = normalizeLegalName(row.fabbricante_assemblatore);
    if (!nn) {
      deltaSkippedNoMf++;
      continue;
    }
    const mf = mfByLegalNameNorm.get(nn);
    if (!mf) {
      deltaSkippedNoMf++;
      continue;
    }
    const rowCf = normCf(row.cod_fiscale);
    if (rowCf && mf.fiscal_code && rowCf !== mf.fiscal_code) {
      deltaSkippedCfMismatch++;
      continue;
    }
    const item = catalogFromRow(row, mf.id);
    const k = item.metadata.ministry_italy_rdm_key;
    if (typeof k === "string" && k) catalogByKey.set(k, item);
  }

  const catalogUpserts = [...catalogByKey.values()];
  let deltaInserted = 0;
  if (catalogUpserts.length > 0) {
    const rpcName = insertOnly
      ? "upsert_master_catalog_rdm_batch_insert_only"
      : "upsert_master_catalog_rdm_batch";
    const { data: rpcCount, error } = await supabaseWithRetry(
      rpcName,
      () => supabase.rpc(rpcName, { p_rows: catalogUpserts }),
      log,
    );
    if (error) throw error;
    deltaInserted = typeof rpcCount === "number" ? rpcCount : catalogUpserts.length;
  }

  return { deltaInserted, deltaSkippedNoMf, deltaSkippedCfMismatch };
}

/**
 * Flush di un gruppo di batch in parallelo.
 *
 * @param {Record<string, unknown>[][]} batchGroup
 * @param {Map<string, { id: string; fiscal_code: string | null }>} mfByLegalNameNorm
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {(msg: string) => void} log
 * @param {boolean} insertOnly
 */
async function flushBatchGroup(batchGroup, mfByLegalNameNorm, supabase, log, insertOnly) {
  const results = await Promise.all(
    batchGroup.map((rows) => flushCatalogBatch(rows, mfByLegalNameNorm, supabase, log, insertOnly)),
  );
  let deltaInserted = 0;
  let deltaSkippedNoMf = 0;
  let deltaSkippedCfMismatch = 0;
  for (const r of results) {
    deltaInserted += r.deltaInserted;
    deltaSkippedNoMf += r.deltaSkippedNoMf;
    deltaSkippedCfMismatch += r.deltaSkippedCfMismatch;
  }
  return { deltaInserted, deltaSkippedNoMf, deltaSkippedCfMismatch };
}

async function main() {
  if (!pathArg) {
    console.error(
      "Usage: node scripts/import-rdm-json.mjs [--batch=1000] [--catalog-concurrency=4] [--mf-lookup-batch=N] [--stats-every=N] [--limit=N] [--resume] [--reset-checkpoint] [--skip-mf-pass] [--insert-only] [--dry-run] <path-to.json>",
    );
    process.exit(1);
  }

  const jsonPath = resolve(pathArg);
  const checkpointPath = `${jsonPath}.rdm-checkpoint.json`;
  const st = statSync(jsonPath);

  const t0 = Date.now();
  const log = (msg) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${msg}`);

  if (RESET_CHECKPOINT) {
    try {
      unlinkSync(checkpointPath);
      log("checkpoint eliminato.");
    } catch {
      /* no file */
    }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? process.env.SUPABASE_SECRET_KEY?.trim();
  if (!DRY && (!url || !key)) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const useStreamingTwoPass =
    LIMIT == null || !Number.isFinite(LIMIT) || LIMIT <= 0;

  if (DRY) {
    if (LIMIT != null && Number.isFinite(LIMIT) && LIMIT > 0) {
      const records = await loadRootJsonArray(jsonPath, LIMIT, { statsEvery: STATS_EVERY, log });
      console.log("Dry run: first ministry_italy_rdm_key:", ministryItalyRdmKey(records[0] ?? {}));
    } else {
      for await (const row of iterateRootJsonArray(jsonPath, 1)) {
        console.log("Dry run: first ministry_italy_rdm_key:", ministryItalyRdmKey(row));
        break;
      }
    }
    return;
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  log(`batch=${BATCH} | catalog-concurrency=${CATALOG_CONCURRENCY} | insert-only=${INSERT_ONLY}`);

  /** @type {Map<string, { id: string; fiscal_code: string | null }>} */
  let mfByLegalNameNorm = new Map();

  if (useStreamingTwoPass) {
    let resumeFrom = 0;
    if (RESUME) {
      const cp = readCheckpoint(checkpointPath);
      const v = validateCheckpoint(cp, jsonPath, { size: st.size, mtimeMs: st.mtimeMs });
      resumeFrom = v.resumeFrom;
      if (resumeFrom > 0) {
        log(`resume catalogo: prossima riga sorgente da elaborare (indice 0-based) = ${resumeFrom.toLocaleString("it-IT")}`);
      }
    }

    /** Totale righe nel file (per % nel log). */
    let totalRowsForProgress = 0;

    if (!SKIP_MF_PASS) {
      log("pass 1/2: scansione fabbricanti (streaming)…");
      const mfRows = [];
      const seenNameNorm = new Set();
      let skippedNoMfName = 0;
      let totalRows = 0;
      let nextLog = STATS_EVERY;
      for await (const row of iterateRootJsonArray(jsonPath, null)) {
        totalRows++;
        if (totalRows >= nextLog) {
          log(`pass1: ${totalRows.toLocaleString("it-IT")} righe scorse…`);
          while (nextLog <= totalRows) nextLog += STATS_EVERY;
        }
        const m = manufacturerFromRow(row);
        if (!m) {
          skippedNoMfName++;
          continue;
        }
        if (seenNameNorm.has(m.legal_name_norm)) continue;
        seenNameNorm.add(m.legal_name_norm);
        mfRows.push(m);
      }
      log(
        `pass1 ok: ${totalRows.toLocaleString("it-IT")} righe file | ${mfRows.length.toLocaleString("it-IT")} fabbricanti unici | senza nome: ${skippedNoMfName.toLocaleString("it-IT")}`,
      );

      let mfUpserted = 0;
      let mfProgressMark = STATS_EVERY;
      for (const batch of chunk(mfRows, BATCH)) {
        const { error } = await supabaseWithRetry(
          "upsert_manufacturers_rdm_batch",
          () => supabase.rpc("upsert_manufacturers_rdm_batch", { p_rows: batch }),
          log,
        );
        if (error) throw error;
        mfUpserted += batch.length;
        if (mfUpserted >= mfProgressMark || mfUpserted === mfRows.length) {
          log(
            `fabbricanti: ${mfUpserted.toLocaleString("it-IT")}/${mfRows.length.toLocaleString("it-IT")} in RPC`,
          );
          while (mfProgressMark <= mfUpserted) mfProgressMark += STATS_EVERY;
        }
      }

      const allNorm = [...seenNameNorm];
      for (const part of chunk(allNorm, MF_LOOKUP_CHUNK)) {
        const { data, error } = await supabaseWithRetry(
          "manufacturers id lookup",
          () =>
            supabase.from("manufacturers").select("id, legal_name_norm, fiscal_code").in("legal_name_norm", part),
          log,
        );
        if (error) throw error;
        for (const row of data ?? []) {
          if (row.legal_name_norm) {
            mfByLegalNameNorm.set(row.legal_name_norm, {
              id: row.id,
              fiscal_code: row.fiscal_code ?? null,
            });
          }
        }
      }
      totalRowsForProgress = totalRows;
    } else {
      log("pass 1/2 saltato (--skip-mf-pass): carico fabbricanti da DB…");
      mfByLegalNameNorm = await loadManufacturerMapFromDb(supabase, log);
      log("conteggio righe file (solo per percentuali)…");
      totalRowsForProgress = await countRowsOnly(jsonPath, log);
    }

    log(`pass 2/2: catalogo (streaming, concurrency=${CATALOG_CONCURRENCY})…`);
    let catInserted = 0;
    let catSkippedNoMf = 0;
    let catSkippedCfMismatch = 0;
    let sourceRowsProcessed = 0;
    let catProgressMark = STATS_EVERY;
    /** @type {Record<string, unknown>[]} */
    let batchRows = [];
    /** @type {Record<string, unknown>[][]} */
    let pendingBatchGroup = [];

    /**
     * Flush del gruppo pendente in parallelo, aggiorna contatori, scrive checkpoint.
     */
    async function flushPending() {
      if (pendingBatchGroup.length === 0) return;
      const r = await flushBatchGroup(pendingBatchGroup, mfByLegalNameNorm, supabase, log, INSERT_ONLY);
      catInserted += r.deltaInserted;
      catSkippedNoMf += r.deltaSkippedNoMf;
      catSkippedCfMismatch += r.deltaSkippedCfMismatch;
      writeCheckpointFile(checkpointPath, jsonPath, st, sourceRowsProcessed);
      if (sourceRowsProcessed >= catProgressMark || sourceRowsProcessed === totalRowsForProgress) {
        const pct = totalRowsForProgress
          ? ((sourceRowsProcessed / totalRowsForProgress) * 100).toFixed(1)
          : "100";
        log(
          `catalogo: sorgente ${sourceRowsProcessed.toLocaleString("it-IT")}/${totalRowsForProgress.toLocaleString("it-IT")} (${pct}%) | ` +
            `RPC row_count Σ ${catInserted.toLocaleString("it-IT")} | ` +
            `skip nome/mf ${catSkippedNoMf.toLocaleString("it-IT")} | ` +
            `skip CF mismatch ${catSkippedCfMismatch.toLocaleString("it-IT")}`,
        );
        while (catProgressMark <= sourceRowsProcessed) catProgressMark += STATS_EVERY;
      }
      pendingBatchGroup = [];
    }

    for await (const row of iterateRootJsonArray(jsonPath, null)) {
      if (sourceRowsProcessed < resumeFrom) {
        sourceRowsProcessed++;
        continue;
      }
      batchRows.push(row);
      sourceRowsProcessed++;

      if (batchRows.length >= BATCH) {
        pendingBatchGroup.push(batchRows);
        batchRows = [];
        if (pendingBatchGroup.length >= CATALOG_CONCURRENCY) {
          await flushPending();
        }
      }
    }

    if (batchRows.length > 0) pendingBatchGroup.push(batchRows);
    await flushPending();

    try {
      unlinkSync(checkpointPath);
    } catch {
      /* */
    }
    log(
      `FINE — RPC row_count Σ: ${catInserted.toLocaleString("it-IT")} | skip (no manufacturer / no name): ${catSkippedNoMf.toLocaleString("it-IT")} | skip (CF mismatch): ${catSkippedCfMismatch.toLocaleString("it-IT")} | checkpoint rimosso`,
    );
    return;
  }

  /** --------- Modalità --limit (array in RAM) --------- */
  const records = await loadRootJsonArray(
    jsonPath,
    LIMIT != null && Number.isFinite(LIMIT) && LIMIT > 0 ? LIMIT : null,
    { statsEvery: STATS_EVERY, log },
  );
  log(`parse: completato ${records.length} record (limit)`);

  const mfRows = [];
  const seenNameNorm = new Set();
  let skippedNoMfName = 0;
  for (const row of records) {
    const m = manufacturerFromRow(row);
    if (!m) {
      skippedNoMfName++;
      continue;
    }
    if (seenNameNorm.has(m.legal_name_norm)) continue;
    seenNameNorm.add(m.legal_name_norm);
    mfRows.push(m);
  }
  console.log(
    `Records: ${records.length}, unique manufacturers (by name): ${mfRows.length}, rows without fabbricante name: ${skippedNoMfName}`,
  );

  let mfUpserted = 0;
  let mfProgressMark = STATS_EVERY;
  for (const batch of chunk(mfRows, BATCH)) {
    const { error } = await supabaseWithRetry(
      "upsert_manufacturers_rdm_batch",
      () => supabase.rpc("upsert_manufacturers_rdm_batch", { p_rows: batch }),
      log,
    );
    if (error) throw error;
    mfUpserted += batch.length;
    if (mfUpserted >= mfProgressMark || mfUpserted === mfRows.length) {
      log(
        `fabbricanti: ${mfUpserted.toLocaleString("it-IT")}/${mfRows.length.toLocaleString("it-IT")} in RPC`,
      );
      while (mfProgressMark <= mfUpserted) mfProgressMark += STATS_EVERY;
    }
  }

  for (const part of chunk([...seenNameNorm], MF_LOOKUP_CHUNK)) {
    const { data, error } = await supabaseWithRetry(
      "manufacturers id lookup",
      () =>
        supabase.from("manufacturers").select("id, legal_name_norm, fiscal_code").in("legal_name_norm", part),
      log,
    );
    if (error) throw error;
    for (const row of data ?? []) {
      if (row.legal_name_norm) {
        mfByLegalNameNorm.set(row.legal_name_norm, {
          id: row.id,
          fiscal_code: row.fiscal_code ?? null,
        });
      }
    }
  }

  let catInserted = 0;
  let catSkippedNoMf = 0;
  let catSkippedCfMismatch = 0;
  let sourceRowsProcessed = 0;
  let catProgressMark = STATS_EVERY;
  const totalRecords = records.length;

  const batches = chunk(records, BATCH);
  for (const batchGroup of chunk(batches, CATALOG_CONCURRENCY)) {
    const r = await flushBatchGroup(batchGroup, mfByLegalNameNorm, supabase, log, INSERT_ONLY);
    catInserted += r.deltaInserted;
    catSkippedNoMf += r.deltaSkippedNoMf;
    catSkippedCfMismatch += r.deltaSkippedCfMismatch;

    sourceRowsProcessed += batchGroup.reduce((s, b) => s + b.length, 0);
    if (sourceRowsProcessed >= catProgressMark || sourceRowsProcessed === totalRecords) {
      const pct = totalRecords ? ((sourceRowsProcessed / totalRecords) * 100).toFixed(1) : "100";
      log(
        `catalogo: sorgente ${sourceRowsProcessed.toLocaleString("it-IT")}/${totalRecords.toLocaleString("it-IT")} (${pct}%) | ` +
          `RPC row_count Σ ${catInserted.toLocaleString("it-IT")} | ` +
          `skip nome/mf ${catSkippedNoMf.toLocaleString("it-IT")} | ` +
          `skip CF mismatch ${catSkippedCfMismatch.toLocaleString("it-IT")}`,
      );
      while (catProgressMark <= sourceRowsProcessed) catProgressMark += STATS_EVERY;
    }
  }

  log(
    `FINE catalogo — RPC row_count Σ: ${catInserted.toLocaleString("it-IT")} | skip (no manufacturer / no name): ${catSkippedNoMf.toLocaleString("it-IT")} | skip (CF mismatch): ${catSkippedCfMismatch.toLocaleString("it-IT")}`,
  );
}

/**
 * Conta righe senza tenere l'array (secondo pass leggero solo per % nel log).
 */
async function countRowsOnly(jsonPath, log) {
  let n = 0;
  let nextLog = STATS_EVERY * 20;
  for await (const _ of iterateRootJsonArray(jsonPath, null)) {
    n++;
    if (n >= nextLog) {
      log(`conteggio righe file: ${n.toLocaleString("it-IT")}…`);
      nextLog += STATS_EVERY * 20;
    }
  }
  log(`conteggio righe file: ${n.toLocaleString("it-IT")} totali`);
  return n;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
