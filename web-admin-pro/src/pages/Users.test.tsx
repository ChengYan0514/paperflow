import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Users, { roleOptionsFor } from './Users';
import {
  createAdminUser,
  listAdminUsers,
  resetAdminUserPassword,
  updateAdminUser,
} from '@/services/admin';

const model = vi.hoisted(() => ({
  currentUser: {
    id: 1,
    username: 'admin',
    displayName: 'Admin',
    role: 'SUPER_ADMIN',
  },
}));

vi.mock('@umijs/max', () => ({
  useModel: () => ({ initialState: { currentUser: model.currentUser } }),
}));

vi.mock('@ant-design/pro-components', async () => {
  const { Form } = await vi.importActual<typeof import('antd')>('antd');

  return {
    PageContainer: ({ children, title }: any) => (
      <main>
        <h1>{title}</h1>
        {children}
      </main>
    ),
    ProTable: ({ dataSource = [], columns = [], rowKey, toolbar }: any) => (
      <section aria-label="用户表格">
        {toolbar?.actions}
        <table>
          <thead>
            <tr>
              {columns.map((column: any) => (
                <th key={String(column.title)}>{column.title}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataSource.map((row: any) => (
              <tr key={typeof rowKey === 'function' ? rowKey(row) : row[rowKey]}>
                {columns.map((column: any) => (
                  <td key={String(column.title)}>
                    {column.render
                      ? column.render(row[column.dataIndex], row)
                      : row[column.dataIndex]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    ),
    ModalForm: ({
      children,
      form,
      initialValues,
      layout,
      open,
      trigger,
      title,
      onFinish,
      onOpenChange,
    }: any) => {
      if (!open) {
        return trigger ? (
          <span
            onClick={() => onOpenChange?.(true)}
            onKeyDown={() => onOpenChange?.(true)}
          >
            {trigger}
          </span>
        ) : null;
      }

      return (
        <Form
          aria-label={title}
          form={form}
          initialValues={initialValues}
          layout={layout}
          onFinish={onFinish}
        >
          <h2>{title}</h2>
          {children}
          <button type="submit">提交</button>
        </Form>
      );
    },
  };
});

vi.mock('@/services/admin', () => ({
  listAdminUsers: vi.fn(async () => [
    {
      id: 1,
      username: 'admin',
      displayName: 'Admin',
      role: 'SUPER_ADMIN',
      enabled: true,
      lastLoginAt: '2026-07-08T12:00:00Z',
      createdAt: '2026-07-01T12:00:00Z',
      updatedAt: '2026-07-01T12:00:00Z',
    },
  ]),
  createAdminUser: vi.fn(async () => ({
    id: 2,
    username: 'new_user',
    displayName: 'New User',
    role: 'USER',
    enabled: true,
    createdAt: '2026-07-08T12:00:00Z',
    updatedAt: '2026-07-08T12:00:00Z',
  })),
  updateAdminUser: vi.fn(async () => ({
    id: 1,
    username: 'admin',
    displayName: 'Admin',
    role: 'ADMIN',
    enabled: true,
    createdAt: '2026-07-01T12:00:00Z',
    updatedAt: '2026-07-08T12:00:00Z',
  })),
  resetAdminUserPassword: vi.fn(async () => undefined),
}));

describe('Users page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    model.currentUser = {
      id: 1,
      username: 'admin',
      displayName: 'Admin',
      role: 'SUPER_ADMIN',
    };
  });

  it('lists admin users for super admins', async () => {
    render(<Users />);

    expect(listAdminUsers).toHaveBeenCalled();
    expect(await screen.findByLabelText('用户表格')).toBeInTheDocument();

    for (const text of [
      '用户名',
      '显示名',
      '角色',
      '状态',
      '最近登录',
      '创建时间',
      '操作',
      'admin',
      'SUPER_ADMIN',
    ]) {
      expect(await screen.findByText(text)).toBeInTheDocument();
    }
  });

  it('blocks regular users', async () => {
    model.currentUser = {
      id: 2,
      username: 'reader',
      displayName: 'Reader',
      role: 'USER',
    };

    render(<Users />);

    expect(await screen.findByRole('heading', { name: '403' })).toBeInTheDocument();
  });

  it('creates users after validating password length', async () => {
    model.currentUser = {
      id: 1,
      username: 'admin',
      displayName: 'Admin',
      role: 'SUPER_ADMIN',
    };

    render(<Users />);

    fireEvent.click(await screen.findByRole('button', { name: '创建用户' }));
    expect(await screen.findByRole('form', { name: '创建用户' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('用户名'), {
      target: { value: 'new_user' },
    });
    fireEvent.change(screen.getByLabelText('显示名'), {
      target: { value: 'New User' },
    });
    fireEvent.change(screen.getByLabelText('密码'), {
      target: { value: '1234' },
    });
    fireEvent.click(screen.getByRole('button', { name: /提\s*交/ }));

    expect(createAdminUser).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('密码'), {
      target: { value: '12345' },
    });
    fireEvent.click(screen.getByRole('button', { name: /提\s*交/ }));

    await screen.findByText('admin');
    expect(createAdminUser).toHaveBeenCalledWith({
      username: 'new_user',
      displayName: 'New User',
      role: 'USER',
      password: '12345',
      enabled: true,
    });
    expect(listAdminUsers).toHaveBeenCalledTimes(2);
  });

  it('limits role choices for admin users', async () => {
    expect(roleOptionsFor('ADMIN')).toEqual(['USER']);
    expect(roleOptionsFor('SUPER_ADMIN')).toEqual([
      'SUPER_ADMIN',
      'ADMIN',
      'USER',
    ]);
  });

  it('updates roles and enabled state', async () => {
    render(<Users />);

    await screen.findByText('admin');
    fireEvent.mouseDown(screen.getByLabelText('修改 admin 角色'));
    const adminOptions = await screen.findAllByText('ADMIN');
    fireEvent.click(adminOptions[adminOptions.length - 1]);
    fireEvent.click(screen.getByRole('button', { name: '禁用 admin' }));
    fireEvent.click(await screen.findByRole('button', { name: /确\s*认/ }));

    expect(updateAdminUser).toHaveBeenCalledWith(1, { role: 'ADMIN' });
    expect(updateAdminUser).toHaveBeenCalledWith(1, { enabled: false });
  });

  it('resets passwords after validating password length', async () => {
    render(<Users />);

    fireEvent.click(await screen.findByRole('button', { name: '重置 admin 密码' }));
    expect(await screen.findByRole('form', { name: '重置密码' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('新密码'), {
      target: { value: '1234' },
    });
    fireEvent.click(screen.getByRole('button', { name: /提\s*交/ }));

    expect(resetAdminUserPassword).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('新密码'), {
      target: { value: '12345' },
    });
    fireEvent.click(screen.getByRole('button', { name: /提\s*交/ }));

    await waitFor(() => {
      expect(resetAdminUserPassword).toHaveBeenCalledWith(1, '12345');
    });
  });
});
