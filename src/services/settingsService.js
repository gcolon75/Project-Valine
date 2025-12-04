// src/services/settingsService.js
import { apiClient } from './api.js';

/**
 * Get user settings
 * @returns {Promise<Object>} User settings
 */
export const getSettings = async () => {
  try {
    const { data } = await apiClient.get('/settings');
    return data;
  } catch (error) {
    console.error('Error fetching settings:', error);
    throw error;
  }
};

/**
 * Update user settings
 * @param {Object} settings - Settings to update
 * @param {Object} [settings.notifications] - Notification preferences
 * @param {Object} [settings.accountSecurity] - Security settings
 * @param {Object} [settings.privacy] - Privacy settings
 * @returns {Promise<Object>} Updated settings
 */
export const updateSettings = async (settings) => {
  try {
    const { data } = await apiClient.put('/settings', settings);
    return data;
  } catch (error) {
    console.error('Error updating settings:', error);
    throw error;
  }
};

/**
 * Export account data (GDPR compliance)
 * Downloads a JSON file with all user data
 * @returns {Promise<Object>} Account data export
 */
export const exportAccountData = async () => {
  try {
    const { data } = await apiClient.post('/account/export');
    
    // Create a downloadable JSON file
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `valine-account-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    return data;
  } catch (error) {
    console.error('Error exporting account data:', error);
    throw error;
  }
};

/**
 * Delete account permanently (GDPR compliance)
 * Requires password confirmation for security
 * @param {string} password - User's current password for confirmation
 * @returns {Promise<Object>} Deletion confirmation
 */
export const deleteAccount = async (password) => {
  if (!password) {
    throw new Error('Password is required to delete account');
  }
  
  try {
    const { data } = await apiClient.delete('/account', {
      data: { confirmPassword: password }
    });
    
    // Clear auth token on successful deletion
    localStorage.removeItem('auth_token');
    
    return data;
  } catch (error) {
    console.error('Error deleting account:', error);
    throw error;
  }
};

export default {
  getSettings,
  updateSettings,
  exportAccountData,
  deleteAccount
};
