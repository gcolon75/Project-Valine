/**
 * Tests for MarketingLayout with allowlist enforcement
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MarketingLayout from '../../layouts/MarketingLayout';
import { ThemeProvider } from '../../context/ThemeContext';

// Mock the allowlist config
vi.mock('../../utils/allowlistConfig', () => ({
  isAllowlistActive: vi.fn(() => false)
}));

// Mock SEO components
vi.mock('../../seo/MetaInjector', () => ({
  default: () => null
}));

vi.mock('../../seo/StructuredData', () => ({
  default: () => null
}));

vi.mock('../../components/MarketingFooter', () => ({
  default: () => <div>Footer</div>
}));

describe('MarketingLayout - Allowlist Enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show "Sign up" button when allowlist is not active', () => {
    const { isAllowlistActive } = vi.mocked(await import('../../utils/allowlistConfig'));
    isAllowlistActive.mockReturnValue(false);

    render(
      <BrowserRouter>
        <ThemeProvider>
          <MarketingLayout />
        </ThemeProvider>
      </BrowserRouter>
    );

    // Should show "Sign up" button
    const signUpButton = screen.getByText(/Sign up/i);
    expect(signUpButton).toBeInTheDocument();
    expect(signUpButton.closest('a')).toHaveAttribute('href', '/join');
  });

  it('should hide "Sign up" button when allowlist is active', () => {
    const { isAllowlistActive } = vi.mocked(await import('../../utils/allowlistConfig'));
    isAllowlistActive.mockReturnValue(true);

    render(
      <BrowserRouter>
        <ThemeProvider>
          <MarketingLayout />
        </ThemeProvider>
      </BrowserRouter>
    );

    // Should NOT show "Sign up" button
    expect(screen.queryByText(/Sign up/i)).not.toBeInTheDocument();
  });

  it('should always show "Sign In" link regardless of allowlist', () => {
    const { isAllowlistActive } = vi.mocked(await import('../../utils/allowlistConfig'));
    
    // Test with allowlist active
    isAllowlistActive.mockReturnValue(true);
    const { rerender } = render(
      <BrowserRouter>
        <ThemeProvider>
          <MarketingLayout />
        </ThemeProvider>
      </BrowserRouter>
    );
    
    expect(screen.getByText(/Sign In/i)).toBeInTheDocument();
    
    // Test with allowlist inactive
    isAllowlistActive.mockReturnValue(false);
    rerender(
      <BrowserRouter>
        <ThemeProvider>
          <MarketingLayout />
        </ThemeProvider>
      </BrowserRouter>
    );
    
    expect(screen.getByText(/Sign In/i)).toBeInTheDocument();
  });

  it('should have navigation links', () => {
    render(
      <BrowserRouter>
        <ThemeProvider>
          <MarketingLayout />
        </ThemeProvider>
      </BrowserRouter>
    );

    expect(screen.getByText(/Features/i)).toBeInTheDocument();
    expect(screen.getByText(/About/i)).toBeInTheDocument();
    expect(screen.getByText(/FAQ/i)).toBeInTheDocument();
  });

  it('should have skip to main content link for accessibility', () => {
    render(
      <BrowserRouter>
        <ThemeProvider>
          <MarketingLayout />
        </ThemeProvider>
      </BrowserRouter>
    );

    const skipLink = screen.getByText(/Skip to main content/i);
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute('href', '#main-content');
  });
});
