import { ModalForm, PageContainer, ProTable } from '@ant-design/pro-components';
import { useModel } from '@umijs/max';
import {
  Button,
  Checkbox,
  Form,
  Input,
  message,
  Popconfirm,
  Select,
  Space,
  Tag,
} from 'antd';
import { useEffect, useState } from 'react';
import type { AdminUser, CreateAdminUserParams } from '@/services/admin';
import {
  createAdminUser,
  listAdminUsers,
  resetAdminUserPassword,
  updateAdminUser,
} from '@/services/admin';
import type { AdminRole, AuthUser } from '@/services/auth';

type InitialState = {
  currentUser?: AuthUser;
};

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : '-';
}

export function roleOptionsFor(role?: AdminRole) {
  if (role === 'SUPER_ADMIN') {
    return ['SUPER_ADMIN', 'ADMIN', 'USER'] as AdminRole[];
  }
  return ['USER'] as AdminRole[];
}

export default function Users() {
  const { initialState } = useModel('@@initialState') as {
    initialState: InitialState;
  };
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [resetUser, setResetUser] = useState<AdminUser | null>(null);
  const [form] = Form.useForm();
  const [resetForm] = Form.useForm();
  const currentRole = initialState.currentUser?.role;

  const refreshUsers = () => listAdminUsers().then(setUsers);

  useEffect(() => {
    if (currentRole !== 'USER') {
      refreshUsers();
    }
  }, [currentRole]);

  if (initialState.currentUser?.role === 'USER') {
    return <PageContainer title="403">403</PageContainer>;
  }

  const updateUser = async (user: AdminUser, values: Parameters<typeof updateAdminUser>[1]) => {
    try {
      await updateAdminUser(user.id, values);
      await refreshUsers();
    } catch {
      message.error('操作失败');
    }
  };

  return (
    <PageContainer title="用户管理">
      <ProTable<AdminUser>
        dataSource={users}
        pagination={false}
        rowKey="id"
        search={false}
        toolbar={{
          actions: [
            <Button key="create" type="primary" onClick={() => setCreateOpen(true)}>
              创建用户
            </Button>,
          ],
        }}
        columns={[
          { title: '用户名', dataIndex: 'username' },
          {
            title: '显示名',
            dataIndex: 'displayName',
            render: (_, user) => user.displayName || '-',
          },
          {
            title: '角色',
            dataIndex: 'role',
            render: (_, user) => (
              <Select<AdminRole>
                aria-label={`修改 ${user.username} 角色`}
                value={user.role}
                style={{ minWidth: 128 }}
                options={roleOptionsFor(currentRole).map((item) => ({
                  label: item,
                  value: item,
                }))}
                onChange={(value) => updateUser(user, { role: value })}
              />
            ),
          },
          {
            title: '状态',
            dataIndex: 'enabled',
            render: (enabled) => (
              <Tag color={enabled ? 'green' : 'default'}>
                {enabled ? '启用' : '禁用'}
              </Tag>
            ),
          },
          {
            title: '最近登录',
            dataIndex: 'lastLoginAt',
            render: (_, user) => formatDate(user.lastLoginAt),
          },
          {
            title: '创建时间',
            dataIndex: 'createdAt',
            render: (_, user) => formatDate(user.createdAt),
          },
          {
            title: '操作',
            render: (_, user) => (
              <Space>
                <Popconfirm
                  title={`${user.enabled ? '禁用' : '启用'} ${user.username}`}
                  okText="确认"
                  cancelText="取消"
                  onConfirm={() => updateUser(user, { enabled: !user.enabled })}
                >
                  <Button size="small">
                    {user.enabled ? `禁用 ${user.username}` : `启用 ${user.username}`}
                  </Button>
                </Popconfirm>
                <Button size="small" onClick={() => setResetUser(user)}>
                  重置 {user.username} 密码
                </Button>
              </Space>
            ),
          },
        ]}
      />
      <ModalForm<CreateAdminUserParams>
        open={createOpen}
        title="创建用户"
        form={form}
        initialValues={{
          enabled: true,
          role: 'USER',
        }}
        layout="vertical"
        modalProps={{ destroyOnHidden: true }}
        onOpenChange={setCreateOpen}
        onFinish={async (values) => {
          await createAdminUser(values);
          form.resetFields();
          await refreshUsers();
          return true;
        }}
      >
        <Form.Item
          label="用户名"
          name="username"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item label="显示名" name="displayName">
          <Input />
        </Form.Item>
        <Form.Item label="角色" name="role">
          <Select>
            {roleOptionsFor(currentRole).map((role) => (
              <Select.Option key={role} value={role}>
                {role}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item
          label="密码"
          name="password"
          rules={[{ required: true }, { min: 5 }]}
        >
          <Input.Password />
        </Form.Item>
        <Form.Item name="enabled" valuePropName="checked">
          <Checkbox>启用</Checkbox>
        </Form.Item>
      </ModalForm>
      <ModalForm<{ newPassword: string }>
        open={Boolean(resetUser)}
        title="重置密码"
        form={resetForm}
        layout="vertical"
        modalProps={{ destroyOnHidden: true }}
        onOpenChange={(open) => {
          if (!open) {
            setResetUser(null);
          }
        }}
        onFinish={async ({ newPassword }) => {
          if (!resetUser) {
            return false;
          }
          await resetAdminUserPassword(resetUser.id, newPassword);
          message.success('密码已重置');
          resetForm.resetFields();
          setResetUser(null);
          return true;
        }}
      >
        <Form.Item
          label="新密码"
          name="newPassword"
          rules={[{ required: true }, { min: 5 }]}
        >
          <Input.Password />
        </Form.Item>
      </ModalForm>
    </PageContainer>
  );
}
