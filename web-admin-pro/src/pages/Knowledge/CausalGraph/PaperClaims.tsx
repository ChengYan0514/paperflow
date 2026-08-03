import { ArrowLeftOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { Link, useParams } from '@umijs/max';
import { Button, Card, Col, Row, Space, Statistic, Table, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';
import type { CausalClaim, CausalPaperDetail } from '@/services/knowledge';
import { getCausalPaper } from '@/services/knowledge';
import { QueryState } from '../../businessUtils';
import { CausalForceGraph } from './components/CausalForceGraph';
import { CausalInferenceMethod } from './components/CausalInferenceMethod';
import { SignBadge } from './components/SignBadge';

const mainContributionRowStyle = {
  backgroundColor: '#ffffff',
  color: '#1e293b',
  opacity: 1,
};

const auxiliaryClaimRowStyle = {
  backgroundColor: '#f8fafc',
  color: '#94a3b8',
  opacity: 0.8,
};

function isMainContribution(claim: CausalClaim) {
  return claim.isMainContribution === true;
}

export default function CausalPaperClaimsPage() {
  const { workId = '' } = useParams();
  const [data, setData] = useState<CausalPaperDetail>();
  const [error, setError] = useState<unknown>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getCausalPaper(workId).then(setData).catch(setError).finally(() => setLoading(false));
  }, [workId]);

  const claims = data
    ? [...data.claims].sort(
        (left, right) => Number(isMainContribution(right)) - Number(isMainContribution(left)),
      )
    : [];

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
                  <Button icon={<ArrowLeftOutlined />}><Link to="/knowledge/causal-graph">返回因果图谱</Link></Button>
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
              <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 12 }}>
                高亮行（核心发现）浅色行（非核心发现）
              </Typography.Text>
              <Table<CausalClaim>
                dataSource={claims}
                expandable={{ expandedRowRender: (claim) => <Typography.Paragraph>{claim.evidence || '-'}</Typography.Paragraph> }}
                onRow={(claim) => ({
                  style: isMainContribution(claim)
                    ? mainContributionRowStyle
                    : auxiliaryClaimRowStyle,
                })}
                pagination={{ pageSize: 10 }}
                rowKey="recordId"
                scroll={{ x: 1080 }}
                columns={[
                  {
                    title: '标准关系',
                    width: 260,
                    render: (_, claim) => (
                      <Link
                        style={{ color: isMainContribution(claim) ? '#2563eb' : '#60a5fa' }}
                        to={`/knowledge/causal-graph/edges?cause=${encodeURIComponent(claim.causeStandard)}&effect=${encodeURIComponent(claim.effectStandard)}`}
                      >
                        {claim.causeStandard}
                        {' -> '}
                        {claim.effectStandard}
                      </Link>
                    ),
                  },
                  { title: '方向', width: 120, render: (_, claim) => <SignBadge value={claim.signCategory} /> },
                  {
                    title: '方法',
                    dataIndex: 'causalInferenceMethod',
                    width: 180,
                    render: (_, claim) => <CausalInferenceMethod method={claim.causalInferenceMethod} otherDescription={claim.evidenceMethodOtherDescription} />,
                  },
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
