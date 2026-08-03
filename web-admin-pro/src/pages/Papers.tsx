import { DownloadOutlined } from '@ant-design/icons';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Link, useSearchParams } from '@umijs/max';
import { Button } from 'antd';
import { useEffect, useState } from 'react';
import type { OriginalFile, Page } from '@/services/business';
import { listPapers, papersExportUrl } from '@/services/business';
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
  const [error, setError] = useState<unknown>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listPapers(searchParams)
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [searchParams]);

  return (
    <PageContainer title="论文管理">
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
              {
                title: fieldLabel('workSourceNames'),
                dataIndex: 'sourceName',
                width: 180,
                render: (_, file) => (
                  <SourceLink sourceId={file.sourceId} sourceName={file.sourceName} showId={false} />
                ),
              },
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
