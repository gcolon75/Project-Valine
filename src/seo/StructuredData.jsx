import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { SEO_CONFIG } from './metaConfig';

/**
 * StructuredData - Injects JSON-LD structured data for search engines
 * Includes: Organization, WebSite, and BreadcrumbList schemas
 */
const StructuredData = () => {
  const location = useLocation();

  useEffect(() => {
    const seoEnabled = import.meta.env.VITE_SEO_ENABLED !== 'false';
    if (!seoEnabled) {
      return;
    }

    // Remove existing structured data scripts
    const existingScripts = document.querySelectorAll('script[data-structured-data]');
    existingScripts.forEach(script => script.remove());

    // Organization Schema
    const organizationSchema = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: SEO_CONFIG.siteName,
      url: SEO_CONFIG.siteDomain,
      logo: `${SEO_CONFIG.siteDomain}/assets/logo.png`,
      sameAs: [
        // Placeholder for future social media links
        // 'https://twitter.com/projectvaline',
        // 'https://linkedin.com/company/projectvaline',
      ],
    };

    // WebSite Schema with potential search action
    const websiteSchema = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SEO_CONFIG.siteName,
      url: SEO_CONFIG.siteDomain,
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${SEO_CONFIG.siteDomain}/search?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    };

    // BreadcrumbList Schema (for pages with sections)
    const breadcrumbSchema = getBreadcrumbSchema(location.pathname + location.hash);

    // Inject schemas
    injectStructuredData('organization', organizationSchema);
    injectStructuredData('website', websiteSchema);
    if (breadcrumbSchema) {
      injectStructuredData('breadcrumb', breadcrumbSchema);
    }
  }, [location]);

  return null;
};

/**
 * Helper to inject JSON-LD script into document head
 */
function injectStructuredData(id, schema) {
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.setAttribute('data-structured-data', id);
  script.textContent = JSON.stringify(schema);
  document.head.appendChild(script);
}

/**
 * Build breadcrumb schema based on current route
 */
function getBreadcrumbSchema(path) {
  const items = [];
  const domain = SEO_CONFIG.siteDomain;

  // Always include home
  items.push({
    '@type': 'ListItem',
    position: 1,
    name: 'Home',
    item: domain,
  });

  // Add breadcrumbs for specific sections
  if (path.includes('#features')) {
    items.push({
      '@type': 'ListItem',
      position: 2,
      name: 'Features',
      item: `${domain}/#features`,
    });
  } else if (path.includes('#about')) {
    items.push({
      '@type': 'ListItem',
      position: 2,
      name: 'About',
      item: `${domain}/#about`,
    });
  } else if (path.includes('#faq')) {
    items.push({
      '@type': 'ListItem',
      position: 2,
      name: 'FAQ',
      item: `${domain}/#faq`,
    });
  } else if (path === '/join' || path === '/signup') {
    items.push({
      '@type': 'ListItem',
      position: 2,
      name: 'Join',
      item: `${domain}/join`,
    });
  }

  // Only return breadcrumb if there are multiple items
  if (items.length <= 1) {
    return null;
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items,
  };
}

export default StructuredData;
