import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Roles from './Roles';
import { listAdminRoles } from '@/services/admin';

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

vi.mock('@ant-design/pro-components', () => ({
  PageContainer: ({ children, title }: any) => (
    <main>
      <h1>{title}</h1>
      {children}
    </main>
  ),
}));

vi.mock('@/services/admin', () => ({
  listAdminRoles: vi.fn(async () => [
    { role: 'SUPER_ADMIN', description: 'Full system administration' },
    { role: 'ADMIN', description: 'Manage users with USER role' },
    { role: 'USER', description: 'Read-only admin access' },
  ]),
}));

describe('Roles page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    model.currentUser = {
      id: 1,
      username: 'admin',
      displayName: 'Admin',
      role: 'SUPER_ADMIN',
    };
  });

  it('shows the fixed role matrix for super admins', async () => {
    render(<Roles />);

    expect(listAdminRoles).toHaveBeenCalled();
    expect(await screen.findByText('SUPER_ADMIN')).toBeInTheDocument();
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
    expect(screen.getByText('USER')).toBeInTheDocument();
    expect(screen.getByText('Full system administration')).toBeInTheDocument();
  });

  it('blocks admins and users', async () => {
    model.currentUser = {
      id: 2,
      username: 'manager',
      displayName: 'Manager',
      role: 'ADMIN',
    };

    render(<Roles />);

    expect(await screen.findByRole('heading', { name: '403' })).toBeInTheDocument();
    expect(listAdminRoles).not.toHaveBeenCalled();
  });
});
