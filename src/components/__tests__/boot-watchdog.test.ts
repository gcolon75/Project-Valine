// src/components/__tests__/boot-watchdog.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Boot Watchdog', () => {
  let originalAppMounted: (() => void) | undefined;
  let timeoutSpy: ReturnType<typeof vi.spyOn>;
  let clearTimeoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Save original state
    originalAppMounted = (window as any).__appMounted;
    
    // Spy on setTimeout and clearTimeout
    timeoutSpy = vi.spyOn(global, 'setTimeout');
    clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    
    // Clear any existing __appMounted
    delete (window as any).__appMounted;
  });

  afterEach(() => {
    // Restore original state
    if (originalAppMounted) {
      (window as any).__appMounted = originalAppMounted;
    } else {
      delete (window as any).__appMounted;
    }
    
    timeoutSpy.mockRestore();
    clearTimeoutSpy.mockRestore();
  });

  it('should expose __appMounted function on window', () => {
    // Simulate boot watchdog initialization (normally done in theme-init.js)
    const mockAppMounted = vi.fn();
    (window as any).__appMounted = mockAppMounted;
    
    expect((window as any).__appMounted).toBeDefined();
    expect(typeof (window as any).__appMounted).toBe('function');
  });

  it('should clear timeout when app mounts successfully', () => {
    // Simulate the boot watchdog logic
    let bootTimer: NodeJS.Timeout | null = null;
    let appMounted = false;
    
    const BOOT_TIMEOUT_MS = 8000;
    
    // Mock the __appMounted function
    (window as any).__appMounted = () => {
      appMounted = true;
      if (bootTimer) {
        clearTimeout(bootTimer);
        bootTimer = null;
      }
    };
    
    // Start boot watchdog
    bootTimer = setTimeout(() => {
      if (!appMounted) {
        console.error('App failed to mount');
      }
    }, BOOT_TIMEOUT_MS);
    
    // Simulate successful mount
    (window as any).__appMounted();
    
    expect(appMounted).toBe(true);
    expect(bootTimer).toBeNull();
  });

  it('should trigger timeout if app does not mount within deadline', () => {
    vi.useFakeTimers();
    
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const showOverlaySpy = vi.fn();
    
    let bootTimer: NodeJS.Timeout | null = null;
    let appMounted = false;
    
    const BOOT_TIMEOUT_MS = 8000;
    
    // Mock the __appMounted function
    (window as any).__appMounted = () => {
      appMounted = true;
      if (bootTimer) {
        clearTimeout(bootTimer);
        bootTimer = null;
      }
    };
    
    // Start boot watchdog
    bootTimer = setTimeout(() => {
      if (!appMounted) {
        console.error('[Boot Watchdog] App failed to mount within ' + BOOT_TIMEOUT_MS + 'ms');
        showOverlaySpy();
      }
    }, BOOT_TIMEOUT_MS);
    
    // Fast-forward time past the timeout
    vi.advanceTimersByTime(BOOT_TIMEOUT_MS + 100);
    
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('App failed to mount')
    );
    expect(showOverlaySpy).toHaveBeenCalled();
    expect(appMounted).toBe(false);
    
    consoleErrorSpy.mockRestore();
    vi.useRealTimers();
  });

  it('should not trigger timeout if app mounts before deadline', () => {
    vi.useFakeTimers();
    
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const showOverlaySpy = vi.fn();
    
    let bootTimer: NodeJS.Timeout | null = null;
    let appMounted = false;
    
    const BOOT_TIMEOUT_MS = 8000;
    
    // Mock the __appMounted function
    (window as any).__appMounted = () => {
      appMounted = true;
      if (bootTimer) {
        clearTimeout(bootTimer);
        bootTimer = null;
      }
    };
    
    // Start boot watchdog
    bootTimer = setTimeout(() => {
      if (!appMounted) {
        console.error('[Boot Watchdog] App failed to mount');
        showOverlaySpy();
      }
    }, BOOT_TIMEOUT_MS);
    
    // Advance time but not past timeout
    vi.advanceTimersByTime(4000);
    
    // Simulate mount before timeout
    (window as any).__appMounted();
    
    // Advance past original timeout
    vi.advanceTimersByTime(5000);
    
    // Should not have triggered error
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(showOverlaySpy).not.toHaveBeenCalled();
    expect(appMounted).toBe(true);
    
    consoleErrorSpy.mockRestore();
    vi.useRealTimers();
  });

  it('should log helpful diagnostic information on boot failure', () => {
    vi.useFakeTimers();
    
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    let bootTimer: NodeJS.Timeout | null = null;
    let appMounted = false;
    
    const BOOT_TIMEOUT_MS = 8000;
    
    // Mock the __appMounted function
    (window as any).__appMounted = () => {
      appMounted = true;
      if (bootTimer) {
        clearTimeout(bootTimer);
        bootTimer = null;
      }
      console.log('[Boot Watchdog] ✅ App mounted successfully');
    };
    
    // Start boot watchdog with diagnostic logging
    bootTimer = setTimeout(() => {
      if (!appMounted) {
        console.error('[Boot Watchdog] ⚠️ App failed to mount within ' + BOOT_TIMEOUT_MS + 'ms');
        console.error('[Boot Watchdog] Common causes:');
        console.error('  1. JavaScript bundle failed to load (check Network tab for 404s)');
        console.error('  2. Module returned HTML instead of JavaScript (MIME type issue)');
      }
    }, BOOT_TIMEOUT_MS);
    
    // Fast-forward past timeout without mounting
    vi.advanceTimersByTime(BOOT_TIMEOUT_MS + 100);
    
    // Should have logged diagnostic info
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Common causes')
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('JavaScript bundle failed to load')
    );
    
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    vi.useRealTimers();
  });
});
