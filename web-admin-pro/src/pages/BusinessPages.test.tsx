import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OriginalFileDetailPage from './OriginalFileDetail';
import OriginalFilesPage from './OriginalFiles';
import SourceDetailPage from './SourceDetail';
import SourcesPage from './Sources';
import WorkDetailPage from './WorkDetail';
import WorksPage from './Works';
import {
  getOriginalFile,
  getSource,
  getWork,
  listOriginalFiles,
  listSources,
  listWorks,
} from '@/services/business';

let searchParams = new URLSearchParams();
let setSearchParams = vi.fn();
let params = { sourceId: 'S1', workId: 'W1', fileId: 'F1' };

vi.mock('@umijs/max', () => ({
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  useSearchParams: () => [searchParams, setSearchParams],
  useParams: () => params,
}));

vi.mock('@ant-design/pro-components', () => ({
  PageContainer: ({ children, title }: any) => (
    <main>
      <h1>{title}</h1>
      {children}
    </main>
  ),
  ProTable: ({ dataSource = [], columns = [], rowKey, pagination }: any) => (
    <>
      <table>
        <thead>
          <tr>
            {columns.map((column: any) => (
              <th key={String(column.title)}>{column.title}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataSource.map((row: any) => (
            <tr key={typeof rowKey === 'function' ? rowKey(row) : row[rowKey]}>
              {columns.map((column: any) => (
                <td key={String(column.title)}>
                  {column.render
                    ? column.render(undefined, row)
                    : Array.isArray(column.dataIndex)
                      ? column.dataIndex.reduce((value: any, key: string) => value?.[key], row)
                      : row[column.dataIndex]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {pagination ? (
        <button
          type="button"
          onClick={() => pagination.onChange(pagination.current + 1, pagination.pageSize)}
        >
          下一页
        </button>
      ) : null}
    </>
  ),
}));

const source = {
  sourceId: 'S1',
  sourceName: 'Nature',
  provider: 'OpenAlex',
  stats: {
    workCount: 2,
    originalFileCount: 1,
    matchedFileCount: 1,
    parsedFileCount: 1,
    readyFileCount: 1,
    parseFailedFileCount: 0,
    blockFailedFileCount: 0,
    unsupportedFileCount: 0,
  },
};

const file = {
  fileId: 'F1',
  sourceId: 'S1',
  year: 2024,
  paperTitle: 'Paper title',
  authors: 'Ada',
  doi: '10.1/a',
  url: 'https://example.test',
  provider: 'OpenAlex',
  originalFileName: 'paper.pdf',
  originalFilePath: 'openalex/original/S1/F1.pdf',
  originalFileUrl: '/api/assets/openalex/original/S1/F1.pdf',
  originalFileType: 'PDF',
  fileSize: 1200,
  flagMatch: 1,
  matchedWorkId: 'W1',
  flagText: 2,
  flagBlock: 1,
  textFiles: [
    {
      fileId: 'F1',
      fileType: 'MD',
      fileName: 'paper.md',
      filePath: 'parsed/F1.md',
      fileUrl: '/api/assets/parsed/F1.md',
      fileSize: 300,
    },
  ],
};

const work = {
  workId: 'W1',
  title: 'Work title',
  doi: '10.1/a',
  publicationYear: 2024,
  publicationDate: '2024-01-01',
  type: 'article',
  language: 'en',
  sourceIds: ['S1'],
  processingStatus: 'READY' as const,
  matchedFileId: 'F1',
  flagMatch: 1,
  flagText: 2,
  flagBlock: 1,
};

vi.mock('@/services/business', () => ({
  assetUrl: (path?: string | null) => path,
  listSources: vi.fn(async () => ({ items: [source], page: 1, size: 20, total: 1 })),
  getSource: vi.fn(async () => source),
  listWorks: vi.fn(async () => ({ items: [work], page: 1, size: 20, total: 1 })),
  getWork: vi.fn(async () => ({
    work,
    sources: [{ sourceId: 'S1', sourceName: 'Nature', provider: 'OpenAlex' }],
    authors: [{ authorId: 'A1', authorName: 'Ada', authorPosition: 'first' }],
    matchedFile: file,
    processingStatus: 'READY',
  })),
  listOriginalFiles: vi.fn(async () => ({ items: [file], page: 1, size: 20, total: 1 })),
  getOriginalFile: vi.fn(async () => file),
}));

describe('business pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParams = new URLSearchParams('sourceId=S1&sort=sourceIdAsc');
    setSearchParams = vi.fn();
    params = { sourceId: 'S1', workId: 'W1', fileId: 'F1' };
  });

  it('lists sources using the current URL query', async () => {
    render(<SourcesPage />);

    expect(await screen.findByText('S1')).toBeInTheDocument();
    expect(listSources).toHaveBeenCalledWith(searchParams);
    expect(screen.getByText('Nature')).toBeInTheDocument();
  });

  it('updates URL query when changing pages', async () => {
    render(<SourcesPage />);

    expect(await screen.findByText('S1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '下一页' }));

    await waitFor(() => expect(setSearchParams).toHaveBeenCalled());

    const next = setSearchParams.mock.calls[0][0] as URLSearchParams;
    expect(next.toString()).toBe('sourceId=S1&sort=sourceIdAsc&page=2&size=20');
  });

  it('updates URL query from list filters', async () => {
    render(<SourcesPage />);

    fireEvent.change(screen.getByLabelText('来源期刊名称'), {
      target: { value: 'Nature' },
    });
    fireEvent.click(screen.getByRole('button', { name: /查\s*询/ }));

    await waitFor(() => expect(setSearchParams).toHaveBeenCalled());

    const next = setSearchParams.mock.calls[0][0] as URLSearchParams;
    expect(next.toString()).toBe('sourceId=S1&sort=sourceIdAsc&sourceName=Nature');
  });

  it('renders advanced filters separately from the primary search', async () => {
    searchParams = new URLSearchParams('title=AI&yearFrom=2020&yearTo=2024');
    render(<WorksPage />);

    expect(await screen.findByDisplayValue('AI')).toBeInTheDocument();
    expect(screen.getByText('年份范围: 2020-2024')).toBeInTheDocument();
    expect(screen.queryByLabelText('类型')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('语言')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('匹配文件 ID')).not.toBeInTheDocument();
  });

  it('shows source detail actions', async () => {
    render(<SourceDetailPage />);

    expect(getSource).toHaveBeenCalledWith('S1');
    expect(await screen.findByText('查看论文')).toHaveAttribute('href', '/works?sourceId=S1');
    expect(screen.getByText('查看原始文件')).toHaveAttribute(
      'href',
      '/original-files?sourceId=S1',
    );
  });

  it('lists works and links matched files', async () => {
    searchParams = new URLSearchParams('authorName=Ada&sort=titleAsc');
    render(<WorksPage />);

    expect(await screen.findByText('W1')).toHaveAttribute('href', '/works/W1');
    expect(listWorks).toHaveBeenCalledWith(searchParams);
    expect(screen.getByText('F1')).toHaveAttribute('href', '/original-files/F1');
  });

  it('shows work detail metadata and content-block entry', async () => {
    render(<WorkDetailPage />);

    expect(getWork).toHaveBeenCalledWith('W1');
    expect(await screen.findByText('Work title')).toBeInTheDocument();
    expect(screen.getAllByText('Ada').length).toBeGreaterThan(0);
    expect(screen.getByText('查看内容块')).toHaveAttribute('href', '/works/W1/blocks');
  });

  it('lists original files and links related entities', async () => {
    searchParams = new URLSearchParams('sourceName=Nature&sort=yearDesc');
    render(<OriginalFilesPage />);

    expect(await screen.findByText('F1')).toHaveAttribute('href', '/original-files/F1');
    expect(listOriginalFiles).toHaveBeenCalledWith(searchParams);
    expect(screen.getAllByText('S1')[0]).toHaveAttribute('href', '/sources/S1');
    expect(screen.getByText('W1')).toHaveAttribute('href', '/works/W1');
  });

  it('shows original file detail metadata and asset links', async () => {
    render(<OriginalFileDetailPage />);

    expect(getOriginalFile).toHaveBeenCalledWith('F1');
    expect(
      await screen.findByRole('link', { name: 'paper.pdf' }),
    ).toHaveAttribute('href', '/api/assets/openalex/original/S1/F1.pdf');
    expect(screen.getByRole('link', { name: 'openalex/original/S1/F1.pdf' })).toHaveAttribute(
      'href',
      '/api/assets/openalex/original/S1/F1.pdf',
    );
    expect(screen.getByText('paper.md')).toBeInTheDocument();
    expect(screen.getByText('查看内容块')).toHaveAttribute('href', '/original-files/F1/blocks');
  });
});
