import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Link, useSearchParams } from '@umijs/max';
import { useEffect, useState } from 'react';
import type { Page, SourceSummary } from '@/services/business';
import { listSources } from '@/services/business';
import { fieldLabel, QueryState } from './businessUtils';

export default function SourcesPage() {
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<Page<SourceSummary>>();
  const [error, setError] = useState<unknown>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listSources(searchParams)
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [searchParams]);

  return (
    <PageContainer title="来源期刊列表">
      <QueryState loading={loading} error={error} data={data}>
        {(page) => (
          <ProTable<SourceSummary>
            dataSource={page.items}
            rowKey="sourceId"
            search={false}
            toolBarRender={false}
            pagination={false}
            columns={[
              {
                title: fieldLabel('sourceId'),
                dataIndex: 'sourceId',
                render: (_, source) => (
                  <Link to={`/sources/${source.sourceId}`}>{source.sourceId}</Link>
                ),
              },
              { title: fieldLabel('sourceName'), dataIndex: 'sourceName' },
              { title: fieldLabel('provider'), dataIndex: 'provider' },
              { title: fieldLabel('workCount'), dataIndex: ['stats', 'workCount'] },
              {
                title: fieldLabel('originalFileCount'),
                dataIndex: ['stats', 'originalFileCount'],
              },
              {
                title: fieldLabel('matchedFileCount'),
                dataIndex: ['stats', 'matchedFileCount'],
              },
              { title: fieldLabel('parsedFileCount'), dataIndex: ['stats', 'parsedFileCount'] },
              { title: fieldLabel('readyFileCount'), dataIndex: ['stats', 'readyFileCount'] },
              {
                title: fieldLabel('parseFailedFileCount'),
                dataIndex: ['stats', 'parseFailedFileCount'],
              },
              {
                title: fieldLabel('blockFailedFileCount'),
                dataIndex: ['stats', 'blockFailedFileCount'],
              },
              {
                title: fieldLabel('unsupportedFileCount'),
                dataIndex: ['stats', 'unsupportedFileCount'],
              },
            ]}
          />
        )}
      </QueryState>
    </PageContainer>
  );
}
