import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Link, useSearchParams } from '@umijs/max';
import { useEffect, useState } from 'react';
import type { OriginalFile, Page } from '@/services/business';
import { listOriginalFiles } from '@/services/business';
import {
  bytes,
  fieldLabel,
  QueryState,
  SourceLink,
  StatusTag,
  WorkLink,
} from './businessUtils';

export default function OriginalFilesPage() {
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<Page<OriginalFile>>();
  const [error, setError] = useState<unknown>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listOriginalFiles(searchParams)
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [searchParams]);

  return (
    <PageContainer title="原始文件列表">
      <QueryState loading={loading} error={error} data={data}>
        {(page) => (
          <ProTable<OriginalFile>
            dataSource={page.items}
            rowKey="fileId"
            search={false}
            toolBarRender={false}
            pagination={false}
            columns={[
              {
                title: fieldLabel('fileId'),
                dataIndex: 'fileId',
                render: (_, file) => (
                  <Link to={`/original-files/${file.fileId}`}>{file.fileId}</Link>
                ),
              },
              {
                title: fieldLabel('sourceId'),
                dataIndex: 'sourceId',
                render: (_, file) => <SourceLink sourceId={file.sourceId} />,
              },
              {
                title: fieldLabel('originalFileType'),
                dataIndex: 'originalFileType',
                render: (_, file) => <StatusTag value={file.originalFileType} />,
              },
              { title: fieldLabel('originalFileName'), dataIndex: 'originalFileName' },
              {
                title: fieldLabel('fileSize'),
                dataIndex: 'fileSize',
                render: (_, file) => bytes(file.fileSize),
              },
              {
                title: fieldLabel('matchedWorkId'),
                dataIndex: 'matchedWorkId',
                render: (_, file) =>
                  file.matchedWorkId ? <WorkLink workId={file.matchedWorkId} /> : '-',
              },
              {
                title: fieldLabel('flagMatch'),
                dataIndex: 'flagMatch',
                render: (_, file) => <StatusTag kind="flagMatch" value={file.flagMatch} />,
              },
              {
                title: fieldLabel('flagText'),
                dataIndex: 'flagText',
                render: (_, file) => <StatusTag kind="flagText" value={file.flagText} />,
              },
              {
                title: fieldLabel('flagBlock'),
                dataIndex: 'flagBlock',
                render: (_, file) => <StatusTag kind="flagBlock" value={file.flagBlock} />,
              },
              { title: fieldLabel('provider'), dataIndex: 'provider' },
              { title: fieldLabel('year'), dataIndex: 'year' },
            ]}
          />
        )}
      </QueryState>
    </PageContainer>
  );
}
