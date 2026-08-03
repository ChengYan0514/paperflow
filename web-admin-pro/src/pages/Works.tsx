import { DownloadOutlined } from '@ant-design/icons';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Link, useSearchParams } from '@umijs/max';
import { Button, Space } from 'antd';
import { useEffect, useState } from 'react';
import type { Page, WorkListItem } from '@/services/business';
import { listWorks, worksExportUrl } from '@/services/business';
import {
  fieldLabel,
  QueryBar,
  QueryState,
  SourceLink,
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
            toolBarRender={() => [
              <Button href={worksExportUrl(searchParams)} icon={<DownloadOutlined />} key="export">
                导出 CSV
              </Button>,
            ]}
            pagination={tablePagination(page, searchParams, setSearchParams)}
            scroll={{ x: 1080 }}
            columns={[
              {
                title: fieldLabel('title'),
                dataIndex: 'title',
                width: 210,
                render: (_, work) =>
                  work.matchedFileId ? (
                    <Link to={`/original-files/${work.matchedFileId}`}>{work.title || '-'}</Link>
                  ) : (
                    work.title || '-'
                  ),
              },
              {
                title: fieldLabel('publicationYear'),
                dataIndex: 'publicationYear',
                width: 90,
              },
              {
                title: fieldLabel('workSourceNames'),
                dataIndex: 'sources',
                width: 180,
                render: (_, work) =>
                  work.sources.length ? (
                    <Space size={8} wrap>
                      {work.sources.map((source) => (
                        <SourceLink
                          key={source.sourceId}
                          sourceId={source.sourceId}
                          sourceName={source.sourceName}
                          showId={false}
                        />
                      ))}
                    </Space>
                  ) : (
                    '-'
                  ),
              },
              {
                title: fieldLabel('processingStatus'),
                dataIndex: 'processingStatus',
                width: 120,
                render: (_, work) => <StatusTag kind="processingStatus" value={work.processingStatus} />,
              },
            ]}
          />
        )}
      </QueryState>
    </PageContainer>
  );
}
