# ClaimInEconomics
一个面向经济学论文因果关系（causal claims）抽取与整理的自动化处理流水线。

## 项目目标

本项目从经济学论文文本中自动识别、结构化和整理因果关系声明（causal claims），并将最终结果映射到数据库结构中，支持后续检索、分析和研究。

整体流程：
    Raw Paper Data (csv文件，见dataset\raw_data\block_batch_001_20works.csv)
          |
          v
    数据清洗与预处理
          |
          v
    Stage 0: LLM 初步识别候选 causal claims
          |
          v
    Stage 1: LLM 深度抽取和规范化 claim
          |
          v
    后处理与 embedding 映射
          |
          v
    PostgreSQL 数据库存储

## 项目结构

    ClaimInEconomics/
    |
    ├── config.yaml                 # 主流水线配置
    ├── pipeline.py                 # 一键运行完整流程
    |
    ├── dataset/
    │   ├── raw_data/               # 原始论文数据
    │   └── cleaned/                # 清洗后的数据
    |
    ├── llm/
    │   ├── stage0_input/            # Stage0 输入
    │   ├── stage0_output/           # Stage0 输出
    │   ├── stage1_input/            # Stage1 输入
    │   └── stage1_output/           # Stage1 输出
    |
    ├── prompts/
    │   ├── stage0_system.tex        # Stage0 prompt
    │   ├── stage1_system.tex        # Stage1 prompt
    │   └── stage1_user.tex
    |
    ├── schemas/
    │   ├── stage0_response_schema.json
    │   └── stage1_response_schema.json
    |
    ├── scripts/
    │   ├── deal_with.py             # 原始数据清洗
    │   ├── deal_delete.py           # 特殊缺失数据处理
    │   ├── stage0_1.py              # Stage0输入生成
    │   ├── run_stage0.py            # 调用LLM执行Stage0
    │   ├── stage0_2.py              # Stage1输入生成
    │   ├── run_stage1.py            # 调用LLM执行Stage1
    │   ├── stage0_34.py             # 后处理
    │   └── map.py                   # embedding映射
    |
    └── insert_data/
        ├── init_database.py         # 初始化数据库
        └── pipeline_db.py           # 导入数据库

## 核心运行逻辑

### 1. 数据准备

`scripts/deal_with.py`

负责：

-   读取原始论文数据
-   清理无效字段
-   生成标准化输入数据

输出：

    dataset/cleaned/

------------------------------------------------------------------------

### 2. Stage 0：候选 Claim 发现

输入：

    dataset/cleaned/*.csv

处理：

-   将论文 block 转换为 JSON
-   调用大语言模型
-   根据 schema 输出候选 causal claim

输出：

    llm/stage0_output/stage0_outputs.jsonl

------------------------------------------------------------------------

### 3. Stage 1：Claim 精细抽取

Stage1 使用 Stage0 结果定位论文文本片段，并进一步：

-   提取 cause
-   提取 effect
-   判断影响方向
-   生成标准化 causal claim

输出：

    llm/stage1_output/

------------------------------------------------------------------------

### 4. 后处理与映射

通过：

    stage0_34.py
    map.py

完成：

-   claim 清洗
-   标准化
-   embedding计算
-   相似 claim 映射

------------------------------------------------------------------------

### 5. 数据库存储

数据库模块负责：

-   创建 claim_table
-   创建 paper_claim_table
-   创建主题标签表
-   导入最终结果

数据库：

    PostgreSQL

------------------------------------------------------------------------

## 环境要求

-   Python \>= 3.10
-   PostgreSQL \>= 14
-   可访问 OpenAI-compatible API

## 安装

``` bash
pip install -r requirements.txt
```

## 配置

修改：

    config.yaml

主要配置：

-   LLM API 地址
-   API Key
-   模型名称
-   输入输出路径

建议不要直接保存 API Key，生产环境应使用环境变量。

## 运行完整 Pipeline

``` bash
python pipeline.py
```

Pipeline 顺序：

1.  数据清洗
2.  Stage0 输入生成
3.  Stage0 LLM调用
4.  Stage1 输入生成
5.  Stage1 LLM调用
6.  后处理
7.  embedding映射

## 数据库导入

进入：

    insert_data/

初始化：

``` bash
python init_database.py
```

导入：

``` bash
python pipeline_db.py
```

## 注意事项

-   LLM 调用会产生 API 费用。
-   Stage0 和 Stage1 输出依赖 prompt 与 schema 文件。
-   修改模型时优先修改 `config.yaml`。
-   数据量较大时建议分批运行。
