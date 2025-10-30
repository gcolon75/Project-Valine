export function json(data, statusCode = 200, extra = {}) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': 'true',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'strict-origin-when-cross-origin',
      'permissions-policy': 'camera=(), microphone=(), geolocation=()',
      'strict-transport-security': 'max-age=63072000; includeSubDomains; preload',
      ...extra,
    },
    body: JSON.stringify(data),
  };
}

export function error(message, statusCode = 400, extra = {}) {
  return json({ error: message }, statusCode, extra);
}
