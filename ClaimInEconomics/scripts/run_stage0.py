from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path
from typing import Any, Dict, List

from common import (
    custom_id_parts,
    ensure_dir,
    extract_token_usage,
    get_message_content,
    get_openai_client,
    load_config,
    parse_json_content,
    read_text,
    resolve_path,
    write_jsonl,
)


def resolve_input_jsons(config_path: Path, input_json_path: str) -> List[Path]:
    raw = str(input_json_path).strip()
    if not raw:
        raise ValueError("stage0.input_json_path is required.")

    if any(token in raw for token in ["*", "?", "["]):
        base_dir = resolve_path(config_path, str(Path(raw).parent))
        pattern = Path(raw).name
        files = sorted(base_dir.glob(pattern))
    else:
        file_path = resolve_path(config_path, raw)
        files = [file_path] if file_path.exists() else []

    if not files:
        raise FileNotFoundError(f"No Stage 0 input JSON files found for: {raw}")
    return files


def format_block_set(blocks: List[Dict[str, Any]]) -> str:
    return json.dumps(blocks, ensure_ascii=False, indent=2)


def build_requests(config_path: Path) -> tuple[Dict[str, Any], List[Dict[str, Any]], Path]:
    cfg = load_config(config_path)
    stg = cfg["stage0"]
    model_type = cfg["pipeline"]["stage0"]["model_type"]
    model_cfg = cfg["models"][model_type]

    output_dir = resolve_path(config_path, stg["output_dir"])
    ensure_dir(output_dir)

    json_files = resolve_input_jsons(config_path, stg["input_json_path"])
    system_prompt = read_text(resolve_path(config_path, stg["system_prompt_file"]))
    with resolve_path(config_path, stg["response_schema_file"]).open("r", encoding="utf-8") as f:
        schema = json.load(f)

    iters = int(stg.get("iterations", 1))
    requests: List[Dict[str, Any]] = []

    for json_path in json_files:
        with json_path.open("r", encoding="utf-8") as f:
            source = json.load(f)
        if not isinstance(source, dict):
            raise ValueError(f"Stage 0 input must be a JSON object: {json_path}")

        paper_title = str(source.get("paper_title", "")).strip()
        block_set = source.get("block_set", [])
        if not isinstance(block_set, list):
            raise ValueError(f"'block_set' must be a list in {json_path}")

        block_set_text = format_block_set(block_set)
        for i in range(1, iters + 1):
            custom_id = f"{json_path.stem}__s0_i{i}"
            user_prompt = (
                stg["user_prompt_template"]
                .replace("{{paper_title}}", paper_title)
                .replace("{{block_set}}", block_set_text)
            )
            body = {
                "model": model_cfg["model"],
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": float(stg.get("temperature", 0.0)),
                "max_tokens": int(stg.get("max_tokens", 4096)),
                "response_format": schema,
            }
            requests.append(
                {
                    "custom_id": custom_id,
                    "method": "POST",
                    "url": "/v1/chat/completions",
                    "body": body,
                    "metadata": {
                        "source_json_file": str(json_path),
                        "paper_title": paper_title,
                        "block_count": len(block_set),
                    },
                }
            )
    return cfg, requests, output_dir


def retrieve_batch_results(client: Any, batch_id: str) -> List[Dict[str, Any]]:
    print(f"[STAGE0] Waiting for batch {batch_id} to complete...")
    while True:
        batch = client.batches.retrieve(batch_id)
        print(f"[STAGE0] Batch status: {batch.status}")

        if batch.status == "completed":
            break
        if batch.status in ["failed", "cancelled", "expired"]:
            raise RuntimeError(f"Batch failed with status: {batch.status}")
        time.sleep(10)

    if not batch.output_file_id:
        return []

    output_file = client.files.content(batch.output_file_id)
    output_text = output_file.text
    results: List[Dict[str, Any]] = []
    for line in output_text.strip().split("\n"):
        if line.strip():
            results.append(json.loads(line))
    return results


def run(
    config_path: str | Path,
    execute: bool = True,
    max_requests: int | None = None,
    use_batch: bool = False,
    batch_size: int = 100,
) -> Path:
    """Pipeline entry for Stage 0.

    Returns the generated stage0_outputs.jsonl path.
    """
    config_path = Path(config_path).resolve()

    cfg, requests, output_dir = build_requests(config_path)

    if max_requests is not None:
        requests = requests[: max(0, max_requests)]

    req_path = output_dir / "stage0_requests.jsonl"
    req_rows = [
        {
            "custom_id": req["custom_id"],
            "method": req["method"],
            "url": req["url"],
            "body": req["body"],
        }
        for req in requests
    ]
    write_jsonl(req_path, req_rows)
    print(f"[STAGE0] Wrote request file: {req_path}")

    if not execute:
        return req_path

    client = get_openai_client(cfg,"chat")

    raw_rows = []
    norm_rows = []
    from concurrent.futures import ThreadPoolExecutor, as_completed
    from common import run_chat_request

    def process_request(req, idx):
        custom_id = req["custom_id"]
        meta = req.get("metadata", {})
        attempt = 0
        max_retries = 2

        while attempt <= max_retries:
            try:
                response = run_chat_request(client, req["body"])
                content = get_message_content(response)
                parsed = parse_json_content(content)
                if not isinstance(parsed, list):
                    raise ValueError("Stage 0 response must be a JSON array.")
                payload = parsed
                status = "ok"
                parse_error = ""
                token_usage = extract_token_usage(response)
                break
            except Exception as e:
                attempt += 1
                parse_error = str(e)[:200]
                if attempt > max_retries:
                    content = ""
                    payload = []
                    status = "error"
                    token_usage = None

        parts = custom_id_parts(custom_id)
        relevant_block_ids = [
            row.get("block_id") for row in payload
            if isinstance(row, dict) and row.get("relevant") is True
        ]

        return {
            "raw": {
                "custom_id": custom_id,
                "paper_id": parts["paper_id"],
                "stage0_iteration": parts["stage0_iteration"],
                "status": status,
                "parse_error": parse_error,
                "source_json_file": meta.get("source_json_file", ""),
                "response_content": content,
            },
            "norm": {
                "base_custom_id_stage_0": custom_id,
                "paper_id": parts["paper_id"],
                "stage0_iteration": parts["stage0_iteration"],
                "source_json_file": meta.get("source_json_file", ""),
                "paper_title": meta.get("paper_title", ""),
                "block_count": meta.get("block_count", 0),
                "screening_results": payload,
                "relevant_block_ids": relevant_block_ids,
                "relevant_block_count": len(relevant_block_ids),
            },
        }

    with ThreadPoolExecutor(max_workers=20) as executor:
        futures = [executor.submit(process_request, r, i) for i, r in enumerate(requests)]
        for future in as_completed(futures):
            result = future.result()
            raw_rows.append(result["raw"])
            norm_rows.append(result["norm"])

    raw_path = output_dir / "stage0_raw_responses.jsonl"
    out_path = output_dir / "stage0_outputs.jsonl"
    write_jsonl(raw_path, raw_rows)
    write_jsonl(out_path, norm_rows)
    print(f"[STAGE0] Wrote normalized outputs: {out_path}")
    return out_path


def main() -> int:
    ap = argparse.ArgumentParser(description="Stage 0 section screener runner.")
    ap.add_argument("--config", required=True, help="Path to YAML config.")
    ap.add_argument(
        "--execute",
        action="store_true",
        help="Call the API directly. Without this flag, only request JSONL is generated.",
    )
    ap.add_argument(
        "--max-requests",
        type=int,
        default=None,
        help="Optional cap on number of requests (for smoke tests).",
    )
    ap.add_argument(
        "--use-batch",
        action="store_true",
        help="Use Batch API instead of parallel requests.",
    )
    ap.add_argument(
        "--batch-size",
        type=int,
        default=100,
        help="Maximum requests per batch (default: 100). Set to -1 for no limit.",
    )
    args = ap.parse_args()

    config_path = Path(args.config).resolve()
    try:
        cfg, requests, output_dir = build_requests(config_path)
    except Exception as e:
        print(f"[STAGE0] Failed to build requests: {e}", file=sys.stderr)
        return 1

    if args.max_requests is not None:
        requests = requests[: max(0, args.max_requests)]

    req_path = output_dir / "stage0_requests.jsonl"
    req_rows = [
        {
            "custom_id": req["custom_id"],
            "method": req["method"],
            "url": req["url"],
            "body": req["body"],
        }
        for req in requests
    ]
    write_jsonl(req_path, req_rows)
    print(f"[STAGE0] Wrote request file: {req_path}")

    if not args.execute:
        print("[STAGE0] Dry mode complete. Use --execute to call the API.")
        return 0

    try:
        client = get_openai_client(cfg)
    except Exception as e:
        print(f"[STAGE0] {e}", file=sys.stderr)
        return 1

    raw_rows: List[Dict[str, Any]] = []
    norm_rows: List[Dict[str, Any]] = []

    request_meta = {req["custom_id"]: req.get("metadata", {}) for req in requests}

    from concurrent.futures import ThreadPoolExecutor, as_completed

    from common import run_chat_request

    def process_request(req: Dict[str, Any], client: Any, idx: int) -> Dict[str, Any]:
        custom_id = req["custom_id"]
        meta = req.get("metadata", {})

        print(f"[STAGE0] Executing {idx}/{len(requests)}: {custom_id}")

        max_retries = 2  # 👉 额外重试次数（总共=1+2=3次）
        attempt = 0

        while attempt <= max_retries:
            try:
                response = run_chat_request(client, req["body"])
                content = get_message_content(response)
                parsed = parse_json_content(content)

                if not isinstance(parsed, list):
                    raise ValueError("Stage 0 response must be a JSON array.")

                payload = parsed
                status = "ok"
                parse_error = ""
                token_usage = extract_token_usage(response)

                # 👉 成功直接 break
                break

            except Exception as e:
                attempt += 1
                parse_error = str(e)[:200]  # 防止过长
                print(f"[STAGE0] ⚠️ Attempt {attempt} failed: {custom_id} | {parse_error}")

                if attempt > max_retries:
                    # 👉 最终失败
                    content = ""
                    payload = []
                    status = "error"
                    token_usage = None
                else:
                    # 👉 继续重试
                    continue

        parts = custom_id_parts(custom_id)

        relevant_block_ids = [
            row.get("block_id")
            for row in payload
            if isinstance(row, dict) and row.get("relevant") is True
        ]

        result = {
            "raw": {
                "custom_id": custom_id,
                "paper_id": parts["paper_id"],
                "stage0_iteration": parts["stage0_iteration"],
                "status": status,
                "parse_error": parse_error,
                "source_json_file": meta.get("source_json_file", ""),
                "response_content": content,
            },
            "norm": {
                "base_custom_id_stage_0": custom_id,
                "paper_id": parts["paper_id"],
                "stage0_iteration": parts["stage0_iteration"],
                "source_json_file": meta.get("source_json_file", ""),
                "paper_title": meta.get("paper_title", ""),
                "block_count": meta.get("block_count", 0),
                "screening_results": payload,
                "relevant_block_ids": relevant_block_ids,
                "relevant_block_count": len(relevant_block_ids),
            },
        }

        if token_usage:
            result["raw"]["token_usage"] = token_usage
            print(
                "[STAGE0] Token usage: "
                f"{token_usage['total_tokens']} total "
                f"({token_usage['prompt_tokens']} prompt + "
                f"{token_usage['completion_tokens']} completion)"
            )

        return result

    total_tokens = 0
    # 将原来的 max_workers=10 增加到
    with ThreadPoolExecutor(max_workers=20) as executor:
        futures = {
            executor.submit(process_request, req, client, idx): idx
            for idx, req in enumerate(requests, start=1)
        }
        for idx, future in enumerate(as_completed(futures), start=1):
            result = future.result()
            raw_rows.append(result["raw"])
            norm_rows.append(result["norm"])
            if "token_usage" in result["raw"]:
                total_tokens += result["raw"]["token_usage"]["total_tokens"]
            print(f"[STAGE0] Completed {idx}/{len(requests)}")
    print(f"[STAGE0] Total token usage: {total_tokens} tokens")

    raw_path = output_dir / "stage0_raw_responses.jsonl"
    out_path = output_dir / "stage0_outputs.jsonl"
    write_jsonl(raw_path, raw_rows)
    write_jsonl(out_path, norm_rows)
    print(f"[STAGE0] Wrote raw responses: {raw_path}")
    print(f"[STAGE0] Wrote normalized outputs: {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())