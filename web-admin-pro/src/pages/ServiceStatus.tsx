import { PageContainer } from '@ant-design/pro-components';
import { Alert, Card, Col, Descriptions, Row, Table, Tag } from 'antd';
import { useEffect, useState } from 'react';
import type { RecentError, ServiceCheck, ServiceStatus } from '@/services/business';
import { getServiceStatus } from '@/services/business';
import { dateText, QueryState } from './businessUtils';

function CheckCard({ check }: { check: ServiceCheck }) {
  return (
    <Card size="small">
      <Descriptions
        column={1}
        items={[
          { key: 'name', label: '检查项', children: check.name },
          {
            key: 'status',
            label: '状态',
            children: <Tag color={check.ok ? 'success' : 'error'}>{check.ok ? '正常' : '异常'}</Tag>,
          },
          { key: 'message', label: '说明', children: check.message },
        ]}
      />
    </Card>
  );
}

export default function ServiceStatusPage() {
  const [data, setData] = useState<ServiceStatus>();
  const [error, setError] = useState<unknown>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getServiceStatus()
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageContainer title="服务状态">
      <QueryState loading={loading} error={error} data={data}>
        {(status) => (
          <>
            <Alert
              message={status.status === 'UP' ? '服务运行正常' : '服务存在异常'}
              description={`版本 ${status.version}，检查时间 ${dateText(status.checkedAt)}`}
              type={status.status === 'UP' ? 'success' : 'error'}
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Row gutter={[16, 16]}>
              {[status.backend, status.database, status.dataRoot, status.disk].map((check) => (
                <Col key={check.name} xs={24} lg={12}>
                  <CheckCard check={check} />
                </Col>
              ))}
            </Row>
            <Card title="最近错误" style={{ marginTop: 16 }}>
              <Table<RecentError>
                dataSource={status.recentErrors}
                rowKey={(row) => `${row.requestId}-${row.createdAt}`}
                pagination={false}
                columns={[
                  { title: '时间', dataIndex: 'createdAt', render: (value) => dateText(value) },
                  { title: '请求 ID', dataIndex: 'requestId' },
                  { title: '方法', dataIndex: 'method', width: 80 },
                  { title: '路径', dataIndex: 'path' },
                  { title: '错误', dataIndex: 'message', render: (value) => value || '-' },
                ]}
              />
            </Card>
          </>
        )}
      </QueryState>
    </PageContainer>
  );
}
