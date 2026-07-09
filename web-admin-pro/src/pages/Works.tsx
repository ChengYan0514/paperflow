import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Link, useSearchParams } from '@umijs/max';
import { useEffect, useState } from 'react';
import type { Page, WorkListItem } from '@/services/business';
import { listWorks } from '@/services/business';
import {
  fieldLabel,
  OriginalFileLink,
  QueryBar,
  QueryState,
  StatusTag,
  tablePagination,
  valueLabel,
} from './businessUtils';

const primaryField = { name: 'title', placeholder: '按论文标题检索' };
const advancedFields = [
  { name: 'workId' },
  { name: 'doi' },
  { name: 'sourceId' },
  { name: 'sourceName' },
  { name: 'authorName' },
  { name: 'yearRange', type: 'yearRange' as const },
  {
    name: 'processingStatus',
    type: 'select' as const,
    options: [
      'NO_MATCHED_FILE',
      'MATCHED',
      'PARSING',
      'PARSE_FAILED',
      'UNSUPPORTED_TEXT_INPUT',
      'PARSED',
      'BLOCK_FAILED',
      'READY',
    ].map((value) => ({ label: valueLabel(value), value })),
  },
];
const sortOptions = [
  'publicationYearDesc',
  'publicationYearAsc',
  'titleAsc',
  'workIdAsc',
  'statusIssueFirst',
  'statusReadyFirst',
].map((value) => ({ label: valueLabel(value), value }));

export default function WorksPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<Page<WorkListItem>>();
  const [error, setError] = useState<unknown>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listWorks(searchParams)
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [searchParams]);

  return (
    <PageContainer title="论文列表">
      <QueryBar
        primaryField={primaryField}
        advancedFields={advancedFields}
        sortOptions={sortOptions}
        searchParams={searchParams}
        setSearchParams={setSearchParams}
      />
      <QueryState loading={loading} error={error} data={data}>
        {(page) => (
          <ProTable<WorkListItem>
            dataSource={page.items}
            rowKey="workId"
            search={false}
            toolBarRender={false}
            pagination={tablePagination(page, searchParams, setSearchParams)}
            scroll={{ x: 1380 }}
            columns={[
              {
                title: fieldLabel('workId'),
                dataIndex: 'workId',
                width: 180,
                ellipsis: true,
                render: (_, work) => <Link to={`/works/${work.workId}`}>{work.workId}</Link>,
              },
              { title: fieldLabel('title'), dataIndex: 'title', width: 300, ellipsis: true },
              { title: fieldLabel('doi'), dataIndex: 'doi', width: 180, ellipsis: true },
              {
                title: fieldLabel('publicationYear'),
                dataIndex: 'publicationYear',
                width: 100,
              },
              {
                title: fieldLabel('sourceIds'),
                dataIndex: 'sourceIds',
                width: 180,
                ellipsis: true,
                render: (_, work) => work.sourceIds.join(', '),
              },
              {
                title: fieldLabel('processingStatus'),
                dataIndex: 'processingStatus',
                width: 150,
                render: (_, work) => <StatusTag value={work.processingStatus} />,
              },
              {
                title: fieldLabel('matchedFileId'),
                dataIndex: 'matchedFileId',
                width: 180,
                ellipsis: true,
                render: (_, work) =>
                  work.matchedFileId ? <OriginalFileLink fileId={work.matchedFileId} /> : '-',
              },
              {
                title: fieldLabel('flagMatch'),
                dataIndex: 'flagMatch',
                width: 130,
                render: (_, work) => <StatusTag kind="flagMatch" value={work.flagMatch} />,
              },
              {
                title: fieldLabel('flagText'),
                dataIndex: 'flagText',
                width: 150,
                render: (_, work) => <StatusTag kind="flagText" value={work.flagText} />,
              },
              {
                title: fieldLabel('flagBlock'),
                dataIndex: 'flagBlock',
                width: 150,
                render: (_, work) => <StatusTag kind="flagBlock" value={work.flagBlock} />,
              },
            ]}
          />
        )}
      </QueryState>
    </PageContainer>
  );
}
