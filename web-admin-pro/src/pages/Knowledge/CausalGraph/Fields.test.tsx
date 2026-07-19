import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CausalFieldsPage from './Fields';

vi.mock('@ant-design/pro-components', () => ({
  PageContainer: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

vi.mock('antd', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  Input: (props: React.ComponentProps<'input'>) => <input {...props} />,
  Space: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Table: ({ dataSource = [] }: { dataSource?: { subfield: string; topic: string }[] }) => (
    <table>
      <tbody>
        {dataSource.map((item) => (
          <tr key={`${item.subfield}-${item.topic}`}>
            <td>{item.subfield}</td>
            <td>{item.topic}</td>
          </tr>
        ))}
      </tbody>
    </table>
  ),
}));

vi.mock('@/services/knowledge', () => ({
  getCausalFields: vi.fn(async () => ({
    items: [
      { subfield: 'Economics', topic: 'Labor economics', claimRecordCount: 1, paperCount: 1, variableCount: 1 },
      { subfield: 'Economics', topic: 'Macroeconomics', claimRecordCount: 1, paperCount: 1, variableCount: 1 },
      { subfield: 'Sociology', topic: 'Social networks', claimRecordCount: 1, paperCount: 1, variableCount: 1 },
    ],
  })),
}));

vi.mock('../../businessUtils', () => ({
  QueryState: ({ data, children }: { data?: unknown; children: (value: never) => React.ReactNode }) =>
    data ? children(data as never) : null,
}));

describe('CausalFieldsPage', () => {
  it('filters field-analysis records by subfield and topic keywords', async () => {
    render(<CausalFieldsPage />);

    expect(await screen.findByText('Social networks')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox', { name: '筛选子领域' }), { target: { value: 'econ' } });
    expect(screen.getByText('Labor economics')).toBeInTheDocument();
    expect(screen.queryByText('Social networks')).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox', { name: '筛选主题' }), { target: { value: 'macro' } });
    expect(screen.getByText('Macroeconomics')).toBeInTheDocument();
    expect(screen.queryByText('Labor economics')).not.toBeInTheDocument();
  });
});
