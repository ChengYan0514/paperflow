import { PageContainer } from '@ant-design/pro-components';
import { Card, Table } from 'antd';
import { useEffect, useState } from 'react';
import type { CausalFieldAnalysis, CausalFieldItem } from '@/services/knowledge';
import { getCausalFields } from '@/services/knowledge';
import { QueryState } from '../../businessUtils';

export default function CausalFieldsPage() {
  const [data, setData] = useState<CausalFieldAnalysis>();
  const [error, setError] = useState<unknown>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCausalFields().then(setData).catch(setError).finally(() => setLoading(false));
  }, []);

  return (
    <PageContainer title="领域分析">
      <QueryState loading={loading} error={error} data={data}>
        {(fields) => (
          <Card size="small">
            <Table<CausalFieldItem>
              dataSource={fields.items}
              rowKey={(item) => `${item.subfield}-${item.topic}`}
              pagination={{ pageSize: 20, showSizeChanger: true }}
              columns={[
                { title: '子领域', dataIndex: 'subfield' },
                { title: '主题', dataIndex: 'topic' },
                { title: '声明记录数', dataIndex: 'claimRecordCount', sorter: (a, b) => a.claimRecordCount - b.claimRecordCount },
                { title: '论文数', dataIndex: 'paperCount', sorter: (a, b) => a.paperCount - b.paperCount },
                { title: '变量数', dataIndex: 'variableCount', sorter: (a, b) => a.variableCount - b.variableCount },
              ]}
            />
          </Card>
        )}
      </QueryState>
    </PageContainer>
  );
}
