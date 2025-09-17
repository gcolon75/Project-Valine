const cfg = {
  region: import.meta.env.VITE_COGNITO_REGION,
  userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  clientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
  domain: import.meta.env.VITE_COGNITO_DOMAIN, // e.g. https://yourprefix.auth.us-west-2.amazoncognito.com
  authMode: import.meta.env.VITE_AUTH_MODE, // 'cognito' | 'demo'
};

function hostedBase() {
  if (cfg.domain) return cfg.domain.replace(/\/+$/, '');
  if (cfg.userPoolId && cfg.region) {
    return `https://${cfg.userPoolId}.auth.${cfg.region}.amazoncognito.com`;
  }
  return '';
}

export function isCognitoEnabled() {
  return !!(cfg.authMode === 'cognito' && cfg.clientId && hostedBase());
}

export function openHostedUI() {
  const base = hostedBase();
  if (!base) throw new Error('Cognito domain not configured');
  const redirect = `${window.location.origin}/auth/callback`;
  const url =
    `${base}/oauth2/authorize?` +
    new URLSearchParams({
      client_id: cfg.clientId,
      response_type: 'token', // implicit; switch to 'code' later
      scope: 'email openid profile',
      redirect_uri: redirect,
    });
  window.location.assign(url);
}

export function parseTokensFromHash() {
  const hash = window.location.hash?.slice(1);
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  const id = params.get('id_token');
  const access = params.get('access_token');
  if (id) localStorage.setItem('id_token', id);
  if (access) localStorage.setItem('access_token', access);
  if (window.history.replaceState) {
    const cleanUrl = window.location.origin + window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
  }
  return { id, access };
}

export function getIdToken() {
  return localStorage.getItem('id_token');
}
