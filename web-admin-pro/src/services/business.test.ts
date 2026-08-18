import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const requestMock = vi.hoisted(() => vi.fn());

vi.mock('@umijs/max', () => ({
  request: requestMock,
}));

describe('business service', () => {
  beforeEach(() => {
    vi.resetModules();
    requestMock.mockReset();
    requestMock.mockResolvedValue({ items: [] });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('passes URL query to source list calls', async () => {
    const { listSources } = await import('./business');
    const params = new URLSearchParams('sourceName=nature&sort=workCountDesc');

    await listSources(params);

    expect(requestMock).toHaveBeenCalledWith(
      '/api/sources?sourceName=nature&sort=workCountDesc&page=1&size=10',
      { method: 'GET' },
    );
  });

  it('builds export URLs without pagination', async () => {
    const { papersExportUrl } = await import('./business');
    const params = new URLSearchParams('sourceId=S1&page=3&size=20&flagText=-1');

    expect(papersExportUrl(params)).toBe('/api/papers/export?sourceId=S1&flagText=-1');
  });

  it('gets service status', async () => {
    const { getServiceStatus } = await import('./business');

    await getServiceStatus();

    expect(requestMock).toHaveBeenCalledWith('/api/service-status', {
      method: 'GET',
    });
  });

  it('passes includeDiscarded to paper block calls', async () => {
    const { listPaperBlocks } = await import('./business');
    const params = new URLSearchParams('includeDiscarded=true&size=500');

    await listPaperBlocks('F1', params);

    expect(requestMock).toHaveBeenCalledWith(
      '/api/papers/F1/blocks?includeDiscarded=true&size=500&page=1',
      { method: 'GET' },
    );
  });

  it('sends the batch paper deletion payload as JSON', async () => {
    document.cookie = 'XSRF-TOKEN=test-token';
    requestMock
      .mockResolvedValueOnce({ items: [{ fileId: 'F1', recordVersion: 1 }] });
    const { softDeletePapers } = await import('./business');

    await softDeletePapers([{ fileId: 'F1', recordVersion: 0 }], '重复导入');

    expect(requestMock).toHaveBeenCalledWith('/api/papers/batch', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-XSRF-TOKEN': 'test-token',
      },
      data: {
        papers: [{ fileId: 'F1', recordVersion: 0 }],
        reason: '重复导入',
      },
    });
    document.cookie = 'XSRF-TOKEN=; Max-Age=0';
  });
});
