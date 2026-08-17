import { CopyOutlined, DownloadOutlined, LinkOutlined, RedoOutlined, SearchOutlined } from '@ant-design/icons';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Button, Descriptions, Form, Input, InputNumber, Modal, Progress, Space, Table, Tag, Typography, message } from 'antd';
import { useEffect, useState } from 'react';
import { useAccess } from '@umijs/max';
import type { OpenAlexJournalImportTask, OpenAlexSource } from '@/services/business';
import { createOpenAlexJournalImport, listOpenAlexJournalImports, retryOpenAlexJournalImport, searchOpenAlexSources, syncOpenAlexSources } from '@/services/business';

type ImportForm = { yearFrom?: number; yearTo?: number };

function taskColor(status: OpenAlexJournalImportTask['status']) {
  return ({ QUEUED: 'default', RUNNING: 'processing', SUCCEEDED: 'success', FAILED: 'error' } as const)[status];
}

export default function SourceSearchPage() {
  const access = useAccess();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<OpenAlexSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<OpenAlexSource>();
  const [tasks, setTasks] = useState<OpenAlexJournalImportTask[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [form] = Form.useForm<ImportForm>();

  const search = async () => {
    if (query.trim().length < 2) return;
    setLoading(true);
    try {
      setItems(await searchOpenAlexSources(query));
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async (sourceId: string) => {
    const page = await listOpenAlexJournalImports(sourceId);
    setTasks(page.items);
  };

  const openImport = async (source: OpenAlexSource) => {
    setSelected(source);
    form.resetFields();
    setImportOpen(true);
    try {
      await loadTasks(source.sourceId);
    } catch {
      setTasks([]);
    }
  };

  const submitImport = async () => {
    if (!selected) return;
    const values = await form.validateFields();
    if (values.yearFrom && values.yearTo && values.yearFrom > values.yearTo) {
      form.setFields([{ name: 'yearTo', errors: ['结束年份不能早于起始年份'] }]);
      return;
    }
    setImporting(true);
    try {
      await createOpenAlexJournalImport(selected.sourceId, values.yearFrom, values.yearTo);
      await loadTasks(selected.sourceId);
      message.success('来源元数据导入任务已提交');
    } finally {
      setImporting(false);
    }
  };

  useEffect(() => {
    if (!importOpen || !selected || !tasks.some((task) => task.status === 'QUEUED' || task.status === 'RUNNING')) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      void loadTasks(selected.sourceId);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [importOpen, selected, tasks]);

  return (
    <PageContainer title="OpenAlex 期刊检索">
      <Space.Compact style={{ marginBottom: 16, maxWidth: 720, width: '100%' }}>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onPressEnter={search}
          placeholder="来源名称、Source ID、ISSN 或出版社"
        />
        <Button type="primary" icon={<SearchOutlined />} loading={loading} onClick={search}>检索</Button>
      </Space.Compact>
      {access.canSuperAdmin ? (
        <Button
          style={{ marginBottom: 16, marginLeft: 12 }}
          loading={loading}
          onClick={async () => {
            setLoading(true);
            try {
              const result = await syncOpenAlexSources();
              message.success(`已同步 ${result.syncedCount} 条来源`);
            } finally {
              setLoading(false);
            }
          }}
        >同步 OpenAlex 来源</Button>
      ) : null}
      <ProTable<OpenAlexSource>
        rowKey="sourceId"
        search={false}
        options={false}
        loading={loading}
        dataSource={items}
        columns={[
          { title: '来源名称', dataIndex: 'displayName', ellipsis: true },
          { title: 'Source ID', dataIndex: 'sourceId', width: 170 },
          { title: 'ISSN-L', dataIndex: 'issnL', width: 120 },
          { title: '出版社', dataIndex: 'publisher', ellipsis: true },
          { title: '论文数', dataIndex: 'worksCount', width: 100 },
          {
            title: '收录', width: 130,
            render: (_, source) => <Space>{source.isOa ? <Tag color="green">OA</Tag> : null}{source.isInDoaj ? <Tag color="blue">DOAJ</Tag> : null}</Space>,
          },
          {
            title: '操作', width: 120,
            render: (_, source) => (
              <Space>
                <Button
                  type="text"
                  icon={<CopyOutlined />}
                  title="复制 Source ID"
                  onClick={async () => { await navigator.clipboard.writeText(source.sourceId); message.success('已复制'); }}
                />
                {source.homepageUrl ? <Button type="text" icon={<LinkOutlined />} title="打开期刊主页" href={source.homepageUrl} target="_blank" /> : null}
                {access.canImportOpenAlexJournals ? <Button type="text" icon={<DownloadOutlined />} title="导入来源数据" onClick={() => openImport(source)} /> : null}
              </Space>
            ),
          },
        ]}
        locale={{ emptyText: <Typography.Text type="secondary">输入至少两个字符检索 OpenAlex 来源</Typography.Text> }}
      />
      <Modal
        open={importOpen}
        title="导入来源元数据"
        okText="提交导入"
        cancelText="关闭"
        confirmLoading={importing}
        onCancel={() => setImportOpen(false)}
        onOk={submitImport}
        width={760}
      >
        {selected ? <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Descriptions size="small" column={1} items={[
            { key: 'source', label: '来源', children: selected.displayName },
            { key: 'source', label: 'Source ID', children: selected.sourceId },
          ]} />
          <Form<ImportForm> form={form} layout="inline">
            <Form.Item name="yearFrom" label="起始年份"><InputNumber min={1000} max={9999} placeholder="全部年份" /></Form.Item>
            <Form.Item name="yearTo" label="结束年份"><InputNumber min={1000} max={9999} placeholder="全部年份" /></Form.Item>
          </Form>
          <Table<OpenAlexJournalImportTask>
            rowKey="taskId"
            size="small"
            pagination={false}
            dataSource={tasks}
            columns={[
              { title: '状态', width: 100, render: (_, task) => <Tag color={taskColor(task.status)}>{task.status}</Tag> },
              { title: '年份', width: 130, render: (_, task) => task.yearFrom || task.yearTo ? `${task.yearFrom ?? '全部'} - ${task.yearTo ?? '全部'}` : '全部年份' },
              { title: '进度', render: (_, task) => task.status === 'RUNNING' || task.status === 'QUEUED' ? <Progress percent={task.progressTotal ? Math.round(task.progressCurrent * 100 / task.progressTotal) : 0} size="small" status={task.status === 'RUNNING' ? 'active' : 'normal'} /> : task.result ? `Work ${task.result.workCount}，主题 ${task.result.workTopicCount}` : task.errorMessage || '-' },
              { title: '操作', width: 56, render: (_, task) => task.status === 'FAILED' && access.canImportOpenAlexJournals ? <Button type="text" icon={<RedoOutlined />} title="重试导入" onClick={async () => { await retryOpenAlexJournalImport(task.taskId); await loadTasks(selected.sourceId); }} /> : null },
            ]}
          />
        </Space> : null}
      </Modal>
    </PageContainer>
  );
}
