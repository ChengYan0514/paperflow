import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Link, useSearchParams } from '@umijs/max';
import { Alert, Space, Typography } from 'antd';
import { useEffect, useState } from 'react';
import type { OriginalFile, Page } from '@/services/business';
import { listPapers } from '@/services/business';
import {
  fieldLabel,
  QueryBar,
  QueryState,
  SourceLink,
  StatusTag,
  tablePagination,
  valueLabel,
} from './businessUtils';

type FailureStage = 'MATCHING' | 'TEXT_PARSING' | 'BLOCK_IMPORT';

const primaryField = { name: 'sourceName', placeholder: '按来源期刊名称检索' };
const advancedFields = [
  { name: 'sourceId' },
  {
    name: 'stage',
    type: 'select' as const,
    options: ['MATCHING', 'TEXT_PARSING', 'BLOCK_IMPORT'].map((value) => ({
      label: valueLabel(value),
      value,
    })),
  },
];
const sortOptions = ['sourceIdAsc', 'yearDesc', 'textStatusIssueFirst'].map((value) => ({
  label: valueLabel(value),
  value,
}));

function stage(searchParams: URLSearchParams): FailureStage {
  const value = searchParams.get('stage');
  return value === 'MATCHING' || value === 'BLOCK_IMPORT' ? value : 'TEXT_PARSING';
}

function failureParams(searchParams: URLSearchParams) {
  const next = new URLSearchParams(searchParams);
  const currentStage = stage(searchParams);
  next.delete('stage');
  next.delete('flagMatch');
  next.delete('flagText');
  next.delete('flagBlock');
  if (!next.has('sort')) {
    next.set('sort', 'textStatusIssueFirst');
  }
  if (currentStage === 'MATCHING') {
    next.set('flagMatch', '-1');
  } else if (currentStage === 'BLOCK_IMPORT') {
    next.set('flagText', '2');
    next.set('flagBlock', '-1');
  } else {
    next.set('flagText', '-1');
  }
  return next;
}

function command(currentStage: FailureStage, file: OriginalFile) {
  if (currentStage === 'MATCHING') {
    return `uv run paperflow match --source-id ${file.sourceId}`;
  }
  if (currentStage === 'BLOCK_IMPORT') {
    return `uv run paperflow import-blocks --file-id ${file.fileId} --retry-failed`;
  }
  return `uv run paperflow parse-text --file-id ${file.fileId} --retry-failed`;
}

function stageDescription(currentStage: FailureStage) {
  if (currentStage === 'MATCHING') {
    return '论文匹配失败：论文全文文件未能匹配到 Work。';
  }
  if (currentStage === 'BLOCK_IMPORT') {
    return '全文入库失败：文件已解析，但内容块未成功入库。';
  }
  return '文件解析失败：论文全文文件文本解析未成功。';
}

export default function FailureTasksPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<Page<OriginalFile>>();
  const [error, setError] = useState<unknown>();
  const [loading, setLoading] = useState(true);
  const currentStage = stage(searchParams);

  useEffect(() => {
    setLoading(true);
    listPapers(failureParams(searchParams))
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [searchParams]);

  return (
    <PageContainer title="失败任务">
      <Alert
        message={stageDescription(currentStage)}
        description="当前管理台只读，不触发 Python pipeline；请复制命令到运维环境执行。"
        showIcon
        style={{ marginBottom: 16 }}
        type="warning"
      />
      <QueryBar
        primaryField={primaryField}
        advancedFields={advancedFields}
        sortOptions={sortOptions}
        searchParams={searchParams}
        setSearchParams={setSearchParams}
      />
      <QueryState loading={loading} error={error} data={data}>
        {(page) => (
          <ProTable<OriginalFile>
            dataSource={page.items}
            rowKey="fileId"
            search={false}
            toolBarRender={false}
            pagination={tablePagination(page, searchParams, setSearchParams)}
            scroll={{ x: 1180 }}
            columns={[
              {
                title: fieldLabel('fileId'),
                dataIndex: 'fileId',
                width: 130,
                render: (_, file) => <Link to={`/papers/${file.fileId}`}>{file.fileId}</Link>,
              },
              { title: fieldLabel('originalFileName'), dataIndex: 'originalFileName', width: 180 },
              {
                title: fieldLabel('sourceId'),
                dataIndex: 'sourceId',
                width: 130,
                render: (_, file) => <SourceLink sourceId={file.sourceId} />,
              },
              {
                title: fieldLabel('flagMatch'),
                dataIndex: 'flagMatch',
                width: 110,
                render: (_, file) => <StatusTag kind="flagMatch" value={file.flagMatch} />,
              },
              {
                title: fieldLabel('flagText'),
                dataIndex: 'flagText',
                width: 120,
                render: (_, file) => <StatusTag kind="flagText" value={file.flagText} />,
              },
              {
                title: fieldLabel('flagBlock'),
                dataIndex: 'flagBlock',
                width: 120,
                render: (_, file) => <StatusTag kind="flagBlock" value={file.flagBlock} />,
              },
              {
                title: '建议命令',
                width: 360,
                render: (_, file) => (
                  <Typography.Text copyable={{ text: command(currentStage, file) }} code>
                    {command(currentStage, file)}
                  </Typography.Text>
                ),
              },
              {
                title: '上下文',
                width: 180,
                render: (_, file) => (
                  <Space>
                    <Link to={`/papers/${file.fileId}`}>论文详情</Link>
                  </Space>
                ),
              },
            ]}
          />
        )}
      </QueryState>
    </PageContainer>
  );
}
