import { PageContainer } from '@ant-design/pro-components';
import { Link, useSearchParams } from '@umijs/max';
import { Card, Col, Input, Progress, Row, Space, Statistic, Table, Typography } from 'antd';
import { useEffect, useState } from 'react';
import type { CausalFieldAnalysis, CausalFieldItem } from '@/services/knowledge';
import { getCausalFields } from '@/services/knowledge';
import { QueryState } from '../../businessUtils';
import './Fields.less';

function heatmapLevel(value: number, maximum: number) {
  if (!value || !maximum) return 'empty';
  const ratio = value / maximum;
  if (ratio <= 0.25) return 'low';
  if (ratio <= 0.6) return 'medium';
  if (ratio <= 0.85) return 'high';
  return 'highest';
}

export default function CausalFieldsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<CausalFieldAnalysis>();
  const [error, setError] = useState<unknown>();
  const [loading, setLoading] = useState(true);
  const [subfieldSearch, setSubfieldSearch] = useState('');
  const [topicSearch, setTopicSearch] = useState('');

  useEffect(() => {
    getCausalFields().then(setData).catch(setError).finally(() => setLoading(false));
  }, []);

  function selectSubfield(subfield: string) {
    const next = new URLSearchParams(searchParams);
    next.set('subfield', subfield);
    setSearchParams(next);
  }

  return (
    <PageContainer title="领域分析">
      <QueryState loading={loading} error={error} data={data}>
        {(fields) => {
          const requestedSubfield = searchParams.get('subfield');
          const selectedSubfield = requestedSubfield && fields.overview.subfields.includes(requestedSubfield)
            ? requestedSubfield
            : fields.overview.subfields[0];
          const detail = selectedSubfield ? fields.overview.details[selectedSubfield] : undefined;
          const maxCell = Math.max(
            0,
            ...fields.overview.subfields.flatMap((subfield) =>
              fields.overview.topics.map((topic) => fields.overview.matrix[subfield]?.[topic] ?? 0),
            ),
          );
          const filteredItems = fields.items.filter((item) =>
            item.subfield.toLowerCase().includes(subfieldSearch.trim().toLowerCase())
            && item.topic.toLowerCase().includes(topicSearch.trim().toLowerCase()),
          );
          const gridColumns = `188px repeat(${fields.overview.topics.length}, minmax(104px, 1fr))`;

          return (
            <div className="causal-fields-page">
              <Card
                className="coverage-card"
                size="small"
                title="实际数据包含众多子领域和主题；本页展示声明记录数最多的前 10 个子领域与前 10 个主题。"
                extra={<span className="heatmap-legend" role="img" aria-label="声明记录数色阶：0、低、中、高"><i className="legend-empty" />0<i className="legend-low" />低<i className="legend-medium" />中<i className="legend-high" />高</span>}
              >
                <div className="heatmap-scroll">
                  <div className="heatmap-grid" style={{ gridTemplateColumns: gridColumns }}>
                    <span className="heatmap-corner">子领域 / 主题</span>
                    {fields.overview.topics.map((topic) => <span className="heatmap-topic" key={topic}>{topic}</span>)}
                  </div>
                  <div className="heatmap-rows">
                    {fields.overview.subfields.map((subfield) => (
                      <button
                        className={`heatmap-row${selectedSubfield === subfield ? ' is-selected' : ''}`}
                        key={subfield}
                        type="button"
                        onClick={() => selectSubfield(subfield)}
                        aria-label={`选择子领域 ${subfield}`}
                        aria-pressed={selectedSubfield === subfield}
                        style={{ gridTemplateColumns: gridColumns }}
                      >
                        <span className="heatmap-subfield">{subfield}</span>
                        {fields.overview.topics.map((topic) => {
                          const value = fields.overview.matrix[subfield]?.[topic] ?? 0;
                          return (
                            <span
                              className={`heatmap-cell level-${heatmapLevel(value, maxCell)}`}
                              key={topic}
                              title={`${subfield}，${topic}，${value} 条声明记录`}
                              role="img"
                              aria-label={`${subfield}，${topic}，${value} 条声明记录`}
                            >
                              {value || '-'}
                            </span>
                          );
                        })}
                      </button>
                    ))}
                  </div>
                </div>
                <Typography.Text className="coverage-note" type="secondary">一篇 Work 可同时带有多个领域和主题标签，因此同一声明记录会计入多个单元格；请勿将行、列或单元格合计与全库总数比较。</Typography.Text>
              </Card>

              {detail ? (
                <section className="field-detail" aria-labelledby="field-overview-title">
                  <Typography.Title id="field-overview-title" level={2}>{selectedSubfield} 概览</Typography.Title>
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

              <section className="field-audit" aria-labelledby="field-audit-title">
                <div className="audit-heading">
                  <Typography.Title id="field-audit-title" level={2}>完整明细（{filteredItems.length}）</Typography.Title>
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
