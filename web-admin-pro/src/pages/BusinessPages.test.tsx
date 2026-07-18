import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OriginalFileDetailPage from './OriginalFileDetail';
import OriginalFilesPage from './OriginalFiles';
import FailureTasksPage from './FailureTasks';
import ServiceStatusPage from './ServiceStatus';
import SourceDetailPage from './SourceDetail';
import SourcesPage from './Sources';
import WorkDetailPage from './WorkDetail';
import WorksPage from './Works';
import {
  getOriginalFile,
  getServiceStatus,
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
  listSources: vi.fn(async () => ({ items: [source], page: 1, size: 10, total: 1 })),
  sourcesExportUrl: vi.fn((params?: URLSearchParams) => `/api/sources/export?${params}`),
  getSource: vi.fn(async () => source),
  listWorks: vi.fn(async () => ({ items: [work], page: 1, size: 10, total: 1 })),
  worksExportUrl: vi.fn((params?: URLSearchParams) => `/api/works/export?${params}`),
  getWork: vi.fn(async () => ({
    work,
    sources: [{ sourceId: 'S1', sourceName: 'Nature', provider: 'OpenAlex' }],
    authors: [{ authorId: 'A1', authorName: 'Ada', authorPosition: 'first' }],
    matchedFile: file,
    processingStatus: 'READY',
  })),
  listOriginalFiles: vi.fn(async () => ({ items: [file], page: 1, size: 10, total: 1 })),
  originalFilesExportUrl: vi.fn((params?: URLSearchParams) => `/api/original-files/export?${params}`),
  getOriginalFile: vi.fn(async () => file),
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

vi.mock('@/services/knowledge', () => ({
  getCausalPaperSummary: vi.fn(async () => ({ hasCausalClaims: false })),
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
    expect(screen.getByRole('link', { name: /导出 CSV/ })).toHaveAttribute(
      'href',
      '/api/works/export?authorName=Ada&sort=titleAsc',
    );
  });

  it('shows work detail metadata and content-block entry', async () => {
    render(<WorkDetailPage />);

    expect(getWork).toHaveBeenCalledWith('W1');
    expect(await screen.findByText('Work title')).toBeInTheDocument();
    expect(screen.getAllByText('Ada').length).toBeGreaterThan(0);
    expect(screen.getByText('Nature (S1)')).toHaveAttribute('href', '/sources/S1');
    expect(screen.getByText('查看解析后全文')).toHaveAttribute('href', '/works/W1/blocks');
    expect(screen.getByText('查看匹配原始文件')).toHaveAttribute('href', '/original-files/F1');
  });

  it('lists original files and links related entities', async () => {
    searchParams = new URLSearchParams('sourceName=Nature&sort=yearDesc');
    render(<OriginalFilesPage />);

    expect(await screen.findByText('F1')).toHaveAttribute('href', '/original-files/F1');
    expect(listOriginalFiles).toHaveBeenCalledWith(searchParams);
    expect(screen.getAllByText('S1')[0]).toHaveAttribute('href', '/sources/S1');
    expect(screen.getByText('W1')).toHaveAttribute('href', '/works/W1');
    expect(screen.getByRole('link', { name: /导出 CSV/ })).toHaveAttribute(
      'href',
      '/api/original-files/export?sourceName=Nature&sort=yearDesc',
    );
  });

  it('shows original file status filters in Chinese', async () => {
    searchParams = new URLSearchParams('flagMatch=1&flagText=-1&flagBlock=0');
    render(<OriginalFilesPage />);

    expect(await screen.findByText('匹配状态: 已匹配')).toBeInTheDocument();
    expect(screen.getByText('文本解析状态: 解析失败')).toBeInTheDocument();
    expect(screen.getByText('内容块入库状态: 未入库')).toBeInTheDocument();
  });

  it('shows original file detail metadata and asset links', async () => {
    render(<OriginalFileDetailPage />);

    expect(getOriginalFile).toHaveBeenCalledWith('F1');
    expect(
      await screen.findByRole('link', { name: '查看原始文件：paper.pdf' }),
    ).toHaveAttribute('href', '/api/assets/openalex/original/S1/F1.pdf');
    expect(screen.getByRole('link', { name: 'openalex/original/S1/F1.pdf' })).toHaveAttribute(
      'href',
      '/api/assets/openalex/original/S1/F1.pdf',
    );
    expect(screen.getByText('paper.md')).toBeInTheDocument();
    expect(screen.getByText('查看解析后全文')).toHaveAttribute('href', '/original-files/F1/blocks');
    expect(screen.getByText('查看匹配论文')).toHaveAttribute('href', '/works/W1');
    expect(screen.getByText('查看匹配论文详情')).toHaveAttribute('href', '/works/W1');
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
    const requestParams = vi.mocked(listOriginalFiles).mock.calls[0][0] as URLSearchParams;
    expect(requestParams.toString()).toBe('sourceId=S1&sort=textStatusIssueFirst&flagText=2&flagBlock=-1');
    expect(screen.getByText('uv run paperflow import-blocks --file-id F1 --retry-failed')).toBeInTheDocument();
  });
});
