// src/services/authService.js
import apiClient from './api';

/**
 * Login with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<{user, token}>} User data and auth token
 */
export const login = async (email, password) => {
  const { data } = await apiClient.post('/auth/login', { email, password });
  
  // Store token
  if (data.token) {
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
 * @returns {Promise<{user, token}>} User data and auth token
 */
export const register = async (userData) => {
  const { data } = await apiClient.post('/auth/register', userData);
  
  // Store token
  if (data.token) {
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
    // Always clear local storage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('valine-demo-user');
  }
};

/**
 * Refresh auth token
 * @returns {Promise<{token}>} New token
 */
export const refreshToken = async () => {
  const { data } = await apiClient.post('/auth/refresh');
  
  if (data.token) {
    localStorage.setItem('auth_token', data.token);
  }
  
  return data;
};

/**
 * Check if user is authenticated (has valid token)
 * @returns {boolean}
 */
export const isAuthenticated = () => {
  return !!localStorage.getItem('auth_token');
};

/**
 * Get stored auth token
 * @returns {string|null}
 */
export const getAuthToken = () => {
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
