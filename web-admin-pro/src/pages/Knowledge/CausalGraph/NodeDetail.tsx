import { PageContainer } from '@ant-design/pro-components';
import { Link, useParams } from '@umijs/max';
import { Card, Col, Row, Space, Statistic, Table, Tooltip } from 'antd';
import { useEffect, useState } from 'react';
import type { CausalGraphEdge, CausalNodeDetail } from '@/services/knowledge';
import { getCausalNode } from '@/services/knowledge';
import { QueryState } from '../../businessUtils';
import { CausalForceGraph } from './components/CausalForceGraph';
import { SignBadge } from './components/SignBadge';

function edgeColumns() {
  return [
    {
      title: '关系',
      render: (_: unknown, edge: CausalGraphEdge) => (
        <Link to={`/knowledge/causal-graph/edges?cause=${encodeURIComponent(edge.source)}&effect=${encodeURIComponent(edge.target)}`}>
          {edge.source}
          {' -> '}
          {edge.target}
        </Link>
      ),
    },
    { title: <Tooltip title="聚合关系数量">记录数</Tooltip>, dataIndex: 'recordCount', width: 90 },
    { title: <Tooltip title="该关系被多少篇论文验证">论文数</Tooltip>, dataIndex: 'paperCount', width: 90 },
    { title: <Tooltip title="该关系被多少种方法验证">方法数</Tooltip>, dataIndex: 'diversity', width: 90 },
    { title: '主导方向', width: 120, render: (_: unknown, edge: CausalGraphEdge) => <SignBadge value={edge.dominantSignCategory} /> },
  ];
}

export default function CausalNodeDetailPage() {
  const { variable = '' } = useParams();
  const [data, setData] = useState<CausalNodeDetail>();
  const [error, setError] = useState<unknown>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getCausalNode(variable).then(setData).catch(setError).finally(() => setLoading(false));
  }, [variable]);

  return (
    <PageContainer title="变量详情" subTitle={variable}>
      <QueryState loading={loading} error={error} data={data}>
        {(detail) => {
          const graph = {
            nodes: [detail.node],
            edges: [...detail.outgoing.slice(0, 30), ...detail.incoming.slice(0, 30)],
          };
          const names = new Set(graph.nodes.map((node) => node.id));
          graph.edges.forEach((edge) => {
            if (!names.has(edge.source)) {
              graph.nodes.push({ id: edge.source, label: edge.source, occurrences: edge.recordCount, dominantSubfield: null, asCauseCount: edge.recordCount, asEffectCount: 0 });
              names.add(edge.source);
            }
            if (!names.has(edge.target)) {
              graph.nodes.push({ id: edge.target, label: edge.target, occurrences: edge.recordCount, dominantSubfield: null, asCauseCount: 0, asEffectCount: edge.recordCount });
              names.add(edge.target);
            }
          });
          return (
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Row gutter={[16, 16]}>
                <Col xs={12} md={6}><Card size="small"><Statistic title="总记录" value={detail.totalClaims} /></Card></Col>
                <Col xs={12} md={6}><Card size="small"><Statistic title="作为原因" value={detail.node.asCauseCount} /></Card></Col>
                <Col xs={12} md={6}><Card size="small"><Statistic title="作为结果" value={detail.node.asEffectCount} /></Card></Col>
                <Col xs={12} md={6}><Card size="small"><Statistic title="主领域" value={detail.node.dominantSubfield || '未标注'} /></Card></Col>
              </Row>
              <CausalForceGraph data={graph} height={480} highlightNode={detail.node.id} />
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                  <Card title="出边" size="small">
                    <Table<CausalGraphEdge> dataSource={detail.outgoing} columns={edgeColumns()} rowKey={(edge) => `${edge.source}-${edge.target}`} pagination={{ pageSize: 8 }} />
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card title="入边" size="small">
                    <Table<CausalGraphEdge> dataSource={detail.incoming} columns={edgeColumns()} rowKey={(edge) => `${edge.source}-${edge.target}`} pagination={{ pageSize: 8 }} />
                  </Card>
                </Col>
              </Row>
            </Space>
          );
        }}
      </QueryState>
    </PageContainer>
  );
}
