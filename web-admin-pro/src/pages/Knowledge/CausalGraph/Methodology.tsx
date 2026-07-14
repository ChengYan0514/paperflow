import { PageContainer } from '@ant-design/pro-components';
import { Card, Descriptions, Typography } from 'antd';

export default function CausalMethodologyPage() {
  return (
    <PageContainer title="方法说明">
      <Card>
        <Typography.Paragraph>
          因果知识图谱基于 PostgreSQL 中的 claim_table 与 paper_claim_table 构建。标准变量对来自 claim_table，
          论文级证据、方向、方法和显著性来自 paper_claim_table。
        </Typography.Paragraph>
        <Descriptions bordered column={1} size="small">
          <Descriptions.Item label="记录数 recordCount">某标准因果变量对对应的 paper_claim_table.record_id 数量。</Descriptions.Item>
          <Descriptions.Item label="论文数 paperCount">某标准因果变量对涉及的去重论文数量。</Descriptions.Item>
          <Descriptions.Item label="方法多样性 diversity">不同 causal_inference_method 的数量。</Descriptions.Item>
          <Descriptions.Item label="方向分类 signCategory">positive、negative、null_efffect/null、其他复杂方向映射为 mixed。</Descriptions.Item>
          <Descriptions.Item label="分歧度 disagreement">1 - 主方向记录数 / 总记录数。</Descriptions.Item>
          <Descriptions.Item label="证据粒度">关系详情中的证据以 paper_claim_table.record_id 为粒度展示。</Descriptions.Item>
        </Descriptions>
      </Card>
    </PageContainer>
  );
}
