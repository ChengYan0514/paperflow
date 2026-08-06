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
    get_message_content,
    get_openai_client,
    load_config,
    parse_json_content,
    read_text,
    resolve_path,
    write_jsonl,
)

#将论文txt变为api请求
def build_requests(config_path: Path) -> tuple[Dict[str, Any], List[Dict[str, Any]], Path]:
    cfg = load_config(config_path)
    stg = cfg["stage1"]
    model_type = cfg["pipeline"]["stage1"]["model_type"]
    model_cfg = cfg["models"][model_type]

    input_dir_raw = stg.get("input_dir")
    if not input_dir_raw:
        input_dir_raw = cfg.get("io", {}).get("input_dir")
    if not input_dir_raw:
        raise KeyError("stage1.input_dir is required")

    input_dir = resolve_path(config_path, input_dir_raw)
    output_dir = resolve_path(config_path, stg["output_dir"])
    ensure_dir(output_dir)

    file_glob = stg.get("file_glob", "*.txt")
    if any(token in file_glob for token in ["*", "?", "["]):
        files = sorted(input_dir.glob(file_glob))
    else:
        files = sorted(input_dir.glob(f"{file_glob}"))
    if not files:
        raise FileNotFoundError(f"No input files found in {input_dir} matching {file_glob}")

    system_prompt = read_text(resolve_path(config_path, stg["system_prompt_file"]))
    with resolve_path(config_path, stg["response_schema_file"]).open("r", encoding="utf-8") as f:
        schema = json.load(f)

    iters = int(stg.get("iterations", 1))
    requests: List[Dict[str, Any]] = []
    for file_path in files:
        paper_text = read_text(file_path)
        #清洗输入文本
        paper_text = paper_text.encode("utf-8", "ignore").decode()
        for i in range(1, iters + 1):
            custom_id = f"{file_path.stem}__s1_i{i}"
            user_prompt = stg["user_prompt_template"].replace("<<PAPER_TEXT_EXTRACT>>", paper_text)
            body = {
                "model": model_cfg["model"],
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": float(stg.get("temperature", 0.0)),
                "max_tokens": int(stg.get("max_tokens", 4096)),
                "response_format": {"type": "json_object", "schema": schema},
            }
            requests.append(
                {
                    "custom_id": custom_id,
                    "method": "POST",
                    "url": "/v1/chat/completions",
                    "body": body,
                }
            )
    return cfg, requests, output_dir


def submit_batch_requests(client: Any, requests: List[Dict[str, Any]], output_dir: Path) -> str:
    """使用 Batch API 提交多个请求，返回 batch_id"""
    print(f"[STAGE1] Submitting {len(requests)} requests via Batch API...")
    
    # 将 requests 写入临时文件（Batch API 需要文件格式）
    batch_input_file = output_dir / "batch_input.jsonl"
    with batch_input_file.open("w", encoding="utf-8") as f:
        for req in requests:
            # Batch API 需要的格式：custom_id, method, url, body
            batch_line = {
                "custom_id": req["custom_id"],
                "method": req["method"],
                "url": req["url"],
                "body": req["body"],
            }
            f.write(json.dumps(batch_line, ensure_ascii=False) + "\n")
    
    # 上传文件到 OpenAI
    with batch_input_file.open("rb") as f:
        uploaded_file = client.files.create(file=f, purpose="batch")
    
    # 创建 batch
    batch = client.batches.create(
        input_file_id=uploaded_file.id,
        endpoint="/v1/chat/completions",
        completion_window="24h"
    )
    
    print(f"[STAGE1] Batch created: {batch.id}, status: {batch.status}")
    return batch.id


def retrieve_batch_results(client: Any, batch_id: str, output_dir: Path) -> List[Dict[str, Any]]:
    """检索 Batch API 的结果"""
    print(f"[STAGE1] Waiting for batch {batch_id} to complete...")
    
    # 轮询检查 batch 状态
    while True:
        batch = client.batches.retrieve(batch_id)
        print(f"[STAGE1] Batch status: {batch.status}")
        
        if batch.status == "completed":
            print(f"[STAGE1] Batch completed successfully!")
            break
        elif batch.status in ["failed", "cancelled"]:
            raise RuntimeError(f"Batch failed with status: {batch.status}")
        else:
            # 等待 10 秒后再次检查
            time.sleep(10)
    
    # 获取结果文件
    if batch.output_file_id:
        output_file = client.files.content(batch.output_file_id)
        output_text = output_file.text
        
        # 解析结果
        results = []
        for line in output_text.strip().split("\n"):
            if line.strip():
                results.append(json.loads(line))
        
        return results
    
    return []
def run(config_path, execute=True, max_requests=None):
    config_path = Path(config_path).resolve()

    try:
        _, requests, output_dir = build_requests(config_path)
    except Exception as e:
        raise RuntimeError(f"[STAGE1] Failed to build requests: {e}")

    if max_requests is not None:
        requests = requests[:max_requests]

    req_path = output_dir / "stage1_requests.jsonl"
    write_jsonl(req_path, requests)
    print(f"[STAGE1] Wrote request file: {req_path}")

    if not execute:
        print("[STAGE1] Dry mode complete.")
        return output_dir

    try:
        cfg = load_config(config_path)
        client = get_openai_client(cfg,"chat")
    except Exception as e:
        raise RuntimeError(f"[STAGE1] {e}")

    from concurrent.futures import ThreadPoolExecutor, as_completed
    from common import run_chat_request

    def process_request(req, client, idx):
        cid = req["custom_id"]

        def call_once():
            response = run_chat_request(client, req["body"])
            content = get_message_content(response)
            content = content.encode("utf-8", "ignore").decode()
            payload = parse_json_content(content)

            token_usage = None
            if hasattr(response, "usage") and response.usage:
                token_usage = {
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens,
                }

            return payload, content, token_usage

        print(f"[STAGE1] Executing {idx}/{len(requests)}: {cid}")

        attempt = 0
        max_retries = 2

        while True:
            try:
                payload, content, token_usage = call_once()
                status = "ok"
                parse_error = ""
                break
            except Exception as e:
                err = str(e)
                parse_error = err[:200]

                if "maximum context length" in err.lower():
                    payload = {}
                    content = ""
                    status = "error_context_length"
                    token_usage = None
                    break

                attempt += 1
                print(f"[STAGE1] Attempt {attempt} failed: {cid} | {parse_error}")

                if attempt > max_retries:
                    payload = {}
                    content = ""
                    status = "error"
                    token_usage = None
                    break

        parts = custom_id_parts(cid)

        result = {
            "raw": {
                "custom_id": cid,
                "paper_id": parts["paper_id"],
                "stage1_iteration": parts["stage1_iteration"],
                "status": status,
                "parse_error": parse_error,
                "response_content": content,
            },
            "norm": {
                "base_custom_id_stage_1": cid,
                "paper_id": parts["paper_id"],
                "stage1_iteration": parts["stage1_iteration"],
                "edges": payload.get("edges", []),
            },
        }

        if token_usage:
            result["raw"]["token_usage"] = token_usage
            print(f"[STAGE1] Token usage: {token_usage['total_tokens']}")

        return result

    raw_rows = []
    norm_rows = []
    total_tokens = 0

    print("[STAGE1] Starting parallel execution with 20 workers...")

    with ThreadPoolExecutor(max_workers=20) as executor:
        futures = {executor.submit(process_request, req, client, idx): idx for idx, req in enumerate(requests, start=1)}

        for idx, future in enumerate(as_completed(futures), start=1):
            result = future.result()
            raw_rows.append(result["raw"])
            norm_rows.append(result["norm"])

            if "token_usage" in result["raw"]:
                total_tokens += result["raw"]["token_usage"]["total_tokens"]

            print(f"[STAGE1] Completed {idx}/{len(requests)}")

    print(f"[STAGE1] Total token usage: {total_tokens} tokens")

    raw_path = output_dir / "stage1_raw_responses.jsonl"
    out_path = output_dir / "stage1_outputs.jsonl"

    write_jsonl(raw_path, raw_rows)
    write_jsonl(out_path, norm_rows)

    print(f"[STAGE1] Wrote raw responses: {raw_path}")
    print(f"[STAGE1] Wrote normalized outputs: {out_path}")

    return output_dir

def main() -> int:

    ap = argparse.ArgumentParser(
        description="Stage 1 extraction runner."
    )


    ap.add_argument(
        "--config",
        required=True,
        help="Path to YAML config."
    )


    ap.add_argument(
        "--execute",
        action="store_true",
        help="Call API directly."
    )


    ap.add_argument(
        "--max-requests",
        type=int,
        default=None
    )


    args = ap.parse_args()


    try:

        output_dir = run(
            args.config,
            execute=args.execute,
            max_requests=args.max_requests
        )


        print(
            f"[STAGE1] Finished: {output_dir}"
        )


    except Exception as e:

        print(
            f"[STAGE1] Failed: {e}",
            file=sys.stderr
        )

        return 1


    return 0

if __name__ == "__main__":
    raise SystemExit(main())