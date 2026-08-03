import { DownloadOutlined } from '@ant-design/icons';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Link, useSearchParams } from '@umijs/max';
import { Button } from 'antd';
import { useEffect, useState } from 'react';
import type { OriginalFile, Page } from '@/services/business';
import { listOriginalFiles, originalFilesExportUrl } from '@/services/business';
import {
  bytes,
  fieldLabel,
  flagLabels,
  QueryBar,
  QueryState,
  SourceLink,
  StatusTag,
  tablePagination,
  valueLabel,
} from './businessUtils';

const primaryField = { name: 'sourceName', placeholder: '按来源期刊名称检索' };
const advancedFields = [
  { name: 'sourceId' },
  { name: 'provider' },
  { name: 'matchedWorkId' },
  {
    name: 'originalFileType',
    type: 'select' as const,
    options: ['PDF', 'XML', 'HTML'].map((value) => ({ label: value, value })),
  },
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
const sortOptions = ['sourceIdAsc', 'yearDesc', 'fileSizeAsc', 'providerAsc', 'textStatusIssueFirst'].map(
  (value) => ({ label: valueLabel(value), value }),
);

export default function OriginalFilesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<Page<OriginalFile>>();
  const [error, setError] = useState<unknown>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listOriginalFiles(searchParams)
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [searchParams]);

  return (
    <PageContainer title="论文全文文件列表">
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
                href={originalFilesExportUrl(searchParams)}
                icon={<DownloadOutlined />}
                key="export"
              >
                导出 CSV
              </Button>,
            ]}
            pagination={tablePagination(page, searchParams, setSearchParams)}
            scroll={{ x: 1080 }}
            columns={[
              {
                title: fieldLabel('title'),
                dataIndex: 'paperTitle',
                width: 210,
                render: (_, file) => (
                  <Link to={`/original-files/${file.fileId}`}>
                    {file.paperTitle || file.originalFileName}
                  </Link>
                ),
              },
              {
                title: fieldLabel('workSourceNames'),
                dataIndex: 'sourceName',
                width: 180,
                render: (_, file) => (
                  <SourceLink sourceId={file.sourceId} sourceName={file.sourceName} showId={false} />
                ),
              },
              {
                title: fieldLabel('originalFileType'),
                dataIndex: 'originalFileType',
                width: 100,
                render: (_, file) => <StatusTag value={file.originalFileType} />,
              },
              {
                title: fieldLabel('fileSize'),
                dataIndex: 'fileSize',
                width: 100,
                render: (_, file) => bytes(file.fileSize),
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
              { title: fieldLabel('provider'), dataIndex: 'provider', width: 100 },
              { title: fieldLabel('year'), dataIndex: 'year', width: 80 },
            ]}
          />
        )}
      </QueryState>
    </PageContainer>
  );
}
