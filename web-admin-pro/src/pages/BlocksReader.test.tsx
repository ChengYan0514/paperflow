import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { tableMarkup, PaperBlocksPage } from './BlocksReader';
import { listPaperBlocks } from '@/services/business';

vi.mock('@umijs/max', () => ({
  useParams: () => ({ fileId: 'F1' }),
  useSearchParams: () => [
    new URLSearchParams('includeDiscarded=true'),
    vi.fn(),
  ],
}));

vi.mock('@ant-design/pro-components', () => ({
  PageContainer: ({ children, title, subTitle }: any) => (
    <main>
      <h1>{title}</h1>
      <span>{subTitle}</span>
      {children}
    </main>
  ),
}));

vi.mock('@/services/business', async () => ({
  assetUrl: (path?: string | null) => path,
  listPaperBlocks: vi.fn(async () => ({
    items: [
      {
        blockId: 'B1',
        fileId: 'F1',
        blockType: 'title',
        blockText: 'Introduction',
        blockSeq: 1,
        titleLevel: 1,
      },
      {
        blockId: 'B2',
        fileId: 'F1',
        blockType: 'equation',
        blockText: '$$x^2$$',
        blockSeq: 2,
      },
      {
        blockId: 'B3',
        fileId: 'F1',
        blockType: 'table',
        blockText: '<table onclick="bad()"><tr><td>Cell</td></tr><script>bad()</script></table>',
        blockSeq: 3,
      },
      {
        blockId: 'B4',
        fileId: 'F1',
        blockType: 'image',
        blockText: 'Figure body',
        imageUrl: '/api/assets/fig.png',
        imageCaption: 'Figure 1',
        blockSeq: 4,
      },
      {
        blockId: 'B5',
        fileId: 'F1',
        blockType: 'reference',
        references: ['Smith 2024'],
        blockSeq: 5,
      },
      {
        blockId: 'B6',
        fileId: 'F1',
        blockType: 'page_footnote',
        footnoteLabel: '1',
        footnoteText: 'Footnote text',
        blockSeq: 6,
      },
    ],
    page: 1,
    size: 500,
    total: 6,
  })),
}));

describe('BlocksReader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads all paper blocks with includeDiscarded and renders block types', async () => {
    render(<PaperBlocksPage />);

    expect(await screen.findByText('Introduction')).toBeInTheDocument();
    expect(listPaperBlocks).toHaveBeenCalledWith(
      'F1',
      expect.objectContaining({}),
    );
    const params = vi.mocked(listPaperBlocks).mock.calls[0][1];
    expect(params?.get('includeDiscarded')).toBe('true');
    expect(screen.getByText('Cell')).toBeInTheDocument();
    expect(screen.getByText('Figure 1')).toBeInTheDocument();
    expect(screen.getByText('Smith 2024')).toBeInTheDocument();
    expect(screen.getByText('1 Footnote text')).toBeInTheDocument();
  });

  it('sanitizes table html', () => {
    const html = tableMarkup('<table onclick="bad()"><tr><td><span>safe</span></td></tr></table>');

    expect(html).toContain('<table>');
    expect(html).toContain('safe');
    expect(html).not.toContain('onclick');
    expect(html).not.toContain('<span');
  });
});
