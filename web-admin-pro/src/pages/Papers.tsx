import { DownloadOutlined } from '@ant-design/icons';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Link, useSearchParams } from '@umijs/max';
import { Button, Space, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';
import type { OriginalFile, Page, SourceSummary } from '@/services/business';
import { getSource, listPapers, papersExportUrl } from '@/services/business';
import {
  fieldLabel,
  flagLabels,
  QueryBar,
  QueryState,
  SourceLink,
  StatusTag,
  tablePagination,
  valueLabel,
} from './businessUtils';

const primaryField = { name: 'q', placeholder: '按标题、作者、DOI 或文件 ID 检索' };
const advancedFields = [
  { name: 'sourceId' },
  { name: 'sourceName' },
  { name: 'provider' },
  { name: 'yearRange', type: 'yearRange' as const },
  {
    name: 'flagMatch',
    type: 'select' as const,
    options: [-1, 0, 1].map((value) => ({ label: flagLabels.flagMatch[value], value })),
  },
  {
    name: 'flagText',
    type: 'select' as const,
    options: [-2, -1, 0, 1, 2].map((value) => ({ label: flagLabels.flagText[value], value })),
  },
  {
    name: 'flagBlock',
    type: 'select' as const,
    options: [-1, 0, 1].map((value) => ({ label: flagLabels.flagBlock[value], value })),
  },
];
const sortOptions = ['yearDesc', 'providerAsc', 'textStatusIssueFirst'].map(
  (value) => ({ label: valueLabel(value), value }),
);

export default function PapersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<Page<OriginalFile>>();
  const [source, setSource] = useState<SourceSummary>();
  const [error, setError] = useState<unknown>();
  const [loading, setLoading] = useState(true);
  const sourceId = searchParams.get('sourceId')?.trim() || undefined;

  useEffect(() => {
    setLoading(true);
    listPapers(searchParams)
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [searchParams]);

  useEffect(() => {
    setSource(undefined);
    if (!sourceId) {
      return;
    }
    getSource(sourceId).then(setSource).catch(() => undefined);
  }, [sourceId]);

  const clearSourceScope = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('sourceId');
    next.delete('page');
    setSearchParams(next);
  };
  const sourceTitle = source?.sourceName || sourceId;

  return (
    <PageContainer title={sourceTitle ? `${sourceTitle} 的论文` : '论文管理'}>
      {sourceId ? (
        <div
          style={{
            alignItems: 'center',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            justifyContent: 'space-between',
            marginBottom: 16,
            paddingBottom: 12,
          }}
        >
          <Space wrap size={[8, 8]}>
            <Typography.Text type="secondary">当前范围</Typography.Text>
            <Tag color="blue">来源期刊</Tag>
            <Typography.Text>{sourceTitle}</Typography.Text>
            <Typography.Text type="secondary">{sourceId}</Typography.Text>
            {source?.provider ? <Typography.Text type="secondary">{source.provider}</Typography.Text> : null}
          </Space>
          <Space>
            <Button href={`/sources/${encodeURIComponent(sourceId)}`}>返回来源详情</Button>
            <Button onClick={clearSourceScope}>清除期刊筛选</Button>
          </Space>
        </div>
      ) : null}
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
            toolBarRender={() => [
              <Button
                href={papersExportUrl(searchParams)}
                icon={<DownloadOutlined />}
                key="export"
              >
                导出 CSV
              </Button>,
            ]}
            pagination={tablePagination(page, searchParams, setSearchParams)}
            scroll={{ x: 980 }}
            columns={[
              {
                title: fieldLabel('title'),
                dataIndex: 'paperTitle',
                width: 210,
                render: (_, file) => (
                  <Link to={`/papers/${file.fileId}`}>
                    {file.paperTitle || file.originalFileName}
                  </Link>
                ),
              },
              { title: fieldLabel('authors'), dataIndex: 'authors', width: 180, ellipsis: true },
              ...(sourceId
                ? []
                : [{
                    title: fieldLabel('workSourceNames'),
                    dataIndex: 'sourceName',
                    width: 180,
                    render: (_: unknown, file: OriginalFile) => (
                      <SourceLink sourceId={file.sourceId} sourceName={file.sourceName} showId={false} />
                    ),
                  }]),
              { title: fieldLabel('year'), dataIndex: 'year', width: 80 },
              { title: fieldLabel('provider'), dataIndex: 'provider', width: 100 },
              {
                title: fieldLabel('flagText'),
                dataIndex: 'flagText',
                width: 120,
                render: (_, file) => <StatusTag kind="flagText" value={file.flagText} />,
              },
            ]}
          />
        )}
      </QueryState>
    </PageContainer>
  );
}
