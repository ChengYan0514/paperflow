import { Alert, Button, Descriptions, Progress, Space, Table, Typography, Upload, message } from 'antd';
import { useState } from 'react';
import type { UploadFile } from 'antd/es/upload/interface';
import { confirmImportBatch, completeImportBatch, createImportBatch, getImportBatch, importErrorsUrl, listImportItems, uploadImportPart, type ImportBatch, type ImportItem } from '@/services/originalFileImport';

const PART_SIZE = 32 * 1024 * 1024;

type OriginalFileImportContentProps = {
  onComplete?: () => void;
};

export function OriginalFileImportContent({ onComplete }: OriginalFileImportContentProps) {
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
      if (current.status === 'SUCCESS') {
        message.success('批次导入完成');
        onComplete?.();
      } else if (current.status === 'PARTIAL_SUCCESS') {
        message.warning('批次导入完成，但存在失败行');
        onComplete?.();
      } else {
        message.error(current.errorSummary || '批次导入失败');
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : '导入失败');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Typography.Paragraph>
        上传不超过 5GB 的 ZIP 文件。系统只接受下面约定的目录和文件类型。
      </Typography.Paragraph>
      <Alert
        type="info"
        showIcon
        message="ZIP 目录结构（必须按此放置）"
        description={
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <Typography.Text>
              ZIP 内只能有一个 CSV，路径必须是{' '}
              <Typography.Text code>openalex/csv/...</Typography.Text>；论文文件必须放在{' '}
              <Typography.Text code>openalex/original/...</Typography.Text> 下。
            </Typography.Text>
            <pre
              style={{
                background: '#f6f8fa',
                border: '1px solid #e5e7eb',
                borderRadius: 4,
                margin: 0,
                overflowX: 'auto',
                padding: 12,
              }}
            >{`论文导入.zip
+-- openalex/
    |-- csv/
    |   +-- papers.csv
    +-- original/
        +-- S123/
            +-- 0b25942be034bdccafd3bd2a7d70487650c584a9eb76a94f0f410daed7723141.pdf`}</pre>
            <Typography.Text>
              CSV 中的{' '}
              <Typography.Text code>file_path</Typography.Text> 必须与 ZIP 内的实际路径完全一致；例如：{' '}
              <Typography.Text code>openalex/original/S123/0b25942be034bdccafd3bd2a7d70487650c584a9eb76a94f0f410daed7723141.pdf</Typography.Text>。
            </Typography.Text>
            <Typography.Text>
              其中路径中的{' '}
              <Typography.Text code>S123</Typography.Text> 必须与该行的{' '}
              <Typography.Text code>source_id</Typography.Text> 相同，文件名必须与{' '}
              <Typography.Text code>file_name</Typography.Text> 相同。
            </Typography.Text>
          </Space>
        }
      />
      <Alert
        type="warning"
        showIcon
        message="CSV 表头和路径示例"
        description={
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <Typography.Text>
              支持字段：source_id、year、paper_title、authors、doi、url、provider、file_name、file_path、file_type、file_size。
            </Typography.Text>
            <Typography.Text>
              必填字段：source_id、year、paper_title、authors、file_name、file_path。
            </Typography.Text>
            <pre
            style={{
              background: '#fffbe6',
              border: '1px solid #ffe58f',
              borderRadius: 4,
              margin: 0,
              overflowX: 'auto',
              padding: 12,
              whiteSpace: 'pre-wrap',
            }}
            >{`source_id,year,paper_title,authors,file_name,file_path
S123,2024,Example Title,Author One;Author Two,0b25942be034bdccafd3bd2a7d70487650c584a9eb76a94f0f410daed7723141.pdf,openalex/original/S123/0b25942be034bdccafd3bd2a7d70487650c584a9eb76a94f0f410daed7723141.pdf`}</pre>
          </Space>
        }
      />
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
  );
}

export default function OriginalFileImportPage() {
  return <OriginalFileImportContent />;
}
