import { PageContainer } from '@ant-design/pro-components';
import { Link, useSearchParams } from '@umijs/max';
import { Card, Col, Empty, Row, Space, Statistic, Tooltip, Typography } from 'antd';
import { useEffect, useState } from 'react';
import type { CausalEdgeDetail } from '@/services/knowledge';
import { getCausalEdge } from '@/services/knowledge';
import { QueryState } from '../../businessUtils';
import { EdgeEvidenceTable } from './components/EdgeEvidenceTable';

function isNotFound(error: unknown) {
  return typeof error === 'object'
    && error !== null
    && 'response' in error
    && (error as { response?: { status?: number } }).response?.status === 404;
}

export default function CausalEdgeDetailPage() {
  const [searchParams] = useSearchParams();
  const cause = searchParams.get('cause') || '';
  const effect = searchParams.get('effect') || '';
  const [data, setData] = useState<CausalEdgeDetail>();
  const [error, setError] = useState<unknown>();
  const [missing, setMissing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setData(undefined);
    setError(undefined);
    setMissing(false);
    getCausalEdge(cause, effect)
      .then(setData)
      .catch((requestError) => {
        if (isNotFound(requestError)) {
          setMissing(true);
        } else {
          setError(requestError);
        }
      })
      .finally(() => setLoading(false));
  }, [cause, effect]);

  return (
    <PageContainer title="关系详情" subTitle={`${cause} -> ${effect}`}>
      {missing ? <Empty description="暂无该因果关系的证据记录" /> : (
        <QueryState loading={loading} error={error} data={data}>
          {(detail) => (
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Card>
                <Typography.Title level={4} style={{ marginTop: 0 }}>
                  <Link to={`/knowledge/causal-graph/nodes/${encodeURIComponent(detail.edge.source)}`}>{detail.edge.source}</Link>
                  {' -> '}
                  <Link to={`/knowledge/causal-graph/nodes/${encodeURIComponent(detail.edge.target)}`}>{detail.edge.target}</Link>
                </Typography.Title>
                <Typography.Text type="secondary">
                  <span>负向{detail.edge.signBreakdown.negative ?? 0}条　</span>
                  <span>正向{detail.edge.signBreakdown.positive ?? 0}条　</span>
                  <span>不显著{detail.edge.signBreakdown.null ?? 0}条　</span>
                  <span>混合{detail.edge.signBreakdown.mixed ?? 0}条</span>
                </Typography.Text>
              </Card>
              <Row gutter={[16, 16]}>
                <Col xs={12} md={4}><Card size="small"><Statistic title={<Tooltip title="聚合关系数量">记录数</Tooltip>} value={detail.edge.recordCount} /></Card></Col>
                <Col xs={12} md={4}><Card size="small"><Statistic title={<Tooltip title="该关系被多少篇论文验证">论文数</Tooltip>} value={detail.edge.paperCount} /></Card></Col>
                <Col xs={12} md={4}><Card size="small"><Statistic title={<Tooltip title="该关系被多少种方法验证">方法数</Tooltip>} value={detail.edge.diversity} /></Card></Col>
              </Row>
              <Card title="证据记录" size="small">
                <EdgeEvidenceTable claims={detail.claims} />
              </Card>
            </Space>
          )}
        </QueryState>
      )}
    </PageContainer>
  );
}
