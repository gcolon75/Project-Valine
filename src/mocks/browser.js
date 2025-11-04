// src/mocks/browser.js
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/**
 * MSW Service Worker for browser/development mode
 * 
 * This enables API mocking in the browser for development and testing.
 * The service worker intercepts network requests and returns mock responses.
 * 
 * Usage:
 * 1. In development, enable by setting VITE_USE_MSW=true
 * 2. Start the worker in main.jsx when needed
 * 3. The worker will intercept requests matching handlers in ./handlers.js
 * 
 * Note: This is separate from src/mocks/server.js which is used in Node.js tests
 */
export const worker = setupWorker(...handlers);

/**
 * Start MSW in the browser
 * @param {Object} options - MSW worker options
 */
export async function startMSW(options = {}) {
  const defaultOptions = {
    onUnhandledRequest: 'bypass', // Allow unmatched requests to pass through
    quiet: false, // Log matched requests
    ...options
  };

  try {
    await worker.start(defaultOptions);
    console.log('[MSW] Service worker started - API mocking enabled');
    return worker;
  } catch (error) {
    console.error('[MSW] Failed to start service worker:', error);
    throw error;
  }
}

export default worker;
