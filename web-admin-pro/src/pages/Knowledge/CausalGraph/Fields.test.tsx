import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CausalFieldsPage from './Fields';

vi.mock('@ant-design/pro-components', () => ({
  PageContainer: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

const setSearchParams = vi.fn();

vi.mock('@umijs/max', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  useSearchParams: () => [new URLSearchParams(), setSearchParams],
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
  },
}));

vi.mock('@/services/knowledge', () => ({
  getCausalFields: vi.fn(async () => ({
    items: [
      { subfield: 'Economics', topic: 'Labor economics', claimRecordCount: 1, paperCount: 1, variableCount: 1 },
      { subfield: 'Economics', topic: 'Macroeconomics', claimRecordCount: 1, paperCount: 1, variableCount: 1 },
      { subfield: 'Sociology', topic: 'Social networks', claimRecordCount: 1, paperCount: 1, variableCount: 1 },
    ],
    overview: {
      subfields: ['Economics', 'Sociology'],
      topics: ['Labor economics', 'Social networks'],
      matrix: {
        Economics: { 'Labor economics': 4, 'Social networks': 0 },
        Sociology: { 'Labor economics': 0, 'Social networks': 2 },
      },
      details: {
        Economics: {
          paperCount: 3,
          claimRecordCount: 4,
          standardClaimCount: 2,
          variableCount: 5,
          methodCounts: [{ method: 'DID', claimRecordCount: 3 }, { method: '未标注方法', claimRecordCount: 1 }],
          topVariables: [{ variable: 'Education', claimRecordCount: 3 }],
          topRelations: [{ cause: 'Education', effect: 'Income', claimRecordCount: 3, paperCount: 2, methodCount: 2, globalClaimRecordCount: 8 }],
        },
        Sociology: {
          paperCount: 2,
          claimRecordCount: 2,
          standardClaimCount: 1,
          variableCount: 3,
          methodCounts: [{ method: 'RCT', claimRecordCount: 2 }],
          topVariables: [{ variable: 'Trust', claimRecordCount: 2 }],
          topRelations: [{ cause: 'Trust', effect: 'Participation', claimRecordCount: 2, paperCount: 2, methodCount: 1, globalClaimRecordCount: 2 }],
        },
      },
    },
  })),
}));

vi.mock('../../businessUtils', () => ({
  QueryState: ({ data, children }: { data?: unknown; children: (value: never) => React.ReactNode }) =>
    data ? children(data as never) : null,
}));

describe('CausalFieldsPage', () => {
  it('shows the heatmap and detail for the leading subfield', async () => {
    render(<CausalFieldsPage />);

    expect(await screen.findByText('领域与主题热力图')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Economics/ })).toBeInTheDocument();
    expect(screen.getByText('论文数:3')).toBeInTheDocument();
    expect(screen.getByText('DID')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Education 3' })).toHaveAttribute(
      'href',
      '/knowledge/causal-graph/nodes/Education',
    );
    expect(screen.getByRole('link', { name: 'Education -> Income' })).toHaveAttribute(
      'href',
      '/knowledge/causal-graph/edges?cause=Education&effect=Income',
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

  it('persists the selected heatmap subfield in the URL query', async () => {
    render(<CausalFieldsPage />);

    await screen.findByText('领域与主题热力图');
    fireEvent.click(screen.getByRole('button', { name: '选择子领域 Sociology' }));

    const selectedParams = setSearchParams.mock.calls.at(-1)?.[0] as URLSearchParams;
    expect(selectedParams.get('subfield')).toBe('Sociology');
  });
});
