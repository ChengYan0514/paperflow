import { PageContainer } from '@ant-design/pro-components';
import { Link, useSearchParams } from '@umijs/max';
import { Card, Col, Progress, Row, Statistic } from 'antd';
import { useEffect, useState } from 'react';
import type { TaskStatus, TaskStatusSource } from '@/services/business';
import { listTaskStatus } from '@/services/business';
import { fieldLabel, QueryState } from './businessUtils';

function progress(value: number, total: number) {
  return total > 0 ? value / total : 1;
}

function abnormalCount(source: TaskStatusSource) {
  return (
    source.workCount -
    source.matchedWorkCount +
    (source.originalFileCount - source.parsedFileCount) +
    (source.originalFileCount - source.blockImportedFileCount)
  );
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
      if (sort === 'abnormalCountDesc') {
        return abnormalCount(right) - abnormalCount(left) || left.sourceId.localeCompare(right.sourceId);
      }
      return left.sourceId.localeCompare(right.sourceId);
    });
}

export default function TaskStatusPage() {
  const [searchParams] = useSearchParams();
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
                <Row gutter={[16, 16]}>
                  {sources.map((source) => (
                    <Col key={source.sourceId} xs={24} md={12} xl={8}>
                      <Card
                        title={<Link to={`/sources/${source.sourceId}`}>{source.sourceId}</Link>}
                        extra={source.provider || '-'}
                      >
                        <strong>{source.sourceName || '-'}</strong>
                        <Progress
                          percent={Math.round(progress(source.matchedWorkCount, source.workCount) * 100)}
                          format={() => `论文匹配 ${source.matchedWorkCount}/${source.workCount}`}
                        />
                        <Progress
                          percent={Math.round(progress(source.parsedFileCount, source.originalFileCount) * 100)}
                          format={() => `文件解析 ${source.parsedFileCount}/${source.originalFileCount}`}
                        />
                        <Progress
                          percent={Math.round(
                            progress(source.blockImportedFileCount, source.originalFileCount) * 100,
                          )}
                          format={() =>
                            `全文入库 ${source.blockImportedFileCount}/${source.originalFileCount}`
                          }
                        />
                      </Card>
                    </Col>
                  ))}
                </Row>
              </div>
            </>
          );
        }}
      </QueryState>
    </PageContainer>
  );
}
