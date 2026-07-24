import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CausalPaperClaimsPage from './PaperClaims';

const mocks = vi.hoisted(() => ({
  getCausalPaper: vi.fn(),
}));

vi.mock('@umijs/max', () => ({
  Link: ({
    children,
    to,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useParams: () => ({ workId: 'W2098702674' }),
}));

vi.mock('@ant-design/pro-components', () => ({
  PageContainer: ({ children }: { children: React.ReactNode }) => (
    <main>{children}</main>
  ),
}));

vi.mock('@/services/knowledge', () => ({
  getCausalPaper: mocks.getCausalPaper,
}));

vi.mock('../../businessUtils', () => ({
  QueryState: ({
    children,
    data,
  }: {
    children: (value: never) => React.ReactNode;
    data?: unknown;
  }) => (data ? children(data as never) : null),
}));

vi.mock('./components/CausalForceGraph', () => ({
  CausalForceGraph: () => null,
}));

describe('CausalPaperClaimsPage', () => {
  it('lists main contribution claims before auxiliary claims', async () => {
    mocks.getCausalPaper.mockResolvedValueOnce({
      paper: { workId: 'W2098702674', title: 'Example paper' },
      paperGraph: { nodes: [], edges: [] },
      claims: [
        {
          recordId: 1,
          workId: 'W2098702674',
          causeStandard: 'Auxiliary policy',
          effectStandard: 'Auxiliary income',
          signCategory: 'positive',
          isMainContribution: false,
        },
        {
          recordId: 2,
          workId: 'W2098702674',
          causeStandard: 'Main policy',
          effectStandard: 'Main income',
          signCategory: 'positive',
          isMainContribution: true,
        },
      ],
    });

    render(<CausalPaperClaimsPage />);

    const mainClaimRow = (
      await screen.findByRole('link', { name: 'Main policy -> Main income' })
    ).closest('tr');
    const auxiliaryClaimRow = screen
      .getByRole('link', { name: 'Auxiliary policy -> Auxiliary income' })
      .closest('tr');

    expect(mainClaimRow).not.toBeNull();
    expect(auxiliaryClaimRow).not.toBeNull();
    expect(
      mainClaimRow?.compareDocumentPosition(auxiliaryClaimRow as Node),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('visually de-emphasizes auxiliary claims while keeping main claims prominent', async () => {
    mocks.getCausalPaper.mockResolvedValueOnce({
      paper: { workId: 'W2098702674', title: 'Example paper' },
      paperGraph: { nodes: [], edges: [] },
      claims: [
        {
          recordId: 1,
          workId: 'W2098702674',
          causeStandard: 'Auxiliary policy',
          effectStandard: 'Auxiliary income',
          signCategory: 'positive',
          isMainContribution: false,
        },
        {
          recordId: 2,
          workId: 'W2098702674',
          causeStandard: 'Main policy',
          effectStandard: 'Main income',
          signCategory: 'positive',
          isMainContribution: true,
        },
      ],
    });

    render(<CausalPaperClaimsPage />);

    const mainRelation = await screen.findByRole('link', {
      name: 'Main policy -> Main income',
    });
    const auxiliaryRelation = screen.getByRole('link', {
      name: 'Auxiliary policy -> Auxiliary income',
    });

    expect(mainRelation.closest('tr')).toHaveStyle({
      backgroundColor: '#ffffff',
      color: '#1e293b',
      opacity: '1',
    });
    expect(mainRelation).toHaveStyle({ color: '#2563eb' });
    expect(auxiliaryRelation.closest('tr')).toHaveStyle({
      backgroundColor: '#f8fafc',
      color: '#94a3b8',
      opacity: '0.8',
    });
    expect(auxiliaryRelation).toHaveStyle({ color: '#60a5fa' });
  });

  it('explains the main and auxiliary claim highlighting', async () => {
    mocks.getCausalPaper.mockResolvedValueOnce({
      paper: { workId: 'W2098702674', title: 'Example paper' },
      paperGraph: { nodes: [], edges: [] },
      claims: [],
    });

    render(<CausalPaperClaimsPage />);

    expect(
      await screen.findByText('高亮行（核心发现）浅色行（非核心发现）'),
    ).toBeInTheDocument();
  });

  it('shows the Other-method description tooltip for a paper claim', async () => {
    mocks.getCausalPaper.mockResolvedValueOnce({
      paper: { workId: 'W2098702674', title: 'Example paper' },
      paperGraph: { nodes: [], edges: [] },
      claims: [
        {
          recordId: 1,
          workId: 'W2098702674',
          causeStandard: 'Policy',
          effectStandard: 'Income',
          signCategory: 'positive',
          causalInferenceMethod: 'Other',
          evidenceMethodOtherDescription:
            'Generalized Method of Moments (GMM) with Dynamic Feedback',
        },
      ],
    });

    render(<CausalPaperClaimsPage />);

    expect(
      await screen.findByLabelText(
        '方法描述：Generalized Method of Moments (GMM) with Dynamic Feedback',
      ),
    ).toBeInTheDocument();
  });
});
