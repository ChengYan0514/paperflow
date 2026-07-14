import { PageContainer } from '@ant-design/pro-components';
import { Link, useSearchParams } from '@umijs/max';
import { Card, Col, Row, Space, Statistic, Typography } from 'antd';
import { useEffect, useState } from 'react';
import type { CausalEdgeDetail } from '@/services/knowledge';
import { getCausalEdge } from '@/services/knowledge';
import { QueryState } from '../../businessUtils';
import { EdgeEvidenceTable } from './components/EdgeEvidenceTable';
import { SignBadge } from './components/SignBadge';

export default function CausalEdgeDetailPage() {
  const [searchParams] = useSearchParams();
  const cause = searchParams.get('cause') || '';
  const effect = searchParams.get('effect') || '';
  const [data, setData] = useState<CausalEdgeDetail>();
  const [error, setError] = useState<unknown>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getCausalEdge(cause, effect).then(setData).catch(setError).finally(() => setLoading(false));
  }, [cause, effect]);

  return (
    <PageContainer title="关系详情" subTitle={`${cause} -> ${effect}`}>
      <QueryState loading={loading} error={error} data={data}>
        {(detail) => (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Card>
              <Typography.Title level={4} style={{ marginTop: 0 }}>
                <Link to={`/knowledge/causal-graph/nodes/${encodeURIComponent(detail.edge.source)}`}>{detail.edge.source}</Link>
                {' -> '}
                <Link to={`/knowledge/causal-graph/nodes/${encodeURIComponent(detail.edge.target)}`}>{detail.edge.target}</Link>
              </Typography.Title>
              <SignBadge value={detail.edge.dominantSignCategory} />
            </Card>
            <Row gutter={[16, 16]}>
              <Col xs={12} md={4}><Card size="small"><Statistic title="记录数" value={detail.edge.recordCount} /></Card></Col>
              <Col xs={12} md={4}><Card size="small"><Statistic title="论文数" value={detail.edge.paperCount} /></Card></Col>
              <Col xs={12} md={4}><Card size="small"><Statistic title="方法数" value={detail.edge.diversity} /></Card></Col>
              <Col xs={12} md={4}><Card size="small"><Statistic title="分歧度" value={detail.edge.disagreement} precision={2} /></Card></Col>
              <Col xs={12} md={4}><Card size="small"><Statistic title="领域扩散" value={detail.stats.spreadSubfield} /></Card></Col>
              <Col xs={12} md={4}><Card size="small"><Statistic title="时间跨度" value={detail.stats.spreadTime} suffix="年" /></Card></Col>
            </Row>
            <Card title="证据记录" size="small">
              <EdgeEvidenceTable claims={detail.claims} />
            </Card>
          </Space>
        )}
      </QueryState>
    </PageContainer>
  );
}
