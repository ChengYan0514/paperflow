import { Link } from '@umijs/max';
import { Button, Table, Typography } from 'antd';
import { useState } from 'react';
import type { CausalClaim } from '@/services/knowledge';
import { CausalInferenceMethod } from './CausalInferenceMethod';
import { SignBadge } from './SignBadge';

export function EdgeEvidenceTable({ claims }: { claims: CausalClaim[] }) {
  const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);
  return (
    <Table<CausalClaim>
      dataSource={claims}
      expandable={{
        expandedRowKeys,
        onExpandedRowsChange: (keys) => setExpandedRowKeys([...keys]),
        expandedRowRender: (claim) => (
          <div style={{ maxWidth: 980 }}>
            <Typography.Paragraph>
              {claim.evidence || '暂无证据文本'}
            </Typography.Paragraph>
            <Typography.Text type="secondary">
              原始主张：{claim.claim || '-'}
            </Typography.Text>
          </div>
        ),
      }}
      pagination={{ pageSize: 10, showSizeChanger: true }}
      rowKey="recordId"
      scroll={{ x: 1180 }}
      columns={[
        {
          title: '论文',
          dataIndex: 'title',
          width: 260,
          render: (_, claim) => (
            <div>
              <Link to={`/knowledge/causal-graph/papers/${claim.workId}`}>
                {claim.title || claim.workId}
              </Link>
              <div style={{ color: '#8c8c8c', fontSize: 12 }}>
                {claim.sourceName || claim.sourceId || '-'} ·{' '}
                {claim.publicationYear || '-'}
              </div>
            </div>
          ),
        },
        {
          title: '方向',
          dataIndex: 'signCategory',
          width: 110,
          render: (_, claim) => <SignBadge value={claim.signCategory} />,
        },
        {
          title: '方法',
          dataIndex: 'causalInferenceMethod',
          width: 180,
          render: (_, claim) => (
            <CausalInferenceMethod
              method={claim.causalInferenceMethod}
              otherDescription={claim.evidenceMethodOtherDescription}
            />
          ),
        },
        { title: '显著性', dataIndex: 'statisticalSignificance', width: 130 },
        { title: '领域', dataIndex: 'subfieldName', width: 180 },
        {
          title: '操作',
          width: 150,
          render: (_, claim) => (
            <Button size="small" type="link">
              <Link to={`/works/${claim.workId}`}>查看论文详情</Link>
            </Button>
          ),
        },
      ]}
    />
  );
}
