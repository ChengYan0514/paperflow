import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CausalEdgeDetailPage from './EdgeDetail';

const mocks = vi.hoisted(() => ({
  getCausalEdge: vi.fn(),
}));

const edgeDetail = {
  edge: {
    source: 'Firm size',
    target: 'Firm growth',
    recordCount: 14,
    paperCount: 8,
    diversity: 3,
    signBreakdown: { negative: 3, positive: 8, null: 1, mixed: 2 },
  },
  claims: [],
};

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

  it('shows the aggregated edge direction breakdown', async () => {
    mocks.getCausalEdge.mockResolvedValueOnce(edgeDetail);

    render(<CausalEdgeDetailPage />);

    expect(await screen.findByText('负向3条')).toBeInTheDocument();
    expect(screen.getByText('正向8条')).toBeInTheDocument();
    expect(screen.getByText('不显著1条')).toBeInTheDocument();
    expect(screen.getByText('混合2条')).toBeInTheDocument();
  });

  it('does not show the removed edge metrics', async () => {
    mocks.getCausalEdge.mockResolvedValueOnce(edgeDetail);

    render(<CausalEdgeDetailPage />);

    await screen.findByText('Firm size');
    expect(screen.queryByText('领域扩散')).not.toBeInTheDocument();
    expect(screen.queryByText('时间跨度')).not.toBeInTheDocument();
    expect(screen.queryByText('分歧度')).not.toBeInTheDocument();
  });

  it.each([
    ['记录数', '聚合关系数量'],
    ['论文数', '该关系被多少篇论文验证'],
    ['方法数', '该关系被多少种方法验证'],
  ])('explains %s', async (label, description) => {
    mocks.getCausalEdge.mockResolvedValueOnce(edgeDetail);

    render(<CausalEdgeDetailPage />);

    fireEvent.mouseEnter(await screen.findByText(label));
    expect(await screen.findByText(description)).toBeInTheDocument();
  });
});
