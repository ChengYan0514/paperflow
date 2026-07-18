import { FilterOutlined, QuestionCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { Link, useNavigate, useSearchParams } from '@umijs/max';
import { AutoComplete, Button, Card, Col, Form, Input, InputNumber, Row, Select, Space, Statistic, Table, Tabs, Tooltip, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import type { CausalGraphData, CausalGraphEdge, CausalGraphSummary } from '@/services/knowledge';
import { getCausalGraph, getCausalSummary, searchCausalTerms } from '@/services/knowledge';
import { QueryState } from '../../businessUtils';
import { CausalForceGraph } from './components/CausalForceGraph';
import { SignBadge } from './components/SignBadge';

const nodeDefaults = {
  maxEdges: 500,
  maxNodes: 300,
  minDiversity: 5,
  minRecordCount: 20,
};

type NodeSearchValues = {
  maxEdges: number;
  maxNodes: number;
  minDiversity: number;
  minRecordCount: number;
  query?: string;
  subfields?: string[];
};

type EdgeSearchValues = {
  cause?: string;
  effect?: string;
};

function graphParams(searchParams: URLSearchParams) {
  const params = new URLSearchParams(searchParams);
  for (const [key, value] of Object.entries(nodeDefaults)) {
    if (!params.has(key)) {
      params.set(key, String(value));
    }
  }
  return params;
}

function nodeValues(searchParams: URLSearchParams): NodeSearchValues {
  return {
    maxEdges: Number(searchParams.get('maxEdges') || nodeDefaults.maxEdges),
    maxNodes: Number(searchParams.get('maxNodes') || nodeDefaults.maxNodes),
    minDiversity: Number(searchParams.get('minDiversity') || nodeDefaults.minDiversity),
    minRecordCount: Number(searchParams.get('minRecordCount') || nodeDefaults.minRecordCount),
    query: searchParams.get('query') || undefined,
    subfields: searchParams.getAll('subfields'),
  };
}

function paramsFromNodeValues(values: NodeSearchValues) {
  const params = new URLSearchParams();
  params.set('minRecordCount', String(values.minRecordCount));
  params.set('minDiversity', String(values.minDiversity));
  params.set('maxNodes', String(values.maxNodes));
  params.set('maxEdges', String(values.maxEdges));
  if (values.query?.trim()) {
    params.set('query', values.query.trim());
  }
  values.subfields?.filter(Boolean).forEach((subfield) => {
    params.append('subfields', subfield);
  });
  return params;
}

function StwAutoComplete({
  id,
  onChange,
  placeholder,
  value,
}: {
  id?: string;
  onChange?: (value: string) => void;
  placeholder: string;
  value?: string;
}) {
  const [options, setOptions] = useState<{ value: string }[]>([]);

  useEffect(() => {
    const query = value?.trim();
    if (!query) {
      setOptions([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      searchCausalTerms(query)
        .then((terms) => {
          if (!cancelled) {
            setOptions(terms.map((term) => ({ value: term })));
          }
        })
        .catch(() => {
          if (!cancelled) {
            setOptions([]);
          }
        });
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [value]);

  return (
    <AutoComplete
      allowClear
      filterOption={false}
      onChange={onChange}
      options={options}
      value={value}
    >
      <Input id={id} placeholder={placeholder} />
    </AutoComplete>
  );
}

export default function CausalGraphOverviewPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [nodeForm] = Form.useForm<NodeSearchValues>();
  const [edgeForm] = Form.useForm<EdgeSearchValues>();
  const [summary, setSummary] = useState<CausalGraphSummary>();
  const [graph, setGraph] = useState<CausalGraphData>();
  const [error, setError] = useState<unknown>();
  const [loading, setLoading] = useState(true);
  const [searchMode, setSearchMode] = useState<'node' | 'edge'>('node');
  const searchParamKey = searchParams.toString();
  const currentGraphParams = useMemo(() => graphParams(searchParams), [searchParamKey]);
  const currentNodeValues = useMemo(() => nodeValues(searchParams), [searchParamKey]);

  useEffect(() => {
    setLoading(true);
    Promise.all([getCausalSummary(), getCausalGraph(currentGraphParams)])
      .then(([summaryData, graphData]) => {
        setSummary(summaryData);
        setGraph(graphData);
      })
      .catch(setError)
      .finally(() => setLoading(false));
  }, [currentGraphParams]);

  useEffect(() => {
    nodeForm.setFieldsValue(currentNodeValues);
  }, [currentNodeValues, nodeForm]);

  function resetNodeSearch() {
    const values = { ...nodeDefaults, query: undefined, subfields: [] };
    nodeForm.setFieldsValue(values);
    setSearchParams(paramsFromNodeValues(values));
  }

  return (
    <PageContainer title="因果知识图谱">
      <QueryState loading={loading} error={error} data={summary && graph ? { summary, graph } : undefined}>
        {({ summary: summaryData, graph: graphData }) => (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Row gutter={[16, 16]}>
              <Col xs={12} lg={4}>
                <Card size="small"><Statistic title="抽取记录" value={summaryData.overview.totalClaimRecords} /></Card>
              </Col>
              <Col xs={12} lg={4}>
                <Card size="small"><Statistic title="标准关系" value={summaryData.overview.totalStandardClaims} /></Card>
              </Col>
              <Col xs={12} lg={4}>
                <Card size="small"><Statistic title="论文数" value={summaryData.overview.totalPapers} /></Card>
              </Col>
              <Col xs={12} lg={4}>
                <Card size="small"><Statistic title="变量数" value={summaryData.overview.totalNodes} /></Card>
              </Col>
              <Col xs={12} lg={4}>
                <Card size="small"><Statistic title={<span style={{ color: '#94a3b8' }}>当前节点</span>} value={graphData.nodes.length} valueStyle={{ color: '#2563eb' }} /></Card>
              </Col>
              <Col xs={12} lg={4}>
                <Card size="small"><Statistic title={<span style={{ color: '#94a3b8' }}>当前边</span>} value={graphData.edges.length} valueStyle={{ color: '#2563eb' }} /></Card>
              </Col>
            </Row>

            <Card size="small">
              <Tabs
                activeKey={searchMode}
                onChange={(key) => setSearchMode(key as 'node' | 'edge')}
                tabBarExtraContent={(
                  <Typography.Text type="secondary">
                    当前模式：{searchMode === 'node' ? '检索特定节点衍生的网络。' : '检索特定因果关系。'}
                  </Typography.Text>
                )}
                items={[
                  {
                    key: 'node',
                    label: '按节点搜索',
                    children: (
                      <Form form={nodeForm} initialValues={nodeDefaults} layout="vertical" onFinish={(values) => setSearchParams(paramsFromNodeValues(values))}>
                        <Row gutter={[24, 0]}>
                          <Col xs={24} md={12}>
                            <Form.Item label="节点名称" name="query">
                              <StwAutoComplete placeholder="输入变量关键词" />
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={12}>
                            <Form.Item
                              label={(
                                <span>
                                  最小记录数{' '}
                                  <Tooltip title="网络中的边，最少被多少篇论文重复验证。">
                                    <QuestionCircleOutlined aria-label="最小记录数说明" />
                                  </Tooltip>
                                </span>
                              )}
                              name="minRecordCount"
                              rules={[{ required: true, message: '请输入最小记录数' }]}
                            >
                              <InputNumber min={1} max={1000000} style={{ width: '100%' }} />
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={12}>
                            <Form.Item
                              label={(
                                <span>
                                  最小方法数{' '}
                                  <Tooltip title="网络中的边，最少被多少种方法验证。">
                                    <QuestionCircleOutlined aria-label="最小方法数说明" />
                                  </Tooltip>
                                </span>
                              )}
                              name="minDiversity"
                              rules={[{ required: true, message: '请输入最小方法数' }]}
                            >
                              <InputNumber min={1} max={1000} style={{ width: '100%' }} />
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={12}>
                            <Form.Item label="领域" name="subfields">
                              <Select
                                allowClear
                                mode="multiple"
                                options={summaryData.subfields.map((subfield) => ({ label: subfield, value: subfield }))}
                                placeholder="选择领域"
                              />
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={12}>
                            <Form.Item label="预览图中最大节点数" name="maxNodes" rules={[{ required: true, message: '请输入最大节点数' }]}>
                              <InputNumber min={1} max={1000} style={{ width: '100%' }} />
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={12}>
                            <Form.Item label="预览图中最大边数" name="maxEdges" rules={[{ required: true, message: '请输入最大边数' }]}>
                              <InputNumber min={1} max={2000} style={{ width: '100%' }} />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <Button icon={<ReloadOutlined />} onClick={resetNodeSearch}>重置</Button>
                          <Button htmlType="submit" icon={<FilterOutlined />} type="primary">查询</Button>
                        </Space>
                      </Form>
                    ),
                  },
                  {
                    key: 'edge',
                    label: '按边搜索',
                    children: (
                      <Form
                        form={edgeForm}
                        layout="vertical"
                        onFinish={(values) => {
                          const cause = values.cause?.trim();
                          const effect = values.effect?.trim();
                          if (cause && effect) {
                            navigate(`/knowledge/causal-graph/edges?cause=${encodeURIComponent(cause)}&effect=${encodeURIComponent(effect)}`);
                          }
                        }}
                      >
                        <Row gutter={[24, 0]}>
                          <Col xs={24} md={12}>
                            <Form.Item
                              label={(
                                <span>
                                  原因变量 (Cause){' '}
                                  <Tooltip title="因果关系中的自变量，表示可能产生影响的原因。">
                                    <QuestionCircleOutlined aria-label="原因变量说明" />
                                  </Tooltip>
                                </span>
                              )}
                              name="cause"
                              rules={[{ required: true, whitespace: true, message: '请输入原因变量' }]}
                            >
                              <StwAutoComplete placeholder="如：policy, demand" />
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={12}>
                            <Form.Item
                              label={(
                                <span>
                                  结果变量 (Effect){' '}
                                  <Tooltip title="因果关系中的因变量，表示受到影响的结果。">
                                    <QuestionCircleOutlined aria-label="结果变量说明" />
                                  </Tooltip>
                                </span>
                              )}
                              name="effect"
                              rules={[{ required: true, whitespace: true, message: '请输入结果变量' }]}
                            >
                              <StwAutoComplete placeholder="如：inflation, income" />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <Button icon={<ReloadOutlined />} onClick={() => edgeForm.resetFields()}>重置</Button>
                          <Button htmlType="submit" icon={<FilterOutlined />} type="primary">查询</Button>
                        </Space>
                      </Form>
                    ),
                  },
                ]}
              />
            </Card>

            <CausalForceGraph data={graphData} height={620} />

            <Card title="高频因果关系" size="small">
              <Table<CausalGraphEdge>
                dataSource={graphData.edges.slice(0, 20)}
                pagination={false}
                rowKey={(edge) => `${edge.source}-${edge.target}-${edge.claimId}`}
                columns={[
                  {
                    title: '关系',
                    render: (_, edge) => (
                      <Typography.Text>
                        <Link to={`/knowledge/causal-graph/nodes/${encodeURIComponent(edge.source)}`}>{edge.source}</Link>
                        {' -> '}
                        <Link to={`/knowledge/causal-graph/nodes/${encodeURIComponent(edge.target)}`}>{edge.target}</Link>
                      </Typography.Text>
                    ),
                  },
                  { title: '记录数', dataIndex: 'recordCount', width: 100 },
                  { title: '论文数', dataIndex: 'paperCount', width: 100 },
                  { title: '方法数', dataIndex: 'diversity', width: 100 },
                  {
                    title: '主方向',
                    width: 130,
                    render: (_, edge) => <SignBadge value={edge.dominantSignCategory} />,
                  },
                  {
                    title: '详情',
                    width: 100,
                    render: (_, edge) => (
                      <Link to={`/knowledge/causal-graph/edges?cause=${encodeURIComponent(edge.source)}&effect=${encodeURIComponent(edge.target)}`}>查看</Link>
                    ),
                  },
                ]}
              />
            </Card>
          </Space>
        )}
      </QueryState>
    </PageContainer>
  );
}
