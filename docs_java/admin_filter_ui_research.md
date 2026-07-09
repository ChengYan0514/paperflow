# 管理端检索栏 UI 研究和改版方案

日期：2026-07-09

## 范围

本方案只覆盖四个页面的检索栏和排序控件：

- 工作台
- 来源期刊列表
- 论文列表
- 原始文件列表

本轮先不改代码。本文用于后续实现对齐。

## 参考产品和可借鉴模式

### Carbon Data Table

Carbon 的数据表把搜索、过滤、表格设置等全局操作放在 table toolbar 中。搜索有两种模式：默认可折叠，也可以一直展开；展开搜索位于表格标题下方左侧，并延展到右侧操作区之前。它还强调过滤后显示 filter labels，并提供 Clear all filters。

可借鉴点：

- 查询栏应该像表格工具条，而不是一张厚重表单卡片。
- 常用检索保持一行显示；更多条件用展开区承载。
- 已生效条件需要变成可删除的标签，便于快速看懂当前列表状态。

来源：https://carbondesignsystem.com/components/data-table/usage/

### PatternFly Toolbar

PatternFly 明确把 toolbar 作为承载 filters 和 buttons 的容器。过滤启用后，toolbar 会扩展出一行 filter labels 和 Clear all filters。空间不足时，toolbar 可以拆成多行，并支持响应式折叠。

可借鉴点：

- 查询控件应分组：搜索词、状态/布尔筛选、排序、动作。
- 二级筛选不必全部挤在首行。
- 过滤标签行比“查询结果来自哪些条件”更直观。

来源：https://www.patternfly.org/components/toolbar/

### Shopify Polaris IndexFilters

Polaris 的 IndexFilters 把 search、filter、sort、applied filters 和 saved views 统一到列表上方。它的过滤不是把所有字段平铺出来，而是保留主搜索框和少量快捷 filter，其余通过 Add filter/popover 选择；已应用条件会显示为可移除标签。

可借鉴点：

- 主搜索框优先，能覆盖最常用定位任务。
- 低频字段不应常驻占空间。
- 排序应是独立且稳定的位置，不混在普通字段里。

来源：https://polaris.shopify.com/components/selection-and-input/index-filters

### Ant Design Table / DatePicker

Ant Design Table 的定位包含 sort、search、paginate、filter data。DatePicker 支持 RangePicker、年份 picker、预设范围和 allowClear。当前项目已经使用 Ant Design / ProComponents，继续使用它们是最低成本方案。

可借鉴点：

- 不引入新 UI 依赖。
- 年份范围用一个范围选择控件表达，而不是两个平行输入框。
- 表格排序如果是后端白名单排序，先用 toolbar 中的 sort select；后续再考虑表头排序。

来源：

- https://ant.design/components/table/
- https://ant.design/components/date-picker/

### MUI X Date Range Picker

MUI 的 DateRangePicker 使用一个范围字段表达起止时间，也支持 desktop/mobile 响应式变体、多输入字段和快捷项。对年份范围而言，一个范围控件比两个孤立输入更符合成熟产品习惯。

可借鉴点：

- 范围输入要被用户看成一个条件。
- 可以用 `YYYY - YYYY` 的紧凑展示。
- 未来如果要加快捷项，可加“近 5 年 / 近 10 年 / 全部”。

来源：https://mui.com/x/react-date-pickers/date-range-picker/

## 字段调整

按当前业务习惯删掉低频字段：

- 工作台删除 `stage`。
- 论文列表删除 `type`、`language`、`matchedFileId`。
- 原始文件列表删除 `fileId`。

保留字段建议：

### 工作台

- `sourceId`
- `sourceName`
- `provider`
- `sort`

### 来源期刊列表

- `sourceId`
- `sourceName`
- `provider`
- `hasOriginalFiles`
- `hasFailures`
- `sort`

### 论文列表

- `workId`
- `title`
- `doi`
- `sourceId`
- `sourceName`
- `authorName`
- `yearRange`，映射到 `yearFrom/yearTo`
- `processingStatus`
- `sort`

### 原始文件列表

- `sourceId`
- `sourceName`
- `provider`
- `matchedWorkId`
- `originalFileType`
- `yearRange`，映射到 `yearFrom/yearTo`
- `flagMatch`
- `flagText`
- `flagBlock`
- `sort`

## 推荐 UI 方案

采用“轻 toolbar + 高级筛选抽屉/展开行 + 条件标签”的方案。

### 首行结构

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ [主搜索输入：按页面变化 placeholder]      [排序 ▼] [筛选 ▼] [查询] [重置]     │
└──────────────────────────────────────────────────────────────────────────────┘
  条件标签：来源期刊名称: Nature  发表年份: 2020-2024  状态: 就绪  [清空]
```

首行只放：

- 主搜索输入
- 排序
- 筛选展开按钮
- 查询
- 重置

主搜索字段映射：

- 工作台：`sourceId/sourceName/provider` 仍保留独立字段，不做全文合并，避免后端接口变化；但 UI 上可以把三项作为快捷输入组。
- 来源期刊：默认展开 `sourceName`，`sourceId/provider` 放筛选区。
- 论文：主输入用 `title`，`workId/doi/authorName/sourceName` 放筛选区。
- 原始文件：主输入用 `sourceName` 或 `provider`。推荐 `sourceName`，因为用户通常按来源定位文件。

### 展开筛选区

```text
┌ 筛选条件 ────────────────────────────────────────────────────────────────────┐
│ 来源期刊 ID [      ] 来源期刊名称 [      ] 平台 [      ]                     │
│ 年份范围   [  起始年份  -  结束年份  ] 状态 [      ]                         │
└──────────────────────────────────────────────────────────────────────────────┘
```

规则：

- 默认收起，只在有已应用条件或用户点“筛选”时展开。
- 每行最多 3 个字段，移动端单列。
- `yearFrom/yearTo` 合并为一个“年份范围”控件。

### 已应用条件标签

```text
已筛选：发表年份 2020-2024 ×  解析状态 解析失败 ×  平台 OpenAlex ×  清空
```

规则：

- 只展示非空条件。
- 每个标签可单独删除。
- 有任何筛选条件时显示“清空”。
- 排序也可显示为标签，但建议放在排序控件自身显示，不放入标签行，避免噪声。

### 年份范围控件

推荐实现：

- 用 Ant Design `DatePicker.RangePicker`，`picker="year"`，展示格式 `YYYY`。
- URL 仍保持 `yearFrom` / `yearTo`，提交时从 range 拆分，初始化时再合并。
- 支持半开区间：只选起始年份或只选结束年份时，分别传 `yearFrom` 或 `yearTo`。

备选实现：

- 如果 `RangePicker picker="year"` 在当前 antd 版本交互不理想，则用 `InputNumber` 的 compact group，但外观上仍包装成一个“年份范围”字段，不再显示两个独立表单项。

## 视觉方向

当前问题不是颜色不够，而是结构过重。推荐保持 Ant Design Pro 的企业风格，但做得更像工具条：

- 外层用白色轻卡片，边框 `#E5E7EB`，背景不要大面积灰块。
- 首行高度控制在 48-56px。
- 字段间距 12-16px。
- 主搜索输入宽 320-420px，其他 select 160-200px。
- 高级区用浅分隔线，不用新的厚 Card。
- 按钮只保留一个主按钮“查询”，重置用普通/文本按钮。
- 条件标签用轻色 Tag，减少视觉噪音。

## 实现计划

1. 改造 `QueryBar`，支持：
   - `primaryField`
   - `advancedFields`
   - `yearRange` 字段类型
   - applied filter tags
   - collapse/expand
2. 调整四个页面字段配置：
   - 删除指定字段。
   - 把年份起止字段合并为 `yearRange`。
3. 保持 URL query 兼容：
   - `yearRange` 只存在于 UI 配置，不写入 URL。
   - URL 仍写 `yearFrom/yearTo`。
4. 更新测试：
   - 查询栏提交仍写 URL。
   - 重置清空 query。
   - 年份范围能拆分为 `yearFrom/yearTo`。

## 待确认问题

推荐方案把筛选区默认收起，只在有筛选条件或用户点击“筛选”时展开。这样页面更干净，也符合成熟管理平台的 toolbar 模式。

需要确认：你是否接受默认收起高级筛选？

