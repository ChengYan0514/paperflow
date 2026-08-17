# 批量导入全文

管理端批量导入使用 ZIP + CSV。ZIP 内必须包含一个 `openalex/csv/*.csv` 和 CSV 引用的
`openalex/original/{source_id}/{file_name}.{extension}` 文件。CSV 使用 UTF-8（可带 BOM）和标准逗号格式。

流程为：创建批次、上传 32MB 分片、完成合并、预检、管理员确认、异步逐行导入。ZIP 上限默认
5GB，解压后上限默认 10GB，文件数默认 10,000。`file_size` 和 `file_type` 以服务端实际检测为准，
CSV 中的值只产生不一致警告。

批次结果保存在 `original_file_import_batch` 和 `original_file_import_item`。导入沿用
`original_file` 的 `file_id` 由 `source_id + year + paper_title + authors` 的规范化稳定 SHA-256 哈希生成；CSV 的无扩展名 `file_name` 必须等于该值，`file_path` 指向带扩展名的实际文件。同类型跳过，PDF/XML/HTML 按 PDF > XML > HTML 升级，
回收站中的记录不自动恢复。导入不会自动触发 Matching、Text Parsing 或 Block Import。
