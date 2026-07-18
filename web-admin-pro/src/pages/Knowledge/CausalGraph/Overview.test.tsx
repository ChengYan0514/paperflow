import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CausalGraphOverviewPage from './Overview';

const mocks = vi.hoisted(() => ({
  getCausalGraph: vi.fn(async () => ({
    nodes: Array.from({ length: 24 }, (_, index) => ({ id: String(index) })),
    edges: Array.from({ length: 23 }, (_, index) => ({ source: `source-${index}`, target: `target-${index}` })),
  })),
  navigate: vi.fn(),
  searchCausalTerms: vi.fn(async () => ['Consumption']),
  setSearchParams: vi.fn(),
}));

vi.mock('@umijs/max', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="#">{children}</a>,
  useNavigate: () => mocks.navigate,
  useSearchParams: () => [new URLSearchParams(), mocks.setSearchParams],
}));

vi.mock('@ant-design/pro-components', () => ({
  PageContainer: ({ title, subTitle, children }: { title: string; subTitle?: string; children: React.ReactNode }) => (
    <main>
      <h1>{title}</h1>
      {subTitle && <p>{subTitle}</p>}
      {children}
    </main>
  ),
}));

vi.mock('@/services/knowledge', () => ({
  getCausalSummary: vi.fn(async () => ({
    overview: {
      totalClaimRecords: 804369,
      totalStandardClaims: 478414,
      totalPapers: 133242,
      totalNodes: 6049,
      totalEdges: 0,
      graphNodes: 0,
      graphEdges: 0,
      graphMinRepetition: 3,
    },
    subfields: [],
    methods: [],
  })),
  getCausalGraph: mocks.getCausalGraph,
  searchCausalTerms: mocks.searchCausalTerms,
}));

vi.mock('../../businessUtils', () => ({
  QueryState: ({ data, children }: { data?: unknown; children: (value: never) => React.ReactNode }) =>
    data ? children(data as never) : null,
}));

vi.mock('./components/CausalForceGraph', () => ({
  CausalForceGraph: () => null,
}));

vi.mock('./components/SignBadge', () => ({
  SignBadge: () => null,
}));

describe('CausalGraphOverviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not show the obsolete data-source subtitle', async () => {
    render(<CausalGraphOverviewPage />);

    await waitFor(() => {
      expect(screen.getByText('因果知识图谱')).toBeInTheDocument();
    });

    expect(screen.queryByText('从 PaperFlow PostgreSQL 读取标准化因果主张')).not.toBeInTheDocument();
  });

  it('uses the preview-stat colours for the current graph totals', async () => {
    render(<CausalGraphOverviewPage />);

    const nodeTitle = await screen.findByText('当前节点');
    const edgeTitle = screen.getByText('当前边');

    expect(nodeTitle).toHaveStyle({ color: '#94a3b8' });
    expect(edgeTitle).toHaveStyle({ color: '#94a3b8' });
    expect(screen.getByText('24').closest('.ant-statistic-content')).toHaveStyle({ color: '#2563eb' });
    expect(screen.getByText('23').closest('.ant-statistic-content')).toHaveStyle({ color: '#2563eb' });
  });

  it('explains the minimum-record filter in node search', async () => {
    render(<CausalGraphOverviewPage />);

    fireEvent.mouseEnter(await screen.findByLabelText('最小记录数说明'));

    expect(await screen.findByText('网络中的边，最少被多少篇论文重复验证。')).toBeInTheDocument();
  });

  it('explains the minimum-method filter in node search', async () => {
    render(<CausalGraphOverviewPage />);

    fireEvent.mouseEnter(await screen.findByLabelText('最小方法数说明'));

    expect(await screen.findByText('网络中的边，最少被多少种方法验证。')).toBeInTheDocument();
  });

  it('loads STW suggestions and updates graph filters from the node tab', async () => {
    render(<CausalGraphOverviewPage />);

    const input = await screen.findByPlaceholderText('输入变量关键词');
    fireEvent.change(input, { target: { value: 'consu' } });

    await waitFor(() => {
      expect(mocks.searchCausalTerms).toHaveBeenCalledWith('consu');
    });

    fireEvent.submit(input.closest('form') as HTMLFormElement);

    await waitFor(() => {
      expect(mocks.setSearchParams).toHaveBeenCalled();
    });
    const params = mocks.setSearchParams.mock.calls.at(-1)?.[0] as URLSearchParams;
    expect(params.get('query')).toBe('consu');
    expect(params.get('minRecordCount')).toBe('20');
    expect(params.get('minDiversity')).toBe('5');
    expect(params.get('maxNodes')).toBe('300');
    expect(params.get('maxEdges')).toBe('500');
  });

  it('uses STW suggestions for both edge inputs and navigates to relation detail', async () => {
    render(<CausalGraphOverviewPage />);

    fireEvent.click(await screen.findByText('按边搜索'));
    expect(screen.getByText('当前模式：检索特定因果关系。')).toBeInTheDocument();
    const cause = await screen.findByPlaceholderText('如：policy, demand');
    const effect = screen.getByPlaceholderText('如：inflation, income');
    fireEvent.change(cause, { target: { value: 'policy' } });
    fireEvent.change(effect, { target: { value: 'income' } });

    await waitFor(() => {
      expect(mocks.searchCausalTerms).toHaveBeenCalledWith('policy');
      expect(mocks.searchCausalTerms).toHaveBeenCalledWith('income');
    });

    fireEvent.submit(cause.closest('form') as HTMLFormElement);

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith('/knowledge/causal-graph/edges?cause=policy&effect=income');
    });
  });

  it('explains the cause variable in edge search', async () => {
    render(<CausalGraphOverviewPage />);

    fireEvent.click(await screen.findByText('按边搜索'));
    fireEvent.mouseEnter(await screen.findByLabelText('原因变量说明'));

    expect(await screen.findByText('因果关系中的自变量，表示可能产生影响的原因。')).toBeInTheDocument();
  });

  it('explains the effect variable in edge search', async () => {
    render(<CausalGraphOverviewPage />);

    fireEvent.click(await screen.findByText('按边搜索'));
    fireEvent.mouseEnter(await screen.findByLabelText('结果变量说明'));

    expect(await screen.findByText('因果关系中的因变量，表示受到影响的结果。')).toBeInTheDocument();
  });
});
