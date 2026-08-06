from __future__ import annotations

import argparse
import csv
import hashlib
from pathlib import Path
from typing import Any

import psycopg
import yaml


def load_config(config_path: Path) -> dict[str, Any]:
    with open(config_path, "r", encoding="utf-8") as f:
        cfg = yaml.safe_load(f)
    if not isinstance(cfg, dict):
        raise ValueError("config_db.yaml 内容必须是字典结构")
    return cfg


def resolve_path(base_dir: Path, value: str) -> Path:
    p = Path(value)
    if p.is_absolute():
        return p
    return (base_dir / p).resolve()


def clean_text(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    if text == "":
        return None
    return text


def parse_bool(value: Any) -> bool | None:
    text = clean_text(value)
    if text is None:
        return None
    low = text.lower()
    if low in {"true", "t", "1", "yes", "y"}:
        return True
    if low in {"false", "f", "0", "no", "n"}:
        return False
    return None


def parse_float(value: Any) -> float | None:
    text = clean_text(value)
    if text is None:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def export_failed_rows(
    failed_rows: list[dict[str, Any]],
    out_path: Path,
    fieldnames: list[str],
) -> None:
    with open(out_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        if failed_rows:
            writer.writerows(failed_rows)


def build_claim_hash(cause_value: str, effect_value: str) -> str:
    normalized = f"{cause_value.strip().lower()}||{effect_value.strip().lower()}"
    return hashlib.md5(normalized.encode("utf-8")).hexdigest()


def connect_db(db_cfg: dict[str, Any]):
    ssl_modes = db_cfg.get("ssl_modes", ["disable", "prefer", "require"])
    last_err = None

    for ssl_mode in ssl_modes:
        try:
            conn = psycopg.connect(
                host=db_cfg["host"],
                port=int(db_cfg["port"]),
                user=db_cfg["user"],
                password=db_cfg["password"],
                dbname=db_cfg["dbname"],
                connect_timeout=int(db_cfg.get("connect_timeout", 10)),
                sslmode=ssl_mode,
            )
            print(f"数据库连接成功 (sslmode={ssl_mode})")
            return conn
        except Exception as exc:
            last_err = exc
            print(f"sslmode={ssl_mode} 连接失败: {exc}")

    raise last_err


def ensure_target_tables(cur) -> None:
    cur.execute(
        """
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = current_schema()
          AND table_name IN ('claim_table', 'paper_claim_table')
        ORDER BY table_name;
        """
    )
    found_tables = {row[0] for row in cur.fetchall()}
    missing_tables = [name for name in ("claim_table", "paper_claim_table") if name not in found_tables]

    if missing_tables:
        raise RuntimeError(
            "数据库缺少必要表: " + ", ".join(missing_tables) + "。请先创建好表结构后再运行入库。"
        )


def insert_claims(cur, claim_records: dict[str, tuple[str, str]]) -> dict[str, int]:
    claim_rows = [
        (cause_standard, effect_standard, claim_hash)
        for claim_hash, (cause_standard, effect_standard) in claim_records.items()
    ]

    if claim_rows:
        cur.executemany(
            """
            INSERT INTO claim_table (cause_standard, effect_standard, claim_hash)
            VALUES (%s, %s, %s)
            ON CONFLICT (claim_hash)
            DO UPDATE SET
                cause_standard = EXCLUDED.cause_standard,
                effect_standard = EXCLUDED.effect_standard;
            """,
            claim_rows,
        )

    cur.execute(
        """
        SELECT claim_id, claim_hash
        FROM claim_table
        WHERE claim_hash = ANY(%s);
        """,
        (list(claim_records.keys()),),
    )

    result: dict[str, int] = {}
    for claim_id, claim_hash in cur.fetchall():
        result[str(claim_hash)] = int(claim_id)
    return result


def insert_paper_claims(cur, rows: list[dict[str, Any]], claim_hash_to_id: dict[str, int]) -> int:
    insert_rows: list[tuple[Any, ...]] = []

    for row in rows:
        claim_hash = row["claim_hash"]
        claim_id = claim_hash_to_id.get(claim_hash)
        if claim_id is None:
            continue

        insert_rows.append(
            (
                row["paper_id"],
                claim_id,
                row["sign_of_impact"],
                row["type_of_relationship"],
                row["claim"],
                row["cause"],
                row["cause_score"],
                row["effect"],
                row["effect_score"],
                row["evidence"],
                row["causal_inference_method"],
                row["evidence_method_other_description"],
                row["is_main_contribution"],
                row["level_of_tentativeness"],
                row["sources_of_exogenous_variation"],
                row["statistical_significance"],
            )
        )

    if not insert_rows:
        return 0

    cur.executemany(
        """
        INSERT INTO paper_claim_table (
            paper_id,
            claim_id,
            sign_of_impact,
            type_of_relationship,
            claim,
            cause,
            cause_score,
            effect,
            effect_score,
            evidence,
            causal_inference_method,
            evidence_method_other_description,
            is_main_contribution,
            level_of_tentativeness,
            sources_of_exogenous_variation,
            statistical_significance
        )
        VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        )
        ON CONFLICT (paper_id, cause, effect)
        DO UPDATE SET
            claim_id = EXCLUDED.claim_id,
            sign_of_impact = EXCLUDED.sign_of_impact,
            type_of_relationship = EXCLUDED.type_of_relationship,
            claim = EXCLUDED.claim,
            cause_score = EXCLUDED.cause_score,
            effect_score = EXCLUDED.effect_score,
            evidence = EXCLUDED.evidence,
            causal_inference_method = EXCLUDED.causal_inference_method,
            evidence_method_other_description = EXCLUDED.evidence_method_other_description,
            is_main_contribution = EXCLUDED.is_main_contribution,
            level_of_tentativeness = EXCLUDED.level_of_tentativeness,
            sources_of_exogenous_variation = EXCLUDED.sources_of_exogenous_variation,
            statistical_significance = EXCLUDED.statistical_significance;
        """,
        insert_rows,
    )
    return len(insert_rows)


def build_rows_from_csv(
    csv_path: Path,
    col_cfg: dict[str, str],
) -> tuple[
    dict[str, tuple[str, str]],
    list[dict[str, Any]],
    list[dict[str, Any]],
    list[str],
]:
    claim_records: dict[str, tuple[str, str]] = {}
    paper_rows: list[dict[str, Any]] = []
    failed_rows: list[dict[str, Any]] = []

    with open(csv_path, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        failed_fieldnames = list(reader.fieldnames or []) + ["error_reason"]

        for raw in reader:
            source_row = dict(raw)
            paper_id = clean_text(raw.get(col_cfg["paper_id"]))
            cause = clean_text(raw.get(col_cfg["cause"]))
            effect = clean_text(raw.get(col_cfg["effect"]))

            if paper_id is None or cause is None or effect is None:
                source_row["error_reason"] = "missing_required_field"
                failed_rows.append(source_row)
                continue

            claim = clean_text(raw.get(col_cfg["claim"]))
            if claim is None:
                claim = f"{cause} -> {effect}"

            claim_cause = clean_text(raw.get(col_cfg["claim_cause"])) or cause
            claim_effect = clean_text(raw.get(col_cfg["claim_effect"])) or effect

            claim_hash = build_claim_hash(claim_cause, claim_effect)
            claim_records[claim_hash] = (claim_cause, claim_effect)

            paper_rows.append(
                {
                    "paper_id": paper_id,
                    "claim_hash": claim_hash,
                    "sign_of_impact": clean_text(raw.get(col_cfg["sign_of_impact"])),
                    "type_of_relationship": clean_text(raw.get(col_cfg["type_of_relationship"])),
                    "claim": claim,
                    "cause": cause,
                    "cause_score": parse_float(raw.get(col_cfg["cause_score"])),
                    "effect": effect,
                    "effect_score": parse_float(raw.get(col_cfg["effect_score"])),
                    "evidence": clean_text(raw.get(col_cfg["evidence"])),
                    "causal_inference_method": clean_text(raw.get(col_cfg["causal_inference_method"])),
                    "evidence_method_other_description": clean_text(raw.get(col_cfg["evidence_method_other_description"])),
                    "is_main_contribution": parse_bool(raw.get(col_cfg["is_main_contribution"])),
                    "level_of_tentativeness": clean_text(raw.get(col_cfg["level_of_tentativeness"])),
                    "sources_of_exogenous_variation": clean_text(raw.get(col_cfg["sources_of_exogenous_variation"])),
                    "statistical_significance": clean_text(raw.get(col_cfg["statistical_significance"])),
                }
            )

            return claim_records, paper_rows, failed_rows, failed_fieldnames


def main() -> None:
    parser = argparse.ArgumentParser(description="将 LLM 解析 CSV 直接写入数据库")
    parser.add_argument("--config", default="config_db.yaml", help="配置文件路径")
    args = parser.parse_args()

    config_path = Path(args.config).resolve()
    cfg = load_config(config_path)
    base_dir = config_path.parent

    db_cfg = cfg["database"]
    data_cfg = cfg["data"]
    col_cfg = cfg["columns"]

    input_csv = resolve_path(base_dir, data_cfg["input_csv"])
    failed_csv = resolve_path(base_dir, data_cfg.get("failed_csv", "failed_rows.csv"))
    if not input_csv.exists():
        raise FileNotFoundError(f"找不到输入 CSV: {input_csv}")

    print(f"读取 CSV: {input_csv}")
    claim_records, paper_rows, failed_rows, failed_fieldnames = build_rows_from_csv(input_csv, col_cfg)

    export_failed_rows(failed_rows, failed_csv, failed_fieldnames)

    print(f"CSV 读取完成: 总行数={len(paper_rows) + len(failed_rows)}, 跳过行数={len(failed_rows)}")
    print(f"待写入 claim 去重后数量={len(claim_records)}, 待写入 paper_claim 数量={len(paper_rows)}")
    if failed_rows:
        print(f"失败行已导出: {failed_csv}")

    conn = connect_db(db_cfg)
    try:
        with conn.cursor() as cur:
            ensure_target_tables(cur)

            claim_hash_to_id = insert_claims(cur, claim_records)
            paper_count = insert_paper_claims(cur, paper_rows, claim_hash_to_id)

        conn.commit()
        print("写入完成")
        print(f"claim_table upsert 数量: {len(claim_records)}")
        print(f"paper_claim_table upsert 数量: {paper_count}")
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
