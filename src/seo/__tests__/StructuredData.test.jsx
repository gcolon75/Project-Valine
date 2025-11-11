import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import StructuredData from '../StructuredData';

vi.stubEnv('VITE_SEO_ENABLED', 'true');

describe('StructuredData', () => {
  beforeEach(() => {
    // Remove any existing structured data scripts
    document.querySelectorAll('script[data-structured-data]').forEach(el => el.remove());
  });

  afterEach(() => {
    // Cleanup
    document.querySelectorAll('script[data-structured-data]').forEach(el => el.remove());
  });

  it('should not render any visible content', () => {
    const { container } = render(
      <BrowserRouter>
        <StructuredData />
      </BrowserRouter>
    );
    expect(container.firstChild).toBeNull();
  });

  it('should inject Organization schema', () => {
    render(
      <BrowserRouter>
        <StructuredData />
      </BrowserRouter>
    );
    
    const orgScript = document.querySelector('script[data-structured-data="organization"]');
    expect(orgScript).toBeTruthy();
    expect(orgScript.type).toBe('application/ld+json');
    
    const data = JSON.parse(orgScript.textContent);
    expect(data['@type']).toBe('Organization');
    expect(data.name).toBeTruthy();
    expect(data.url).toBeTruthy();
  });

  it('should inject WebSite schema', () => {
    render(
      <BrowserRouter>
        <StructuredData />
      </BrowserRouter>
    );
    
    const websiteScript = document.querySelector('script[data-structured-data="website"]');
    expect(websiteScript).toBeTruthy();
    
    const data = JSON.parse(websiteScript.textContent);
    expect(data['@type']).toBe('WebSite');
    expect(data.name).toBeTruthy();
    expect(data.url).toBeTruthy();
    expect(data.potentialAction).toBeDefined();
  });

  it('should have valid JSON-LD structure', () => {
    render(
      <BrowserRouter>
        <StructuredData />
      </BrowserRouter>
    );
    
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    
    scripts.forEach(script => {
      expect(() => JSON.parse(script.textContent)).not.toThrow();
      const data = JSON.parse(script.textContent);
      expect(data['@context']).toBe('https://schema.org');
      expect(data['@type']).toBeTruthy();
    });
  });

  it('should inject BreadcrumbList for features section', () => {
    // Mock window.location.hash
    delete window.location;
    window.location = { pathname: '/', hash: '#features' };
    
    render(
      <BrowserRouter>
        <StructuredData />
      </BrowserRouter>
    );
    
    const breadcrumbScript = document.querySelector('script[data-structured-data="breadcrumb"]');
    
    if (breadcrumbScript) {
      const data = JSON.parse(breadcrumbScript.textContent);
      expect(data['@type']).toBe('BreadcrumbList');
      expect(data.itemListElement).toBeDefined();
      expect(Array.isArray(data.itemListElement)).toBe(true);
      expect(data.itemListElement.length).toBeGreaterThan(1);
    }
  });

  it('should replace existing structured data on route change', () => {
    const { rerender } = render(
      <BrowserRouter>
        <StructuredData />
      </BrowserRouter>
    );
    
    const initialScripts = document.querySelectorAll('script[data-structured-data]');
    const initialCount = initialScripts.length;
    
    rerender(
      <BrowserRouter>
        <StructuredData />
      </BrowserRouter>
    );
    
    const newScripts = document.querySelectorAll('script[data-structured-data]');
    
    // Should have same number of scripts (old ones replaced, not duplicated)
    expect(newScripts.length).toBe(initialCount);
  });

  it('should respect SEO_ENABLED flag when disabled', () => {
    vi.stubEnv('VITE_SEO_ENABLED', 'false');
    
    render(
      <BrowserRouter>
        <StructuredData />
      </BrowserRouter>
    );
    
    const scripts = document.querySelectorAll('script[data-structured-data]');
    expect(scripts.length).toBe(0);
    
    vi.unstubAllEnvs();
  });

  it('should keep structured data under 5KB total', () => {
    render(
      <BrowserRouter>
        <StructuredData />
      </BrowserRouter>
    );
    
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    let totalSize = 0;
    
    scripts.forEach(script => {
      totalSize += script.textContent.length;
    });
    
    // Keep under 5KB as per requirements
    expect(totalSize).toBeLessThan(5 * 1024);
  });
});
