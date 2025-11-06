// src/utils/sanitize.js
import DOMPurify from 'dompurify';

/**
 * Sanitization utility for user-generated content
 * Uses DOMPurify to prevent XSS attacks
 * 
 * Usage:
 * - sanitizeText: For plain text content (strips all HTML)
 * - sanitizeHtml: For limited HTML content (allows safe tags)
 * - sanitizeUrl: For URLs (ensures safe protocols)
 */

/**
 * Strict configuration - strips all HTML tags
 * Use for: headlines, titles, names, bio text
 */
const STRICT_CONFIG = {
  ALLOWED_TAGS: [],
  ALLOWED_ATTR: [],
  KEEP_CONTENT: true, // Keep text content, strip tags
};

/**
 * Limited HTML configuration - allows safe formatting
 * Use for: bio with basic formatting (if needed)
 */
const LIMITED_HTML_CONFIG = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a'],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
  ALLOWED_URI_REGEXP: /^(?:https?|mailto):/i,
};

/**
 * Sanitize plain text - strips all HTML
 * @param {string} text - User input text
 * @returns {string} Sanitized text
 */
export function sanitizeText(text) {
  if (!text || typeof text !== 'string') return '';
  return DOMPurify.sanitize(text, STRICT_CONFIG);
}

/**
 * Sanitize HTML with limited safe tags
 * @param {string} html - User input HTML
 * @returns {string} Sanitized HTML
 */
export function sanitizeHtml(html) {
  if (!html || typeof html !== 'string') return '';
  return DOMPurify.sanitize(html, LIMITED_HTML_CONFIG);
}

/**
 * Sanitize URL - ensures safe protocols
 * @param {string} url - User input URL
 * @returns {string} Sanitized URL or empty string if invalid
 */
export function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return '';
  
  try {
    const parsed = new URL(url);
    const allowedProtocols = ['http:', 'https:', 'mailto:'];
    
    if (!allowedProtocols.includes(parsed.protocol)) {
      console.warn(`Blocked unsafe URL protocol: ${parsed.protocol}`);
      return '';
    }
    
    return DOMPurify.sanitize(url, { ALLOWED_URI_REGEXP: /^(?:https?|mailto):/i });
  } catch (e) {
    console.warn('Invalid URL:', url);
    return '';
  }
}

/**
 * Validate and sanitize link text
 * @param {string} text - Link text
 * @param {number} maxLength - Maximum length (default: 100)
 * @returns {string} Sanitized link text
 */
export function sanitizeLinkText(text, maxLength = 100) {
  const sanitized = sanitizeText(text);
  return sanitized.slice(0, maxLength);
}

/**
 * Encode HTML entities for safe display
 * Use when you want to display user input as-is without any HTML
 * @param {string} text - Text to encode
 * @returns {string} HTML-encoded text
 */
export function encodeHtmlEntities(text) {
  if (!text || typeof text !== 'string') return '';
  
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Sanitize object with multiple text fields
 * Useful for profile data, form submissions
 * @param {Object} obj - Object with text fields
 * @param {Array<string>} textFields - Fields to sanitize as text
 * @param {Array<string>} urlFields - Fields to sanitize as URLs
 * @returns {Object} Sanitized object
 */
export function sanitizeObject(obj, textFields = [], urlFields = []) {
  const sanitized = { ...obj };
  
  textFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = sanitizeText(sanitized[field]);
    }
  });
  
  urlFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = sanitizeUrl(sanitized[field]);
    }
  });
  
  return sanitized;
}

export default {
  sanitizeText,
  sanitizeHtml,
  sanitizeUrl,
  sanitizeLinkText,
  encodeHtmlEntities,
  sanitizeObject
};
