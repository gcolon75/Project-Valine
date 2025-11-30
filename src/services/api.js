import axios from 'axios';

const base = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

// Deprecated/stale API hosts that should never be used
const DEPRECATED_HOSTS = [
  'https://fb9pxd6m09.execute-api.us-west-2.amazonaws.com',
  'fb9pxd6m09.execute-api.us-west-2.amazonaws.com'
];

// Debug mode validation - check for deprecated hosts
if (import.meta.env.VITE_DEBUG_API === 'true' || import.meta.env.DEV) {
  console.log('[API Client] Initializing with base URL:', base);
  
  // Check if using a deprecated host
  const isDeprecated = DEPRECATED_HOSTS.some(deprecated => 
    base.includes(deprecated)
  );
  
  if (isDeprecated) {
    console.error(
      '❌ CRITICAL: API client is configured with a DEPRECATED host!\n' +
      `   Current: ${base}\n` +
      '   This host is no longer valid and requests will fail.\n' +
      '   Action required:\n' +
      '   1. Update VITE_API_BASE in .env.production to the correct host\n' +
      '   2. Rebuild and redeploy the application\n' +
      '   3. Clear browser cache and CloudFront distribution\n' +
      '   For validation, run: node scripts/validate-api-base.js'
    );
  }
}


// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // Start with 1 second
  retryableStatuses: [408, 429, 500, 502, 503, 504],
  retryableErrors: ['ECONNABORTED', 'ECONNREFUSED', 'ETIMEDOUT', 'ERR_NETWORK']
};

/**
 * Calculate exponential backoff delay
 * @param {number} attempt - Current attempt number (0-indexed)
 * @returns {number} Delay in milliseconds
 */
const getRetryDelay = (attempt) => {
  const delay = RETRY_CONFIG.retryDelay * Math.pow(2, attempt);
  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 1000;
  return Math.min(delay + jitter, 10000); // Max 10 seconds
};

/**
 * Check if error should be retried
 * @param {Error} error - Axios error
 * @returns {boolean}
 */
const shouldRetry = (error) => {
  if (!error.response && error.code) {
    return RETRY_CONFIG.retryableErrors.includes(error.code);
  }
  if (error.response) {
    return RETRY_CONFIG.retryableStatuses.includes(error.response.status);
  }
  return false;
};

// Axios client with auth interceptor, timeouts, and retry logic
export const apiClient = axios.create({
  baseURL: base,
  headers: { 'Content-Type': 'application/json' },
  timeout: 8000, // 8 second timeout (configurable)
  withCredentials: import.meta.env.VITE_ENABLE_AUTH === 'true' || import.meta.env.VITE_API_USE_CREDENTIALS === 'true', // Enable credentials for cookie auth
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN'
});

/**
 * Get CSRF token from cookie
 * Reads the XSRF-TOKEN cookie set by the backend
 */
const getCsrfToken = () => {
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'XSRF-TOKEN') {
      return decodeURIComponent(value);
    }
  }
  return null;
};

// Request interceptor - add auth token, CSRF protection, and path normalization
apiClient.interceptors.request.use((config) => {
  // Add Authorization header for backward compatibility (when not using cookies)
  const enableAuth = import.meta.env.VITE_ENABLE_AUTH === 'true';
  const csrfEnabled = import.meta.env.VITE_CSRF_ENABLED === 'true';
  const stripLegacyPrefix = import.meta.env.VITE_API_STRIP_LEGACY_API_PREFIX === 'true';
  
  if (!enableAuth) {
    const token = localStorage.getItem('auth_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Strip legacy /api prefix if enabled
  if (stripLegacyPrefix && config.url && config.url.startsWith('/api/')) {
    config.url = config.url.substring(4); // Remove '/api' prefix
    if (import.meta.env.DEV) {
      console.log(`[API Client] Stripped /api prefix: ${config.url}`);
    }
  }
  
  // Add CSRF protection for state-changing requests
  if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase())) {
    // Read XSRF-TOKEN cookie and send as X-CSRF-Token header
    if (csrfEnabled || enableAuth) {
      const csrfToken = getCsrfToken();
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }
    }
    
    // Also add X-Requested-With for additional protection
    config.headers['X-Requested-With'] = 'XMLHttpRequest';
  }
  
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor - handle retries and errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    
    // Handle 401 Unauthorized - notify auth system
    if (error.response?.status === 401) {
      // Dispatch custom event for AuthProvider to handle
      window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: error }));
      
      // Don't retry 401 errors
      if (import.meta.env.DEV) {
        console.warn('[API Client] Unauthorized request (401):', config?.url);
      }
      return Promise.reject(error);
    }
    
    // Initialize retry count
    if (!config._retryCount) {
      config._retryCount = 0;
    }
    
    // Check if we should retry
    if (config._retryCount < RETRY_CONFIG.maxRetries && shouldRetry(error)) {
      config._retryCount++;
      
      // Calculate delay with exponential backoff
      const delay = getRetryDelay(config._retryCount - 1);
      
      console.warn(
        `[API Client] Retrying request (${config._retryCount}/${RETRY_CONFIG.maxRetries}) ` +
        `after ${delay}ms: ${config.method?.toUpperCase()} ${config.url}`
      );
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Retry the request
      return apiClient(config);
    }
    
    // Log failed requests for debugging
    if (import.meta.env.DEV) {
      // Enhanced diagnostics for network errors
      if (error.code === 'ERR_NETWORK' && !error.response) {
        const fullUrl = config?.baseURL + (config?.url || '');
        console.warn(
          `[API Client] Network Error - DNS or connection failed.\n` +
          `  Attempted URL: ${fullUrl}\n` +
          `  Check VITE_API_BASE (current: ${import.meta.env.VITE_API_BASE || 'not set'})\n` +
          `  Tip: Ensure API Gateway URL is correct or start local backend.`
        );
      }
      
      console.error('[API Client] Request failed:', {
        method: config?.method,
        url: config?.url,
        fullUrl: config?.baseURL + (config?.url || ''),
        status: error.response?.status,
        message: error.message,
        code: error.code,
        retries: config._retryCount
      });
    }
    
    // Enhanced DEBUG logging (opt-in via VITE_DEBUG_API env var)
    // This provides additional diagnostics without exposing sensitive info in production
    if (import.meta.env.VITE_DEBUG_API === 'true') {
      const debugInfo = {
        timestamp: new Date().toISOString(),
        request: {
          method: config?.method,
          url: config?.url,
          baseURL: config?.baseURL,
          fullUrl: config?.baseURL + (config?.url || ''),
          headers: config?.headers
        },
        error: {
          code: error.code,
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText
        },
        retry: {
          attempt: config._retryCount || 0,
          maxRetries: RETRY_CONFIG.maxRetries
        }
      };
      
      // Try to resolve hostname to diagnose DNS issues
      if (error.code === 'ERR_NETWORK' && config?.baseURL) {
        try {
          const hostname = new URL(config.baseURL).hostname;
          debugInfo.dns = {
            hostname: hostname,
            note: 'DNS resolution happens at browser/system level. Check network tab for actual resolution.',
            recommendation: `Run: node scripts/check-auth-backend.js --domain ${hostname}`
          };
        } catch (e) {
          debugInfo.dns = { error: 'Could not parse baseURL' };
        }
      }
      
      console.group('[API DEBUG] Request Failure Details');
      console.table(debugInfo.request);
      console.table(debugInfo.error);
      if (debugInfo.dns) {
        console.log('DNS Info:', debugInfo.dns);
      }
      console.groupEnd();
    }
    
    return Promise.reject(error);
  }
);

// Legacy fetch-based request function for backward compatibility
async function req(p, o = {}) {
  const res = await fetch(base + p, { headers: { 'Content-Type': 'application/json' }, ...o });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const login = (b) => req('/auth/login', { method: 'POST', body: JSON.stringify(b) });
export const feed = (page = 0) => req('/feed?page=' + page);
export const search = (q) => req('/search?q=' + encodeURIComponent(q));
export const listScripts = (p = 0) => req('/scripts?page=' + p);
export const getScript = (id) => req('/scripts/' + id);
export const createScript = (d) => req('/scripts', { method: 'POST', body: JSON.stringify(d) });
export const listAuditions = (p = 0) => req('/auditions?page=' + p);
export const getAudition = (id) => req('/auditions/' + id);
export const createAudition = (d) => req('/auditions', { method: 'POST', body: JSON.stringify(d) });
export const requestAccess = (scriptId, userId) => req('/requests', { method: 'POST', body: JSON.stringify({ scriptId, requesterId: userId }) });
export const listRequests = () => req('/requests');
export const listComments = (sid) => req('/scripts/' + sid + '/comments');
export const postComment = (sid, body) => req('/scripts/' + sid + '/comments', { method: 'POST', body: JSON.stringify(body) });
export const listNotifications = (userId) => req('/notifications?userId=' + userId);
export const listMessages = (room) => req('/messages?room=' + room);
export const postMessage = (msg) => req('/messages', { method: 'POST', body: JSON.stringify(msg) });

export const likeScript = (id, userId) => req(`/scripts/${id}/like`, { method: 'POST', body: JSON.stringify({ userId }) });
export const followUser = (id, userId) => req(`/users/${id}/follow`, { method: 'POST', body: JSON.stringify({ userId }) });

// Update a user's profile. Accepts the user id and partial data to merge.
export const updateUser = (id, data) =>
  req(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export default apiClient;
