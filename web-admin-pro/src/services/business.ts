import { request } from '@umijs/max';
import { apiBaseUrl, csrfToken } from './auth';

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
  recordVersion: number;
  currentVersion?: number;
  createdAt?: string | null;
  createdBy?: number | null;
  updatedAt?: string | null;
  updatedBy?: number | null;
};

export type OpenAlexSource = {
  sourceId: string;
  displayName: string;
  publisher?: string | null;
  issnL?: string | null;
  issn: string[];
  worksCount?: number | null;
  citedByCount?: number | null;
  isOa?: boolean | null;
  isInDoaj?: boolean | null;
  homepageUrl?: string | null;
};

export type OpenAlexJournalImportStatus = 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';

export type OpenAlexJournalImportResult = {
  sourceCount: number;
  workCount: number;
  workSourceCount: number;
  workAuthorCount: number;
  workTopicCount: number;
  matchResetCount: number;
};

export type OpenAlexJournalImportTask = {
  taskId: string;
  sourceId: string;
  yearFrom?: number | null;
  yearTo?: number | null;
  status: OpenAlexJournalImportStatus;
  retryOfTaskId?: string | null;
  attemptCount: number;
  progressCurrent: number;
  progressTotal: number;
  progressMessage?: string | null;
  result?: OpenAlexJournalImportResult | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
};

export type PaperMutation = { fileId: string; recordVersion: number };
export type PaperBatchDeleteItem = PaperMutation;
export type PaperBatchDeleteResponse = { items: PaperMutation[] };
export type TrashedPaper = PaperMutation & {
  sourceId: string;
  sourceName?: string | null;
  year?: number | null;
  paperTitle?: string | null;
  authors?: string | null;
  deletedAt: string;
  deletedBy?: number | null;
  deleteReason?: string | null;
};

export type PaperFileVersion = {
  fileId: string;
  versionNo: number;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedBy?: number | null;
  uploadedAt: string;
  current: boolean;
};

export type PaperMetadataInput = {
  sourceId: string;
  year: number;
  paperTitle: string;
  authors: string[];
  doi?: string;
  url?: string;
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

async function writeJson<T>(path: string, method: string, data?: unknown) {
  const token = await csrfToken();
  return request<T>(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-XSRF-TOKEN': token,
    },
    data,
  });
}

async function writeForm<T>(path: string, formData: FormData) {
  const token = await csrfToken();
  return request<T>(path, {
    method: 'POST',
    headers: { 'X-XSRF-TOKEN': token },
    data: formData,
  });
}

export function searchOpenAlexSources(query: string) {
  const params = new URLSearchParams({ q: query });
  return getJson<OpenAlexSource[]>('/api/openalex/source-search', params);
}

export function getOpenAlexSource(sourceId: string) {
  return getJson<OpenAlexSource>(`/api/openalex/source-search/${sourceId}`);
}

export function syncOpenAlexSources() {
  return writeJson<{ syncedCount: number }>('/api/openalex/source-search/sync', 'POST');
}

export function createOpenAlexJournalImport(sourceId: string, yearFrom?: number, yearTo?: number) {
  return writeJson<OpenAlexJournalImportTask>('/api/openalex/journal-imports', 'POST', {
    sourceId,
    yearFrom,
    yearTo,
  });
}

export function listOpenAlexJournalImports(sourceId?: string) {
  const params = new URLSearchParams();
  if (sourceId) params.set('sourceId', sourceId);
  return getJson<Page<OpenAlexJournalImportTask>>('/api/openalex/journal-imports', withDefaults(params));
}

export function retryOpenAlexJournalImport(taskId: string) {
  return writeJson<OpenAlexJournalImportTask>(`/api/openalex/journal-imports/${taskId}/retry`, 'POST');
}

export function createPaper(metadata: PaperMetadataInput, file: File) {
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);
  return writeForm<PaperMutation>('/api/papers', form);
}

export function updatePaper(fileId: string, metadata: PaperMetadataInput, recordVersion: number) {
  return writeJson<PaperMutation>(`/api/papers/${fileId}`, 'PUT', { ...metadata, recordVersion });
}

export function replacePaperFile(fileId: string, recordVersion: number, file: File) {
  const form = new FormData();
  form.append('file', file);
  return writeForm<PaperMutation>(
    `/api/papers/${fileId}/versions?recordVersion=${recordVersion}`,
    form,
  );
}

export function listPaperVersions(fileId: string) {
  return getJson<PaperFileVersion[]>(`/api/papers/${fileId}/versions`);
}

export function restorePaperVersion(fileId: string, versionNo: number, recordVersion: number) {
  return writeJson<PaperMutation>(
    `/api/papers/${fileId}/versions/${versionNo}/restore`,
    'POST',
    { recordVersion },
  );
}

export function softDeletePaper(fileId: string, recordVersion: number, reason?: string) {
  return writeJson<PaperMutation>(`/api/papers/${fileId}`, 'DELETE', { recordVersion, reason });
}

export function softDeletePapers(papers: PaperBatchDeleteItem[], reason?: string) {
  return writeJson<PaperBatchDeleteResponse>('/api/papers/batch', 'DELETE', { papers, reason });
}

export function listTrashedPapers(query?: string) {
  const params = query ? new URLSearchParams({ q: query }) : undefined;
  return getJson<TrashedPaper[]>('/api/papers/trash', params);
}

export function restorePaper(fileId: string, recordVersion: number) {
  return writeJson<PaperMutation>(`/api/papers/${fileId}/restore`, 'POST', { recordVersion });
}

export function purgePaper(fileId: string, recordVersion: number, confirmation: string) {
  return writeJson<void>(`/api/papers/${fileId}/purge`, 'POST', { recordVersion, confirmation });
}
