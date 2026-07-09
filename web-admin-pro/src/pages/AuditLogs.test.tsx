import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AuditLogsPage from './AuditLogs';
import { listAdminAuditLogs } from '@/services/admin';

let searchParams = new URLSearchParams('action=LOGIN&result=SUCCESS');
let setSearchParams = vi.fn();

vi.mock('@umijs/max', () => ({
  useSearchParams: () => [searchParams, setSearchParams],
}));

vi.mock('@ant-design/pro-components', () => ({
  PageContainer: ({ children, title }: any) => (
    <main>
      <h1>{title}</h1>
      {children}
    </main>
  ),
  ProTable: ({ dataSource = [], columns = [], rowKey }: any) => (
    <table>
      <tbody>
        {dataSource.map((row: any) => (
          <tr key={typeof rowKey === 'function' ? rowKey(row) : row[rowKey]}>
            {columns.map((column: any) => (
              <td key={String(column.title)}>
                {column.render ? column.render(row[column.dataIndex], row) : row[column.dataIndex]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ),
}));

vi.mock('@/services/admin', () => ({
  listAdminAuditLogs: vi.fn(async () => ({
    items: [
      {
        id: 1,
        actorUsername: 'Admin',
        action: 'LOGIN',
        targetType: 'AUTH',
        targetId: '1',
        result: 'SUCCESS',
        requestId: 'req-1',
        remoteAddr: '127.0.0.1',
        message: '登录成功',
        createdAt: '2026-07-09T10:00:00Z',
      },
    ],
    page: 1,
    size: 10,
    total: 1,
  })),
}));

describe('audit logs page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParams = new URLSearchParams('action=LOGIN&result=SUCCESS');
    setSearchParams = vi.fn();
  });

  it('lists audit logs with current URL query', async () => {
    render(<AuditLogsPage />);

    expect(await screen.findByText('Admin')).toBeInTheDocument();
    expect(listAdminAuditLogs).toHaveBeenCalledWith(searchParams);
    expect(screen.getAllByText('登录').length).toBeGreaterThan(0);
    expect(screen.getAllByText('成功').length).toBeGreaterThan(0);
    expect(screen.getByText('req-1')).toBeInTheDocument();
  });
});
