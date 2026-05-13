#!/usr/bin/env python3
"""
Importa CSV dispositivi medici (MoH / RDM) in SQLite locale, flusso separato da confezioni AIFA.

Chiave tecnica univoca nei dati ministeriali: cod_catalogo_fabbr_ass (TEXT, preserva formato).
Si scartano righe con codice vuoto o con più codici nella stessa cella (presenza di ';').

Stesso pattern di assenza dall'export degli AIFA su SQLite:
assente_da_export, marcato_assente_il (prima volta), ultimo_visto_il.

  python scripts/import_dm_rdm_csv.py ^
    --file "C:\\Users\\hp\\Downloads\\DISPO_RDM_1_20260511_csv\\DISPO_RDM_1_20260511.csv"

  python scripts/import_dm_rdm_csv.py -f ./export.csv --db ./data/dispositivi_rdm.sqlite
"""

from __future__ import annotations

import argparse
import csv
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path

CSV_COLUMNS = (
    "tipologia_dm",
    "progressivo_dm_ass",
    "data_prima_pubblicazione",
    "dm_riferimento",
    "gruppo_dm_simili",
    "iscrizione_repertorio",
    "data_inizio_validita",
    "data_fine_validita",
    "fabbricante_assemblatore",
    "cod_fiscale",
    "PARTITAIVA_VATNUMBER_MAND",
    "cod_catalogo_fabbr_ass",
    "denominazione_commerciale",
    "classificazione_cnd",
    "descrizione_cnd",
    "data_fine_commercio",
)

DDL = """
CREATE TABLE IF NOT EXISTS rdm_dispositivi_csv (
    cod_catalogo_fabbr_ass   TEXT PRIMARY KEY NOT NULL,
    tipologia_dm             TEXT,
    progressivo_dm_ass       TEXT,
    data_prima_pubblicazione TEXT,
    dm_riferimento           TEXT,
    gruppo_dm_simili         TEXT,
    iscrizione_repertorio    TEXT,
    data_inizio_validita     TEXT,
    data_fine_validita       TEXT,
    fabbricante_assemblatore TEXT,
    cod_fiscale              TEXT,
    partitaiva_vatnumber_mand TEXT,
    denominazione_commerciale TEXT,
    classificazione_cnd       TEXT,
    descrizione_cnd             TEXT,
    data_fine_commercio           TEXT,
    assente_da_export      INTEGER NOT NULL DEFAULT 0,
    marcato_assente_il      TEXT,
    ultimo_visto_il         TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_rdm_csv_assente ON rdm_dispositivi_csv (assente_da_export);
"""


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _as_str(raw: object) -> str:
    if raw is None:
        return ""
    return str(raw).strip()


def catalog_code_ok(raw: object) -> tuple[bool, str]:
    """Un solo codice catalogo utilizzabile; ';' ⇒ più codici in cella → scarto."""
    c = _as_str(raw)
    if not c:
        return False, "vuoto"
    if ";" in c:
        return False, "multiplo_(contiene_;)"
    return True, c


def ensure_schema(con: sqlite3.Connection) -> None:
    con.executescript(DDL)


def open_csv_try(path: Path):
    sample = path.read_bytes()[: min(1_048_576, path.stat().st_size)]
    chosen = "utf-8"
    for enc in ("utf-8-sig", "utf-8", "cp1252"):
        try:
            sample.decode(enc)
            chosen = enc
            break
        except UnicodeDecodeError:
            continue
    else:
        chosen = "latin-1"

    return open(path, "r", encoding=chosen, newline=""), chosen


UPSERT_SQL = """
INSERT INTO rdm_dispositivi_csv (
    cod_catalogo_fabbr_ass,
    tipologia_dm,
    progressivo_dm_ass,
    data_prima_pubblicazione,
    dm_riferimento,
    gruppo_dm_simili,
    iscrizione_repertorio,
    data_inizio_validita,
    data_fine_validita,
    fabbricante_assemblatore,
    cod_fiscale,
    partitaiva_vatnumber_mand,
    denominazione_commerciale,
    classificazione_cnd,
    descrizione_cnd,
    data_fine_commercio,
    assente_da_export,
    marcato_assente_il,
    ultimo_visto_il
) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
ON CONFLICT(cod_catalogo_fabbr_ass) DO UPDATE SET
    tipologia_dm              = excluded.tipologia_dm,
    progressivo_dm_ass       = excluded.progressivo_dm_ass,
    data_prima_pubblicazione  = excluded.data_prima_pubblicazione,
    dm_riferimento           = excluded.dm_riferimento,
    gruppo_dm_simili         = excluded.gruppo_dm_simili,
    iscrizione_repertorio     = excluded.iscrizione_repertorio,
    data_inizio_validita      = excluded.data_inizio_validita,
    data_fine_validita        = excluded.data_fine_validita,
    fabbricante_assemblatore  = excluded.fabbricante_assemblatore,
    cod_fiscale               = excluded.cod_fiscale,
    partitaiva_vatnumber_mand = excluded.partitaiva_vatnumber_mand,
    denominazione_commerciale = excluded.denominazione_commerciale,
    classificazione_cnd       = excluded.classificazione_cnd,
    descrizione_cnd           = excluded.descrizione_cnd,
    data_fine_commercio       = excluded.data_fine_commercio,
    assente_da_export         = excluded.assente_da_export,
    marcato_assente_il        = excluded.marcato_assente_il,
    ultimo_visto_il           = excluded.ultimo_visto_il
"""


def sqlite_row_tuple(row: dict[str, str], cod: str, iso: str) -> tuple:
    return (
        cod,
        _as_str(row.get("tipologia_dm")),
        _as_str(row.get("progressivo_dm_ass")),
        _as_str(row.get("data_prima_pubblicazione")),
        _as_str(row.get("dm_riferimento")),
        _as_str(row.get("gruppo_dm_simili")),
        _as_str(row.get("iscrizione_repertorio")),
        _as_str(row.get("data_inizio_validita")),
        _as_str(row.get("data_fine_validita")),
        _as_str(row.get("fabbricante_assemblatore")),
        _as_str(row.get("cod_fiscale")),
        _as_str(row.get("PARTITAIVA_VATNUMBER_MAND")),
        _as_str(row.get("denominazione_commerciale")),
        _as_str(row.get("classificazione_cnd")),
        _as_str(row.get("descrizione_cnd")),
        _as_str(row.get("data_fine_commercio")),
        0,
        None,
        iso,
    )


def run_import(
    csv_path: Path,
    db_path: Path,
    *,
    batch_size: int = 2500,
    dry_run: bool = False,
) -> None:
    if not csv_path.is_file():
        raise SystemExit(f"File CSV non trovato: {csv_path}")

    db_path.parent.mkdir(parents=True, exist_ok=True)
    iso = _now_iso()

    csv_file, enc_used = open_csv_try(csv_path)

    try:
        reader = csv.DictReader(csv_file, delimiter=";", quotechar='"')

        if not reader.fieldnames:
            raise SystemExit("CSV vuoto o senza intestazioni.")

        header_set = {h.strip() for h in reader.fieldnames}
        missing = [c for c in CSV_COLUMNS if c not in header_set]
        if missing:
            raise SystemExit(
                f"CSV: mancano colonne attese {missing}. Intestazioni: {reader.fieldnames}"
            )

        if dry_run:
            n_ok = n_bad = n_dup = 0
            seen: set[str] = set()
            for row in reader:
                ok, cod = catalog_code_ok(row.get("cod_catalogo_fabbr_ass"))
                if not ok:
                    n_bad += 1
                    continue
                if cod in seen:
                    n_dup += 1
                    continue
                seen.add(cod)
                n_ok += 1
            print(
                f"[dry-run] encoding={enc_used} righe_csv={n_ok + n_bad + n_dup} "
                f"univoche_cod={n_ok} scartate={n_bad} duplicati_file={n_dup}",
                flush=True,
            )
            return

        con = sqlite3.connect(db_path)
        try:
            ensure_schema(con)
            con.execute("BEGIN IMMEDIATE")

            con.execute("DROP TABLE IF EXISTS tmp_cod_catalogo_correnti")
            con.execute(
                """
                CREATE TEMP TABLE tmp_cod_catalogo_correnti (
                    cod_catalogo_fabbr_ass TEXT PRIMARY KEY
                )
                """
            )

            inserted_rows = upsert_batches = 0
            skipped_bad = skipped_dup_file = 0
            pending: list[tuple] = []
            seen_cod: set[str] = set()

            for row in reader:
                ok, cod = catalog_code_ok(row.get("cod_catalogo_fabbr_ass"))
                if not ok:
                    skipped_bad += 1
                    continue
                if cod in seen_cod:
                    skipped_dup_file += 1
                    continue
                seen_cod.add(cod)

                con.execute(
                    "INSERT INTO tmp_cod_catalogo_correnti (cod_catalogo_fabbr_ass) VALUES (?)",
                    (cod,),
                )
                pending.append(sqlite_row_tuple(row, cod, iso))

                if len(pending) >= batch_size:
                    con.executemany(UPSERT_SQL, pending)
                    upsert_batches += 1
                    inserted_rows += len(pending)
                    pending.clear()

            if pending:
                con.executemany(UPSERT_SQL, pending)
                upsert_batches += 1
                inserted_rows += len(pending)

            cur_mark = con.execute(
                """
                UPDATE rdm_dispositivi_csv
                SET
                    assente_da_export = 1,
                    marcato_assente_il = COALESCE(marcato_assente_il, ?)
                WHERE cod_catalogo_fabbr_ass NOT IN (
                    SELECT cod_catalogo_fabbr_ass FROM tmp_cod_catalogo_correnti
                )
                  AND COALESCE(assente_da_export, 0) = 0
                """,
                (iso,),
            )
            marked_new = cur_mark.rowcount

            con.commit()

            print(f"SQLite: {db_path}")
            print(f"Encoding CSV: {enc_used}")
            print(f"Upsert codici univoci: {inserted_rows}")
            print(f"Batches: {upsert_batches}")
            print(f"Righe scartate (codice vuoto o multiplo): {skipped_bad}")
            print(f"Duplicati codice nel CSV (solo prima occorrenza): {skipped_dup_file}")
            print(f"Nuovi assenti dall'export (0->1): {marked_new}", flush=True)

        except Exception:
            con.rollback()
            raise
        finally:
            con.close()

    finally:
        csv_file.close()


def main(argv: list[str]) -> None:
    p = argparse.ArgumentParser(description=__doc__)

    root = Path(__file__).resolve().parents[1]
    default_db = root / "data" / "dispositivi_rdm.sqlite"

    p.add_argument("--file", "-f", dest="csv_path", required=True, help="Percorso al CSV (;).")
    p.add_argument("--db", "-d", type=Path, default=default_db, help=f"SQLite (default: {default_db})")
    p.add_argument("--batch-size", type=int, default=2500, help="Batch executemany (default 2500).")
    p.add_argument("--dry-run", action="store_true", help="Solo conta, senza SQLite.")
    ns = p.parse_args(argv)

    csv_path = Path(ns.csv_path).expanduser().resolve()
    db_path = Path(ns.db).expanduser()
    if not db_path.is_absolute():
        db_path = (Path.cwd() / db_path).resolve()

    run_import(csv_path, db_path, batch_size=ns.batch_size, dry_run=ns.dry_run)


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, OSError):
        pass
    main(sys.argv[1:])
