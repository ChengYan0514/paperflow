import { request } from '@umijs/max';
import { apiBaseUrl } from './auth';

export type Page<T> = {
  items: T[];
  page: number;
  size: number;
  total: number;
};

export type SourceStats = {
  workCount: number;
  originalFileCount: number;
  matchedFileCount: number;
  parsedFileCount: number;
  readyFileCount: number;
  parseFailedFileCount: number;
  blockFailedFileCount: number;
  unsupportedFileCount: number;
};

export type SourceSummary = {
  sourceId: string;
  sourceName?: string | null;
  provider?: string | null;
  stats: SourceStats;
};

export type TaskStatusTotals = {
  sourceCount: number;
  workCount: number;
  originalFileCount: number;
  matchedWorkCount: number;
  parsedFileCount: number;
  blockImportedFileCount: number;
};

export type TaskStatusSource = {
  sourceId: string;
  sourceName?: string | null;
  provider?: string | null;
  workCount: number;
  originalFileCount: number;
  matchedWorkCount: number;
  parsedFileCount: number;
  blockImportedFileCount: number;
};

export type TaskStatus = {
  totals: TaskStatusTotals;
  sources: TaskStatusSource[];
};

export type ServiceCheck = {
  name: string;
  ok: boolean;
  message: string;
};

export type RecentError = {
  requestId: string;
  method: string;
  path: string;
  message?: string | null;
  createdAt: string;
};

export type ServiceStatus = {
  status: 'UP' | 'DOWN';
  version: string;
  checkedAt: string;
  backend: ServiceCheck;
  database: ServiceCheck;
  dataRoot: ServiceCheck;
  disk: ServiceCheck;
  recentErrors: RecentError[];
};

export type WorkMetadata = {
  workId: string;
  title?: string | null;
  doi?: string | null;
  publicationYear?: number | null;
  publicationDate?: string | null;
  type?: string | null;
  language?: string | null;
};

export type SourceBrief = {
  sourceId: string;
  sourceName?: string | null;
  provider?: string | null;
};

export type Author = {
  authorId: string;
  authorName?: string | null;
  authorPosition?: string | null;
};

export type TextFile = {
  fileId: string;
  fileType: string;
  fileName: string;
  filePath: string;
  fileUrl: string;
  fileSize: number;
};

export type OriginalFile = {
  fileId: string;
  sourceId: string;
  sourceName?: string | null;
  year?: number | null;
  paperTitle?: string | null;
  authors?: string | null;
  doi?: string | null;
  url?: string | null;
  provider?: string | null;
  originalFileName: string;
  originalFilePath: string;
  originalFileUrl: string;
  originalFileType: string;
  fileSize: number;
  flagMatch: number;
  matchedWorkId?: string | null;
  flagText: number;
  flagBlock: number;
  textFiles: TextFile[];
};

export type PaperTaskStatus = {
  flagMatch: number;
  flagText: number;
  flagBlock: number;
};

export type OpenAlexMetadata = WorkMetadata & {
  sources: SourceBrief[];
  authors: Author[];
};

export type PaperDetail = {
  originalFile: Omit<OriginalFile, 'flagMatch' | 'matchedWorkId' | 'flagText' | 'flagBlock' | 'textFiles'>;
  taskStatus: PaperTaskStatus;
  openAlex?: OpenAlexMetadata | null;
  textFiles: TextFile[];
  causalSummary?: {
    workId: string;
    claimRecordCount: number;
    standardClaimCount: number;
    variableCount: number;
    hasCausalClaims: boolean;
  } | null;
};

export type Block = {
  blockId: string;
  fileId: string;
  blockType: string;
  blockText?: string | null;
  pdfPage?: number | null;
  pdfBbox?: unknown | null;
  blockSeq: number;
  parentTitleBlockId?: string | null;
  titleLevel?: number | null;
  imagePath?: string | null;
  imageUrl?: string | null;
  imageCaption?: string | null;
  imageFootnote?: string | null;
  tableImagePath?: string | null;
  tableImageUrl?: string | null;
  tableCaption?: string | null;
  tableFootnote?: string | null;
  equationImagePath?: string | null;
  equationImageUrl?: string | null;
  equationFormat?: string | null;
  footnoteLabel?: string | null;
  footnoteText?: string | null;
  references?: string[] | null;
};

function withDefaults(params?: URLSearchParams) {
  const next = new URLSearchParams(params);
  if (!next.has('page')) {
    next.set('page', '1');
  }
  if (!next.has('size')) {
    next.set('size', '10');
  }
  return next;
}

function withoutPagination(params?: URLSearchParams) {
  const next = new URLSearchParams(params);
  next.delete('page');
  next.delete('size');
  return next;
}

async function getJson<T>(path: string, params?: URLSearchParams) {
  const query = params?.toString();
  return request<T>(`${path}${query ? `?${query}` : ''}`, {
    method: 'GET',
  });
}

export function assetUrl(path?: string | null) {
  if (!path) {
    return null;
  }
  return path.startsWith('http') ? path : `${apiBaseUrl}${path}`;
}

export function listTaskStatus() {
  return getJson<TaskStatus>('/api/task-status');
}

export function getServiceStatus() {
  return getJson<ServiceStatus>('/api/service-status');
}

export function listSources(params?: URLSearchParams) {
  return getJson<Page<SourceSummary>>('/api/sources', withDefaults(params));
}

export function sourcesExportUrl(params?: URLSearchParams) {
  const query = withoutPagination(params).toString();
  return `${apiBaseUrl}/api/sources/export${query ? `?${query}` : ''}`;
}

export function getSource(sourceId: string) {
  return getJson<SourceSummary>(`/api/sources/${sourceId}`);
}

export function listPapers(params?: URLSearchParams) {
  return getJson<Page<OriginalFile>>('/api/papers', withDefaults(params));
}

export function papersExportUrl(params?: URLSearchParams) {
  const query = withoutPagination(params).toString();
  return `${apiBaseUrl}/api/papers/export${query ? `?${query}` : ''}`;
}

export function getPaper(fileId: string) {
  return getJson<PaperDetail>(`/api/papers/${fileId}`);
}

export function listPaperBlocks(fileId: string, params?: URLSearchParams) {
  return getJson<Page<Block>>(
    `/api/papers/${fileId}/blocks`,
    withDefaults(params),
  );
}
