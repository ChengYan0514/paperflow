import { DeleteOutlined, RollbackOutlined } from '@ant-design/icons';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Button, Input, Modal, Space, message } from 'antd';
import { useEffect, useState } from 'react';
import { useAccess } from '@umijs/max';
import type { TrashedPaper } from '@/services/business';
import { listTrashedPapers, purgePaper, restorePaper } from '@/services/business';

export default function PaperTrashPage() {
  const access = useAccess();
  const [items, setItems] = useState<TrashedPaper[]>([]);
  const [query, setQuery] = useState('');
  const load = () => listTrashedPapers(query).then(setItems);
  useEffect(() => { load(); }, []);

  return (
    <PageContainer title="论文回收站">
      <Input.Search
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onSearch={load}
        placeholder="按标题、作者、Source 或文件 ID 检索"
        style={{ marginBottom: 16, maxWidth: 520 }}
      />
      <ProTable<TrashedPaper>
        rowKey="fileId"
        search={false}
        options={false}
        dataSource={items}
        columns={[
          { title: '论文标题', dataIndex: 'paperTitle', ellipsis: true },
          { title: '作者', dataIndex: 'authors', ellipsis: true },
          { title: '来源', dataIndex: 'sourceName', ellipsis: true },
          { title: '删除时间', dataIndex: 'deletedAt', width: 190 },
          { title: '删除原因', dataIndex: 'deleteReason', ellipsis: true },
          { title: '记录版本', dataIndex: 'recordVersion', width: 110 },
          {
            title: '操作', width: 180,
            render: (_, paper) => (
              <Space>
                <Button icon={<RollbackOutlined />} onClick={async () => { await restorePaper(paper.fileId, paper.recordVersion); message.success('论文已恢复'); load(); }}>恢复</Button>
                {access.canPurgePapers ? (
                  <Button danger icon={<DeleteOutlined />} onClick={() => {
                    let confirmation = '';
                    Modal.confirm({
                      title: '永久删除论文',
                      content: <Input placeholder="输入“删除”确认" onChange={(event) => { confirmation = event.target.value; }} />,
                      okButtonProps: { danger: true },
                      onOk: async () => {
                        if (confirmation !== '删除') throw new Error('请输入“删除”');
                        await purgePaper(paper.fileId, paper.recordVersion, confirmation);
                        message.success('论文已永久删除');
                        load();
                      },
                    });
                  }}>永久删除</Button>
                ) : null}
              </Space>
            ),
          },
        ]}
      />
    </PageContainer>
  );
}
