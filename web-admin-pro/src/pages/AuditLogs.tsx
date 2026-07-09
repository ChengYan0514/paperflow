import { PageContainer, ProTable } from '@ant-design/pro-components';
import { useSearchParams } from '@umijs/max';
import { Button, Card, DatePicker, Form, Input, Select, Space } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import type { Page } from '@/services/business';
import type { AdminAuditLog } from '@/services/admin';
import { listAdminAuditLogs } from '@/services/admin';
import { dateText, fieldLabel, QueryState, StatusTag, tablePagination, valueLabel } from './businessUtils';

const actionOptions = [
  'LOGIN',
  'LOGOUT',
  'CHANGE_PASSWORD',
  'CREATE_ADMIN_USER',
  'UPDATE_ADMIN_USER',
  'RESET_PASSWORD',
].map((value) => ({ label: valueLabel(value), value }));

const resultOptions = ['SUCCESS', 'FAILURE'].map((value) => ({
  label: valueLabel(value),
  value,
}));

function initialValues(searchParams: URLSearchParams) {
  const createdFrom = searchParams.get('createdFrom');
  const createdTo = searchParams.get('createdTo');
  return {
    actorUsername: searchParams.get('actorUsername') ?? undefined,
    action: searchParams.get('action') ?? undefined,
    targetType: searchParams.get('targetType') ?? undefined,
    result: searchParams.get('result') ?? undefined,
    requestId: searchParams.get('requestId') ?? undefined,
    createdRange:
      createdFrom || createdTo
        ? [createdFrom ? dayjs(createdFrom) : null, createdTo ? dayjs(createdTo) : null]
        : undefined,
  };
}

export default function AuditLogsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<Page<AdminAuditLog>>();
  const [error, setError] = useState<unknown>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listAdminAuditLogs(searchParams)
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [searchParams]);

  return (
    <PageContainer title="操作审计">
      <Card size="small" style={{ marginBottom: 16 }} styles={{ body: { padding: 12 } }}>
        <Form
          key={searchParams.toString()}
          initialValues={initialValues(searchParams)}
          layout="vertical"
          onFinish={(values) => {
            const next = new URLSearchParams(searchParams);
            next.delete('page');
            for (const key of ['actorUsername', 'action', 'targetType', 'result', 'requestId']) {
              const value = values[key];
              if (value === undefined || value === null || String(value).trim() === '') {
                next.delete(key);
              } else {
                next.set(key, String(value).trim());
              }
            }
            next.delete('createdFrom');
            next.delete('createdTo');
            const [from, to] = values.createdRange ?? [];
            if (from) {
              next.set('createdFrom', from.toISOString());
            }
            if (to) {
              next.set('createdTo', to.toISOString());
            }
            setSearchParams(next);
          }}
        >
          <Space wrap align="end" size={12}>
            <Form.Item label={fieldLabel('actorUsername')} name="actorUsername" style={{ marginBottom: 0 }}>
              <Input allowClear placeholder="输入操作人" style={{ width: 180 }} />
            </Form.Item>
            <Form.Item label={fieldLabel('action')} name="action" style={{ marginBottom: 0 }}>
              <Select allowClear options={actionOptions} placeholder="选择操作类型" style={{ width: 180 }} />
            </Form.Item>
            <Form.Item label={fieldLabel('targetType')} name="targetType" style={{ marginBottom: 0 }}>
              <Input allowClear placeholder="输入目标类型" style={{ width: 160 }} />
            </Form.Item>
            <Form.Item label={fieldLabel('result')} name="result" style={{ marginBottom: 0 }}>
              <Select allowClear options={resultOptions} placeholder="选择结果" style={{ width: 140 }} />
            </Form.Item>
            <Form.Item label={fieldLabel('requestId')} name="requestId" style={{ marginBottom: 0 }}>
              <Input allowClear placeholder="输入请求 ID" style={{ width: 180 }} />
            </Form.Item>
            <Form.Item label={fieldLabel('createdRange')} name="createdRange" style={{ marginBottom: 0 }}>
              <DatePicker.RangePicker showTime style={{ width: 360 }} />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0 }}>
              <Button type="primary" htmlType="submit">
                查询
              </Button>
            </Form.Item>
          </Space>
        </Form>
      </Card>
      <QueryState loading={loading} error={error} data={data}>
        {(page) => (
          <ProTable<AdminAuditLog>
            dataSource={page.items}
            rowKey="id"
            search={false}
            toolBarRender={false}
            pagination={tablePagination(page, searchParams, setSearchParams)}
            scroll={{ x: 1200 }}
            columns={[
              {
                title: fieldLabel('createdAt'),
                dataIndex: 'createdAt',
                width: 160,
                render: (_, row) => dateText(row.createdAt),
              },
              {
                title: fieldLabel('actorUsername'),
                dataIndex: 'actorUsername',
                width: 120,
                render: (_, row) => row.actorUsername || '-',
              },
              {
                title: fieldLabel('action'),
                dataIndex: 'action',
                width: 150,
                render: (_, row) => valueLabel(row.action),
              },
              {
                title: fieldLabel('targetType'),
                dataIndex: 'targetType',
                width: 120,
                render: (_, row) => valueLabel(row.targetType),
              },
              {
                title: fieldLabel('targetId'),
                dataIndex: 'targetId',
                width: 140,
                render: (_, row) => row.targetId || '-',
              },
              {
                title: fieldLabel('result'),
                dataIndex: 'result',
                width: 90,
                render: (_, row) => <StatusTag value={row.result} />,
              },
              {
                title: fieldLabel('requestId'),
                dataIndex: 'requestId',
                width: 180,
                render: (_, row) => row.requestId || '-',
              },
              {
                title: fieldLabel('remoteAddr'),
                dataIndex: 'remoteAddr',
                width: 120,
                render: (_, row) => row.remoteAddr || '-',
              },
              {
                title: fieldLabel('message'),
                dataIndex: 'message',
                width: 180,
                render: (_, row) => row.message || '-',
              },
            ]}
          />
        )}
      </QueryState>
    </PageContainer>
  );
}
