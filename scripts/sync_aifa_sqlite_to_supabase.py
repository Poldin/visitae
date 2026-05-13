#!/usr/bin/env python3
"""
Legge dal SQLite locale (`confezioni_fornitura`) prodotto da import_confezioni_AIFA_aic.py
e chiama la RPC Supabase `sync_master_catalog_aifa_farmaci_batch` a batch da max 1000 righe.

Variabili d'ambiente (come import-rdm-json.mjs):

  NEXT_PUBLIC_SUPABASE_URL  oppure SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY  oppure SUPABASE_SECRET_KEY

Esempi:

  set SUPABASE_SECRET_KEY=...
  python scripts/sync_aifa_sqlite_to_supabase.py --sqlite-db data/confezioni_fornitura.sqlite

  python scripts/sync_aifa_sqlite_to_supabase.py -d ./data/foo.sqlite --only-present-in-export --limit 3000 --dry-run

Durante la sync vera stampa una riga dopo ogni batch RPC; uso `flush=True` per vedere il log subito anche
su terminali non-TTY.

Se esiste `.env.local` nella root del repo, le variabili vengono caricate automaticamente (senza
sovrascrivere env già impostata nel processo).
"""

from __future__ import annotations

import argparse
import json
import os
import sqlite3
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Iterable

RPC_NAME = "sync_master_catalog_aifa_farmaci_batch"
DEFAULT_BATCH = 1000


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
    """Chiavi KEY=VALUE; non sovrascrive variabili già presenti in os.environ."""
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
    return Path(__file__).resolve().parents[1] / "data" / "confezioni_fornitura.sqlite"


def row_to_rpc_payload(row: sqlite3.Row) -> dict[str, Any]:
    d = dict(row)
    cod_farmaco = str(d["cod_farmaco"] or "")
    cod_confezione = str(d["cod_confezione"] or "")
    sku = f"{cod_farmaco}|{cod_confezione}" if cod_farmaco or cod_confezione else None

    metadata_patch = {
        "aifa_confezioni": {
            "cod_farmaco": cod_farmaco or None,
            "cod_confezione": cod_confezione or None,
            "codice_ditta": str(d["codice_ditta"] or "") or None,
            "stato_amministrativo": d.get("stato_amministrativo") or None,
            "tipo_procedura": d.get("tipo_procedura") or None,
            "forma": d.get("forma") or None,
            "codice_atc": d.get("codice_atc") or None,
            "pa_associati": d.get("pa_associati") or None,
            "fornitura": d.get("fornitura") or None,
            "link_fi": d.get("link_fi") or None,
            "link_rcp": d.get("link_rcp") or None,
        },
        "assente_da_export": bool(d.get("assente_da_export")),
        "marcato_assente_il": d.get("marcato_assente_il") or None,
        "ultimo_visto_sqlite_il": d.get("ultimo_visto_il") or None,
    }

    ragione = str(d.get("ragione_sociale") or "").strip()

    return {
        "aic_code": str(d["codice_aic"] or "").strip(),
        "name": str(d.get("denominazione") or "").strip() or None,
        "sku": sku,
        "default_description": str(d.get("descrizione") or "").strip() or None,
        "manufacturer_full_legal_name": ragione or None,
        "metadata_patch": metadata_patch,
    }


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
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            raw = resp.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        raise SystemExit(f"HTTP {e.code} da Supabase RPC: {err_body}") from e

    if not raw:
        return {}
    data = json.loads(raw)
    if isinstance(data, list) and len(data) == 1 and isinstance(data[0], dict):
        return data[0]
    if isinstance(data, dict):
        return data
    return {"raw": data}


def iter_sqlite_rows(
    db_path: Path,
    *,
    only_present: bool,
    limit: int | None,
) -> Iterable[sqlite3.Row]:
    con = sqlite3.connect(db_path)
    con.row_factory = sqlite3.Row
    try:
        q = "SELECT * FROM confezioni_fornitura"
        if only_present:
            q += " WHERE COALESCE(assente_da_export, 0) = 0"
        q += " ORDER BY codice_aic ASC"
        if limit is not None:
            q += f" LIMIT {int(limit)}"
        cur = con.execute(q)
        yield from cur
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
        help=f"SQLite da import AIFA (default: {default_sqlite_path()})",
    )
    p.add_argument(
        "--batch",
        type=int,
        default=DEFAULT_BATCH,
        help=f"Righe per chiamata RPC (max {DEFAULT_BATCH} lato server). Default {DEFAULT_BATCH}.",
    )
    p.add_argument(
        "--only-present-in-export",
        action="store_true",
        help="Solo righe con assente_da_export = 0 nello SQLite.",
    )
    p.add_argument("--limit", type=int, default=None, help="Ferma dopo N righe SQLite (test).")
    p.add_argument(
        "--dry-run",
        action="store_true",
        help="Solo conta batch e primo payload di esempio, niente chiamate HTTP.",
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
            f"Nota: batch richiesto > {DEFAULT_BATCH}, uso {DEFAULT_BATCH} (limite RPC).",
            file=sys.stderr,
            flush=True,
        )
    base = env_base_url()
    key = env_service_key()
    if not ns.dry_run and (not base or not key):
        raise SystemExit(
            "Servono NEXT_PUBLIC_SUPABASE_URL (o SUPABASE_URL) e "
            "SUPABASE_SERVICE_ROLE_KEY (o SUPABASE_SECRET_KEY)."
        )

    rows_iter = iter_sqlite_rows(
        sqlite_path,
        only_present=ns.only_present_in_export,
        limit=ns.limit,
    )

    total_rows = 0
    batch_idx = 0
    for batch in chunked(rows_iter, bs):
        batch_idx += 1
        payloads = []
        for row in batch:
            pl = row_to_rpc_payload(row)
            if not pl.get("aic_code"):
                continue
            payloads.append(pl)
        if not payloads:
            continue
        total_rows += len(payloads)

        if ns.dry_run:
            print(f"[dry-run] batch {batch_idx}: {len(payloads)} righe", flush=True)
            if batch_idx == 1 and payloads:
                print(json.dumps(payloads[0], ensure_ascii=False, indent=2), flush=True)
            continue

        result = call_rpc(base, key, payloads)
        if result.get("error"):
            raise SystemExit(f"RPC errore: {result}")
        print(
            f"batch {batch_idx}: master_catalog {result.get('master_catalog_upsert_rows')} "
            f"manufacturers {result.get('manufacturers_upsert_rows')}",
            flush=True,
        )

    if ns.dry_run:
        print(f"[dry-run] totale righe valide elaborate (conta): {total_rows}", flush=True)
        return

    print(f"Fine: {total_rows} righe mandate in {batch_idx} batch.", flush=True)


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, OSError):
        pass
    main(sys.argv[1:])
