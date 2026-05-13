#!/usr/bin/env python3
"""
Legge SQLite `rdm_dispositivi_csv` (import_dm_rdm_csv.py) e chiama
`sync_master_catalog_rdm_csv_batch` su Supabase (max 1000 righe/RPC).

Usa NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (o equivalenti da .env.local).

 Esempi:

  python scripts/sync_rdm_sqlite_to_supabase.py -d data/dispositivi_rdm.sqlite --dry-run --limit 3

  python scripts/sync_rdm_sqlite_to_supabase.py -d data/dispositivi_rdm.sqlite
"""

from __future__ import annotations

import argparse
import json
import os
import random
import re
import sqlite3
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Iterable

RPC_NAME = "sync_master_catalog_rdm_csv_batch"
DEFAULT_BATCH = 1000


class RpcFatal(RuntimeError):
    """Errore definitivo sulla chiamata RPC (dopo i retry di rete)."""

    __slots__ = ("http_code",)

    def __init__(self, msg: str, *, http_code: int | None = None):
        super().__init__(msg)
        self.http_code = http_code


def _pg_statement_timeout_message(msg: str) -> bool:
    m = msg.lower()
    return "57014" in msg or "statement timeout" in m or "query_canceled" in m


def env_base_url() -> str:
    return (
        os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
        or os.environ.get("SUPABASE_URL")
        or ""
    ).strip()


def env_service_key() -> str:
    return (
        os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        or os.environ.get("SUPABASE_SECRET_KEY")
        or ""
    ).strip()


def load_env_local(path: Path) -> None:
    if not path.is_file():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        k = k.strip()
        if not k or k in os.environ:
            continue
        v = v.strip().strip('"').strip("'")
        os.environ[k] = v


def default_sqlite_path() -> Path:
    return Path(__file__).resolve().parents[1] / "data" / "dispositivi_rdm.sqlite"


def normalize_legal_name(v: object) -> str | None:
    s = " ".join(str(v or "").split()).strip().lower()
    return s or None


def norm_cf(v: object) -> str | None:
    t = str(v or "").strip().upper()
    t = re.sub(r"\s+", "", t)
    return t or None


def ministry_italy_rdm_key(d: dict[str, Any]) -> str:
    """Allineato a ministryItalyRdmKey in scripts/import-rdm-json.mjs."""
    tipo = str(d.get("tipologia_dm") or "").strip()
    prog = str(d.get("progressivo_dm_ass") or "").strip()
    cf = norm_cf(d.get("cod_fiscale")) or "__NO_CF__"
    cat = str(d.get("cod_catalogo_fabbr_ass") or "").strip()
    mf = normalize_legal_name(d.get("fabbricante_assemblatore")) or "__NO_MF_NAME__"
    return f"IT-RDM|{tipo}|{prog}|{cf}|{cat}|{mf}"


def row_to_rpc_payload(row: sqlite3.Row) -> dict[str, Any]:
    d = dict(row)
    cod = str(d.get("cod_catalogo_fabbr_ass") or "").strip()
    denom = str(d.get("denominazione_commerciale") or "").strip()
    desc = str(d.get("descrizione_cnd") or "").strip()
    fabbr = str(d.get("fabbricante_assemblatore") or "").strip()
    cf_raw = _as_str_plain(d.get("cod_fiscale"))
    vat_raw = _as_str_plain(d.get("partitaiva_vatnumber_mand"))

    metadata_patch = {
        "ministry_italy_rdm_key": ministry_italy_rdm_key(d),
        "rdm_csv": {
            "tipologia_dm": d.get("tipologia_dm") or None,
            "progressivo_dm_ass": d.get("progressivo_dm_ass") or None,
            "data_prima_pubblicazione": d.get("data_prima_pubblicazione") or None,
            "dm_riferimento": d.get("dm_riferimento") or None,
            "gruppo_dm_simili": d.get("gruppo_dm_simili") or None,
            "iscrizione_repertorio": d.get("iscrizione_repertorio") or None,
            "data_inizio_validita": d.get("data_inizio_validita") or None,
            "data_fine_validita": d.get("data_fine_validita") or None,
            "classificazione_cnd": d.get("classificazione_cnd") or None,
            "data_fine_commercio": d.get("data_fine_commercio") or None,
        },
        "assente_da_export": bool(d.get("assente_da_export")),
        "marcato_assente_il": d.get("marcato_assente_il") or None,
        "ultimo_visto_sqlite_il": d.get("ultimo_visto_il") or None,
    }

    name_for_rpc = denom or None

    return {
        "cod_catalogo_fabbr_ass": cod,
        "name": name_for_rpc,
        "sku": cod or None,
        "default_description": desc or None,
        "manufacturer_full_legal_name": fabbr or None,
        "manufacturer_fiscal_code": cf_raw or None,
        "manufacturer_vat": vat_raw or None,
        "metadata_patch": metadata_patch,
    }


def _as_str_plain(raw: object) -> str:
    if raw is None:
        return ""
    return str(raw).strip()


def call_rpc(base_url: str, service_key: str, rows: list[dict[str, Any]]) -> dict[str, Any]:
    url = f"{base_url.rstrip('/')}/rest/v1/rpc/{RPC_NAME}"
    body = json.dumps({"p_rows": rows}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {service_key}",
            "apikey": service_key,
            "Prefer": "return=representation",
        },
    )
    with urllib.request.urlopen(req, timeout=240) as resp:
        raw = resp.read().decode("utf-8")
    if not raw:
        return {}
    data = json.loads(raw)
    if isinstance(data, list) and len(data) == 1 and isinstance(data[0], dict):
        return data[0]
    if isinstance(data, dict):
        return data
    return {"raw": data}


def _transient_network_error(exc: BaseException) -> bool:
    if isinstance(exc, urllib.error.HTTPError):
        return exc.code in (408, 425, 429, 502, 503, 504)
    if isinstance(exc, urllib.error.URLError):
        r = exc.reason
        if isinstance(r, (ConnectionResetError, BrokenPipeError, TimeoutError)):
            return True
        if isinstance(r, OSError) and getattr(r, "winerror", None) == 10054:
            return True
        s = str(r).lower()
        return any(x in s for x in ("reset", "timed out", "timeout", "eof", "ssl", "handshake"))
    if isinstance(exc, (ConnectionResetError, BrokenPipeError, TimeoutError)):
        return True
    if isinstance(exc, OSError) and getattr(exc, "winerror", None) == 10054:
        return True
    return False


def call_rpc_with_retry(
    base_url: str,
    service_key: str,
    rows: list[dict[str, Any]],
    *,
    max_attempts: int,
    batch_label: str,
) -> dict[str, Any]:
    last_exc: BaseException | None = None
    for attempt in range(1, max_attempts + 1):
        try:
            return call_rpc(base_url, service_key, rows)
        except urllib.error.HTTPError as e:
            last_exc = e
            try:
                body = e.read().decode("utf-8", errors="replace")
            except Exception:
                body = str(e)
            if attempt < max_attempts and _transient_network_error(e):
                delay = min(120.0, 3.0 * (2 ** (attempt - 1)) + random.uniform(0, 2))
                print(
                    f"[retry batch {batch_label}] HTTP {e.code} tentativo {attempt}/{max_attempts}, "
                    f"attesa {delay:.1f}s…",
                    flush=True,
                    file=sys.stderr,
                )
                time.sleep(delay)
                continue
            raise RpcFatal(f"HTTP {e.code}: {body}", http_code=e.code) from e
        except urllib.error.URLError as e:
            last_exc = e
            if attempt < max_attempts and _transient_network_error(e):
                delay = min(120.0, 3.0 * (2 ** (attempt - 1)) + random.uniform(0, 2))
                print(
                    f"[retry batch {batch_label}] {type(e).__name__}: {e} tentativo {attempt}/{max_attempts}, "
                    f"attesa {delay:.1f}s…",
                    flush=True,
                    file=sys.stderr,
                )
                time.sleep(delay)
                continue
            raise RpcFatal(f"Errore di rete dopo {attempt} tentativi: {e}") from e

    raise RpcFatal(f"Errore RPC dopo {max_attempts} tentativi: {last_exc}")


def rpc_send_maybe_split_pg_timeout(
    base_url: str,
    service_key: str,
    payloads: list[dict[str, Any]],
    *,
    max_attempts: int,
    batch_label: str,
) -> None:
    """Invia un batch RPC; di fronte al timeout Postgres (57014) divide ricorsivamente fino a 1 riga."""
    if not payloads:
        return
    try:
        result = call_rpc_with_retry(
            base_url,
            service_key,
            payloads,
            max_attempts=max_attempts,
            batch_label=batch_label,
        )
    except RpcFatal as e:
        if not _pg_statement_timeout_message(str(e)):
            raise SystemExit(str(e)) from e
        if len(payloads) <= 1:
            raise SystemExit(
                f"{e} — timeout PG anche su 1 riga (batch {batch_label}); "
                "aumenta `statement_timeout` sulla RPC o verifica dati/pathologico su questa riga."
            ) from e
        mid = len(payloads) // 2
        print(
            f"[split timeout] batch {batch_label}: {len(payloads)} → {mid} + {len(payloads) - mid}",
            flush=True,
            file=sys.stderr,
        )
        rpc_send_maybe_split_pg_timeout(
            base_url,
            service_key,
            payloads[:mid],
            max_attempts=max_attempts,
            batch_label=f"{batch_label}.a",
        )
        rpc_send_maybe_split_pg_timeout(
            base_url,
            service_key,
            payloads[mid:],
            max_attempts=max_attempts,
            batch_label=f"{batch_label}.b",
        )
        return

    if result.get("error"):
        raise SystemExit(f"RPC errore: {result}")
    print(
        f"batch {batch_label}: master_catalog {result.get('master_catalog_upsert_rows')} "
        f"manufacturers {result.get('manufacturers_upsert_rows')}",
        flush=True,
    )


def iter_sqlite_rows(
    db_path: Path,
    *,
    only_present: bool,
    limit: int | None,
) -> Iterable[sqlite3.Row]:
    con = sqlite3.connect(db_path)
    con.row_factory = sqlite3.Row
    try:
        q = "SELECT * FROM rdm_dispositivi_csv"
        if only_present:
            q += " WHERE COALESCE(assente_da_export, 0) = 0"
        q += " ORDER BY cod_catalogo_fabbr_ass ASC"
        if limit is not None:
            q += f" LIMIT {int(limit)}"
        yield from con.execute(q)
    finally:
        con.close()


def chunked(rows: Iterable[sqlite3.Row], n: int) -> Iterable[list[sqlite3.Row]]:
    buf: list[sqlite3.Row] = []
    for r in rows:
        buf.append(r)
        if len(buf) >= n:
            yield buf
            buf = []
    if buf:
        yield buf


def main(argv: list[str]) -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument(
        "--sqlite-db",
        "-d",
        type=Path,
        default=default_sqlite_path(),
        help=f"SQLite (default {default_sqlite_path()})",
    )
    p.add_argument("--batch", type=int, default=DEFAULT_BATCH, help=f"Max {DEFAULT_BATCH} (limite RPC).")
    p.add_argument(
        "--only-present-in-export",
        action="store_true",
        help="Solo assente_da_export = 0.",
    )
    p.add_argument("--limit", type=int, default=None, help="Test: max righe SQLite.")
    p.add_argument("--dry-run", action="store_true", help="Niente HTTP.")
    p.add_argument(
        "--max-retries",
        type=int,
        default=12,
        help="Tentativi massimi per batch su errore di rete transitorio (default 12).",
    )
    ns = p.parse_args(argv)

    repo_root = Path(__file__).resolve().parents[1]
    load_env_local(repo_root / ".env.local")

    sqlite_path = Path(ns.sqlite_db).expanduser().resolve()
    if not sqlite_path.is_file():
        raise SystemExit(f"SQLite non trovato: {sqlite_path}")

    bs = max(1, min(int(ns.batch), DEFAULT_BATCH))
    if int(ns.batch) > DEFAULT_BATCH:
        print(
            f"Nota: batch > {DEFAULT_BATCH}, uso {DEFAULT_BATCH}.",
            file=sys.stderr,
            flush=True,
        )

    base = env_base_url()
    key = env_service_key()

    rows_iter = iter_sqlite_rows(
        sqlite_path,
        only_present=ns.only_present_in_export,
        limit=ns.limit,
    )

    total_rows = 0
    batch_idx = 0

    if not ns.dry_run:
        if not base or not key:
            raise SystemExit(
                "Servono NEXT_PUBLIC_SUPABASE_URL (o SUPABASE_URL) e SUPABASE_SERVICE_ROLE_KEY "
                "(o SUPABASE_SECRET_KEY)."
            )

    for batch in chunked(rows_iter, bs):
        batch_idx += 1
        payloads: list[dict[str, Any]] = []
        for row in batch:
            pl = row_to_rpc_payload(row)
            c = str(pl.get("cod_catalogo_fabbr_ass") or "").strip()
            if not c or ";" in c:
                continue
            payloads.append(pl)
        if not payloads:
            continue
        total_rows += len(payloads)

        if ns.dry_run:
            print(f"[dry-run] batch {batch_idx}: {len(payloads)} righe", flush=True)
            if batch_idx == 1:
                print(json.dumps(payloads[0], ensure_ascii=False, indent=2), flush=True)
            continue

        rpc_send_maybe_split_pg_timeout(
            base,
            key,
            payloads,
            max_attempts=max(1, ns.max_retries),
            batch_label=str(batch_idx),
        )

    if ns.dry_run:
        print(f"[dry-run] righe sinteticamente mandate: {total_rows}", flush=True)
        return

    print(f"Fine: {total_rows} righe in {batch_idx} batch.", flush=True)


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, OSError):
        pass
    main(sys.argv[1:])
