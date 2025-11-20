import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MetaInjector from '../MetaInjector';

// Mock environment variables
vi.stubEnv('VITE_SEO_ENABLED', 'true');

describe('MetaInjector', () => {
  beforeEach(() => {
    // Clear head before each test
    document.head.innerHTML = '';
    document.documentElement.lang = '';
  });

  afterEach(() => {
    // Cleanup
    document.head.innerHTML = '';
    document.documentElement.lang = '';
  });

  it('should not render any visible content', () => {
    const { container } = render(
      <BrowserRouter>
        <MetaInjector />
      </BrowserRouter>
    );
    expect(container.firstChild).toBeNull();
  });

  it('should set document title', () => {
    render(
      <BrowserRouter>
        <MetaInjector />
      </BrowserRouter>
    );
    expect(document.title).toBeTruthy();
    expect(document.title).toContain('Joint');
  });

  it('should set meta description', () => {
    render(
      <BrowserRouter>
        <MetaInjector />
      </BrowserRouter>
    );
    const metaDesc = document.querySelector('meta[name="description"]');
    expect(metaDesc).toBeTruthy();
    expect(metaDesc.getAttribute('content')).toBeTruthy();
  });

  it('should set canonical link', () => {
    render(
      <BrowserRouter>
        <MetaInjector />
      </BrowserRouter>
    );
    const canonical = document.querySelector('link[rel="canonical"]');
    expect(canonical).toBeTruthy();
    expect(canonical.getAttribute('href')).toBeTruthy();
  });

  it('should set robots meta tag', () => {
    render(
      <BrowserRouter>
        <MetaInjector />
      </BrowserRouter>
    );
    const robots = document.querySelector('meta[name="robots"]');
    expect(robots).toBeTruthy();
    expect(robots.getAttribute('content')).toMatch(/index|noindex/);
  });

  it('should set OpenGraph tags', () => {
    render(
      <BrowserRouter>
        <MetaInjector />
      </BrowserRouter>
    );
    
    const ogType = document.querySelector('meta[property="og:type"]');
    const ogUrl = document.querySelector('meta[property="og:url"]');
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDescription = document.querySelector('meta[property="og:description"]');
    const ogImage = document.querySelector('meta[property="og:image"]');

    expect(ogType?.getAttribute('content')).toBe('website');
    expect(ogUrl?.getAttribute('content')).toBeTruthy();
    expect(ogTitle?.getAttribute('content')).toBeTruthy();
    expect(ogDescription?.getAttribute('content')).toBeTruthy();
    expect(ogImage?.getAttribute('content')).toBeTruthy();
  });

  it('should set Twitter Card tags', () => {
    render(
      <BrowserRouter>
        <MetaInjector />
      </BrowserRouter>
    );
    
    const twitterCard = document.querySelector('meta[name="twitter:card"]');
    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    const twitterDescription = document.querySelector('meta[name="twitter:description"]');
    const twitterImage = document.querySelector('meta[name="twitter:image"]');

    expect(twitterCard?.getAttribute('content')).toBe('summary_large_image');
    expect(twitterTitle?.getAttribute('content')).toBeTruthy();
    expect(twitterDescription?.getAttribute('content')).toBeTruthy();
    expect(twitterImage?.getAttribute('content')).toBeTruthy();
  });

  it('should set HTML lang attribute', () => {
    render(
      <BrowserRouter>
        <MetaInjector />
      </BrowserRouter>
    );
    expect(document.documentElement.lang).toBe('en');
  });

  it('should respect SEO_ENABLED flag when disabled', () => {
    vi.stubEnv('VITE_SEO_ENABLED', 'false');
    
    render(
      <BrowserRouter>
        <MetaInjector />
      </BrowserRouter>
    );
    
    // When disabled, component should not modify document
    // (Note: This test may need adjustment based on implementation)
    const metaDesc = document.querySelector('meta[name="description"]');
    expect(metaDesc).toBeNull();
    
    vi.unstubAllEnvs();
  });
});
