/**
 * Moderation utilities for content safety and URL validation
 * Implements text scanning, profanity detection, and URL safety checks
 */

import fs from 'fs';
import path from 'path';

// Default profanity list (small, configurable)
const DEFAULT_PROFANITY_LIST = [
  'damn',
  'hell',
  'crap',
  'shit',
  'fuck',
  'bitch',
  'bastard',
  'ass',
  'asshole',
  'dick',
  'cock',
  'pussy',
  'slut',
  'whore',
  'nigger',
  'nigga',
  'fag',
  'faggot',
  'retard',
  'cunt',
];

/**
 * Get profanity list from environment or default
 */
function getProfanityList() {
  const customPath = process.env.PROFANITY_LIST_PATH;
  
  if (customPath) {
    try {
      const content = fs.readFileSync(customPath, 'utf-8');
      return content.split('\n').map(word => word.trim()).filter(Boolean);
    } catch (err) {
      console.warn('[Moderation] Failed to load custom profanity list, using default:', err);
    }
  }
  
  return DEFAULT_PROFANITY_LIST;
}

/**
 * Normalize text for matching (lowercase, remove diacritics)
 */
function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .trim();
}

/**
 * Check if text contains profanity with word boundary detection
 * @param {string} text - Text to check
 * @returns {{ hasProfanity: boolean, matches: string[] }}
 */
export function checkProfanity(text) {
  if (!text || typeof text !== 'string') {
    return { hasProfanity: false, matches: [] };
  }
  
  const normalized = normalizeText(text);
  const profanityList = getProfanityList();
  const matches = [];
  
  for (const word of profanityList) {
    const normalizedWord = normalizeText(word);
    // Use word boundary regex to avoid false positives
    const regex = new RegExp(`\\b${normalizedWord}\\b`, 'gi');
    if (regex.test(normalized)) {
      matches.push(word);
    }
  }
  
  return {
    hasProfanity: matches.length > 0,
    matches,
  };
}

/**
 * Get allowed and blocked domain lists from environment
 */
function getDomainLists() {
  const allowedStr = process.env.URL_ALLOWED_DOMAINS || 'imdb.com,youtube.com,vimeo.com,linkedin.com,github.com';
  const blockedStr = process.env.URL_BLOCKED_DOMAINS || '';
  
  return {
    allowed: allowedStr.split(',').map(d => d.trim()).filter(Boolean),
    blocked: blockedStr.split(',').map(d => d.trim()).filter(Boolean),
  };
}

/**
 * Get allowed protocols from environment
 */
function getAllowedProtocols() {
  const protocolsStr = process.env.URL_ALLOWED_PROTOCOLS || 'http:https:mailto:';
  return protocolsStr.split(':').filter(Boolean).map(p => p + ':');
}

/**
 * Check if URL is safe (protocol, domain checks)
 * @param {string} url - URL to validate
 * @returns {{ isSafe: boolean, issues: string[] }}
 */
export function validateUrl(url) {
  if (!url || typeof url !== 'string') {
    return { isSafe: false, issues: ['URL is required'] };
  }
  
  const issues = [];
  
  // Parse URL
  let parsed;
  try {
    parsed = new URL(url);
  } catch (err) {
    return { isSafe: false, issues: ['Invalid URL format'] };
  }
  
  // Check for dangerous protocols
  const allowedProtocols = getAllowedProtocols();
  if (!allowedProtocols.includes(parsed.protocol)) {
    issues.push(`Protocol '${parsed.protocol}' not allowed. Allowed: ${allowedProtocols.join(', ')}`);
  }
  
  // Block dangerous protocols explicitly
  const dangerousProtocols = ['javascript:', 'data:', 'file:', 'vbscript:'];
  if (dangerousProtocols.includes(parsed.protocol)) {
    issues.push(`Dangerous protocol '${parsed.protocol}' detected`);
  }
  
  // Check for inline JavaScript patterns in URL
  const urlLower = url.toLowerCase();
  if (urlLower.includes('javascript:') || urlLower.includes('data:text/html')) {
    issues.push('URL contains inline JavaScript pattern');
  }
  
  // Domain checks (only for http/https)
  if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
    const { allowed, blocked } = getDomainLists();
    const hostname = parsed.hostname.toLowerCase();
    
    // Check blocked domains
    for (const blockedDomain of blocked) {
      if (hostname === blockedDomain || hostname.endsWith('.' + blockedDomain)) {
        issues.push(`Domain '${hostname}' is blocked`);
      }
    }
    
    // Strict mode: only allow whitelisted domains
    if (process.env.MODERATION_STRICT_MODE === 'true') {
      const isAllowed = allowed.some(allowedDomain => 
        hostname === allowedDomain || hostname.endsWith('.' + allowedDomain)
      );
      
      if (!isAllowed) {
        issues.push(`Domain '${hostname}' not in allowed list (strict mode)`);
      }
    }
    
    // Flag suspicious TLDs
    const suspiciousTlds = ['.xyz', '.top', '.click', '.loan', '.work', '.gq', '.ml', '.ga', '.cf', '.tk'];
    for (const tld of suspiciousTlds) {
      if (hostname.endsWith(tld)) {
        issues.push(`Suspicious TLD detected: ${tld}`);
      }
    }
  }
  
  return {
    isSafe: issues.length === 0,
    issues,
  };
}

/**
 * Sanitize and scan text content
 * @param {string} text - Text to scan
 * @param {string} fieldName - Name of the field being scanned
 * @returns {{ ok: boolean, issues: Array<{field: string, reason: string}>, normalizedText: string }}
 */
export function sanitizeAndScanText(text, fieldName = 'text') {
  if (!text || typeof text !== 'string') {
    return { ok: true, issues: [], normalizedText: '' };
  }
  
  const issues = [];
  
  // Check for profanity
  const profanityCheck = checkProfanity(text);
  if (profanityCheck.hasProfanity) {
    issues.push({
      field: fieldName,
      reason: `Contains profane language: ${profanityCheck.matches.join(', ')}`,
    });
  }
  
  // Basic sanitization - trim whitespace
  const normalizedText = text.trim();
  
  return {
    ok: issues.length === 0,
    issues,
    normalizedText,
  };
}

/**
 * Validate and scan URL
 * @param {string} url - URL to scan
 * @param {string} fieldName - Name of the field being scanned
 * @returns {{ ok: boolean, issues: Array<{field: string, reason: string}> }}
 */
export function validateAndScanUrl(url, fieldName = 'url') {
  const urlCheck = validateUrl(url);
  
  const issues = urlCheck.issues.map(reason => ({
    field: fieldName,
    reason,
  }));
  
  return {
    ok: urlCheck.isSafe,
    issues,
  };
}

/**
 * Scan profile payload for moderation issues
 * @param {object} payload - Profile data to scan
 * @returns {{ ok: boolean, issues: Array<{field: string, reason: string}>, normalizedPayload: object }}
 */
export function scanProfilePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return { ok: true, issues: [], normalizedPayload: {} };
  }
  
  const allIssues = [];
  const normalizedPayload = { ...payload };
  
  // Scan displayName
  if (payload.displayName) {
    const result = sanitizeAndScanText(payload.displayName, 'displayName');
    allIssues.push(...result.issues);
    if (result.normalizedText) {
      normalizedPayload.displayName = result.normalizedText;
    }
  }
  
  // Scan headline
  if (payload.headline) {
    const result = sanitizeAndScanText(payload.headline, 'headline');
    allIssues.push(...result.issues);
    if (result.normalizedText) {
      normalizedPayload.headline = result.normalizedText;
    }
  }
  
  // Scan bio
  if (payload.bio) {
    const result = sanitizeAndScanText(payload.bio, 'bio');
    allIssues.push(...result.issues);
    if (result.normalizedText) {
      normalizedPayload.bio = result.normalizedText;
    }
  }
  
  // Scan social links
  if (payload.socialLinks && typeof payload.socialLinks === 'object') {
    for (const [key, url] of Object.entries(payload.socialLinks)) {
      if (url && typeof url === 'string') {
        const result = validateAndScanUrl(url, `socialLinks.${key}`);
        allIssues.push(...result.issues);
      }
    }
  }
  
  return {
    ok: allIssues.length === 0,
    issues: allIssues,
    normalizedPayload,
  };
}

/**
 * Scan external link for moderation issues
 * @param {object} link - Link object with label and url
 * @returns {{ ok: boolean, issues: Array<{field: string, reason: string}> }}
 */
export function scanLink(link) {
  if (!link || typeof link !== 'object') {
    return { ok: true, issues: [] };
  }
  
  const allIssues = [];
  
  // Scan label
  if (link.label) {
    const result = sanitizeAndScanText(link.label, 'label');
    allIssues.push(...result.issues);
  }
  
  // Scan URL
  if (link.url) {
    const result = validateAndScanUrl(link.url, 'url');
    allIssues.push(...result.issues);
  }
  
  return {
    ok: allIssues.length === 0,
    issues: allIssues,
  };
}

/**
 * Format issues for API response
 * @param {Array<{field: string, reason: string}>} issues - Issues array
 * @returns {{ code: string, message: string, fields: Array<{name: string, reason: string}> }}
 */
export function formatIssuesForResponse(issues) {
  return {
    code: 'MODERATION_BLOCKED',
    message: 'Content blocked by moderation rules',
    fields: issues.map(issue => ({
      name: issue.field,
      reason: issue.reason,
    })),
  };
}

/**
 * Check if moderation is enabled
 */
export function isModerationEnabled() {
  return process.env.MODERATION_ENABLED === 'true';
}

/**
 * Get profanity action (block or warn)
 */
export function getProfanityAction() {
  return process.env.PROFANITY_ACTION || 'block';
}

/**
 * Determine severity based on category
 * @param {string} category - Report category
 * @returns {number} Severity level (0-3)
 */
export function getSeverityFromCategory(category) {
  const severityMap = {
    spam: 1,
    abuse: 3,
    unsafe_link: 2,
    profanity: 1,
    privacy: 2,
    other: 0,
  };
  
  return severityMap[category] || 0;
}

/**
 * Infer category from issues
 * @param {Array<{field: string, reason: string}>} issues - Issues array
 * @returns {string} Inferred category
 */
export function inferCategoryFromIssues(issues) {
  if (!issues || issues.length === 0) return 'other';
  
  // Check if any issue is URL-related
  const hasUrlIssue = issues.some(issue => 
    issue.reason.toLowerCase().includes('url') ||
    issue.reason.toLowerCase().includes('protocol') ||
    issue.reason.toLowerCase().includes('domain')
  );
  
  if (hasUrlIssue) return 'unsafe_link';
  
  // Check if any issue is profanity-related
  const hasProfanityIssue = issues.some(issue =>
    issue.reason.toLowerCase().includes('profane')
  );
  
  if (hasProfanityIssue) return 'profanity';
  
  return 'other';
}

/**
 * Redact PII in log messages (first 6 + last 4 chars)
 * @param {string} value - Value to redact
 * @returns {string} Redacted value
 */
export function redactPII(value) {
  if (!value || typeof value !== 'string') return '[redacted]';
  
  if (value.length <= 10) {
    return '*'.repeat(value.length);
  }
  
  const first6 = value.substring(0, 6);
  const last4 = value.substring(value.length - 4);
  const middle = '*'.repeat(Math.max(0, value.length - 10));
  
  return `${first6}${middle}${last4}`;
}
