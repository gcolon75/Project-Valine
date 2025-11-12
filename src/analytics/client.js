/**
 * Analytics Privacy Stub Client
 * Privacy-first analytics with opt-in consent
 */

// Analytics configuration
let analyticsConfig = null;

// Event queue
const eventQueue = [];
let flushTimer = null;
const FLUSH_INTERVAL = 5000; // 5 seconds
const MAX_QUEUE_SIZE = 10;

/**
 * Generate UUID v4
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Get or create anonymous ID from cookie
 */
function getAnonId() {
  const cookieName = 'analytics_uuid';
  const cookies = document.cookie.split(';').map(c => c.trim());
  const existing = cookies.find(c => c.startsWith(`${cookieName}=`));
  
  if (existing) {
    return existing.split('=')[1];
  }
  
  // Create new UUID
  const anonId = generateUUID();
  
  // Set cookie (30 days)
  const expires = new Date();
  expires.setDate(expires.getDate() + 30);
  document.cookie = `${cookieName}=${anonId}; expires=${expires.toUTCString()}; path=/; SameSite=Strict`;
  
  return anonId;
}

/**
 * Get or create session ID (ephemeral, in memory)
 */
let sessionId = null;
function getSessionId() {
  if (!sessionId) {
    sessionId = generateUUID();
  }
  return sessionId;
}

/**
 * Get consent status from cookie
 */
function getConsentStatus() {
  const cookieName = analyticsConfig?.consentCookie || 'analytics_consent';
  const cookies = document.cookie.split(';').map(c => c.trim());
  const consentCookie = cookies.find(c => c.startsWith(`${cookieName}=`));
  
  if (!consentCookie) {
    return null; // No consent decision made
  }
  
  const value = consentCookie.split('=')[1];
  return value === 'accept';
}

/**
 * Set consent status
 */
export function setConsent(accepted) {
  const cookieName = analyticsConfig?.consentCookie || 'analytics_consent';
  const value = accepted ? 'accept' : 'decline';
  
  // Set cookie (1 year)
  const expires = new Date();
  expires.setDate(expires.getDate() + 365);
  document.cookie = `${cookieName}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Strict`;
  
  // If declined, also remove the anonId cookie
  if (!accepted) {
    document.cookie = 'analytics_uuid=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    sessionId = null;
  }
}

/**
 * Check if user has consented
 */
export function hasConsent() {
  return getConsentStatus() === true;
}

/**
 * Check if consent banner should be shown
 */
export function shouldShowConsentBanner() {
  if (!analyticsConfig) return false;
  if (!analyticsConfig.enabled) return false;
  if (!analyticsConfig.requireConsent) return false;
  return getConsentStatus() === null;
}

/**
 * Load analytics configuration from backend
 */
async function loadConfig() {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const response = await fetch(`${apiUrl}/analytics/config`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (response.ok) {
      analyticsConfig = await response.json();
    } else {
      // Default config if endpoint fails
      analyticsConfig = {
        enabled: false,
        requireConsent: true,
        allowedEvents: [],
        samplingRate: 1.0,
        consentCookie: 'analytics_consent'
      };
    }
  } catch (error) {
    console.warn('Failed to load analytics config:', error);
    analyticsConfig = {
      enabled: false,
      requireConsent: true,
      allowedEvents: [],
      samplingRate: 1.0,
      consentCookie: 'analytics_consent'
    };
  }
}

/**
 * Apply sampling rate
 */
function shouldSample() {
  if (!analyticsConfig) return false;
  if (analyticsConfig.samplingRate >= 1.0) return true;
  return Math.random() < analyticsConfig.samplingRate;
}

/**
 * Flush event queue to backend
 */
async function flushEvents() {
  if (eventQueue.length === 0) return;
  
  const events = eventQueue.splice(0, eventQueue.length);
  
  try {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    await fetch(`${apiUrl}/analytics/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ events })
    });
  } catch (error) {
    console.warn('Failed to send analytics events:', error);
  }
  
  // Clear flush timer
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
}

/**
 * Schedule event queue flush
 */
function scheduleFlush() {
  if (flushTimer) return;
  
  flushTimer = setTimeout(() => {
    flushEvents();
  }, FLUSH_INTERVAL);
}

/**
 * Queue an analytics event
 */
export async function queueEvent(eventName, properties = {}) {
  // Ensure config is loaded
  if (!analyticsConfig) {
    await loadConfig();
  }
  
  // Check if analytics is enabled
  if (!analyticsConfig.enabled) {
    return;
  }
  
  // Check consent if required
  if (analyticsConfig.requireConsent && !hasConsent()) {
    return;
  }
  
  // Check if event is allowed
  if (!analyticsConfig.allowedEvents.includes(eventName)) {
    return;
  }
  
  // Apply sampling
  if (!shouldSample()) {
    return;
  }
  
  // Get userId from localStorage or context (if user is logged in)
  let userId = null;
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      userId = user.id || null;
    }
  } catch (e) {
    // Ignore
  }
  
  // Create event
  const event = {
    event: eventName,
    anonId: getAnonId(),
    userId,
    sessionId: getSessionId(),
    properties: properties || {},
    ts: new Date().toISOString()
  };
  
  // Add to queue
  eventQueue.push(event);
  
  // Flush if queue is full
  if (eventQueue.length >= MAX_QUEUE_SIZE) {
    await flushEvents();
  } else {
    scheduleFlush();
  }
}

/**
 * Track page view
 */
export function trackPageView(path, referrer) {
  queueEvent('page_view', {
    path,
    referrer: referrer || document.referrer || undefined
  });
}

/**
 * Track login
 */
export function trackLogin(method = 'password', success = true) {
  queueEvent('login', {
    method,
    success
  });
}

/**
 * Track signup
 */
export function trackSignup(method = 'password', success = true) {
  queueEvent('signup', {
    method,
    success
  });
}

/**
 * Track profile update
 */
export function trackProfileUpdate(fieldsChanged = []) {
  queueEvent('profile_update', {
    fieldsChanged
  });
}

/**
 * Track media upload
 */
export function trackMediaUpload(type, sizeBucket) {
  queueEvent('media_upload', {
    type,
    sizeBucket
  });
}

/**
 * Track logout
 */
export function trackLogout() {
  queueEvent('logout', {});
}

/**
 * Initialize analytics
 */
export async function initAnalytics() {
  await loadConfig();
  
  // Flush events before page unload
  window.addEventListener('beforeunload', () => {
    if (eventQueue.length > 0) {
      flushEvents();
    }
  });
}

/**
 * Get analytics config (for debugging)
 */
export function getAnalyticsConfig() {
  return analyticsConfig;
}
