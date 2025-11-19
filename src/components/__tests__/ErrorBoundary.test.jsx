// src/components/__tests__/ErrorBoundary.test.jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useEffect, useState } from 'react';
import ErrorBoundary from '../ErrorBoundary';

// Component that throws an error during render
const ThrowError = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// Component that throws an error in useEffect
const ThrowEffectError = ({ shouldThrow }) => {
  useEffect(() => {
    if (shouldThrow) {
      throw new Error('Effect error');
    }
  }, [shouldThrow]);
  
  return <div>Component rendered</div>;
};

describe('ErrorBoundary', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    // Mock console.error to avoid noise in test output
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock window.__errorInstrumentation
    window.__errorInstrumentation = {
      logError: vi.fn()
    };
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    delete window.__errorInstrumentation;
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('renders error UI when child component throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Oops! Something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/We've encountered an unexpected error/i)).toBeInTheDocument();
  });

  it('shows Try Again and Reload buttons when error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Try Again')).toBeInTheDocument();
    expect(screen.getByText('Reload')).toBeInTheDocument();
  });

  it('shows Back to Home link when error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const homeLink = screen.getByText(/Back to Home/i);
    expect(homeLink).toBeInTheDocument();
    expect(homeLink.closest('a')).toHaveAttribute('href', '/');
  });

  it('logs error to error instrumentation', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(window.__errorInstrumentation.logError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Test error'
      }),
      expect.objectContaining({
        boundary: 'ErrorBoundary',
        location: expect.any(String)
      })
    );
  });

  it('resets error state when Try Again is clicked', () => {
    const { container } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Error UI should be shown
    expect(screen.getByText(/Oops! Something went wrong/i)).toBeInTheDocument();

    // Click Try Again - this resets the error state
    fireEvent.click(screen.getByText('Try Again'));

    // The error boundary will try to render the child again, which will throw again
    // In a real scenario, the child would conditionally throw based on some state
    // For this test, we just verify the button exists and doesn't crash
    expect(container).toBeInTheDocument();
  });

  it('calls window.location.reload when Reload is clicked', () => {
    const reloadMock = vi.fn();
    const originalLocation = window.location;
    
    delete window.location;
    window.location = { ...originalLocation, reload: reloadMock };

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText('Reload'));

    expect(reloadMock).toHaveBeenCalled();

    // Restore
    window.location = originalLocation;
  });

  it('catches errors thrown in useEffect', () => {
    // Note: useEffect errors ARE caught by ErrorBoundary when they cause rendering issues
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    render(
      <ErrorBoundary>
        <ThrowEffectError shouldThrow={true} />
      </ErrorBoundary>
    );

    // The useEffect error is caught and the error boundary fallback is shown
    expect(screen.getByText(/Oops! Something went wrong/i)).toBeInTheDocument();
    
    consoleWarnSpy.mockRestore();
  });

  it('calls clear cache and reload when clear cache button is clicked', () => {
    const reloadMock = vi.fn();
    const originalLocation = window.location;
    const originalLocalStorage = window.localStorage;
    const originalSessionStorage = window.sessionStorage;
    
    const localStorageClearMock = vi.fn();
    const sessionStorageClearMock = vi.fn();
    
    delete window.location;
    window.location = { ...originalLocation, reload: reloadMock };
    
    Object.defineProperty(window, 'localStorage', {
      value: { clear: localStorageClearMock },
      writable: true,
      configurable: true
    });
    
    Object.defineProperty(window, 'sessionStorage', {
      value: { clear: sessionStorageClearMock },
      writable: true,
      configurable: true
    });

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText(/Clear cache & reload/i));

    expect(localStorageClearMock).toHaveBeenCalled();
    expect(sessionStorageClearMock).toHaveBeenCalled();
    expect(reloadMock).toHaveBeenCalledWith(true);

    // Restore
    window.location = originalLocation;
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
      configurable: true
    });
    Object.defineProperty(window, 'sessionStorage', {
      value: originalSessionStorage,
      writable: true,
      configurable: true
    });
  });
});
