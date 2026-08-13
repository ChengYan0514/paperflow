from __future__ import annotations

import argparse
import glob
import os
from pathlib import Path

import pandas as pd

from common import load_config, resolve_path

parser = argparse.ArgumentParser(description="Prepare stage1 input for deleted papers.")
parser.add_argument("--config", default="config.yaml", help="Path to YAML config.")
args = parser.parse_args()

config_path = Path(args.config).resolve()
cfg = load_config(config_path)
delete_cfg = cfg.get("deal_delete", {})

# ===== 路径 =====
input_dir = resolve_path(config_path, delete_cfg.get("input_dir", "dataset/raw_data"))
delete_file = resolve_path(
    config_path,
    delete_cfg.get("delete_file", "dataset/cleaned/delete/delete_no_title.csv"),
)
output_file = resolve_path(
    config_path,
    delete_cfg.get("output_csv", "llm/stage1_input/delete_no_title.csv"),
)
txt_output_dir = resolve_path(
    config_path,
    delete_cfg.get("txt_output_dir", "llm/stage1_input/delete_no_title"),
)

os.makedirs(txt_output_dir, exist_ok=True)

# ===== 读取 delete work_id =====
delete_df = pd.read_csv(delete_file)

if 'work_id' not in delete_df.columns:
    raise ValueError("delete文件中缺少 work_id 列")

# 类型统一（关键）
delete_df['work_id'] = delete_df['work_id'].astype(str)
delete_work_ids = set(delete_df['work_id'])

print(f"需要提取的 work_id 数量: {len(delete_work_ids)}")

# ===== 找 block_batch 文件 =====
files = glob.glob(os.path.join(input_dir, "block_batch*.csv"))
print(f"发现 {len(files)} 个 block_batch 文件")

all_results = []

# ===== 处理每个文件 =====
for file in files:
    print(f"\n处理文件: {file}")

    df = pd.read_csv(file)

    required_cols = ['work_id', 'block_type', 'block_seq', 'block_text', 'title_level']
    if not set(required_cols).issubset(df.columns):
        print(f"[跳过] 缺少必要字段: {file}")
        continue

    # ===== 类型统一 =====
    df['work_id'] = df['work_id'].astype(str)

    # ===== 筛选 work_id =====
    df = df[df['work_id'].isin(delete_work_ids)]
    print(f"匹配到行数: {len(df)}")

    if df.empty:
        continue

    # ===== 只保留 title / text =====
    df = df[df['block_type'].isin(['title', 'text'])]

    # ===== 排序 =====
    df['block_seq'] = pd.to_numeric(df['block_seq'], errors='coerce')
    df = df.sort_values(by=['work_id', 'block_seq']).reset_index(drop=True)

    # ===== 清洗字段 =====
    df['block_text'] = df['block_text'].fillna("")
    df['title_level'] = pd.to_numeric(df['title_level'], errors='coerce')

    # ==============================
    # 🚀 Step 2：删除 reference 后内容（保持你原始正则）
    # ==============================
    ref_mask = (
        df['title_level'].notna() &
        df['block_text'].str.strip().str.match(
            r'^(references|bibliography)$',
            case=False,
            na=False
        )
    )

    # 行编号
    df['row_id'] = df.groupby('work_id').cumcount()

    # 找每篇论文第一个 reference
    first_ref = (
        df[ref_mask]
        .groupby('work_id')['row_id']
        .min()
    )

    # 映射
    df['first_ref_row'] = df['work_id'].map(first_ref)

    # 过滤
    before_len = len(df)

    df = df[
        df['first_ref_row'].isna() |
        (df['row_id'] < df['first_ref_row'])
    ].copy()

    print(f"删除 reference 后行数: {before_len - len(df)}")

    # 删除辅助列
    df = df.drop(columns=['row_id', 'first_ref_row'])

    all_results.append(df)

# ===== 合并 =====
if not all_results:
    print("\n⚠️ 没有匹配到任何数据")
    exit()

final_df = pd.concat(all_results, ignore_index=True)

output_file.parent.mkdir(parents=True, exist_ok=True)
# 全局排序（非常重要）
final_df = final_df.sort_values(by=['work_id', 'block_seq'])

# ===== 保存 CSV =====
final_df.to_csv(output_file, index=False)
print(f"\nCSV 已保存: {output_file}")
print(f"总行数: {len(final_df)}")

# ==============================
# 🚀 生成 txt 文件
# ==============================
print("\n开始生成 txt 文件...")

for work_id, group in final_df.groupby('work_id'):

    group = group.sort_values(by='block_seq')

    # 拼接文本（去空行）
    text = "\n".join(
        group['block_text']
        .astype(str)
        .str.strip()
        .loc[lambda x: x != ""]
    )

    file_path = os.path.join(txt_output_dir, f"{work_id}.txt")

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(text)

print(f"txt 文件生成完成，共 {final_df['work_id'].nunique()} 个")
print(f"保存目录: {txt_output_dir}")

print("\n🎉 全部处理完成！")