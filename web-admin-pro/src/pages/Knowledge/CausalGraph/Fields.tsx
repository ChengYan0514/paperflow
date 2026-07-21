import { PageContainer } from '@ant-design/pro-components';
import { Link, useSearchParams } from '@umijs/max';
import { Card, Col, Input, Progress, Row, Space, Statistic, Table, Typography } from 'antd';
import { useEffect, useState } from 'react';
import type { CausalFieldAnalysis, CausalFieldItem } from '@/services/knowledge';
import { getCausalFields } from '@/services/knowledge';
import { QueryState } from '../../businessUtils';
import './Fields.less';

export default function CausalFieldsPage() {
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<CausalFieldAnalysis>();
  const [error, setError] = useState<unknown>();
  const [loading, setLoading] = useState(true);
  const [subfieldSearch, setSubfieldSearch] = useState('');
  const [topicSearch, setTopicSearch] = useState('');

  useEffect(() => {
    getCausalFields().then(setData).catch(setError).finally(() => setLoading(false));
  }, []);

  return (
    <PageContainer title="领域分析">
      <QueryState loading={loading} error={error} data={data}>
        {(fields) => {
          const requestedSubfield = searchParams.get('subfield');
          const selectedSubfield = requestedSubfield && fields.overview.subfields.includes(requestedSubfield)
            ? requestedSubfield
            : fields.overview.subfields[0];
          const detail = selectedSubfield ? fields.overview.details[selectedSubfield] : undefined;
          const filteredItems = fields.items.filter((item) =>
            item.subfield.toLowerCase().includes(subfieldSearch.trim().toLowerCase())
            && item.topic.toLowerCase().includes(topicSearch.trim().toLowerCase()),
          );

          return (
            <div className="causal-fields-page">
              {detail ? (
                <section className="field-detail">
                  <div className="summary-band">
                    <Statistic title="论文数" value={detail.paperCount} />
                    <Statistic title="声明记录数" value={detail.claimRecordCount} />
                    <Statistic title="标准关系数" value={detail.standardClaimCount} />
                    <Statistic title="变量数" value={detail.variableCount} />
                  </div>
                  <Row className="detail-panels" gutter={[16, 16]}>
                    <Col xs={24} lg={12}>
                      <Card size="small" title={`高频关系（Top ${detail.topRelations.length}）`}>
                        <div className="relation-list">
                          {detail.topRelations.map((relation) => (
                            <div className="detail-list-item" key={`${relation.cause}-${relation.effect}`}>
                              <Link className="relation-link" to={`/knowledge/causal-graph/edges?cause=${encodeURIComponent(relation.cause)}&effect=${encodeURIComponent(relation.effect)}`}>
                                {relation.cause} {'->'} {relation.effect}
                              </Link>
                              <Typography.Text type="secondary">领域内 {relation.claimRecordCount} 条记录 · {relation.paperCount} 篇 Work · {relation.methodCount} 种方法</Typography.Text>
                              <Typography.Text type="secondary">全库 {relation.globalClaimRecordCount} 条记录</Typography.Text>
                            </div>
                          ))}
                        </div>
                      </Card>
                    </Col>
                    <Col xs={24} md={12} lg={6}>
                      <Card size="small" title={`高频变量（Top ${detail.topVariables.length}）`}>
                        <div className="variable-list">
                          {detail.topVariables.map((variable) => (
                            <Link className="variable-row" key={variable.variable} to={`/knowledge/causal-graph/nodes/${encodeURIComponent(variable.variable)}`}>
                              <span>{variable.variable}</span><span>{variable.claimRecordCount}</span>
                            </Link>
                          ))}
                        </div>
                      </Card>
                    </Col>
                    <Col xs={24} md={12} lg={6}>
                      <Card size="small" title="方法分布（Top 10 + 其他）">
                        <div className="method-list">
                          {detail.methodCounts.map((method) => {
                            const percent = detail.claimRecordCount ? Math.round((method.claimRecordCount / detail.claimRecordCount) * 100) : 0;
                            return (
                              <div className="method-row" key={method.method}>
                                <div><span>{method.method}</span><span>{method.claimRecordCount} · {percent}%</span></div>
                                <Progress percent={percent} showInfo={false} size="small" strokeColor="#8AA4BF" />
                              </div>
                            );
                          })}
                        </div>
                      </Card>
                    </Col>
                  </Row>
                </section>
              ) : null}

              <section className="field-audit">
                <div className="audit-heading">
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
