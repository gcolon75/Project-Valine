import React from 'react';

/**
 * Simple site footer. Feel free to extend this with social links or legal
 * information. It is always placed at the bottom of the marketing pages and
 * outside of the authenticated app layout.
 */
const Footer = () => (
  <footer className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
    &copy; {new Date().getFullYear()} Project Valine. All rights reserved.
  </footer>
);

export default Footer;