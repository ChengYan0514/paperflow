import { request } from '@umijs/max';
import { apiBaseUrl, csrfToken } from './auth';

export type ImportBatch = {
  batchId: string;
  uploadName: string;
  uploadSize: number;
  uploadSha256?: string | null;
  status: string;
  totalRows: number;
  validRows: number;
  successRows: number;
  skippedRows: number;
  failedRows: number;
  errorSummary?: string | null;
  createdAt: string;
  confirmedAt?: string | null;
};

export type ImportItem = {
  rowNumber: number;
  fileId?: string | null;
  sourceId?: string | null;
  filePath?: string | null;
  status: string;
  errorCode?: string | null;
  errorMessage?: string | null;
  warningMessage?: string | null;
  importedAt?: string | null;
};

export type ImportItemPage = { items: ImportItem[]; page: number; size: number; total: number };

async function csrfHeaders() {
  return { 'X-XSRF-TOKEN': await csrfToken() };
}

export async function createImportBatch(uploadName: string) {
  return request<ImportBatch>('/api/original-file-imports', { method: 'POST', params: { uploadName }, headers: await csrfHeaders() });
}

export async function uploadImportPart(batchId: string, partNo: number, blob: Blob) {
  const form = new FormData();
  form.append('part', blob, `part-${partNo}`);
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  const hash = Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, '0')).join('');
  return request<void>(`/api/original-file-imports/${batchId}/parts/${partNo}`, { method: 'PUT', data: form, headers: { ...(await csrfHeaders()), 'X-Part-SHA256': hash } });
}

export async function completeImportBatch(batchId: string) {
  return request<ImportBatch>(`/api/original-file-imports/${batchId}/complete`, { method: 'POST', headers: await csrfHeaders() });
}

export async function confirmImportBatch(batchId: string) {
  return request<ImportBatch>(`/api/original-file-imports/${batchId}/confirm`, { method: 'POST', headers: await csrfHeaders() });
}

export async function cancelImportBatch(batchId: string) {
  return request<ImportBatch>(`/api/original-file-imports/${batchId}/cancel`, { method: 'POST', headers: await csrfHeaders() });
}

export function getImportBatch(batchId: string) {
  return request<ImportBatch>(`/api/original-file-imports/${batchId}`);
}

export function listImportItems(batchId: string, page = 1, size = 50) {
  return request<ImportItemPage>(`/api/original-file-imports/${batchId}/items`, { params: { page, size } });
}

export function importErrorsUrl(batchId: string) {
  return `${apiBaseUrl}/api/original-file-imports/${batchId}/errors.csv`;
}
