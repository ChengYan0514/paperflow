import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Link, useSearchParams } from '@umijs/max';
import { useEffect, useState } from 'react';
import type { Page, SourceSummary } from '@/services/business';
import { listSources } from '@/services/business';
import { fieldLabel, QueryBar, QueryState, tablePagination, valueLabel } from './businessUtils';

const primaryField = { name: 'sourceName', placeholder: '按来源期刊名称检索' };
const advancedFields = [
  { name: 'sourceId' },
  { name: 'provider' },
  {
    name: 'hasOriginalFiles',
    type: 'select' as const,
    options: [
      { label: valueLabel(true), value: true },
      { label: valueLabel(false), value: false },
    ],
  },
  {
    name: 'hasFailures',
    type: 'select' as const,
    options: [
      { label: valueLabel(true), value: true },
      { label: valueLabel(false), value: false },
    ],
  },
];
const sortOptions = ['sourceIdAsc', 'workCountDesc', 'failureCountDesc'].map((value) => ({
  label: valueLabel(value),
  value,
}));

export default function SourcesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
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
      <QueryBar
        primaryField={primaryField}
        advancedFields={advancedFields}
        sortOptions={sortOptions}
        searchParams={searchParams}
        setSearchParams={setSearchParams}
      />
      <QueryState loading={loading} error={error} data={data}>
        {(page) => (
          <ProTable<SourceSummary>
            dataSource={page.items}
            rowKey="sourceId"
            search={false}
            toolBarRender={false}
            pagination={tablePagination(page, searchParams, setSearchParams)}
            scroll={{ x: 1360 }}
            columns={[
              {
                title: fieldLabel('sourceId'),
                dataIndex: 'sourceId',
                width: 180,
                ellipsis: true,
                render: (_, source) => (
                  <Link to={`/sources/${source.sourceId}`}>{source.sourceId}</Link>
                ),
              },
              {
                title: fieldLabel('sourceName'),
                dataIndex: 'sourceName',
                width: 240,
                ellipsis: true,
              },
              { title: fieldLabel('provider'), dataIndex: 'provider', width: 140, ellipsis: true },
              { title: fieldLabel('workCount'), dataIndex: ['stats', 'workCount'], width: 110 },
              {
                title: fieldLabel('originalFileCount'),
                dataIndex: ['stats', 'originalFileCount'],
                width: 120,
              },
              {
                title: fieldLabel('matchedFileCount'),
                dataIndex: ['stats', 'matchedFileCount'],
                width: 130,
              },
              {
                title: fieldLabel('parsedFileCount'),
                dataIndex: ['stats', 'parsedFileCount'],
                width: 120,
              },
              {
                title: fieldLabel('readyFileCount'),
                dataIndex: ['stats', 'readyFileCount'],
                width: 110,
              },
              {
                title: fieldLabel('parseFailedFileCount'),
                dataIndex: ['stats', 'parseFailedFileCount'],
                width: 140,
              },
              {
                title: fieldLabel('blockFailedFileCount'),
                dataIndex: ['stats', 'blockFailedFileCount'],
                width: 170,
              },
              {
                title: fieldLabel('unsupportedFileCount'),
                dataIndex: ['stats', 'unsupportedFileCount'],
                width: 140,
              },
            ]}
          />
        )}
      </QueryState>
    </PageContainer>
  );
}
