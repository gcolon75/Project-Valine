// src/hooks/__tests__/useOptimisticUpdate.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useOptimisticUpdate, optimisticUpdate } from '../useOptimisticUpdate';
import { logDiagnostic } from '../../utils/diagnostics';

vi.mock('../../utils/diagnostics', () => ({
  logDiagnostic: vi.fn()
}));

describe('useOptimisticUpdate', () => {
  let updateFn, rollbackFn, apiCall;

  beforeEach(() => {
    updateFn = vi.fn();
    rollbackFn = vi.fn();
    apiCall = vi.fn();
    vi.clearAllMocks();
  });

  it('should apply optimistic update and sync with API on success', async () => {
    apiCall.mockResolvedValue({ success: true });

    const { result } = renderHook(() =>
      useOptimisticUpdate(updateFn, rollbackFn, { diagnosticContext: 'test' })
    );

    await act(async () => {
      await result.current.execute(apiCall, 'arg1');
    });

    expect(updateFn).toHaveBeenCalledWith('arg1');
    expect(apiCall).toHaveBeenCalledWith('arg1');
    expect(rollbackFn).not.toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it('should rollback on API error', async () => {
    const error = new Error('API failed');
    apiCall.mockRejectedValue(error);

    const { result } = renderHook(() =>
      useOptimisticUpdate(updateFn, rollbackFn, { diagnosticContext: 'test' })
    );

    await act(async () => {
      try {
        await result.current.execute(apiCall, 'arg1');
      } catch (err) {
        // Expected to throw
      }
    });

    expect(updateFn).toHaveBeenCalledWith('arg1');
    expect(apiCall).toHaveBeenCalledWith('arg1');
    expect(rollbackFn).toHaveBeenCalledWith('arg1');
    expect(result.current.error).toBe(error);
    expect(logDiagnostic).toHaveBeenCalled();
  });

  it('should call onSuccess callback', async () => {
    const onSuccess = vi.fn();
    apiCall.mockResolvedValue({ data: 'test' });

    const { result } = renderHook(() =>
      useOptimisticUpdate(updateFn, rollbackFn, { 
        diagnosticContext: 'test',
        onSuccess 
      })
    );

    await act(async () => {
      await result.current.execute(apiCall, 'arg1');
    });

    expect(onSuccess).toHaveBeenCalledWith({ data: 'test' }, 'arg1');
  });

  it('should call onError callback on failure', async () => {
    const onError = vi.fn();
    const error = new Error('Failed');
    apiCall.mockRejectedValue(error);

    const { result } = renderHook(() =>
      useOptimisticUpdate(updateFn, rollbackFn, { 
        diagnosticContext: 'test',
        onError 
      })
    );

    await act(async () => {
      try {
        await result.current.execute(apiCall, 'arg1');
      } catch (err) {
        // Expected
      }
    });

    expect(onError).toHaveBeenCalledWith(error, 'arg1');
  });

  it('should handle multiple arguments', async () => {
    apiCall.mockResolvedValue({ success: true });

    const { result } = renderHook(() =>
      useOptimisticUpdate(updateFn, rollbackFn, { diagnosticContext: 'test' })
    );

    await act(async () => {
      await result.current.execute(apiCall, 'arg1', 'arg2', 'arg3');
    });

    expect(updateFn).toHaveBeenCalledWith('arg1', 'arg2', 'arg3');
    expect(apiCall).toHaveBeenCalledWith('arg1', 'arg2', 'arg3');
  });

  it('should track loading state', async () => {
    apiCall.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    const { result } = renderHook(() =>
      useOptimisticUpdate(updateFn, rollbackFn, { diagnosticContext: 'test' })
    );

    expect(result.current.loading).toBe(false);

    act(() => {
      result.current.execute(apiCall);
    });

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });
});

describe('optimisticUpdate (function)', () => {
  let updateFn, rollbackFn, apiCall;

  beforeEach(() => {
    updateFn = vi.fn();
    rollbackFn = vi.fn();
    apiCall = vi.fn();
    vi.clearAllMocks();
  });

  it('should apply optimistic update and sync with API', async () => {
    apiCall.mockResolvedValue({ success: true });

    const result = await optimisticUpdate(updateFn, apiCall, rollbackFn, 'test');

    expect(updateFn).toHaveBeenCalled();
    expect(apiCall).toHaveBeenCalled();
    expect(rollbackFn).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true });
  });

  it('should rollback on API error', async () => {
    const error = new Error('API failed');
    apiCall.mockRejectedValue(error);

    try {
      await optimisticUpdate(updateFn, apiCall, rollbackFn, 'test');
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBe(error);
    }

    expect(updateFn).toHaveBeenCalled();
    expect(apiCall).toHaveBeenCalled();
    expect(rollbackFn).toHaveBeenCalled();
    expect(logDiagnostic).toHaveBeenCalled();
  });
});
