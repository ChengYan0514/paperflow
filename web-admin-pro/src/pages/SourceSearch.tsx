import { CopyOutlined, LinkOutlined, SearchOutlined } from '@ant-design/icons';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Button, Input, Space, Tag, Typography, message } from 'antd';
import { useState } from 'react';
import { useAccess } from '@umijs/max';
import type { OpenAlexSource } from '@/services/business';
import { searchOpenAlexSources, syncOpenAlexSources } from '@/services/business';

export default function SourceSearchPage() {
  const access = useAccess();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<OpenAlexSource[]>([]);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (query.trim().length < 2) return;
    setLoading(true);
    try {
      setItems(await searchOpenAlexSources(query));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer title="OpenAlex 来源检索">
      <Space.Compact style={{ marginBottom: 16, maxWidth: 720, width: '100%' }}>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onPressEnter={search}
          placeholder="期刊名称、Source ID、ISSN 或出版社"
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
          { title: '期刊名称', dataIndex: 'displayName', ellipsis: true },
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
              </Space>
            ),
          },
        ]}
        locale={{ emptyText: <Typography.Text type="secondary">输入至少两个字符进行检索</Typography.Text> }}
      />
    </PageContainer>
  );
}
