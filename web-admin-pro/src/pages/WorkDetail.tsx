import { PageContainer } from '@ant-design/pro-components';
import { Link, useParams } from '@umijs/max';
import { Button, Card, Space, Statistic, Table } from 'antd';
import { useEffect, useState } from 'react';
import type { Author, WorkDetail } from '@/services/business';
import { getWork } from '@/services/business';
import type { CausalPaperSummary } from '@/services/knowledge';
import { getCausalPaperSummary } from '@/services/knowledge';
import {
  DetailGrid,
  fieldLabel,
  OriginalFileLink,
  QueryState,
  SourceLink,
  StatusTag,
} from './businessUtils';
import { OriginalFileSummary } from './originalFileSummary';

export default function WorkDetailPage() {
  const { workId = '' } = useParams();
  const [detail, setDetail] = useState<WorkDetail>();
  const [causalSummary, setCausalSummary] = useState<CausalPaperSummary>();
  const [error, setError] = useState<unknown>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getWork(workId), getCausalPaperSummary(workId)])
      .then(([workDetail, summary]) => {
        setDetail(workDetail);
        setCausalSummary(summary);
      })
      .catch(setError)
      .finally(() => setLoading(false));
  }, [workId]);

  return (
    <PageContainer title="论文详情">
      <QueryState loading={loading} error={error} data={detail}>
        {(data) => (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <DetailGrid
              items={[
                { label: fieldLabel('workId'), value: data.work.workId },
                { label: fieldLabel('title'), value: data.work.title, span: 2 },
                { label: fieldLabel('doi'), value: data.work.doi },
                { label: fieldLabel('publicationYear'), value: data.work.publicationYear },
                { label: fieldLabel('publicationDate'), value: data.work.publicationDate },
                { label: fieldLabel('type'), value: data.work.type },
                { label: fieldLabel('language'), value: data.work.language },
                {
                  label: fieldLabel('processingStatus'),
                  value: <StatusTag value={data.processingStatus} />,
                },
              ]}
            />
            <div>
              <h2>来源期刊</h2>
              <Space wrap>
                {data.sources.map((source) => (
                  <SourceLink
                    key={source.sourceId}
                    sourceId={source.sourceId}
                    sourceName={source.sourceName}
                  />
                ))}
              </Space>
            </div>
            <div>
              <h2>作者</h2>
              <Table<Author>
                dataSource={data.authors}
                pagination={false}
                rowKey="authorId"
                columns={[
                  { title: fieldLabel('authorId'), dataIndex: 'authorId' },
                  { title: fieldLabel('authorName'), dataIndex: 'authorName' },
                  { title: fieldLabel('authorPosition'), dataIndex: 'authorPosition' },
                ]}
              />
            </div>
            <div>
              <h2>匹配的论文全文文件</h2>
              {data.matchedFile ? <OriginalFileSummary file={data.matchedFile} /> : '未匹配论文全文文件'}
            </div>
            <div>
              <h2>因果声明</h2>
              <Card size="small">
                {causalSummary?.hasCausalClaims ? (
                  <Space wrap size="large">
                    <Statistic title="声明记录" value={causalSummary.claimRecordCount} />
                    <Statistic title="标准变量对" value={causalSummary.standardClaimCount} />
                    <Statistic title="变量数" value={causalSummary.variableCount} />
                    <Button type="primary">
                      <Link to={`/knowledge/causal-graph/papers/${workId}`}>查看因果声明</Link>
                    </Button>
                  </Space>
                ) : (
                  '暂无因果声明'
                )}
              </Card>
            </div>
            <Space>
              <Link to={`/works/${workId}/blocks`}>查看解析后全文</Link>
              {data.matchedFile ? (
                <OriginalFileLink fileId={data.matchedFile.fileId}>
                  查看匹配论文全文文件
                </OriginalFileLink>
              ) : null}
            </Space>
          </Space>
        )}
      </QueryState>
    </PageContainer>
  );
}
