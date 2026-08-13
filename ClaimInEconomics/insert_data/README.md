# insert_data 新流程

`insert_data` 现在使用单脚本流程：

1. `pipeline_db.py`
2. `config_db.yaml`

目标是把 LLM 解析后的 CSV 直接写入数据库，不做枚举校验，不做标准值映射。

## 配置

编辑 `config_db.yaml`：

- `database`: 数据库连接参数
- `data.input_csv`: 你的输入 CSV 路径（默认 `../llm/final_claims.csv`）
- `data.failed_csv`: 失败行导出路径（默认 `failed_rows.csv`）
- `columns`: CSV 列名映射

说明：

- 这个流程不会创建表，也不会删除表。
- 运行前请先把 `claim_table` 和 `paper_claim_table` 建好。

## 执行

在 `insert_data` 目录下运行：

先安装依赖：

```bash
pip install psycopg pyyaml
```

```bash
python pipeline_db.py --config config_db.yaml
```

## 入库逻辑

- 从 CSV 读取每一行。
- 仅做最小清洗：去空格、空字符串转空值、布尔/数值的基础解析。
- 如果某行缺少必须字段，会跳过这行，并把原始数据连同 `error_reason` 导出到失败 CSV。
- `claim_table`：按 `claim_hash` 去重后 upsert。
- `paper_claim_table`：按 `UNIQUE (paper_id, cause, effect)` upsert。
- 不做合法值校验，不做 `sign_of_impact` / `relationship` / `method` 等字段映射。

## 切换数据源

如果你想用 `../llm/mapped_results.csv`，只需要改：

- `data.input_csv`
- 必要时调整 `columns` 映射（例如 `cause_score`、`effect_score`）
