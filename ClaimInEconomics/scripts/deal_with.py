from __future__ import annotations

import argparse
import glob
import os
from pathlib import Path

import pandas as pd

from common import load_config, resolve_path


def run(input_dir, output_dir, delete_dir=None):
    """
    清洗原始csv:
    1. 删除没有title_level=0的论文
    2. 删除references之后内容

    return: output_dir
    """

    os.makedirs(output_dir, exist_ok=True)

    if delete_dir is None:
        delete_dir = os.path.join(output_dir, "delete")
    os.makedirs(delete_dir, exist_ok=True)

    files = glob.glob(os.path.join(input_dir, "*.csv"))

    print(f"发现 {len(files)} 个CSV文件")

    all_deleted_work_ids = set()

    def process_file(file_path):
        print(f"\n正在处理: {file_path}")

        df = pd.read_csv(file_path)

        required_cols = ['work_id', 'title_level', 'block_text']
        if not set(required_cols).issubset(df.columns):
            print(f"[SKIP] {file_path}")
            return

        if 'block_seq' not in df.columns:
            raise ValueError(f"{file_path} 缺少 block_seq")

        df['block_seq'] = pd.to_numeric(df['block_seq'], errors='coerce')
        df = df.sort_values(
            by=['work_id', 'block_seq']
        ).reset_index(drop=True)

        df['block_text'] = df['block_text'].fillna("")
        df['title_level'] = pd.to_numeric(
            df['title_level'],
            errors='coerce'
        )

        work_has_zero = (
            df.groupby('work_id')['title_level']
            .apply(lambda x: (x == 0).any())
        )

        valid_ids = set(work_has_zero[work_has_zero].index)
        invalid_ids = set(work_has_zero[~work_has_zero].index)

        all_deleted_work_ids.update(invalid_ids)

        df = df[df['work_id'].isin(valid_ids)].copy()

        ref_mask = (
            df['title_level'].notna()
            &
            df['block_text'].str.strip().str.match(
                r'^(references|bibliography)$',
                case=False,
                na=False
            )
        )

        df['row_id'] = df.groupby('work_id').cumcount()

        first_ref = (
            df[ref_mask]
            .groupby('work_id')['row_id']
            .min()
        )

        df['first_ref_row'] = df['work_id'].map(first_ref)

        df = df[
            df['first_ref_row'].isna()
            |
            (df['row_id'] < df['first_ref_row'])
        ].copy()

        df = df.drop(
            columns=['row_id', 'first_ref_row']
        )

        output_file = os.path.join(
            output_dir,
            os.path.basename(file_path)
        )

        df.to_csv(output_file, index=False)

        print(f"保存: {output_file}")

    for file in files:
        process_file(file)

    delete_file = os.path.join(
        delete_dir,
        "delete_no_title.csv"
    )

    pd.DataFrame(
        {"work_id": list(all_deleted_work_ids)}
    ).to_csv(delete_file, index=False)

    return output_dir


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Clean raw block CSV files.")
    parser.add_argument("--config", default="config.yaml", help="Path to YAML config.")
    args = parser.parse_args()

    config_path = Path(args.config).resolve()
    cfg = load_config(config_path)
    deal_cfg = cfg.get("deal_with", {})

    input_dir = resolve_path(config_path, deal_cfg.get("input_dir", "dataset/raw_data"))
    output_dir = resolve_path(config_path, deal_cfg.get("output_dir", "dataset/cleaned"))
    delete_dir = deal_cfg.get("delete_dir")
    if delete_dir is not None:
        delete_dir = resolve_path(config_path, delete_dir)

    run(
        input_dir=str(input_dir),
        output_dir=str(output_dir),
        delete_dir=str(delete_dir) if delete_dir is not None else None,
    )