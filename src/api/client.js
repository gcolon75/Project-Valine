// src/api/client.js
// API client wrapper - exports the main apiClient from services/api.js
// This file exists to match the Phase 02 specification structure

// Re-export the main API client as both default and named export
export { apiClient as default, apiClient } from '../services/api.js';

/**
 * API Client Configuration:
 * 
 * - Base URL: import.meta.env.VITE_API_BASE (default: http://localhost:4000)
 * - Timeout: 8000ms (8 seconds)
 * - Retry logic: Exponential backoff with jitter for idempotent GETs and server errors
 * - Max retries: 3 attempts
 * - Retryable errors: Network errors, 408, 429, 500, 502, 503, 504
 * 
 * Environment Variables:
 * - VITE_API_BASE: Backend API URL
 * - VITE_API_USE_CREDENTIALS: Set to 'true' to enable withCredentials for cookie-based auth
 * 
 * Authentication:
 * - Automatically attaches Bearer token from localStorage ('auth_token')
 * - Dispatches 'auth:unauthorized' event on 401 responses for AuthProvider
 * 
 * Error Handling:
 * - Automatic retry with exponential backoff
 * - Centralized error logging in development mode
 * - 401 errors trigger auth notification without retry
 */
