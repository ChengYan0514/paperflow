import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Link, useSearchParams } from '@umijs/max';
import { useEffect, useState } from 'react';
import type { OriginalFile, Page } from '@/services/business';
import { listOriginalFiles } from '@/services/business';
import {
  bytes,
  fieldLabel,
  QueryBar,
  QueryState,
  SourceLink,
  StatusTag,
  tablePagination,
  valueLabel,
  WorkLink,
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
    options: [-1, 0, 1].map((value) => ({ label: valueLabel(value), value })),
  },
  {
    name: 'flagText',
    type: 'select' as const,
    options: [-2, -1, 0, 1, 2].map((value) => ({ label: valueLabel(value), value })),
  },
  {
    name: 'flagBlock',
    type: 'select' as const,
    options: [-1, 0, 1].map((value) => ({ label: valueLabel(value), value })),
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
    <PageContainer title="原始文件列表">
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
            scroll={{ x: 1420 }}
            columns={[
              {
                title: fieldLabel('fileId'),
                dataIndex: 'fileId',
                width: 180,
                ellipsis: true,
                render: (_, file) => (
                  <Link to={`/original-files/${file.fileId}`}>{file.fileId}</Link>
                ),
              },
              {
                title: fieldLabel('sourceId'),
                dataIndex: 'sourceId',
                width: 160,
                ellipsis: true,
                render: (_, file) => <SourceLink sourceId={file.sourceId} />,
              },
              {
                title: fieldLabel('originalFileType'),
                dataIndex: 'originalFileType',
                width: 120,
                render: (_, file) => <StatusTag value={file.originalFileType} />,
              },
              {
                title: fieldLabel('originalFileName'),
                dataIndex: 'originalFileName',
                width: 260,
                ellipsis: true,
              },
              {
                title: fieldLabel('fileSize'),
                dataIndex: 'fileSize',
                width: 120,
                render: (_, file) => bytes(file.fileSize),
              },
              {
                title: fieldLabel('matchedWorkId'),
                dataIndex: 'matchedWorkId',
                width: 180,
                ellipsis: true,
                render: (_, file) =>
                  file.matchedWorkId ? <WorkLink workId={file.matchedWorkId} /> : '-',
              },
              {
                title: fieldLabel('flagMatch'),
                dataIndex: 'flagMatch',
                width: 130,
                render: (_, file) => <StatusTag kind="flagMatch" value={file.flagMatch} />,
              },
              {
                title: fieldLabel('flagText'),
                dataIndex: 'flagText',
                width: 150,
                render: (_, file) => <StatusTag kind="flagText" value={file.flagText} />,
              },
              {
                title: fieldLabel('flagBlock'),
                dataIndex: 'flagBlock',
                width: 150,
                render: (_, file) => <StatusTag kind="flagBlock" value={file.flagBlock} />,
              },
              { title: fieldLabel('provider'), dataIndex: 'provider', width: 140, ellipsis: true },
              { title: fieldLabel('year'), dataIndex: 'year', width: 80 },
            ]}
          />
        )}
      </QueryState>
    </PageContainer>
  );
}
