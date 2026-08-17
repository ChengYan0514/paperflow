import { PageContainer } from '@ant-design/pro-components';
import { Alert, Button, Card, Descriptions, Progress, Space, Table, Typography, Upload, message } from 'antd';
import { useState } from 'react';
import type { UploadFile } from 'antd/es/upload/interface';
import { confirmImportBatch, completeImportBatch, createImportBatch, getImportBatch, importErrorsUrl, listImportItems, uploadImportPart, type ImportBatch, type ImportItem } from '@/services/originalFileImport';

const PART_SIZE = 32 * 1024 * 1024;

export default function OriginalFileImportPage() {
  const [file, setFile] = useState<File>();
  const [batch, setBatch] = useState<ImportBatch>();
  const [items, setItems] = useState<ImportItem[]>([]);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);

  async function upload() {
    if (!file) return;
    setBusy(true);
    try {
      const created = await createImportBatch(file.name);
      setBatch(created);
      const count = Math.ceil(file.size / PART_SIZE);
      for (let index = 0; index < count; index += 1) {
        await uploadImportPart(created.batchId, index, file.slice(index * PART_SIZE, Math.min(file.size, (index + 1) * PART_SIZE)));
        setProgress(Math.round(((index + 1) / count) * 90));
      }
      let checked = await completeImportBatch(created.batchId);
      while (checked.status === 'VALIDATING') {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        checked = await getImportBatch(created.batchId);
        setBatch(checked);
      }
      setBatch(checked);
      setProgress(100);
      const result = await listImportItems(created.batchId);
      setItems(result.items);
      message.success('ZIP 预检完成');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '上传或预检失败');
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!batch) return;
    setBusy(true);
    try {
      const started = await confirmImportBatch(batch.batchId);
      setBatch(started);
      let current = started;
      while (current.status === 'IMPORTING') {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        current = await getImportBatch(batch.batchId);
        setBatch(current);
        const result = await listImportItems(batch.batchId);
        setItems(result.items);
      }
      message.success('批次导入完成');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '导入失败');
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageContainer title="批量导入全文">
      <Card>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Typography.Paragraph>上传 ZIP（最大 5GB），内含一个 UTF-8 CSV 和按 CSV file_path 放置的全文文件。</Typography.Paragraph>
          <Upload beforeUpload={(next: UploadFile) => { setFile(next as unknown as File); return false; }} maxCount={1} accept=".zip" showUploadList>
            <Button disabled={busy}>选择 ZIP</Button>
          </Upload>
          <Space>
            <Button type="primary" onClick={upload} loading={busy} disabled={!file || Boolean(batch)}>上传并预检</Button>
            <Button onClick={() => { const csv = 'source_id,year,paper_title,authors,doi,url,provider,file_name,file_path,file_type,file_size\nS123,2024,Example Title,"Author One;Author Two",10.1234/example,,,0b25942be034bdccafd3bd2a7d70487650c584a9eb76a94f0f410daed7723141,openalex/original/S123/0b25942be034bdccafd3bd2a7d70487650c584a9eb76a94f0f410daed7723141.pdf,,\n'; const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'original-file-import-template.csv'; link.click(); URL.revokeObjectURL(url); }}>下载 CSV 模板</Button>
          </Space>
          {progress > 0 && progress < 100 && <Progress percent={progress} />}
          {batch && <Descriptions bordered size="small" column={2} items={[{ key: 'status', label: '状态', children: batch.status }, { key: 'rows', label: '行数', children: `${batch.totalRows}（可导入 ${batch.validRows}）` }, { key: 'result', label: '结果', children: `成功 ${batch.successRows}，跳过 ${batch.skippedRows}，失败 ${batch.failedRows}` }, { key: 'sha', label: 'SHA-256', children: batch.uploadSha256 || '-' }]} />}
          {batch?.status === 'READY' && <Button type="primary" onClick={confirm} loading={busy}>确认导入</Button>}
          {batch && batch.failedRows > 0 && <Alert type="warning" message="存在失败行" description={<a href={importErrorsUrl(batch.batchId)} target="_blank" rel="noreferrer">下载错误 CSV</a>} />}
          <Table rowKey="rowNumber" size="small" dataSource={items} pagination={false} columns={[{ title: '行号', dataIndex: 'rowNumber' }, { title: 'file_id', dataIndex: 'fileId' }, { title: '路径', dataIndex: 'filePath' }, { title: '状态', dataIndex: 'status' }, { title: '错误', dataIndex: 'errorMessage' }]} />
        </Space>
      </Card>
    </PageContainer>
  );
}
