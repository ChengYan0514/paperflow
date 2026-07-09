import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Link, useSearchParams } from '@umijs/max';
import { useEffect, useState } from 'react';
import type { Page, WorkListItem } from '@/services/business';
import { listWorks } from '@/services/business';
import {
  fieldLabel,
  OriginalFileLink,
  QueryState,
  StatusTag,
} from './businessUtils';

export default function WorksPage() {
  const [searchParams] = useSearchParams();
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
      <QueryState loading={loading} error={error} data={data}>
        {(page) => (
          <ProTable<WorkListItem>
            dataSource={page.items}
            rowKey="workId"
            search={false}
            toolBarRender={false}
            pagination={false}
            columns={[
              {
                title: fieldLabel('workId'),
                dataIndex: 'workId',
                render: (_, work) => <Link to={`/works/${work.workId}`}>{work.workId}</Link>,
              },
              { title: fieldLabel('title'), dataIndex: 'title', ellipsis: true },
              { title: fieldLabel('doi'), dataIndex: 'doi', ellipsis: true },
              { title: fieldLabel('publicationYear'), dataIndex: 'publicationYear' },
              {
                title: fieldLabel('sourceIds'),
                dataIndex: 'sourceIds',
                render: (_, work) => work.sourceIds.join(', '),
              },
              {
                title: fieldLabel('processingStatus'),
                dataIndex: 'processingStatus',
                render: (_, work) => <StatusTag value={work.processingStatus} />,
              },
              {
                title: fieldLabel('matchedFileId'),
                dataIndex: 'matchedFileId',
                render: (_, work) =>
                  work.matchedFileId ? <OriginalFileLink fileId={work.matchedFileId} /> : '-',
              },
              {
                title: fieldLabel('flagMatch'),
                dataIndex: 'flagMatch',
                render: (_, work) => <StatusTag kind="flagMatch" value={work.flagMatch} />,
              },
              {
                title: fieldLabel('flagText'),
                dataIndex: 'flagText',
                render: (_, work) => <StatusTag kind="flagText" value={work.flagText} />,
              },
              {
                title: fieldLabel('flagBlock'),
                dataIndex: 'flagBlock',
                render: (_, work) => <StatusTag kind="flagBlock" value={work.flagBlock} />,
              },
            ]}
          />
        )}
      </QueryState>
    </PageContainer>
  );
}
