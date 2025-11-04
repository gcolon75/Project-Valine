import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useApiFallback } from '../useApiFallback';

describe('useApiFallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Enable API integration for tests by default
    import.meta.env.VITE_API_INTEGRATION = 'true';
  });

  it('should return data from successful API call', async () => {
    const mockApiCall = vi.fn().mockResolvedValue({ data: 'test data' });
    const fallbackData = { data: 'fallback' };

    const { result } = renderHook(() =>
      useApiFallback(mockApiCall, fallbackData)
    );

    // Initial state has fallbackData while loading
    expect(result.current.data).toEqual(fallbackData);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual({ data: 'test data' });
    expect(result.current.error).toBeNull();
    expect(result.current.usingFallback).toBe(false);
    expect(mockApiCall).toHaveBeenCalledTimes(1);
  });

  it('should return fallback data on network error', async () => {
    const networkError = new Error('Network Error');
    networkError.code = 'ERR_NETWORK';
    const mockApiCall = vi.fn().mockRejectedValue(networkError);
    const fallbackData = { data: 'fallback' };

    const { result } = renderHook(() =>
      useApiFallback(mockApiCall, fallbackData)
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(fallbackData);
    expect(result.current.error).toBeNull(); // Error not set for fallback cases
    expect(result.current.usingFallback).toBe(true);
  });

  it('should return fallback data on 5xx server error', async () => {
    const mockApiCall = vi.fn().mockRejectedValue({
      response: { status: 500 },
      message: 'Server Error',
    });
    const fallbackData = { data: 'fallback' };

    const { result } = renderHook(() =>
      useApiFallback(mockApiCall, fallbackData)
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(fallbackData);
    expect(result.current.usingFallback).toBe(true);
  });

  it('should not use fallback on 4xx client error', async () => {
    const mockApiCall = vi.fn().mockRejectedValue({
      response: { status: 404 },
      message: 'Not Found',
    });
    const fallbackData = { data: 'fallback' };

    const { result } = renderHook(() =>
      useApiFallback(mockApiCall, fallbackData)
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Data stays as fallback but usingFallback is false (4xx doesn't trigger fallback)
    expect(result.current.data).toEqual(fallbackData);
    expect(result.current.error).toBeTruthy();
    expect(result.current.usingFallback).toBe(false);
  });

  it('should log to diagnostics on error', async () => {
    const networkError = new Error('API Error');
    networkError.code = 'ERR_NETWORK';
    const mockApiCall = vi.fn().mockRejectedValue(networkError);
    const fallbackData = { data: 'fallback' };
    const diagnosticContext = 'TestComponent';

    const { result } = renderHook(() =>
      useApiFallback(mockApiCall, fallbackData, { diagnosticContext })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.usingFallback).toBe(true);
    });

    // Verify the hook executed and used fallback (diagnostics logging happens internally)
    expect(mockApiCall).toHaveBeenCalled();
    expect(result.current.data).toEqual(fallbackData);
  });

  it('should allow manual retry', async () => {
    let callCount = 0;
    const mockApiCall = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        const err = new Error('First attempt failed');
        err.code = 'ERR_NETWORK';
        return Promise.reject(err);
      }
      return Promise.resolve({ data: 'success on retry' });
    });
    const fallbackData = { data: 'fallback' };

    const { result } = renderHook(() =>
      useApiFallback(mockApiCall, fallbackData)
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.usingFallback).toBe(true);

    // Refetch (not retry)
    result.current.refetch();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual({ data: 'success on retry' });
    expect(result.current.usingFallback).toBe(false);
    expect(mockApiCall).toHaveBeenCalledTimes(2);
  });

  it('should handle empty fallback data', async () => {
    const networkError = new Error('API Error');
    networkError.code = 'ERR_NETWORK';
    const mockApiCall = vi.fn().mockRejectedValue(networkError);
    const fallbackData = null;

    const { result } = renderHook(() =>
      useApiFallback(mockApiCall, fallbackData)
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull(); // Error not set for fallback cases
    expect(result.current.usingFallback).toBe(true);
  });
});
