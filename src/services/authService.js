// src/services/authService.js
import apiClient from './api.js';

const ENABLE_AUTH = import.meta.env.VITE_ENABLE_AUTH === 'true';

/**
 * Login with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<{user}>} User data (token in HttpOnly cookie)
 */
export const login = async (email, password) => {
  const { data } = await apiClient.post('/auth/login', { email, password });
  
  // When cookie auth is enabled, token is in HttpOnly cookie
  // For backward compatibility, still handle token in response body
  if (!ENABLE_AUTH && data.token) {
    localStorage.setItem('auth_token', data.token);
  }
  
  return data;
};

/**
 * Register a new user
 * @param {Object} userData - User registration data
 * @param {string} userData.username - Username
 * @param {string} userData.email - Email
 * @param {string} userData.password - Password
 * @param {string} userData.displayName - Display name
 * @returns {Promise<{user}>} User data (token in HttpOnly cookie)
 */
export const register = async (userData) => {
  const { data } = await apiClient.post('/auth/register', userData);
  
  // When cookie auth is enabled, token is in HttpOnly cookie
  // For backward compatibility, still handle token in response body
  if (!ENABLE_AUTH && data.token) {
    localStorage.setItem('auth_token', data.token);
  }
  
  return data;
};

/**
 * Get current authenticated user
 * @returns {Promise<User>} Current user data
 */
export const getCurrentUser = async () => {
  const { data } = await apiClient.get('/auth/me');
  return data;
};

/**
 * Logout current user
 * @returns {Promise<void>}
 */
export const logout = async () => {
  try {
    await apiClient.post('/auth/logout');
  } catch (err) {
    console.error('Logout API call failed:', err);
  } finally {
    // Clear local storage (for backward compatibility)
    if (!ENABLE_AUTH) {
      localStorage.removeItem('auth_token');
    }
    localStorage.removeItem('valine-demo-user');
  }
};

/**
 * Refresh auth token
 * @returns {Promise<{message}>} Success message (new token in HttpOnly cookie)
 */
export const refreshToken = async () => {
  const { data } = await apiClient.post('/auth/refresh');
  
  // When cookie auth is enabled, token is in HttpOnly cookie
  // For backward compatibility, still handle token in response body
  if (!ENABLE_AUTH && data.token) {
    localStorage.setItem('auth_token', data.token);
  }
  
  return data;
};

/**
 * Check if user is authenticated (has valid token)
 * When VITE_ENABLE_AUTH is true, relies on cookies (always returns true)
 * Otherwise checks localStorage
 * @returns {boolean}
 */
export const isAuthenticated = () => {
  if (ENABLE_AUTH) {
    // With cookie auth, we can't check from JS, so attempt to get current user
    // This is handled by the AuthProvider
    return true; // Optimistically return true
  }
  return !!localStorage.getItem('auth_token');
};

/**
 * Get stored auth token
 * When VITE_ENABLE_AUTH is true, returns null (token is HttpOnly)
 * @returns {string|null}
 */
export const getAuthToken = () => {
  if (ENABLE_AUTH) {
    return null; // Token is in HttpOnly cookie, not accessible
  }
  return localStorage.getItem('auth_token');
};

/**
 * Get access token from cookie or localStorage
 * Reads access_token cookie first, falls back to localStorage auth_token
 * Note: This function is intentionally duplicated in api.js to avoid circular imports
 * @returns {string|null}
 */
export const getAccessToken = () => {
  // First, try to read from access_token cookie (non-HttpOnly)
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'access_token' && value) {
      return decodeURIComponent(value);
    }
  }
  // Fall back to localStorage
  return localStorage.getItem('auth_token');
};

/**
 * Verify email with token
 * @param {string} token - Email verification token from URL
 * @returns {Promise<{user}>} User data with verified email
 */
export const verifyEmail = async (token) => {
  const { data } = await apiClient.post('/auth/verify-email', { token });
  return data;
};

/**
 * Resend email verification
 * @param {string} email - User email to resend verification to
 * @returns {Promise<{message}>} Success message
 */
export const resendVerification = async (email) => {
  const { data } = await apiClient.post('/auth/resend-verification', { email });
  return data;
};
