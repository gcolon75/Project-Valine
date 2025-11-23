/**
 * CORS Headers Utility
 * Ensures consistent CORS configuration across all endpoints
 */

export function getCorsHeaders(origin) {
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.FRONTEND_BASE_URL,
    'http://localhost:5173',
    'http://localhost:3000'
  ].filter(Boolean);
  
  const isAllowed = allowedOrigins.some(allowed => {
    if (allowed === '*') {
      return true;
    }
    // Use exact match only for security - no prefix matching
    return origin === allowed;
  });
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0] || '*',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400'
  };
}

export function addCorsHeaders(response, event) {
  const origin = event?.headers?.origin || event?.headers?.Origin;
  
  return {
    ...response,
    headers: {
      ...response.headers,
      ...getCorsHeaders(origin)
    }
  };
}
