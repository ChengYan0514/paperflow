import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CausalClaim } from '@/services/knowledge';
import { EdgeEvidenceTable } from './EdgeEvidenceTable';

vi.mock('@umijs/max', () => ({
  Link: ({ children }: { children: React.ReactNode }) => (
    <a href="#">{children}</a>
  ),
}));

const otherMethodClaim: CausalClaim = {
  recordId: 1,
  workId: 'W1',
  title: 'A paper using another method',
  causeStandard: 'Policy',
  effectStandard: 'Income',
  signCategory: 'positive',
  causalInferenceMethod: 'Other',
  evidenceMethodOtherDescription:
    'Generalized Method of Moments (GMM) with Dynamic Feedback',
};

describe('EdgeEvidenceTable', () => {
  it('provides the Other-method description through its information tooltip', () => {
    render(<EdgeEvidenceTable claims={[otherMethodClaim]} />);

    expect(
      screen.getByLabelText(
        `方法描述：${otherMethodClaim.evidenceMethodOtherDescription}`,
      ),
    ).toBeInTheDocument();
  });

  it.each([
    { ...otherMethodClaim, evidenceMethodOtherDescription: '   ' },
    { ...otherMethodClaim, causalInferenceMethod: 'Synthetic Controls' },
  ])('does not show a description icon when the claim does not qualify', (claim) => {
    render(<EdgeEvidenceTable claims={[claim]} />);

    expect(screen.queryByLabelText(/方法描述：/)).not.toBeInTheDocument();
  });
});
