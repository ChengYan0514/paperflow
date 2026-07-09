import { PageContainer } from '@ant-design/pro-components';
import { useModel } from '@umijs/max';
import { Table } from 'antd';
import { useEffect, useState } from 'react';
import type { AdminRoleInfo } from '@/services/admin';
import { listAdminRoles } from '@/services/admin';
import type { AuthUser } from '@/services/auth';

type InitialState = {
  currentUser?: AuthUser;
};

export default function Roles() {
  const { initialState } = useModel('@@initialState') as {
    initialState: InitialState;
  };
  const [roles, setRoles] = useState<AdminRoleInfo[]>([]);

  useEffect(() => {
    if (initialState.currentUser?.role === 'SUPER_ADMIN') {
      listAdminRoles().then(setRoles);
    }
  }, [initialState.currentUser?.role]);

  if (initialState.currentUser?.role !== 'SUPER_ADMIN') {
    return <PageContainer title="403">403</PageContainer>;
  }

  return (
    <PageContainer title="角色管理">
      <Table
        dataSource={roles}
        pagination={false}
        rowKey="role"
        columns={[
          { title: '角色', dataIndex: 'role' },
          { title: '权限说明', dataIndex: 'description' },
        ]}
      />
    </PageContainer>
  );
}
