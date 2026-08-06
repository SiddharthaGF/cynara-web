import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  jsonApiResponse,
  stubFetchWithCapture,
} from '@/api/__tests__/hospital-test-utils.ts';
import { ApiError } from '@/api/client.ts';
import {
  getWorkspace,
  isForbiddenWorkspaceError,
  isStaleWorkspaceError,
  updateWorkspace,
} from '@/api/workspace.ts';

const WORKSPACE_DTO = {
  id: 'ws-1',
  code: 'default',
  name: 'Hospital Norte',
  status: 'active',
  rowVersion: 5,
  createdAt: '2026-08-01T09:00:00Z',
  updatedAt: '2026-08-01T09:00:00Z',
  metadataJson: null,
};

describe('workspace façade', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches the workspace with tenant headers', async () => {
    const captured = stubFetchWithCapture(() => jsonApiResponse(WORKSPACE_DTO));

    const workspace = await getWorkspace();

    expect(captured.method).toBe('GET');
    expect(captured.url).toContain('/api/workspace');
    expect(captured.headers.get('X-Hospital-Code')).toBe('test-hospital');
    expect(workspace).toMatchObject({ code: 'default', status: 'active' });
  });

  it('patches the workspace with the concurrency token', async () => {
    const captured = stubFetchWithCapture(() =>
      jsonApiResponse({ ...WORKSPACE_DTO, name: 'Hospital Sur' }),
    );

    const workspace = await updateWorkspace({
      name: 'Hospital Sur',
      rowVersion: 5,
    });

    expect(captured.method).toBe('PATCH');
    expect(captured.url).toContain('/api/workspace');
    expect(JSON.parse(captured.bodyText)).toStrictEqual({
      name: 'Hospital Sur',
      rowVersion: 5,
    });
    expect(workspace.name).toBe('Hospital Sur');
  });

  it('classifies workspace errors', () => {
    expect(
      isForbiddenWorkspaceError(new ApiError(403, 'Forbidden', 'no')),
    ).toBeTruthy();
    expect(
      isForbiddenWorkspaceError(new ApiError(404, 'Not Found', 'no')),
    ).toBeFalsy();
    expect(
      isStaleWorkspaceError(new ApiError(409, 'Conflict', 'stale')),
    ).toBeTruthy();
    expect(
      isStaleWorkspaceError(new ApiError(400, 'Bad Request', 'no')),
    ).toBeFalsy();
  });
});
