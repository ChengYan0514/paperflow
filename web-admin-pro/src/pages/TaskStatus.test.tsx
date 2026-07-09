import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TaskStatusPage, { filterTaskStatusSources } from './TaskStatus';
import { listTaskStatus } from '@/services/business';

vi.mock('@umijs/max', () => ({
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  useSearchParams: () => [new URLSearchParams()],
}));

vi.mock('@ant-design/pro-components', () => ({
  PageContainer: ({ children, title }: any) => (
    <main>
      <h1>{title}</h1>
      {children}
    </main>
  ),
}));

vi.mock('@/services/business', () => ({
  listTaskStatus: vi.fn(async () => ({
    totals: {
      sourceCount: 2,
      workCount: 10,
      originalFileCount: 7,
      matchedWorkCount: 6,
      parsedFileCount: 4,
      blockImportedFileCount: 3,
    },
    sources: [
      {
        sourceId: 'S1',
        sourceName: 'Nature',
        provider: 'OpenAlex',
        workCount: 6,
        originalFileCount: 4,
        matchedWorkCount: 5,
        parsedFileCount: 3,
        blockImportedFileCount: 2,
      },
      {
        sourceId: 'S2',
        sourceName: 'Science',
        provider: 'Crossref',
        workCount: 4,
        originalFileCount: 3,
        matchedWorkCount: 1,
        parsedFileCount: 1,
        blockImportedFileCount: 1,
      },
    ],
  })),
}));

describe('TaskStatus page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads task status totals and source progress', async () => {
    render(<TaskStatusPage />);

    expect(listTaskStatus).toHaveBeenCalled();
    expect(await screen.findByText('来源期刊数')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('Nature')).toBeInTheDocument();
    expect(screen.getByText('论文匹配 5/6')).toBeInTheDocument();
    expect(screen.getByText('全文入库 2/4')).toBeInTheDocument();
  });

  it('filters and sorts sources locally', () => {
    const sources = [
      {
        sourceId: 'S2',
        sourceName: 'Science',
        provider: 'Crossref',
        workCount: 4,
        originalFileCount: 3,
        matchedWorkCount: 1,
        parsedFileCount: 1,
        blockImportedFileCount: 1,
      },
      {
        sourceId: 'S1',
        sourceName: 'Nature',
        provider: 'OpenAlex',
        workCount: 6,
        originalFileCount: 4,
        matchedWorkCount: 5,
        parsedFileCount: 3,
        blockImportedFileCount: 2,
      },
    ];
    const params = new URLSearchParams('provider=open&sort=workCountDesc');

    expect(filterTaskStatusSources(sources, params).map((source) => source.sourceId)).toEqual([
      'S1',
    ]);
  });
});
