import { PageContainer } from '@ant-design/pro-components';
import { Link } from '@umijs/max';
import { Card, Col, Input, Progress, Row, Space, Statistic, Table, Typography } from 'antd';
import { useEffect, useState } from 'react';
import type { CausalFieldAnalysis, CausalFieldItem, CausalGraphSummary } from '@/services/knowledge';
import { getCausalFields, getCausalSummary } from '@/services/knowledge';
import { QueryState } from '../../businessUtils';
import './Fields.less';

export default function CausalFieldsPage() {
  const [data, setData] = useState<{ fields: CausalFieldAnalysis; summary: CausalGraphSummary }>();
  const [error, setError] = useState<unknown>();
  const [loading, setLoading] = useState(true);
  const [subfieldSearch, setSubfieldSearch] = useState('');
  const [topicSearch, setTopicSearch] = useState('');

  useEffect(() => {
    Promise.all([getCausalFields(), getCausalSummary()])
      .then(([fields, summary]) => setData({ fields, summary }))
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageContainer title="领域分析">
      <QueryState loading={loading} error={error} data={data}>
        {({ fields, summary }) => {
          const filteredItems = fields.items.filter((item) =>
            item.subfield.toLowerCase().includes(subfieldSearch.trim().toLowerCase())
            && item.topic.toLowerCase().includes(topicSearch.trim().toLowerCase()),
          );

          return (
            <div className="causal-fields-page">
              <div className="summary-band">
                <Statistic title="抽取记录" value={summary.overview.totalClaimRecords} />
                <Statistic title="标准关系" value={summary.overview.totalStandardClaims} />
                <Statistic title="论文数" value={summary.overview.totalPapers} />
                <Statistic title="变量数" value={summary.overview.totalNodes} />
              </div>

              <Row className="global-insights" gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                  <Card size="small" title={`高频关系（Top ${fields.insights.topRelations.length}）`}>
                    <div className="relation-list">
                      {fields.insights.topRelations.map((relation) => (
                        <div className="detail-list-item" key={`${relation.cause}-${relation.effect}`}>
                          <Link className="relation-link" to={`/knowledge/causal-graph/edges?cause=${encodeURIComponent(relation.cause)}&effect=${encodeURIComponent(relation.effect)}`}>
                            {relation.cause} {'->'} {relation.effect}
                          </Link>
                          <Typography.Text type="secondary">{relation.claimRecordCount} 条抽取记录 · {relation.paperCount} 篇论文 · {relation.methodCount} 种方法</Typography.Text>
                        </div>
                      ))}
                    </div>
                  </Card>
                </Col>
                <Col xs={24} md={12} lg={6}>
                  <Card size="small" title={`高频变量（Top ${fields.insights.topVariables.length}）`}>
                    <div className="variable-list">
                      {fields.insights.topVariables.map((variable) => (
                        <Link className="variable-row" key={variable.name} to={`/knowledge/causal-graph/nodes/${encodeURIComponent(variable.name)}`}>
                          <span>{variable.name}</span><span>{variable.count}</span>
                        </Link>
                      ))}
                    </div>
                  </Card>
                </Col>
                <Col xs={24} md={12} lg={6}>
                  <Card size="small" title="方法分布（Top 10 + 其他）">
                    <div className="method-list">
                      {fields.insights.methodCounts.map((method) => {
                        const percent = summary.overview.totalClaimRecords ? Math.round((method.count / summary.overview.totalClaimRecords) * 100) : 0;
                        return (
                          <div className="method-row" key={method.name}>
                            <div><span>{method.name}</span><span>{method.count} · {percent}%</span></div>
                            <Progress percent={percent} showInfo={false} size="small" strokeColor="#8AA4BF" />
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                </Col>
              </Row>

              <section className="field-audit">
                <div className="audit-heading">
                  <Typography.Title level={2} className="audit-title">领域明细</Typography.Title>
                  <Space wrap>
                    <Input allowClear aria-label="筛选子领域" placeholder="筛选子领域" value={subfieldSearch} onChange={(event) => setSubfieldSearch(event.target.value)} />
                    <Input allowClear aria-label="筛选主题" placeholder="筛选主题" value={topicSearch} onChange={(event) => setTopicSearch(event.target.value)} />
                  </Space>
                </div>
                <Table<CausalFieldItem>
                  dataSource={filteredItems}
                  rowKey={(item) => `${item.subfield}-${item.topic}`}
                  pagination={{ pageSize: 20, showSizeChanger: true }}
                  scroll={{ x: 720 }}
                  columns={[
                    { title: '子领域', dataIndex: 'subfield' },
                    { title: '主题', dataIndex: 'topic' },
                    { title: '声明记录数', dataIndex: 'claimRecordCount', align: 'right', sorter: (a, b) => a.claimRecordCount - b.claimRecordCount },
                    { title: '论文数', dataIndex: 'paperCount', align: 'right', sorter: (a, b) => a.paperCount - b.paperCount },
                    { title: '变量数', dataIndex: 'variableCount', align: 'right', sorter: (a, b) => a.variableCount - b.variableCount },
                  ]}
                />
              </section>
            </div>
          );
        }}
      </QueryState>
    </PageContainer>
  );
}
