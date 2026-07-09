import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Login from './Login';
import { login } from '@/services/auth';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  setInitialState: vi.fn(),
}));

vi.mock('@umijs/max', () => ({
  history: {
    location: {
      search: '?redirect=/works',
    },
    push: mocks.push,
  },
  useModel: () => ({
    setInitialState: mocks.setInitialState,
  }),
}));

vi.mock('antd', async () => {
  const actual = await vi.importActual<typeof import('antd')>('antd');
  return {
    ...actual,
    message: {
      error: vi.fn(),
    },
  };
});

vi.mock('@/services/auth', () => ({
  login: vi.fn(async () => ({
    id: 1,
    username: 'admin',
    displayName: 'Admin',
    role: 'SUPER_ADMIN',
  })),
}));

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to the requested backend page after login', async () => {
    const { container } = render(<Login />);

    fireEvent.change(screen.getByLabelText('账号'), {
      target: { value: 'admin' },
    });
    fireEvent.change(screen.getByLabelText('密码'), {
      target: { value: 'admin' },
    });
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith({
        username: 'admin',
        password: 'admin',
      });
      expect(mocks.setInitialState).toHaveBeenCalled();
      expect(mocks.push).toHaveBeenCalledWith('/works');
    });
  });

  it('shows a visible error when login fails', async () => {
    const { message } = await import('antd');
    vi.mocked(login).mockRejectedValueOnce(new Error('bad credentials'));
    const { container } = render(<Login />);

    fireEvent.change(screen.getByLabelText('账号'), {
      target: { value: 'admin' },
    });
    fireEvent.change(screen.getByLabelText('密码'), {
      target: { value: 'wrong' },
    });
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('登录失败，请检查账号和密码');
    });
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
