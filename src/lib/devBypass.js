/**
 * Development Bypass Mode
 * Allows rapid UI/UX iteration without authentication
 * ⚠️ ONLY WORKS IN DEVELOPMENT - DISABLED IN PRODUCTION BUILDS
 */

/**
 * Check if dev bypass is enabled
 * Conditions:
 *  - VITE_DEV_BYPASS_AUTH or VITE_ENABLE_DEV_BYPASS is 'true'
 *  - Running in development mode (import.meta.env.DEV)
 *  - Hostname is localhost
 */
export const DEV_BYPASS_ENABLED = 
  (import.meta.env.VITE_DEV_BYPASS_AUTH === 'true' || import.meta.env.VITE_ENABLE_DEV_BYPASS === 'true') && 
  import.meta.env.DEV;

/**
 * Mock user for dev bypass mode
 */
export const DEV_MOCK_USER = {
  id: 'dev-user-mock-id',
  email: 'dev@local.dev',
  username: 'devuser',
  displayName: 'Dev User (Bypass Mode)',
  name: 'Dev User (Bypass Mode)',
  onboardingComplete: true,
  status: 'active',
  theme: 'dark',
  role: 'artist',
  emailVerified: true,
  profileComplete: true,
  roles: ['DEV_BYPASS'],
  avatar: 'https://i.pravatar.cc/150?img=68',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const DEV_MOCK_TOKEN = 'dev-bypass-mock-token';

/**
 * Get dev bypass authentication data
 * Returns null if dev bypass is not enabled
 */
export function getDevBypassAuth() {
  if (!DEV_BYPASS_ENABLED) return null;
  
  // Additional security check - only on localhost
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return null;
  }
  
  return {
    user: DEV_MOCK_USER,
    token: DEV_MOCK_TOKEN,
  };
}

/**
 * Check if currently in dev bypass session
 * @param {object} user - Current user object
 * @returns {boolean} True if user is a dev bypass user
 */
export function isDevBypassSession(user) {
  return user?.roles?.includes('DEV_BYPASS') || user?.id === 'dev-user-mock-id';
}
