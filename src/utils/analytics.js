// src/utils/analytics.js

/**
 * Analytics event tracker
 * Sends events to API or logs them for development
 */

const IS_DEV = import.meta.env.DEV;

/**
 * Track an analytics event
 * @param {string} event - Event name
 * @param {Object} properties - Event properties
 */
export function trackEvent(event, properties = {}) {
  const timestamp = new Date().toISOString();
  const eventData = {
    event,
    properties,
    timestamp,
    user: getUserId(),
    session: getSessionId()
  };

  // Log in development
  if (IS_DEV) {
    console.log('[Analytics]', event, properties);
  }

  // Store locally for debugging
  storeEvent(eventData);

  // TODO: Send to API endpoint in production
  // sendToApi(eventData);
}

/**
 * Track reel view
 * @param {string} reelId - Reel ID
 * @param {number} duration - View duration in seconds
 */
export function trackReelView(reelId, duration = 0) {
  trackEvent('reel_view', {
    reel_id: reelId,
    duration_seconds: duration
  });
}

/**
 * Track reel interaction
 * @param {string} reelId - Reel ID
 * @param {string} action - Action type (like, share, comment, bookmark)
 */
export function trackReelInteraction(reelId, action) {
  trackEvent('reel_interaction', {
    reel_id: reelId,
    action
  });
}

/**
 * Track video playback event
 * @param {string} reelId - Reel ID
 * @param {string} action - Playback action (play, pause, mute, unmute)
 * @param {number} position - Current video position in seconds
 */
export function trackVideoPlayback(reelId, action, position = 0) {
  trackEvent('video_playback', {
    reel_id: reelId,
    action,
    position_seconds: position
  });
}

/**
 * Get user ID from auth
 */
function getUserId() {
  try {
    const user = JSON.parse(localStorage.getItem('valine-demo-user'));
    return user?.id || 'anonymous';
  } catch {
    return 'anonymous';
  }
}

/**
 * Get or create session ID
 */
function getSessionId() {
  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID?.() || `session-${Date.now()}`;
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
}

/**
 * Store event locally for debugging
 */
function storeEvent(eventData) {
  try {
    const events = JSON.parse(localStorage.getItem('analytics_events') || '[]');
    events.push(eventData);
    
    // Keep only last 100 events
    const trimmed = events.slice(-100);
    localStorage.setItem('analytics_events', JSON.stringify(trimmed));
  } catch (err) {
    console.error('Failed to store analytics event:', err);
  }
}

/**
 * Get stored analytics events (for debugging)
 */
export function getAnalyticsEvents() {
  try {
    return JSON.parse(localStorage.getItem('analytics_events') || '[]');
  } catch {
    return [];
  }
}

/**
 * Clear stored analytics events
 */
export function clearAnalyticsEvents() {
  localStorage.removeItem('analytics_events');
}

// Expose to window for debugging in development
if (IS_DEV && typeof window !== 'undefined') {
  window.__analytics = {
    track: trackEvent,
    getEvents: getAnalyticsEvents,
    clear: clearAnalyticsEvents
  };
  console.log('[Analytics] Debug utilities available at window.__analytics');
}
