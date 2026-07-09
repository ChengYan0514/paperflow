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
    const { originalFilesExportUrl } = await import('./business');
    const params = new URLSearchParams('sourceId=S1&page=3&size=20&flagText=-1');

    expect(originalFilesExportUrl(params)).toBe('/api/original-files/export?sourceId=S1&flagText=-1');
  });

  it('gets service status', async () => {
    const { getServiceStatus } = await import('./business');

    await getServiceStatus();

    expect(requestMock).toHaveBeenCalledWith('/api/service-status', {
      method: 'GET',
    });
  });

  it('passes includeDiscarded to work block calls', async () => {
    const { listWorkBlocks } = await import('./business');
    const params = new URLSearchParams('includeDiscarded=true&size=500');

    await listWorkBlocks('W1', params);

    expect(requestMock).toHaveBeenCalledWith(
      '/api/works/W1/blocks?includeDiscarded=true&size=500&page=1',
      { method: 'GET' },
    );
  });
});
