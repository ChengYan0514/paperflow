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
