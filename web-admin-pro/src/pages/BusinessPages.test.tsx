import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PaperDetailPage from './PaperDetail';
import PapersPage from './Papers';
import FailureTasksPage from './FailureTasks';
import ServiceStatusPage from './ServiceStatus';
import SourceDetailPage from './SourceDetail';
import SourcesPage from './Sources';
import {
  getPaper,
  getServiceStatus,
  getSource,
  listPapers,
  listSources,
} from '@/services/business';

let searchParams = new URLSearchParams();
let setSearchParams = vi.fn();
let params = { sourceId: 'S1', workId: 'W1', fileId: 'F1' };

vi.mock('@umijs/max', () => ({
  history: { push: vi.fn() },
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  useAccess: () => ({
    canDeletePapers: true,
    canRestorePaperVersions: true,
  }),
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
  ProTable: ({ dataSource = [], columns = [], rowKey, pagination, toolBarRender }: any) => (
    <>
      <div>{typeof toolBarRender === 'function' ? toolBarRender() : null}</div>
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
  sourceName: 'Nature',
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
  sourceNames: 'Nature',
  sources: [{ sourceId: 'S1', sourceName: 'Nature', provider: 'OpenAlex' }],
  processingStatus: 'READY' as const,
  matchedFileId: 'F1',
  flagMatch: 1,
  flagText: 2,
  flagBlock: 1,
};

vi.mock('@/services/business', () => ({
  assetUrl: (path?: string | null) => path,
  listSources: vi.fn(async () => ({ items: [source], page: 1, size: 10, total: 1 })),
  sourcesExportUrl: vi.fn((params?: URLSearchParams) => `/api/sources/export?${params}`),
  getSource: vi.fn(async () => source),
  listPapers: vi.fn(async () => ({ items: [file], page: 1, size: 10, total: 1 })),
  papersExportUrl: vi.fn((params?: URLSearchParams) => `/api/papers/export?${params}`),
  getPaper: vi.fn(async () => ({
    originalFile: {
      fileId: file.fileId, sourceId: file.sourceId, sourceName: file.sourceName, year: file.year,
      paperTitle: file.paperTitle, authors: file.authors, doi: file.doi, url: file.url, provider: file.provider,
      originalFileName: file.originalFileName, originalFilePath: file.originalFilePath,
      originalFileUrl: file.originalFileUrl, originalFileType: file.originalFileType, fileSize: file.fileSize,
    },
    taskStatus: { flagMatch: file.flagMatch, flagText: file.flagText, flagBlock: file.flagBlock },
    openAlex: null,
    textFiles: file.textFiles,
    causalSummary: null,
  })),
  listPaperVersions: vi.fn(async () => []),
  getServiceStatus: vi.fn(async () => ({
    status: 'UP',
    version: '0.1.0',
    checkedAt: '2026-07-09T10:00:00Z',
    backend: { name: 'Java 后端', ok: true, message: '运行中' },
    database: { name: '数据库', ok: true, message: '连接正常' },
    dataRoot: { name: '数据目录', ok: true, message: 'data 存在，可读' },
    disk: { name: '磁盘空间', ok: true, message: '可用 100 GB / 总计 200 GB' },
    recentErrors: [],
  })),
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
    expect(screen.getByRole('link', { name: /导出 CSV/ })).toHaveAttribute(
      'href',
      '/api/sources/export?sourceId=S1&sort=sourceIdAsc',
    );
  });

  it('updates URL query when changing pages', async () => {
    render(<SourcesPage />);

    expect(await screen.findByText('S1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '下一页' }));

    await waitFor(() => expect(setSearchParams).toHaveBeenCalled());

    const next = setSearchParams.mock.calls[0][0] as URLSearchParams;
    expect(next.toString()).toBe('sourceId=S1&sort=sourceIdAsc&page=2&size=10');
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
    searchParams = new URLSearchParams('q=AI&yearFrom=2020&yearTo=2024');
    render(<PapersPage />);

    expect(await screen.findByDisplayValue('AI')).toBeInTheDocument();
    expect(screen.getByText('年份范围: 2020-2024')).toBeInTheDocument();
    expect(screen.getByLabelText('来源期刊名称')).toBeInTheDocument();
    expect(screen.getByLabelText('平台')).toBeInTheDocument();
  });

  it('shows source detail actions', async () => {
    render(<SourceDetailPage />);

    expect(getSource).toHaveBeenCalledWith('S1');
    expect(await screen.findByText('查看论文')).toHaveAttribute('href', '/papers?sourceId=S1');
  });

  it('lists papers in the configured order', async () => {
    searchParams = new URLSearchParams('sourceName=Nature&sort=yearDesc');
    render(<PapersPage />);

    expect(await screen.findByText('Paper title')).toHaveAttribute('href', '/papers/F1');
    expect(listPapers).toHaveBeenCalledWith(searchParams);
    expect(screen.getByText('Nature')).toHaveAttribute('href', '/sources/S1');
    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      '标题',
      '作者',
      '来源期刊',
      '年份',
      '平台',
      '文本解析状态',
    ]);
    expect(screen.getByRole('link', { name: /导出 CSV/ })).toHaveAttribute(
      'href',
      '/api/papers/export?sourceName=Nature&sort=yearDesc',
    );
  });

  it('keeps the source journal visible when listing papers from a source detail page', async () => {
    searchParams = new URLSearchParams('sourceId=S1&sort=yearDesc');
    render(<PapersPage />);

    expect(await screen.findByRole('heading', { name: 'Nature 的论文' })).toBeInTheDocument();
    expect(getSource).toHaveBeenCalledWith('S1');
    expect(screen.getByText('当前范围')).toBeInTheDocument();
    expect(screen.getAllByText('OpenAlex')).toHaveLength(2);
    expect(screen.getByRole('link', { name: '返回来源详情' })).toHaveAttribute('href', '/sources/S1');
    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      '标题',
      '作者',
      '年份',
      '平台',
      '文本解析状态',
    ]);

    fireEvent.click(screen.getByRole('button', { name: '清除期刊筛选' }));
    const next = setSearchParams.mock.calls[0][0] as URLSearchParams;
    expect(next.toString()).toBe('sort=yearDesc');
  });

  it('shows paper status filters in Chinese', async () => {
    searchParams = new URLSearchParams('flagMatch=1&flagText=-1&flagBlock=0');
    render(<PapersPage />);

    expect(await screen.findByText('匹配状态: 已匹配')).toBeInTheDocument();
    expect(screen.getByText('文本解析状态: 解析失败')).toBeInTheDocument();
    expect(screen.getByText('内容块入库状态: 未入库')).toBeInTheDocument();
  });

  it('shows paper detail metadata and content-block entry', async () => {
    render(<PaperDetailPage />);

    expect(getPaper).toHaveBeenCalledWith('F1');
    expect(await screen.findByText('Paper title')).toBeInTheDocument();
    expect(screen.getByText('查看解析后全文').closest('a')).toHaveAttribute('href', '/papers/F1/blocks');
  });

  it('shows the causal summary before linking to causal claims', async () => {
    vi.mocked(getPaper).mockResolvedValueOnce({
      originalFile: {
        fileId: file.fileId, sourceId: file.sourceId, sourceName: file.sourceName, year: file.year,
        paperTitle: file.paperTitle, authors: file.authors, doi: file.doi, url: file.url, provider: file.provider,
        originalFileName: file.originalFileName, originalFilePath: file.originalFilePath,
        originalFileUrl: file.originalFileUrl, originalFileType: file.originalFileType, fileSize: file.fileSize,
      },
      taskStatus: { flagMatch: file.flagMatch, flagText: file.flagText, flagBlock: file.flagBlock },
      openAlex: {
        workId: 'W1', title: 'OpenAlex Paper', sources: [], authors: [],
      },
      textFiles: file.textFiles,
      causalSummary: {
        workId: 'W1', claimRecordCount: 8, standardClaimCount: 4, variableCount: 5, hasCausalClaims: true,
      },
    } as any);

    render(<PaperDetailPage />);

    expect(await screen.findByText('声明记录')).toBeInTheDocument();
    expect(screen.getByText('标准变量对')).toBeInTheDocument();
    expect(screen.getByText('变量数')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('查看因果声明').closest('a')).toHaveAttribute(
      'href',
      '/knowledge/causal-graph/causal-claims/W1',
    );
  });

  it('shows paper detail asset links', async () => {
    render(<PaperDetailPage />);

    expect(getPaper).toHaveBeenCalledWith('F1');
    expect(
      (await screen.findByText('查看论文全文文件：paper.pdf')).closest('a'),
    ).toHaveAttribute('href', '/api/assets/openalex/original/S1/F1.pdf');
    expect(screen.getByText('paper.md')).toBeInTheDocument();
    expect(screen.getByText('查看解析后全文').closest('a')).toHaveAttribute('href', '/papers/F1/blocks');
  });

  it('shows real service status', async () => {
    render(<ServiceStatusPage />);

    expect(getServiceStatus).toHaveBeenCalled();
    expect(await screen.findByText('服务运行正常')).toBeInTheDocument();
    expect(screen.getByText('数据库')).toBeInTheDocument();
  });

  it('shows read-only failure guidance and retry command', async () => {
    searchParams = new URLSearchParams('stage=BLOCK_IMPORT&sourceId=S1');
    render(<FailureTasksPage />);

    expect(await screen.findByText('全文入库失败：文件已解析，但内容块未成功入库。')).toBeInTheDocument();
    const requestParams = vi.mocked(listPapers).mock.calls[0][0] as URLSearchParams;
    expect(requestParams.toString()).toBe('sourceId=S1&sort=textStatusIssueFirst&flagText=2&flagBlock=-1');
    expect(screen.getByText('uv run paperflow import-blocks --file-id F1 --retry-failed')).toBeInTheDocument();
  });
});
