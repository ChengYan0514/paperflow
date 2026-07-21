import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CausalFieldsPage from './Fields';

vi.mock('@ant-design/pro-components', () => ({
  PageContainer: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

vi.mock('@umijs/max', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

vi.mock('antd', () => ({
  Card: ({ children, title }: { children: React.ReactNode; title?: React.ReactNode }) => <section>{title}{children}</section>,
  Col: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Input: ({ allowClear: _allowClear, ...props }: React.ComponentProps<'input'> & { allowClear?: boolean }) => <input {...props} />,
  Progress: ({ percent }: { percent: number }) => <span>{percent}%</span>,
  Row: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Space: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Statistic: ({ title, value }: { title: React.ReactNode; value: React.ReactNode }) => <div>{title}:{value}</div>,
  Table: ({ dataSource = [] }: { dataSource?: { subfield: string; topic: string }[] }) => (
    <table data-testid="field-items">
      <tbody>
        {dataSource.map((item) => (
          <tr data-testid="field-item" key={`${item.subfield}-${item.topic}`}>
            <td>{item.subfield}</td>
            <td>{item.topic}</td>
          </tr>
        ))}
      </tbody>
    </table>
  ),
  Typography: {
    Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
    Title: ({ children, level = 2 }: { children: React.ReactNode; level?: number }) => {
      const Heading = `h${level}` as keyof React.JSX.IntrinsicElements;
      return <Heading>{children}</Heading>;
    },
  },
}));

vi.mock('@/services/knowledge', () => ({
  getCausalFields: vi.fn(async () => ({
    items: [
      { subfield: 'Economics', topic: 'Labor economics', claimRecordCount: 1, paperCount: 1, variableCount: 1 },
      { subfield: 'Economics', topic: 'Macroeconomics', claimRecordCount: 1, paperCount: 1, variableCount: 1 },
      { subfield: 'Sociology', topic: 'Social networks', claimRecordCount: 1, paperCount: 1, variableCount: 1 },
    ],
    insights: {
      methodCounts: [{ name: 'DID', count: 5 }, { name: '其他', count: 3 }],
      topVariables: [{ name: 'Education', count: 6 }],
      topRelations: [{ cause: 'Education', effect: 'Income', claimRecordCount: 6, paperCount: 4, methodCount: 2 }],
    },
  })),
  getCausalSummary: vi.fn(async () => ({
    overview: {
      totalClaimRecords: 8,
      totalStandardClaims: 4,
      totalPapers: 5,
      totalNodes: 6,
    },
  })),
}));

vi.mock('../../businessUtils', () => ({
  QueryState: ({ data, children }: { data?: unknown; children: (value: never) => React.ReactNode }) =>
    data ? children(data as never) : null,
}));

describe('CausalFieldsPage', () => {
  it('labels the complete field analysis table', async () => {
    render(<CausalFieldsPage />);

    await screen.findByText('论文数:5');
    expect(screen.getByRole('heading', { name: '领域明细' })).toBeInTheDocument();
  });

  it('shows global relationship, variable, and method insights without a selected subfield', async () => {
    render(<CausalFieldsPage />);

    await screen.findByText('抽取记录:8');
    expect(screen.getByText('标准关系:4')).toBeInTheDocument();
    expect(screen.getByText('论文数:5')).toBeInTheDocument();
    expect(screen.getByText('变量数:6')).toBeInTheDocument();
    expect(screen.getByText('高频关系（Top 1）')).toBeInTheDocument();
    expect(screen.getByText('高频变量（Top 1）')).toBeInTheDocument();
    expect(screen.getByText('方法分布（Top 10 + 其他）')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Education -> Income' })).toHaveAttribute(
      'href',
      '/knowledge/causal-graph/edges?cause=Education&effect=Income',
    );
    expect(screen.getByRole('link', { name: 'Education 6' })).toHaveAttribute(
      'href',
      '/knowledge/causal-graph/nodes/Education',
    );
  });

  it('filters field-analysis records by subfield and topic keywords', async () => {
    render(<CausalFieldsPage />);

    expect((await screen.findAllByTestId('field-item')).length).toBe(3);

    fireEvent.change(screen.getByRole('textbox', { name: '筛选子领域' }), { target: { value: 'econ' } });
    expect(within(screen.getByTestId('field-items')).getByText('Labor economics')).toBeInTheDocument();
    expect(within(screen.getByTestId('field-items')).queryByText('Social networks')).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox', { name: '筛选主题' }), { target: { value: 'macro' } });
    expect(within(screen.getByTestId('field-items')).getByText('Macroeconomics')).toBeInTheDocument();
    expect(within(screen.getByTestId('field-items')).queryByText('Labor economics')).not.toBeInTheDocument();
  });

});
