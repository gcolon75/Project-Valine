/**
 * SEO Metadata Configuration
 * Maps routes to their metadata: title, description, canonical, indexing rules
 * Pattern: "Project Valine — <Short Descriptor>" (max 60 chars)
 * Descriptions: 150-160 chars for optimal snippet display
 */

const SITE_NAME = 'Project Valine';
const SITE_DOMAIN = 'https://projectvaline.com'; // Update with actual domain
const DEFAULT_DESCRIPTION = 'Connect artists and seekers for collaborative creative projects. Join Project Valine to discover talent, share ideas, and bring creative visions to life.';

/**
 * Route-specific metadata configuration
 * @type {Object.<string, {title: string, description: string, canonicalSegment: string, noIndex?: boolean}>}
 */
export const routeMetadata = {
  '/': {
    title: `${SITE_NAME} — Artists & Seekers Unite`,
    description: 'Connect artists and seekers for collaborative creative projects. Join Project Valine to discover talent, share ideas, and bring creative visions to life.',
    canonicalSegment: '',
    noIndex: false,
  },
  '/#features': {
    title: `${SITE_NAME} — Features`,
    description: 'Explore powerful features for creative collaboration: script sharing, audition management, real-time messaging, and more. Built for artists and seekers.',
    canonicalSegment: '#features',
    noIndex: false,
  },
  '/#about': {
    title: `${SITE_NAME} — About Us`,
    description: 'Learn about Project Valine, the platform connecting creative professionals and enthusiasts. Our mission is to enable seamless artistic collaboration.',
    canonicalSegment: '#about',
    noIndex: false,
  },
  '/#faq': {
    title: `${SITE_NAME} — FAQ`,
    description: 'Frequently asked questions about Project Valine. Get answers about features, pricing, account management, and creative collaboration tools.',
    canonicalSegment: '#faq',
    noIndex: false,
  },
  '/join': {
    title: `${SITE_NAME} — Join Now`,
    description: 'Create your free Project Valine account. Connect with artists, share scripts, discover auditions, and collaborate on creative projects today.',
    canonicalSegment: 'join',
    noIndex: false,
  },
  '/signup': {
    title: `${SITE_NAME} — Sign Up`,
    description: 'Sign up for Project Valine to start your creative collaboration journey. Free account with instant access to our artist and seeker community.',
    canonicalSegment: 'signup',
    noIndex: false,
  },
  '/login': {
    title: `${SITE_NAME} — Log In`,
    description: 'Log in to your Project Valine account to access your creative projects, messages, and network.',
    canonicalSegment: 'login',
    noIndex: true, // Auth pages typically not indexed
  },
  '/signup-page': {
    title: `${SITE_NAME} — Sign Up`,
    description: 'Create your Project Valine account.',
    canonicalSegment: 'signup-page',
    noIndex: true, // Auth pages typically not indexed
  },
  '/login-page': {
    title: `${SITE_NAME} — Log In`,
    description: 'Log in to Project Valine.',
    canonicalSegment: 'login-page',
    noIndex: true, // Auth pages typically not indexed
  },
  '/onboarding': {
    title: `${SITE_NAME} — Get Started`,
    description: 'Complete your Project Valine profile setup.',
    canonicalSegment: 'onboarding',
    noIndex: true, // User onboarding not indexed
  },
  // Placeholders for future pages
  '/privacy': {
    title: `${SITE_NAME} — Privacy Policy`,
    description: 'Read our privacy policy to understand how we protect your data and respect your privacy on Project Valine.',
    canonicalSegment: 'privacy',
    noIndex: false,
  },
  '/terms': {
    title: `${SITE_NAME} — Terms of Service`,
    description: 'Review the terms of service for using Project Valine. Understand your rights and responsibilities as a member.',
    canonicalSegment: 'terms',
    noIndex: false,
  },
};

/**
 * Get metadata for a specific route
 * Falls back to home metadata if route not found
 * @param {string} path - Current route path
 * @returns {{title: string, description: string, canonicalSegment: string, noIndex: boolean}}
 */
export function getMetadataForRoute(path) {
  // Try exact match first
  if (routeMetadata[path]) {
    return routeMetadata[path];
  }

  // Try with hash for anchor links
  const pathWithHash = `/${path.split('#')[1] ? `#${path.split('#')[1]}` : ''}`;
  if (pathWithHash !== '/' && routeMetadata[pathWithHash]) {
    return routeMetadata[pathWithHash];
  }

  // Try base path without query params or hash
  const basePath = `/${path.split('?')[0].split('#')[0].replace(/^\//, '')}`;
  if (routeMetadata[basePath]) {
    return routeMetadata[basePath];
  }

  // Default to home page metadata
  return {
    title: `${SITE_NAME} — Artists & Seekers Unite`,
    description: DEFAULT_DESCRIPTION,
    canonicalSegment: '',
    noIndex: false,
  };
}

/**
 * Build canonical URL for a route
 * @param {string} segment - URL segment (from canonicalSegment)
 * @returns {string} Full canonical URL
 */
export function buildCanonicalUrl(segment) {
  // Remove trailing slashes, ensure no query params
  const cleanSegment = segment.replace(/\/$/, '');
  return `${SITE_DOMAIN}/${cleanSegment}`.replace(/\/$/, '');
}

/**
 * Constants for SEO configuration
 */
export const SEO_CONFIG = {
  siteName: SITE_NAME,
  siteDomain: SITE_DOMAIN,
  defaultDescription: DEFAULT_DESCRIPTION,
  twitterHandle: '@projectvaline', // Update with actual handle
  ogImageDefault: '/og-default.png',
  themeColor: '#10b981', // Emerald-500 from theme
  language: 'en',
};

export default {
  routeMetadata,
  getMetadataForRoute,
  buildCanonicalUrl,
  SEO_CONFIG,
};
