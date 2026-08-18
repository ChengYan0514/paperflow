import { PageContainer } from '@ant-design/pro-components';
import { Link, useSearchParams } from '@umijs/max';
import { Card, Col, Progress, Row, Statistic, Table } from 'antd';
import { useEffect, useState } from 'react';
import type { TaskStatus, TaskStatusSource } from '@/services/business';
import { listTaskStatus } from '@/services/business';
import { fieldLabel, QueryBar, QueryState, valueLabel } from './businessUtils';

const primaryField = { name: 'sourceName', placeholder: '按来源期刊名称检索' };
const advancedFields = [
  { name: 'sourceId' },
  { name: 'provider' },
];
const sortOptions = [
  'sourceIdAsc',
  'workCountDesc',
  'originalFileCountDesc',
  'matchedProgressAsc',
  'parsedProgressAsc',
  'blockImportedProgressAsc',
].map((value) => ({ label: valueLabel(value), value }));

function progress(value: number, total: number) {
  return total > 0 ? value / total : 1;
}

function progressPercent(value: number, total: number) {
  return Math.round(progress(value, total) * 100);
}

export function filterTaskStatusSources(
  sources: TaskStatusSource[],
  searchParams: URLSearchParams,
) {
  const sourceId = searchParams.get('sourceId')?.trim().toLowerCase();
  const sourceName = searchParams.get('sourceName')?.trim().toLowerCase();
  const provider = searchParams.get('provider')?.trim().toLowerCase();
  const sort = searchParams.get('sort') ?? 'sourceIdAsc';

  return sources
    .filter(
      (source) =>
        (!sourceId || source.sourceId.toLowerCase().includes(sourceId)) &&
        (!sourceName || (source.sourceName ?? '').toLowerCase().includes(sourceName)) &&
        (!provider || (source.provider ?? '').toLowerCase().includes(provider)),
    )
    .sort((left, right) => {
      if (sort === 'workCountDesc') {
        return right.workCount - left.workCount || left.sourceId.localeCompare(right.sourceId);
      }
      if (sort === 'originalFileCountDesc') {
        return (
          right.originalFileCount - left.originalFileCount ||
          left.sourceId.localeCompare(right.sourceId)
        );
      }
      if (sort === 'matchedProgressAsc') {
        return (
          progress(left.matchedWorkCount, left.workCount) -
            progress(right.matchedWorkCount, right.workCount) ||
          left.sourceId.localeCompare(right.sourceId)
        );
      }
      if (sort === 'parsedProgressAsc') {
        return (
          progress(left.parsedFileCount, left.originalFileCount) -
            progress(right.parsedFileCount, right.originalFileCount) ||
          left.sourceId.localeCompare(right.sourceId)
        );
      }
      if (sort === 'blockImportedProgressAsc') {
        return (
          progress(left.blockImportedFileCount, left.originalFileCount) -
            progress(right.blockImportedFileCount, right.originalFileCount) ||
          left.sourceId.localeCompare(right.sourceId)
        );
      }
      return left.sourceId.localeCompare(right.sourceId);
    });
}

function ProgressCell({ label, value, total }: { label: string; value: number; total: number }) {
  return (
    <Progress
      percent={progressPercent(value, total)}
      size="small"
      format={() => `${label} ${value}/${total}`}
    />
  );
}

export default function TaskStatusPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<TaskStatus>();
  const [error, setError] = useState<unknown>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listTaskStatus()
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageContainer title="工作台">
      <QueryBar
        primaryField={primaryField}
        advancedFields={advancedFields}
        sortOptions={sortOptions}
        searchParams={searchParams}
        setSearchParams={setSearchParams}
      />
      <QueryState loading={loading} error={error} data={data}>
        {(taskStatus) => {
          const sources = filterTaskStatusSources(taskStatus.sources, searchParams);
          return (
            <>
              <Row gutter={[16, 16]}>
                {Object.entries(taskStatus.totals).map(([key, value]) => (
                  <Col key={key} xs={24} sm={12} md={8} xl={4}>
                    <Card>
                      <Statistic title={fieldLabel(key)} value={value} />
                    </Card>
                  </Col>
                ))}
              </Row>
              <div style={{ marginTop: 16 }}>
                <h2>各来源期刊进度</h2>
                <Table<TaskStatusSource>
                  dataSource={sources}
                  rowKey="sourceId"
                  pagination={{
                    defaultPageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total) => `共 ${total} 条`,
                  }}
                  scroll={{ x: 990 }}
                  columns={[
                    {
                      title: fieldLabel('sourceId'),
                      dataIndex: 'sourceId',
                      width: 130,
                      render: (_, source) => (
                        <Link to={`/sources/${source.sourceId}`}>{source.sourceId}</Link>
                      ),
                    },
                    {
                      title: fieldLabel('sourceName'),
                      dataIndex: 'sourceName',
                      width: 220,
                      render: (value) => value || '-',
                    },
                    {
                      title: fieldLabel('provider'),
                      dataIndex: 'provider',
                      width: 180,
                      render: (value) => value || '-',
                    },
                    {
                      title: '论文匹配',
                      width: 180,
                      render: (_, source) => (
                        <ProgressCell label="论文匹配" value={source.matchedWorkCount} total={source.workCount} />
                      ),
                    },
                    {
                      title: '文件解析',
                      width: 180,
                      render: (_, source) => (
                        <ProgressCell
                          label="文件解析"
                          value={source.parsedFileCount}
                          total={source.originalFileCount}
                        />
                      ),
                    },
                    {
                      title: '全文入库',
                      width: 180,
                      render: (_, source) => (
                        <ProgressCell
                          label="全文入库"
                          value={source.blockImportedFileCount}
                          total={source.originalFileCount}
                        />
                      ),
                    },
                  ]}
                />
              </div>
            </>
          );
        }}
      </QueryState>
    </PageContainer>
  );
}
