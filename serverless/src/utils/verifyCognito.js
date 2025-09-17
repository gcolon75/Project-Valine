import jwt from 'jsonwebtoken';
import jwkToPem from 'jwk-to-pem';

const jwksCache = new Map();

async function getJwks(issuer) {
  if (jwksCache.has(issuer)) return jwksCache.get(issuer);
  const res = await fetch(`${issuer}/.well-known/jwks.json`);
  if (!res.ok) throw new Error('Failed to fetch JWKS');
  const jwks = await res.json();
  jwksCache.set(issuer, jwks);
  return jwks;
}

export async function verifyIdToken(idToken, { region, userPoolId, audience }) {
  const iss = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
  const decoded = jwt.decode(idToken, { complete: true });
  if (!decoded?.header?.kid) throw new Error('Invalid token');
  const { keys } = await getJwks(iss);
  const jwk = keys.find(k => k.kid === decoded.header.kid);
  if (!jwk) throw new Error('JWK not found');
  const pem = jwkToPem(jwk);
  const payload = jwt.verify(idToken, pem, { issuer: iss, audience });
  return payload;
}
