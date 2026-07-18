import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { getInitialState, layout } from './app';
import { changePassword, getCurrentUser, logout } from '@/services/auth';

const mocks = vi.hoisted(() => ({
  location: {
    hash: '',
    pathname: '/task-status',
    search: '',
  },
  replace: vi.fn(),
}));

vi.mock('@umijs/max', () => ({
  history: {
    location: mocks.location,
    replace: mocks.replace,
  },
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

vi.mock('@ant-design/pro-components', async () => {
  const { Form } = await vi.importActual<typeof import('antd')>('antd');

  return {
    ModalForm: ({
      children,
      form,
      layout,
      open,
      title,
      onFinish,
      onOpenChange,
    }: any) =>
      open ? (
        <Form
          aria-label={title}
          form={form}
          layout={layout}
          onFinish={onFinish}
        >
          <h2>{title}</h2>
          {children}
          <button type="submit">提交</button>
          <button type="button" onClick={() => onOpenChange?.(false)}>
            取消
          </button>
        </Form>
      ) : null,
  };
});

vi.mock('antd', async () => {
  const actual = await vi.importActual<typeof import('antd')>('antd');

  return {
    ...actual,
    Dropdown: ({ children, menu }: any) => (
      <div>
        {children}
        {menu.items.map((item: any) => (
          <button
            key={item.key}
            type="button"
            onClick={() => menu.onClick({ key: item.key })}
          >
            {item.label}
          </button>
        ))}
      </div>
    ),
  };
});

vi.mock('@/services/auth', () => ({
  apiBaseUrl: '',
  changePassword: vi.fn(async () => undefined),
  getCurrentUser: vi.fn(async () => ({
    id: 1,
    username: 'admin',
    displayName: 'Admin',
    role: 'SUPER_ADMIN',
  })),
  logout: vi.fn(async () => undefined),
}));

describe('app runtime auth', () => {
  it('loads current user for backend pages', async () => {
    const initialState = await getInitialState();

    expect(getCurrentUser).toHaveBeenCalled();
    expect(initialState.currentUser?.role).toBe('SUPER_ADMIN');
  });

  it('redirects anonymous backend visits to login', async () => {
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Response(null, { status: 401 }));

    const initialState = await getInitialState();

    expect(initialState.currentUser).toBeUndefined();
    expect(mocks.replace).toHaveBeenCalledWith(
      '/login?redirect=%2Ftask-status',
    );
  });

  it('logs out from the layout avatar menu', async () => {
    const runtime = layout({
      initialState: {
        currentUser: {
          id: 1,
          username: 'admin',
          displayName: 'Admin',
          role: 'SUPER_ADMIN',
        },
      },
      setInitialState: vi.fn(),
    } as any);

    const node = (runtime.avatarProps as any)?.render?.({}, <span>Admin</span>);

    expect(node).toBeTruthy();
    render(node);
    fireEvent.click(screen.getByRole('button', { name: '退出登录' }));

    await waitFor(() => {
      expect(logout).toHaveBeenCalled();
      expect(mocks.replace).toHaveBeenCalledWith('/login');
    });
  });

  it('keeps parent menu groups as accordion toggles', () => {
    const runtime = layout({
      initialState: {
        currentUser: {
          id: 1,
          username: 'admin',
          displayName: 'Admin',
          role: 'SUPER_ADMIN',
        },
      },
      setInitialState: vi.fn(),
    } as any);

    const captures: any[] = [];
    function MenuProbe(props: any) {
      captures.push(props);
      return (
        <button
          type="button"
          onClick={() => props.onOpenChange(['literature', 'service'])}
        >
          menu
        </button>
      );
    }

    expect(runtime.subMenuItemRender).toBeUndefined();
    expect(runtime.menuContentRender).toBeTypeOf('function');
    const renderMenuContent = runtime.menuContentRender as Exclude<
      typeof runtime.menuContentRender,
      false | undefined
    >;
    const node = renderMenuContent(
      {} as any,
      <MenuProbe />,
    );

    render(node);

    fireEvent.click(screen.getByRole('button', { name: 'menu' }));

    expect(captures.at(-1).openKeys).toEqual(['service']);
  });

  it('keeps the parent menu open after selecting a child page', () => {
    const runtime = layout({
      initialState: {
        currentUser: {
          id: 1,
          username: 'admin',
          displayName: 'Admin',
          role: 'SUPER_ADMIN',
        },
      },
      setInitialState: vi.fn(),
    } as any);

    const captures: any[] = [];
    function MenuProbe(props: any) {
      captures.push(props);
      return (
        <div>
          <button
            type="button"
            onClick={() => props.onOpenChange(['literature'])}
          >
            open parent
          </button>
          <button type="button" onClick={() => props.onOpenChange(['/sources'])}>
            select child
          </button>
        </div>
      );
    }

    const renderMenuContent = runtime.menuContentRender as Exclude<
      typeof runtime.menuContentRender,
      false | undefined
    >;
    render(renderMenuContent({} as any, <MenuProbe />));

    fireEvent.click(screen.getByRole('button', { name: 'open parent' }));
    expect(captures.at(-1).openKeys).toEqual(['literature']);

    fireEvent.click(screen.getByRole('button', { name: 'select child' }));
    expect(captures.at(-1).openKeys).toEqual(['literature']);
  });

  it('selects only the exact causal graph menu item', () => {
    mocks.location.pathname = '/knowledge/causal-graph/fields';
    const runtime = layout({
      initialState: {},
      setInitialState: vi.fn(),
    } as any);
    const captures: any[] = [];
    function MenuProbe(props: any) {
      captures.push(props);
      return null;
    }

    const renderMenuContent = runtime.menuContentRender as Exclude<
      typeof runtime.menuContentRender,
      false | undefined
    >;
    render(renderMenuContent(
      {
        menuData: [{
          key: 'knowledge',
          children: [
            { key: '/knowledge/causal-graph', path: '/knowledge/causal-graph' },
            { key: '/knowledge/causal-graph/fields', path: '/knowledge/causal-graph/fields' },
          ],
        }],
      } as any,
      <MenuProbe />,
    ));

    expect(captures.at(-1).selectedKeys).toEqual(['/knowledge/causal-graph/fields']);
    mocks.location.pathname = '/task-status';
  });

  it('changes the current user password from the layout avatar menu', async () => {
    const runtime = layout({
      initialState: {
        currentUser: {
          id: 1,
          username: 'admin',
          displayName: 'Admin',
          role: 'SUPER_ADMIN',
        },
      },
      setInitialState: vi.fn(),
    } as any);

    const node = (runtime.avatarProps as any)?.render?.({}, <span>Admin</span>);

    render(node);

    fireEvent.click(screen.getByRole('button', { name: '修改密码' }));
    expect(await screen.findByRole('form', { name: '修改密码' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('当前密码'), {
      target: { value: 'admin' },
    });
    fireEvent.change(screen.getByLabelText('新密码'), {
      target: { value: '1234' },
    });
    fireEvent.click(screen.getByRole('button', { name: /提\s*交/ }));

    expect(changePassword).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('新密码'), {
      target: { value: '12345' },
    });
    fireEvent.click(screen.getByRole('button', { name: /提\s*交/ }));

    await waitFor(() => {
      expect(changePassword).toHaveBeenCalledWith({
        oldPassword: 'admin',
        newPassword: '12345',
      });
    });
  });
});
