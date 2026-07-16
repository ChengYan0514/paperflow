import { FilterOutlined, ReloadOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { Link, useSearchParams } from '@umijs/max';
import { Button, Card, Col, Form, Input, InputNumber, Row, Select, Space, Statistic, Table, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import type { CausalGraphData, CausalGraphEdge, CausalGraphSummary } from '@/services/knowledge';
import { getCausalGraph, getCausalSummary } from '@/services/knowledge';
import { QueryState } from '../../businessUtils';
import { CausalForceGraph } from './components/CausalForceGraph';
import { SignBadge } from './components/SignBadge';

export default function CausalGraphOverviewPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [summary, setSummary] = useState<CausalGraphSummary>();
  const [graph, setGraph] = useState<CausalGraphData>();
  const [error, setError] = useState<unknown>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([getCausalSummary(), getCausalGraph(searchParams)])
      .then(([summaryData, graphData]) => {
        setSummary(summaryData);
        setGraph(graphData);
      })
      .catch(setError)
      .finally(() => setLoading(false));
  }, [searchParams]);

  const initialValues = useMemo(
    () => ({
      minRecordCount: Number(searchParams.get('minRecordCount') || summary?.overview.graphMinRepetition || 3),
      minDiversity: Number(searchParams.get('minDiversity') || 1),
      query: searchParams.get('query') || undefined,
      subfields: searchParams.getAll('subfields'),
      maxNodes: Number(searchParams.get('maxNodes') || 300),
      maxEdges: Number(searchParams.get('maxEdges') || 500),
    }),
    [searchParams, summary],
  );

  return (
    <PageContainer title="因果知识图谱" subTitle="从 PaperFlow PostgreSQL 读取标准化因果主张">
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
                <Card size="small"><Statistic title="当前节点" value={graphData.nodes.length} /></Card>
              </Col>
              <Col xs={12} lg={4}>
                <Card size="small"><Statistic title="当前边" value={graphData.edges.length} /></Card>
              </Col>
            </Row>

            <Card size="small">
              <Form
                initialValues={initialValues}
                layout="vertical"
                onFinish={(values) => {
                  const next = new URLSearchParams();
                  for (const [key, value] of Object.entries(values)) {
                    if (Array.isArray(value)) {
                      value.forEach((item) => {
                        if (item) {
                          next.append(key, String(item));
                        }
                      });
                    } else if (value !== undefined && value !== null && String(value).trim() !== '') {
                      next.set(key, String(value).trim());
                    }
                  }
                  setSearchParams(next);
                }}
              >
                <Space wrap align="end" size={12}>
                  <Form.Item label="变量关键词" name="query" style={{ marginBottom: 0 }}>
                    <Input allowClear placeholder="cause/effect 关键词" style={{ width: 220 }} />
                  </Form.Item>
                  <Form.Item label="最小记录数" name="minRecordCount" style={{ marginBottom: 0 }}>
                    <InputNumber min={1} max={1000000} style={{ width: 120 }} />
                  </Form.Item>
                  <Form.Item label="最小方法数" name="minDiversity" style={{ marginBottom: 0 }}>
                    <InputNumber min={1} max={1000} style={{ width: 120 }} />
                  </Form.Item>
                  <Form.Item label="领域" name="subfields" style={{ marginBottom: 0 }}>
                    <Select
                      allowClear
                      mode="multiple"
                      options={summaryData.subfields.map((subfield) => ({ label: subfield, value: subfield }))}
                      placeholder="选择领域"
                      style={{ minWidth: 260 }}
                    />
                  </Form.Item>
                  <Form.Item label="最大节点" name="maxNodes" style={{ marginBottom: 0 }}>
                    <InputNumber min={1} max={1000} style={{ width: 110 }} />
                  </Form.Item>
                  <Form.Item label="最大边" name="maxEdges" style={{ marginBottom: 0 }}>
                    <InputNumber min={1} max={2000} style={{ width: 110 }} />
                  </Form.Item>
                  <Button htmlType="submit" icon={<FilterOutlined />} type="primary">查询</Button>
                  <Button icon={<ReloadOutlined />} onClick={() => setSearchParams(new URLSearchParams())}>重置</Button>
                </Space>
              </Form>
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
