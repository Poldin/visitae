#!/usr/bin/env python3
"""
Importa / aggiorna il dump AIFA «confezioni fornitura» in SQLite locale.

- Chiave naturale: CODICE_AIC (tutti i codici sono TEXT per non perdere gli zeri).
- Righe non più presenti nell'export corrente: assente_da_export=1;
  marcato_assente_il viene impostato solo alla prima assenza.
- Se un codice riappare, assente_da_export torna a 0 e marcato_assente_il a NULL.

Esempi:

  python scripts/import_confezioni_AIFA_aic.py ^
    --file "C:\\Users\\hp\\Downloads\\confezioni_fornitura.csv"

  python scripts/import_confezioni_AIFA_aic.py ^
    --file ./confezioni.csv ^
    --db ./data/confezioni_fornitura.sqlite
"""

from __future__ import annotations

import argparse
import csv
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path


CSV_COLUMNS = (
    "CODICE_AIC",
    "COD_FARMACO",
    "COD_CONFEZIONE",
    "DENOMINAZIONE",
    "DESCRIZIONE",
    "CODICE_DITTA",
    "RAGIONE_SOCIALE",
    "STATO_AMMINISTRATIVO",
    "TIPO_PROCEDURA",
    "FORMA",
    "CODICE_ATC",
    "PA_ASSOCIATI",
    "FORNITURA",
    "LINK_FI",
    "LINK_RCP",
)

DDL = """
CREATE TABLE IF NOT EXISTS confezioni_fornitura (
    codice_aic             TEXT PRIMARY KEY,
    cod_farmaco            TEXT NOT NULL,
    cod_confezione         TEXT NOT NULL,
    denominazione          TEXT,
    descrizione            TEXT,
    codice_ditta           TEXT,
    ragione_sociale        TEXT,
    stato_amministrativo   TEXT,
    tipo_procedura         TEXT,
    forma                  TEXT,
    codice_atc             TEXT,
    pa_associati           TEXT,
    fornitura              TEXT,
    link_fi                TEXT,
    link_rcp               TEXT,
    assente_da_export      INTEGER NOT NULL DEFAULT 0,
    marcato_assente_il     TEXT,
    ultimo_visto_il        TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_confezioni_assente ON confezioni_fornitura (assente_da_export);
CREATE INDEX IF NOT EXISTS idx_confezioni_cod_farmaco ON confezioni_fornitura (cod_farmaco);
"""


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _as_str(raw: object) -> str:
    if raw is None:
        return ""
    return str(raw).strip()


def ensure_schema(con: sqlite3.Connection) -> None:
    con.executescript(DDL)


def open_csv_try(path: Path):
    """Apre il file provando utf-8 (con BOM), utf-8, cp1252; ultima risorsa latin-1."""
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
INSERT INTO confezioni_fornitura (
    codice_aic,
    cod_farmaco,
    cod_confezione,
    denominazione,
    descrizione,
    codice_ditta,
    ragione_sociale,
    stato_amministrativo,
    tipo_procedura,
    forma,
    codice_atc,
    pa_associati,
    fornitura,
    link_fi,
    link_rcp,
    assente_da_export,
    marcato_assente_il,
    ultimo_visto_il
) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
ON CONFLICT(codice_aic) DO UPDATE SET
    cod_farmaco            = excluded.cod_farmaco,
    cod_confezione         = excluded.cod_confezione,
    denominazione          = excluded.denominazione,
    descrizione            = excluded.descrizione,
    codice_ditta           = excluded.codice_ditta,
    ragione_sociale        = excluded.ragione_sociale,
    stato_amministrativo   = excluded.stato_amministrativo,
    tipo_procedura         = excluded.tipo_procedura,
    forma                  = excluded.forma,
    codice_atc             = excluded.codice_atc,
    pa_associati           = excluded.pa_associati,
    fornitura              = excluded.fornitura,
    link_fi                = excluded.link_fi,
    link_rcp               = excluded.link_rcp,
    assente_da_export      = excluded.assente_da_export,
    marcato_assente_il     = excluded.marcato_assente_il,
    ultimo_visto_il        = excluded.ultimo_visto_il
"""


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
            n_data = sum(1 for _ in reader)
            print(f"[dry-run] encoding={enc_used} righe_dati={n_data} (nessuna scrittura DB)")
            return

        con = sqlite3.connect(db_path)
        try:
            ensure_schema(con)
            con.execute("BEGIN IMMEDIATE")

            con.execute("DROP TABLE IF EXISTS tmp_codici_correnti")
            con.execute(
                """
                CREATE TEMP TABLE tmp_codici_correnti (
                    codice_aic TEXT PRIMARY KEY
                )
                """
            )

            inserted_rows = upsert_batches = bad_rows = dup_rows = 0
            pending: list[tuple] = []
            seen_aic: set[str] = set()

            for row in reader:
                codice_aic = _as_str(row.get("CODICE_AIC", ""))
                if not codice_aic:
                    bad_rows += 1
                    continue
                if codice_aic in seen_aic:
                    dup_rows += 1
                    continue
                seen_aic.add(codice_aic)
                con.execute(
                    "INSERT INTO tmp_codici_correnti (codice_aic) VALUES (?)",
                    (codice_aic,),
                )

                pending.append(
                    (
                        codice_aic,
                        _as_str(row.get("COD_FARMACO")),
                        _as_str(row.get("COD_CONFEZIONE")),
                        _as_str(row.get("DENOMINAZIONE")),
                        _as_str(row.get("DESCRIZIONE")),
                        _as_str(row.get("CODICE_DITTA")),
                        _as_str(row.get("RAGIONE_SOCIALE")),
                        _as_str(row.get("STATO_AMMINISTRATIVO")),
                        _as_str(row.get("TIPO_PROCEDURA")),
                        _as_str(row.get("FORMA")),
                        _as_str(row.get("CODICE_ATC")),
                        _as_str(row.get("PA_ASSOCIATI")),
                        _as_str(row.get("FORNITURA")),
                        _as_str(row.get("LINK_FI")),
                        _as_str(row.get("LINK_RCP")),
                        0,
                        None,
                        iso,
                    )
                )

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
                UPDATE confezioni_fornitura
                SET
                    assente_da_export = 1,
                    marcato_assente_il = COALESCE(marcato_assente_il, ?)
                WHERE codice_aic NOT IN (SELECT codice_aic FROM tmp_codici_correnti)
                  AND COALESCE(assente_da_export, 0) = 0
                """,
                (iso,),
            )
            marked_new = cur_mark.rowcount

            con.commit()

            print(f"SQLite: {db_path}")
            print(f"Encoding CSV: {enc_used}")
            print(f"Upsert righe uniche elaborate: {inserted_rows}")
            print(f"Batches upsert: {upsert_batches}")
            print(f"Righe senza CODICE_AIC: {bad_rows}")
            print(f"Duplicati CODICE_AIC nel file (ignorati): {dup_rows}")
            print(f"Nuovi assenti dall'export (transizione 0->1): {marked_new}")

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
    default_db = root / "data" / "confezioni_fornitura.sqlite"

    p.add_argument(
        "--file",
        "-f",
        dest="csv_path",
        required=True,
        help="Percorso al CSV esportato (delimitatore ;).",
    )
    p.add_argument(
        "--db",
        "-d",
        type=Path,
        default=default_db,
        help=f"Percorso al file SQLite (default: {default_db})",
    )
    p.add_argument(
        "--batch-size",
        type=int,
        default=2500,
        help="Righe per batch executemany (default 2500).",
    )
    p.add_argument(
        "--dry-run",
        action="store_true",
        help="Solo conta le righe, non scrive sul database.",
    )
    ns = p.parse_args(argv)

    csv_path = Path(ns.csv_path).expanduser().resolve()
    db_path = Path(ns.db).expanduser()
    if not db_path.is_absolute():
        db_path = (Path.cwd() / db_path).resolve()

    try:
        run_import(
            csv_path,
            db_path,
            batch_size=ns.batch_size,
            dry_run=ns.dry_run,
        )
    except sqlite3.Error as e:
        raise SystemExit(f"Errore SQLite: {e}") from e


if __name__ == "__main__":
    main(sys.argv[1:])
