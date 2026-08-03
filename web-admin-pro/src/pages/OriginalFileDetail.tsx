import { PageContainer } from '@ant-design/pro-components';
import { Link, useParams } from '@umijs/max';
import { Space, Table } from 'antd';
import { useEffect, useState } from 'react';
import type { OriginalFile, TextFile } from '@/services/business';
import { getOriginalFile } from '@/services/business';
import {
  AssetLink,
  bytes,
  fieldLabel,
  QueryState,
  StatusTag,
  WorkLink,
} from './businessUtils';
import { OriginalFileSummary } from './originalFileSummary';

export default function OriginalFileDetailPage() {
  const { fileId = '' } = useParams();
  const [file, setFile] = useState<OriginalFile>();
  const [error, setError] = useState<unknown>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOriginalFile(fileId)
      .then(setFile)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [fileId]);

  return (
    <PageContainer title="论文全文文件详情">
      <QueryState loading={loading} error={error} data={file}>
        {(data) => (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <OriginalFileSummary file={data} />
            <Space>
              <Link to={`/original-files/${fileId}/blocks`}>查看解析后全文</Link>
              {data.matchedWorkId ? (
                <WorkLink workId={data.matchedWorkId}>查看匹配论文详情</WorkLink>
              ) : null}
            </Space>
            <div>
              <h2>文本文件</h2>
              <Table<TextFile>
                dataSource={data.textFiles}
                pagination={false}
                rowKey={(textFile) => `${textFile.fileId}-${textFile.fileType}`}
                columns={[
                  {
                    title: fieldLabel('fileType'),
                    dataIndex: 'fileType',
                    render: (_, textFile) => <StatusTag value={textFile.fileType} />,
                  },
                  { title: fieldLabel('fileName'), dataIndex: 'fileName' },
                  {
                    title: fieldLabel('filePath'),
                    dataIndex: 'filePath',
                    render: (_, textFile) => (
                      <AssetLink url={textFile.fileUrl}>{textFile.filePath}</AssetLink>
                    ),
                  },
                  {
                    title: fieldLabel('fileSize'),
                    dataIndex: 'fileSize',
                    render: (_, textFile) => bytes(textFile.fileSize),
                  },
                ]}
              />
            </div>
            <AssetLink url={data.originalFileUrl}>
              {`查看论文全文文件：${data.originalFileName}`}
            </AssetLink>
          </Space>
        )}
      </QueryState>
    </PageContainer>
  );
}
