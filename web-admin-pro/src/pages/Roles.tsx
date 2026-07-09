import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import { useModel } from '@umijs/max';
import { useEffect, useState } from 'react';
import type { AdminRoleInfo } from '@/services/admin';
import { listAdminRoles } from '@/services/admin';
import type { AuthUser } from '@/services/auth';

type InitialState = {
  currentUser?: AuthUser;
};

const roleLabels: Record<AdminRoleInfo['role'], string> = {
  SUPER_ADMIN: '超级管理员',
  ADMIN: '管理员',
  USER: '用户',
};

const columns: ProColumns<AdminRoleInfo>[] = [
  { title: '角色', dataIndex: 'role' },
  {
    title: '名称',
    dataIndex: 'role',
    render: (_, role) => roleLabels[role.role],
  },
  { title: '权限说明', dataIndex: 'description' },
];

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
      <ProTable<AdminRoleInfo>
        columns={columns}
        dataSource={roles}
        pagination={false}
        rowKey="role"
        search={false}
        toolBarRender={false}
      />
    </PageContainer>
  );
}
