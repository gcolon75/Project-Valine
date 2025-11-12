/**
 * Analytics Privacy Stub Configuration
 * Feature flags and settings for privacy-first analytics
 */

export const analyticsConfig = {
  enabled: process.env.ANALYTICS_ENABLED === 'true',
  requireConsent: process.env.ANALYTICS_REQUIRE_CONSENT !== 'false', // Default true
  persistEnabled: process.env.ANALYTICS_PERSIST_ENABLED !== 'false', // Default true
  storageDriver: process.env.ANALYTICS_STORAGE_DRIVER || 'postgres',
  retentionDays: parseInt(process.env.ANALYTICS_RETENTION_DAYS || '30', 10),
  allowedEvents: (process.env.ANALYTICS_ALLOWED_EVENTS || 'page_view,signup,login,profile_update,media_upload,logout').split(','),
  samplingRate: parseFloat(process.env.ANALYTICS_SAMPLING_RATE || '1.0'),
  consentCookie: process.env.ANALYTICS_CONSENT_COOKIE || 'analytics_consent',
  
  // Rate limiting
  rateLimit: {
    maxEventsPerWindow: 100,
    windowMinutes: 15
  },
  
  // Batch processing
  maxBatchSize: 50,
  
  // Property denylist - keys that should never be stored
  propertyDenylist: [
    'email',
    'password',
    'token',
    'secret',
    'apiKey',
    'api_key',
    'accessToken',
    'access_token',
    'refreshToken',
    'refresh_token',
    'creditCard',
    'credit_card',
    'ssn',
    'social_security',
    'phone',
    'phoneNumber',
    'phone_number',
    'address',
    'ipAddress',
    'ip_address',
    'ip'
  ]
};

/**
 * Validates if an event name is allowed
 */
export function isEventAllowed(eventName) {
  return analyticsConfig.allowedEvents.includes(eventName);
}

/**
 * Checks if properties contain disallowed keys
 */
export function hasDisallowedProperties(properties) {
  if (!properties || typeof properties !== 'object') {
    return false;
  }
  
  const keys = Object.keys(properties).map(k => k.toLowerCase());
  return analyticsConfig.propertyDenylist.some(denied => 
    keys.some(key => key.includes(denied.toLowerCase()))
  );
}

/**
 * Sanitizes properties by removing disallowed keys
 */
export function sanitizeProperties(properties) {
  if (!properties || typeof properties !== 'object') {
    return properties;
  }
  
  const sanitized = { ...properties };
  const denylist = analyticsConfig.propertyDenylist.map(k => k.toLowerCase());
  
  Object.keys(sanitized).forEach(key => {
    const lowerKey = key.toLowerCase();
    if (denylist.some(denied => lowerKey.includes(denied))) {
      delete sanitized[key];
    }
  });
  
  return sanitized;
}
