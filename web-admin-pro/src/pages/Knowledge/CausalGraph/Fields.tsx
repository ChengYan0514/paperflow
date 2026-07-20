import { PageContainer } from '@ant-design/pro-components';
import { Link, useSearchParams } from '@umijs/max';
import { Card, Col, Input, Progress, Row, Space, Statistic, Table, Typography } from 'antd';
import { useEffect, useState } from 'react';
import type { CausalFieldAnalysis, CausalFieldItem } from '@/services/knowledge';
import { getCausalFields } from '@/services/knowledge';
import { QueryState } from '../../businessUtils';

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

          return (
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Card size="small" title="领域与主题热力图">
                <div style={{ overflowX: 'auto' }}>
                  <div style={{ minWidth: 680 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: `180px repeat(${fields.overview.topics.length}, minmax(100px, 1fr))`, gap: 4, marginBottom: 4 }}>
                      <Typography.Text type="secondary">子领域 / 主题</Typography.Text>
                      {fields.overview.topics.map((topic) => <Typography.Text key={topic} type="secondary">{topic}</Typography.Text>)}
                    </div>
                    {fields.overview.subfields.map((subfield) => (
                      <button
                        key={subfield}
                        type="button"
                        onClick={() => selectSubfield(subfield)}
                        aria-label={`选择子领域 ${subfield}`}
                        style={{
                          alignItems: 'stretch',
                          background: selectedSubfield === subfield ? '#f0fdf4' : 'transparent',
                          border: selectedSubfield === subfield ? '1px solid #52c41a' : '1px solid transparent',
                          cursor: 'pointer',
                          display: 'grid',
                          gridTemplateColumns: `180px repeat(${fields.overview.topics.length}, minmax(100px, 1fr))`,
                          gap: 4,
                          marginBottom: 4,
                          padding: 4,
                          textAlign: 'left',
                          width: '100%',
                        }}
                      >
                        <span style={{ alignSelf: 'center', fontWeight: 500, overflowWrap: 'anywhere' }}>{subfield}</span>
                        {fields.overview.topics.map((topic) => {
                          const value = fields.overview.matrix[subfield]?.[topic] ?? 0;
                          const intensity = maxCell ? value / maxCell : 0;
                          return (
                            <span
                              key={topic}
                              title={`${subfield}，${topic}，${value} 条声明记录`}
                              style={{
                                background: value ? `rgba(22, 119, 255, ${0.12 + intensity * 0.72})` : '#fafafa',
                                color: intensity > 0.5 ? '#fff' : '#1f2937',
                                display: 'block',
                                minHeight: 36,
                                padding: '8px 6px',
                                textAlign: 'center',
                              }}
                            >
                              {value || ''}
                            </span>
                          );
                        })}
                      </button>
                    ))}
                  </div>
                </div>
                <Typography.Text type="secondary">单元格按论文的领域和主题标签分别计入，不能相加为全库总数。</Typography.Text>
              </Card>

              {detail ? (
                <>
                  <Row gutter={[16, 16]}>
                    <Col xs={12} lg={6}><Card size="small"><Statistic title="论文数" value={detail.paperCount} /></Card></Col>
                    <Col xs={12} lg={6}><Card size="small"><Statistic title="声明记录数" value={detail.claimRecordCount} /></Card></Col>
                    <Col xs={12} lg={6}><Card size="small"><Statistic title="标准关系数" value={detail.standardClaimCount} /></Card></Col>
                    <Col xs={12} lg={6}><Card size="small"><Statistic title="变量数" value={detail.variableCount} /></Card></Col>
                  </Row>
                  <Row gutter={[16, 16]}>
                    <Col xs={24} lg={8}>
                      <Card size="small" title="方法分布">
                        <Space direction="vertical" size="small" style={{ width: '100%' }}>
                          {detail.methodCounts.map((method) => (
                            <div key={method.method}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span>{method.method}</span><span>{method.claimRecordCount}</span>
                              </div>
                              <Progress percent={detail.claimRecordCount ? Math.round((method.claimRecordCount / detail.claimRecordCount) * 100) : 0} showInfo={false} size="small" />
                            </div>
                          ))}
                        </Space>
                      </Card>
                    </Col>
                    <Col xs={24} lg={8}>
                      <Card size="small" title="高频变量">
                        <Space direction="vertical" size="small" style={{ width: '100%' }}>
                          {detail.topVariables.map((variable) => (
                            <Link key={variable.variable} to={`/knowledge/causal-graph/nodes/${encodeURIComponent(variable.variable)}`}>
                              <span>{variable.variable}</span><span style={{ float: 'right' }}>{variable.claimRecordCount}</span>
                            </Link>
                          ))}
                        </Space>
                      </Card>
                    </Col>
                    <Col xs={24} lg={8}>
                      <Card size="small" title="高频关系">
                        <Space direction="vertical" size="small" style={{ width: '100%' }}>
                          {detail.topRelations.map((relation) => (
                            <div key={`${relation.cause}-${relation.effect}`}>
                              <Link to={`/knowledge/causal-graph/edges?cause=${encodeURIComponent(relation.cause)}&effect=${encodeURIComponent(relation.effect)}`}>
                                {relation.cause} {'->'} {relation.effect}
                              </Link>
                              <Typography.Text type="secondary" style={{ display: 'block' }}>
                                本领域 {relation.claimRecordCount} 条记录 / {relation.paperCount} 篇论文 / {relation.methodCount} 种方法；全库 {relation.globalClaimRecordCount} 条记录
                              </Typography.Text>
                            </div>
                          ))}
                        </Space>
                      </Card>
                    </Col>
                  </Row>
                </>
              ) : null}

              <Card size="small" title="完整明细">
                <Space wrap style={{ marginBottom: 16 }}>
                  <Input allowClear aria-label="筛选子领域" placeholder="筛选子领域" value={subfieldSearch} onChange={(event) => setSubfieldSearch(event.target.value)} />
                  <Input allowClear aria-label="筛选主题" placeholder="筛选主题" value={topicSearch} onChange={(event) => setTopicSearch(event.target.value)} />
                </Space>
                <Table<CausalFieldItem>
                  dataSource={filteredItems}
                  rowKey={(item) => `${item.subfield}-${item.topic}`}
                  pagination={{ pageSize: 20, showSizeChanger: true }}
                  columns={[
                    { title: '子领域', dataIndex: 'subfield' },
                    { title: '主题', dataIndex: 'topic' },
                    { title: '声明记录数', dataIndex: 'claimRecordCount', sorter: (a, b) => a.claimRecordCount - b.claimRecordCount },
                    { title: '论文数', dataIndex: 'paperCount', sorter: (a, b) => a.paperCount - b.paperCount },
                  ]}
                />
              </Card>
            </Space>
          );
        }}
      </QueryState>
    </PageContainer>
  );
}
