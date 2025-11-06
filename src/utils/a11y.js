// src/utils/a11y.js
/**
 * Accessibility utilities and helpers
 * Provides runtime accessibility checks and helpers for development
 */

/**
 * Check if axe-core is available (in development)
 */
export const isAxeAvailable = () => {
  return typeof window !== 'undefined' && window.axe;
};

/**
 * Run axe accessibility audit on current page
 * @param {Object} options - Axe configuration options
 * @returns {Promise<Object>} - Audit results
 */
export const runAxeAudit = async (options = {}) => {
  if (!isAxeAvailable()) {
    console.warn('axe-core is not available');
    return null;
  }

  try {
    const results = await window.axe.run(options);
    return results;
  } catch (error) {
    console.error('Error running axe audit:', error);
    return null;
  }
};

/**
 * Log accessibility violations to console
 * @param {Object} results - Axe audit results
 */
export const logAxeViolations = (results) => {
  if (!results || !results.violations) return;

  const { violations } = results;

  if (violations.length === 0) {
    console.log('✅ No accessibility violations found!');
    return;
  }

  console.group(`⚠️  ${violations.length} accessibility violation(s) found`);

  violations.forEach((violation) => {
    const { id, impact, description, help, helpUrl, nodes } = violation;

    console.group(`${impact.toUpperCase()}: ${help}`);
    console.log('Description:', description);
    console.log('Help:', helpUrl);
    console.log('Affected elements:', nodes.length);
    
    nodes.forEach((node, index) => {
      console.log(`\n  Element ${index + 1}:`);
      console.log('    HTML:', node.html);
      console.log('    Target:', node.target);
      if (node.failureSummary) {
        console.log('    Issue:', node.failureSummary);
      }
    });

    console.groupEnd();
  });

  console.groupEnd();
};

/**
 * Get summary of accessibility violations
 * @param {Object} results - Axe audit results
 * @returns {Object} - Summary object
 */
export const getViolationsSummary = (results) => {
  if (!results || !results.violations) {
    return {
      total: 0,
      critical: 0,
      serious: 0,
      moderate: 0,
      minor: 0
    };
  }

  const summary = {
    total: results.violations.length,
    critical: 0,
    serious: 0,
    moderate: 0,
    minor: 0
  };

  results.violations.forEach((violation) => {
    const impact = violation.impact;
    if (impact === 'critical') summary.critical++;
    else if (impact === 'serious') summary.serious++;
    else if (impact === 'moderate') summary.moderate++;
    else if (impact === 'minor') summary.minor++;
  });

  return summary;
};

/**
 * Trap focus within a container (for modals, dialogs)
 * @param {HTMLElement} container - Container element
 * @returns {Function} - Cleanup function
 */
export const trapFocus = (container) => {
  if (!container) return () => {};

  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleTabKey = (e) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  };

  container.addEventListener('keydown', handleTabKey);

  // Focus first element
  if (firstElement) {
    firstElement.focus();
  }

  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleTabKey);
  };
};

/**
 * Announce message to screen readers
 * @param {string} message - Message to announce
 * @param {string} priority - 'polite' or 'assertive'
 */
export const announceToScreenReader = (message, priority = 'polite') => {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only'; // Assumes .sr-only is defined in CSS
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

/**
 * Check if element is keyboard accessible
 * @param {HTMLElement} element - Element to check
 * @returns {boolean}
 */
export const isKeyboardAccessible = (element) => {
  if (!element) return false;
  
  const tabIndex = element.getAttribute('tabindex');
  const isInteractive = ['button', 'a', 'input', 'select', 'textarea'].includes(
    element.tagName.toLowerCase()
  );
  
  return isInteractive || (tabIndex !== null && tabIndex !== '-1');
};

/**
 * Generate unique ID for form fields
 * @param {string} prefix - ID prefix
 * @returns {string}
 */
let idCounter = 0;
export const generateId = (prefix = 'field') => {
  return `${prefix}-${++idCounter}`;
};

export default {
  isAxeAvailable,
  runAxeAudit,
  logAxeViolations,
  getViolationsSummary,
  trapFocus,
  announceToScreenReader,
  isKeyboardAccessible,
  generateId
};
