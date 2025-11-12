import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getMetadataForRoute, buildCanonicalUrl, SEO_CONFIG } from './metaConfig';

/**
 * MetaInjector - Injects SEO metadata into document head
 * Updates title, meta tags, canonical link, OpenGraph, and Twitter cards
 * Feature flag: SEO_ENABLED (default true)
 */
const MetaInjector = () => {
  const location = useLocation();

  useEffect(() => {
    // Feature flag check - allows quick rollback
    const seoEnabled = import.meta.env.VITE_SEO_ENABLED !== 'false';
    if (!seoEnabled) {
      return;
    }

    const path = location.pathname + location.hash;
    const metadata = getMetadataForRoute(path);
    const canonicalUrl = buildCanonicalUrl(metadata.canonicalSegment);

    // Update document title
    document.title = metadata.title;

    // Helper to update or create meta tag
    const updateMetaTag = (selector, content) => {
      let element = document.querySelector(selector);
      if (!element) {
        element = document.createElement('meta');
        const [attr, value] = selector.match(/\[(.+?)=['"](.+?)['"]\]/).slice(1);
        element.setAttribute(attr, value);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // Helper to update or create link tag
    const updateLinkTag = (rel, href) => {
      let element = document.querySelector(`link[rel="${rel}"]`);
      if (!element) {
        element = document.createElement('link');
        element.setAttribute('rel', rel);
        document.head.appendChild(element);
      }
      element.setAttribute('href', href);
    };

    // Standard meta tags
    updateMetaTag('meta[name="description"]', metadata.description);
    updateMetaTag('meta[name="robots"]', metadata.noIndex ? 'noindex, nofollow' : 'index, follow');
    
    // Canonical link
    updateLinkTag('canonical', canonicalUrl);

    // OpenGraph tags
    updateMetaTag('meta[property="og:type"]', 'website');
    updateMetaTag('meta[property="og:url"]', canonicalUrl);
    updateMetaTag('meta[property="og:title"]', metadata.title);
    updateMetaTag('meta[property="og:description"]', metadata.description);
    updateMetaTag('meta[property="og:image"]', `${SEO_CONFIG.siteDomain}${SEO_CONFIG.ogImageDefault}`);
    updateMetaTag('meta[property="og:site_name"]', SEO_CONFIG.siteName);

    // Twitter Card tags
    updateMetaTag('meta[name="twitter:card"]', 'summary_large_image');
    updateMetaTag('meta[name="twitter:site"]', SEO_CONFIG.twitterHandle);
    updateMetaTag('meta[name="twitter:title"]', metadata.title);
    updateMetaTag('meta[name="twitter:description"]', metadata.description);
    updateMetaTag('meta[name="twitter:image"]', `${SEO_CONFIG.siteDomain}${SEO_CONFIG.ogImageDefault}`);

    // Language tag (prep for i18n)
    document.documentElement.setAttribute('lang', SEO_CONFIG.language);
  }, [location]);

  // This component doesn't render anything
  return null;
};

export default MetaInjector;
