import { PageContainer } from '@ant-design/pro-components';
import { Link, useParams } from '@umijs/max';
import { Space, Table } from 'antd';
import { useEffect, useState } from 'react';
import type { Author, WorkDetail } from '@/services/business';
import { getWork } from '@/services/business';
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
  const [error, setError] = useState<unknown>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWork(workId)
      .then(setDetail)
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
                  <SourceLink key={source.sourceId} sourceId={source.sourceId} />
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
              <h2>匹配的原始文件</h2>
              {data.matchedFile ? <OriginalFileSummary file={data.matchedFile} /> : '未匹配原始文件'}
            </div>
            <Space>
              <Link to={`/works/${workId}/blocks`}>查看内容块</Link>
              {data.matchedFile ? <OriginalFileLink fileId={data.matchedFile.fileId} /> : null}
            </Space>
          </Space>
        )}
      </QueryState>
    </PageContainer>
  );
}
