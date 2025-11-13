import React from 'react';

/**
 * LEGACY COMPONENT - NO LONGER USED
 * 
 * This component has been replaced by the footer in MarketingLayout (for marketing pages).
 * 
 * TODO: Remove this file after confirming no imports remain in codebase.
 * Last checked: 2025-11-05
 * 
 * Simple site footer. Feel free to extend this with social links or legal
 * information. It is always placed at the bottom of the marketing pages and
 * outside of the authenticated app layout.
 */
const Footer = () => (
  <footer className="py-8 text-center text-sm text-neutral-700 dark:text-neutral-300">
    &copy; {new Date().getFullYear()} Joint. All rights reserved.
  </footer>
);

export default Footer;