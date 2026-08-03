import { PageContainer } from '@ant-design/pro-components';
import { Link, useParams } from '@umijs/max';
import { Card, Space, Statistic } from 'antd';
import { useEffect, useState } from 'react';
import type { SourceSummary } from '@/services/business';
import { getSource } from '@/services/business';
import { DetailGrid, fieldLabel, QueryState } from './businessUtils';

export default function SourceDetailPage() {
  const { sourceId = '' } = useParams();
  const [source, setSource] = useState<SourceSummary>();
  const [error, setError] = useState<unknown>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSource(sourceId)
      .then(setSource)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [sourceId]);

  return (
    <PageContainer title="来源期刊详情">
      <QueryState loading={loading} error={error} data={source}>
        {(data) => (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <DetailGrid
              items={[
                { label: fieldLabel('sourceId'), value: data.sourceId },
                { label: fieldLabel('sourceName'), value: data.sourceName },
                { label: fieldLabel('provider'), value: data.provider },
              ]}
            />
            <Card title="统计">
              <Space wrap>
                {Object.entries(data.stats).map(([key, value]) => (
                  <Statistic key={key} title={fieldLabel(key)} value={value} />
                ))}
              </Space>
            </Card>
            <Space>
              <Link to={`/works?sourceId=${encodeURIComponent(data.sourceId)}`}>查看论文</Link>
              <Link to={`/original-files?sourceId=${encodeURIComponent(data.sourceId)}`}>
                查看论文全文文件
              </Link>
            </Space>
          </Space>
        )}
      </QueryState>
    </PageContainer>
  );
}
