// src/hooks/__tests__/useOptimisticLinkReorder.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useOptimisticLinkReorder } from '../useOptimisticLinkReorder';

describe('useOptimisticLinkReorder', () => {
  const mockLinks = [
    { id: '1', label: 'Link 1', url: 'https://example1.com', type: 'website' },
    { id: '2', label: 'Link 2', url: 'https://example2.com', type: 'imdb' },
    { id: '3', label: 'Link 3', url: 'https://example3.com', type: 'showreel' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with provided links', () => {
    const { result } = renderHook(() => 
      useOptimisticLinkReorder(mockLinks, vi.fn())
    );

    expect(result.current.links).toEqual(mockLinks);
    expect(result.current.isReordering).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('optimistically updates links immediately', async () => {
    const updateApi = vi.fn().mockResolvedValue({});
    const { result } = renderHook(() => 
      useOptimisticLinkReorder(mockLinks, updateApi)
    );

    const reorderedLinks = [mockLinks[2], mockLinks[0], mockLinks[1]];

    act(() => {
      result.current.reorderLinks(reorderedLinks);
    });

    // Links should be updated immediately (optimistic)
    expect(result.current.links).toEqual(reorderedLinks);
    expect(result.current.isReordering).toBe(true);
  });

  it('calls API callback with new links', async () => {
    const updateApi = vi.fn().mockResolvedValue({});
    const { result } = renderHook(() => 
      useOptimisticLinkReorder(mockLinks, updateApi)
    );

    const reorderedLinks = [mockLinks[1], mockLinks[0], mockLinks[2]];

    await act(async () => {
      await result.current.reorderLinks(reorderedLinks);
    });

    expect(updateApi).toHaveBeenCalledWith(reorderedLinks);
    expect(updateApi).toHaveBeenCalledTimes(1);
  });

  it('maintains updated links on successful API call', async () => {
    const updateApi = vi.fn().mockResolvedValue({});
    const { result } = renderHook(() => 
      useOptimisticLinkReorder(mockLinks, updateApi)
    );

    const reorderedLinks = [mockLinks[2], mockLinks[1], mockLinks[0]];

    await act(async () => {
      await result.current.reorderLinks(reorderedLinks);
    });

    await waitFor(() => {
      expect(result.current.isReordering).toBe(false);
    });

    expect(result.current.links).toEqual(reorderedLinks);
    expect(result.current.error).toBeNull();
  });

  it('rolls back to previous state on API failure', async () => {
    const updateApi = vi.fn().mockRejectedValue(new Error('API Error'));
    const { result } = renderHook(() => 
      useOptimisticLinkReorder(mockLinks, updateApi)
    );

    const reorderedLinks = [mockLinks[2], mockLinks[0], mockLinks[1]];

    await act(async () => {
      await result.current.reorderLinks(reorderedLinks);
    });

    await waitFor(() => {
      expect(result.current.isReordering).toBe(false);
    });

    // Should roll back to original links
    expect(result.current.links).toEqual(mockLinks);
    expect(result.current.error).toBeTruthy();
    expect(result.current.error.message).toBe('API Error');
  });

  it('handles missing API callback gracefully', async () => {
    const { result } = renderHook(() => 
      useOptimisticLinkReorder(mockLinks)
    );

    const reorderedLinks = [mockLinks[1], mockLinks[0], mockLinks[2]];

    await act(async () => {
      await result.current.reorderLinks(reorderedLinks);
    });

    // Should still update links even without API call
    expect(result.current.links).toEqual(reorderedLinks);
    expect(result.current.isReordering).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('allows manual link updates via setLinks', () => {
    const { result } = renderHook(() => 
      useOptimisticLinkReorder(mockLinks, vi.fn())
    );

    const newLinks = [
      { id: '4', label: 'New Link', url: 'https://new.com', type: 'website' }
    ];

    act(() => {
      result.current.setLinks(newLinks);
    });

    expect(result.current.links).toEqual(newLinks);
  });

  it('handles rapid reorder requests correctly', async () => {
    const updateApi = vi.fn()
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});
    
    const { result } = renderHook(() => 
      useOptimisticLinkReorder(mockLinks, updateApi)
    );

    const reorder1 = [mockLinks[1], mockLinks[0], mockLinks[2]];
    const reorder2 = [mockLinks[2], mockLinks[1], mockLinks[0]];

    // First reorder
    await act(async () => {
      await result.current.reorderLinks(reorder1);
    });

    // Second reorder before first completes
    await act(async () => {
      await result.current.reorderLinks(reorder2);
    });

    await waitFor(() => {
      expect(result.current.isReordering).toBe(false);
    });

    // Should have the last reorder applied
    expect(result.current.links).toEqual(reorder2);
    expect(updateApi).toHaveBeenCalledTimes(2);
  });

  it('clears error on successful reorder after failure', async () => {
    const updateApi = vi.fn()
      .mockRejectedValueOnce(new Error('First Error'))
      .mockResolvedValueOnce({});
    
    const { result } = renderHook(() => 
      useOptimisticLinkReorder(mockLinks, updateApi)
    );

    const reorderedLinks = [mockLinks[1], mockLinks[0], mockLinks[2]];

    // First attempt fails
    await act(async () => {
      await result.current.reorderLinks(reorderedLinks);
    });

    expect(result.current.error).toBeTruthy();

    // Second attempt succeeds
    await act(async () => {
      await result.current.reorderLinks(reorderedLinks);
    });

    await waitFor(() => {
      expect(result.current.isReordering).toBe(false);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.links).toEqual(reorderedLinks);
  });
});
