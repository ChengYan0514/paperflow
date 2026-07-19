import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CausalNodeDetailPage from './NodeDetail';

const detail = {
  node: {
    id: 'Policy',
    label: 'Policy',
    occurrences: 12,
    dominantSubfield: 'Economics',
    asCauseCount: 8,
    asEffectCount: 4,
  },
  subfieldCounts: {},
  yearCounts: {},
  totalClaims: 12,
  outgoing: [
    {
      source: 'Policy',
      target: 'Income',
      recordCount: 8,
      paperCount: 5,
      diversity: 2,
      disagreement: 0,
      dominantSignCategory: 'positive',
      signBreakdown: {},
    },
  ],
  incoming: [],
};

vi.mock('@umijs/max', () => ({
  Link: ({ children }: { children: React.ReactNode }) => (
    <a href="#">{children}</a>
  ),
  useParams: () => ({ variable: 'Policy' }),
}));

vi.mock('@ant-design/pro-components', () => ({
  PageContainer: ({ children }: { children: React.ReactNode }) => (
    <main>{children}</main>
  ),
}));

vi.mock('@/services/knowledge', () => ({
  getCausalNode: vi.fn(async () => detail),
}));

vi.mock('./components/CausalForceGraph', () => ({
  CausalForceGraph: () => null,
}));

describe('CausalNodeDetailPage', () => {
  it('labels the relation direction as dominant direction', async () => {
    render(<CausalNodeDetailPage />);

    expect(await screen.findAllByText('主导方向')).toHaveLength(2);
    expect(screen.queryByText('方向')).not.toBeInTheDocument();
  });

  it.each([
    ['记录数', '聚合关系数量'],
    ['论文数', '该关系被多少篇论文验证'],
    ['方法数', '该关系被多少种方法验证'],
  ])('explains %s', async (label, description) => {
    render(<CausalNodeDetailPage />);

    fireEvent.mouseEnter((await screen.findAllByText(label))[0]);
    expect(await screen.findByText(description)).toBeInTheDocument();
  });
});
