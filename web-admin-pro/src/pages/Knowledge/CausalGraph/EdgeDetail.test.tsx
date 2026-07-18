import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CausalEdgeDetailPage from './EdgeDetail';

const mocks = vi.hoisted(() => ({
  getCausalEdge: vi.fn(),
}));

vi.mock('@umijs/max', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="#">{children}</a>,
  useSearchParams: () => [new URLSearchParams('cause=Policy&effect=Income')],
}));

vi.mock('@ant-design/pro-components', () => ({
  PageContainer: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

vi.mock('@/services/knowledge', () => ({
  getCausalEdge: mocks.getCausalEdge,
}));

vi.mock('../../businessUtils', () => ({
  QueryState: ({ children, data, error }: { children: (value: never) => React.ReactNode; data?: unknown; error?: unknown }) => {
    if (error) return <div role="alert">加载失败</div>;
    return data ? children(data as never) : <div>默认空态</div>;
  },
}));

vi.mock('./components/EdgeEvidenceTable', () => ({
  EdgeEvidenceTable: () => null,
}));

vi.mock('./components/SignBadge', () => ({
  SignBadge: () => null,
}));

describe('CausalEdgeDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows an empty state for a missing relation', async () => {
    mocks.getCausalEdge.mockRejectedValueOnce({ response: { status: 404 } });

    render(<CausalEdgeDetailPage />);

    expect(await screen.findByText('暂无该因果关系的证据记录')).toBeInTheDocument();
    expect(screen.queryByText('默认空态')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps the normal error state for non-404 failures', async () => {
    mocks.getCausalEdge.mockRejectedValueOnce({ response: { status: 500 } });

    render(<CausalEdgeDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('加载失败');
    });
  });
});
