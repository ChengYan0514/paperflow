import { ArrowLeftOutlined, FileTextOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { Link, useParams } from '@umijs/max';
import { Button, Card, Col, Row, Space, Statistic, Table, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';
import type { CausalClaim, CausalPaperDetail } from '@/services/knowledge';
import { getCausalPaper } from '@/services/knowledge';
import { QueryState } from '../../businessUtils';
import { CausalForceGraph } from './components/CausalForceGraph';
import { SignBadge } from './components/SignBadge';

export default function CausalPaperClaimsPage() {
  const { workId = '' } = useParams();
  const [data, setData] = useState<CausalPaperDetail>();
  const [error, setError] = useState<unknown>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getCausalPaper(workId).then(setData).catch(setError).finally(() => setLoading(false));
  }, [workId]);

  return (
    <PageContainer title="论文因果声明" subTitle={workId}>
      <QueryState loading={loading} error={error} data={data}>
        {(detail) => (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Card>
              <Typography.Title level={4} style={{ marginTop: 0 }}>{detail.paper.title || workId}</Typography.Title>
              <Space wrap>
                <Tag>{workId}</Tag>
                {detail.paper.publicationYear ? <Tag>{detail.paper.publicationYear}</Tag> : null}
                {detail.paper.sourceName ? <Tag>{detail.paper.sourceName}</Tag> : null}
                {detail.paper.subfieldName ? <Tag>{detail.paper.subfieldName}</Tag> : null}
              </Space>
              <div style={{ marginTop: 16 }}>
                <Space wrap>
                  <Button icon={<ArrowLeftOutlined />}><Link to={`/works/${workId}`}>返回论文详情</Link></Button>
                  <Button icon={<FileTextOutlined />}><Link to={`/works/${workId}/blocks`}>查看全文 Blocks</Link></Button>
                </Space>
              </div>
            </Card>
            <Row gutter={[16, 16]}>
              <Col xs={12} md={6}><Card size="small"><Statistic title="声明记录" value={detail.claims.length} /></Card></Col>
              <Col xs={12} md={6}><Card size="small"><Statistic title="图谱节点" value={detail.paperGraph.nodes.length} /></Card></Col>
              <Col xs={12} md={6}><Card size="small"><Statistic title="图谱关系" value={detail.paperGraph.edges.length} /></Card></Col>
              <Col xs={12} md={6}><Card size="small"><Statistic title="核心发现" value={detail.claims.filter((claim) => claim.isMainContribution).length} /></Card></Col>
            </Row>
            <CausalForceGraph data={detail.paperGraph} height={420} />
            <Card title="声明明细" size="small">
              <Table<CausalClaim>
                dataSource={detail.claims}
                expandable={{ expandedRowRender: (claim) => <Typography.Paragraph>{claim.evidence || '-'}</Typography.Paragraph> }}
                pagination={{ pageSize: 10 }}
                rowKey="recordId"
                scroll={{ x: 1080 }}
                columns={[
                  {
                    title: '标准关系',
                    width: 260,
                    render: (_, claim) => (
                      <Link to={`/knowledge/causal-graph/edges?cause=${encodeURIComponent(claim.causeStandard)}&effect=${encodeURIComponent(claim.effectStandard)}`}>
                        {claim.causeStandard}
                        {' -> '}
                        {claim.effectStandard}
                      </Link>
                    ),
                  },
                  { title: '方向', width: 120, render: (_, claim) => <SignBadge value={claim.signCategory} /> },
                  { title: '方法', dataIndex: 'causalInferenceMethod', width: 180 },
                  { title: '显著性', dataIndex: 'statisticalSignificance', width: 130 },
                  { title: '原始主张', dataIndex: 'claim', width: 360 },
                ]}
              />
            </Card>
          </Space>
        )}
      </QueryState>
    </PageContainer>
  );
}
