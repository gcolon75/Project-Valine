// serverless/src/handlers/profilesRouter.js
// Central router for profile, education, and experience HTTP endpoints

import * as profiles from './profiles.js';
import * as education from './education.js';

/**
 * Normalize path to remove stage prefix if present (e.g. "/prod/profiles/..." -> "/profiles/...")
 */
function normalizePath(rawPath) {
  let path = rawPath || '';
  const stage = process.env.STAGE;
  if (stage && path.startsWith(`/${stage}/`)) {
    path = path.slice(stage.length + 1); // remove "/{stage}"
  }
  return path;
}

/**
 * Main router handler for profile, education, and experience endpoints
 */
export const handler = async (event, context) => {
  const httpMethod =
    event.requestContext?.http?.method ||
    event.httpMethod ||
    'GET';

  const rawPath =
    event.requestContext?.http?.path ||
    event.rawPath ||
    event.path ||
    '';

  const method = httpMethod.toUpperCase();
  const path = normalizePath(rawPath);

  try {
    // ===== PROFILE ENDPOINTS =====

    // GET /profiles/{vanityUrl}
    if (method === 'GET' && /^\/profiles\/[^/]+$/.test(path) && !path.includes('/id/')) {
      return profiles.getProfileByVanity(event, context);
    }

    // GET /profiles/id/{id}
    if (method === 'GET' && /^\/profiles\/id\/[^/]+$/.test(path)) {
      return profiles.getProfileById(event, context);
    }

    // POST /profiles
    if (method === 'POST' && path === '/profiles') {
      return profiles.createProfile(event, context);
    }

    // PUT /profiles/id/{id}
    if (method === 'PUT' && /^\/profiles\/id\/[^/]+$/.test(path)) {
      return profiles.updateProfile(event, context);
    }

    // DELETE /profiles/id/{id}
    if (method === 'DELETE' && /^\/profiles\/id\/[^/]+$/.test(path)) {
      return profiles.deleteProfile(event, context);
    }

    // GET /me/profile
    if (method === 'GET' && path === '/me/profile') {
      return profiles.getMyProfile(event, context);
    }

    // PATCH /me/profile
    if (method === 'PATCH' && path === '/me/profile') {
      return profiles.updateMyProfile(event, context);
    }

    // ===== EDUCATION ENDPOINTS =====

    // GET /me/profile/education
    if (method === 'GET' && path === '/me/profile/education') {
      return education.listEducation(event, context);
    }

    // POST /me/profile/education
    if (method === 'POST' && path === '/me/profile/education') {
      return education.createEducation(event, context);
    }

    // PUT /me/profile/education/{id}
    if (method === 'PUT' && /^\/me\/profile\/education\/[^/]+$/.test(path)) {
      return education.updateEducation(event, context);
    }

    // DELETE /me/profile/education/{id}
    if (method === 'DELETE' && /^\/me\/profile\/education\/[^/]+$/.test(path)) {
      return education.deleteEducation(event, context);
    }

    // ===== EXPERIENCE ENDPOINTS =====

    // GET /me/profile/experience
    if (method === 'GET' && path === '/me/profile/experience') {
      return profiles.listMyExperience(event, context);
    }

    // POST /me/profile/experience
    if (method === 'POST' && path === '/me/profile/experience') {
      return profiles.createMyExperience(event, context);
    }

    // PUT /me/profile/experience/{id}
    if (method === 'PUT' && /^\/me\/profile\/experience\/[^/]+$/.test(path)) {
      return profiles.updateMyExperience(event, context);
    }

    // DELETE /me/profile/experience/{id}
    if (method === 'DELETE' && /^\/me\/profile\/experience\/[^/]+$/.test(path)) {
      return profiles.deleteMyExperience(event, context);
    }

    // Fallback
    console.warn('profilesRouter: no route match', { method, path });
    return {
      statusCode: 404,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'Not found' }),
    };
  } catch (err) {
    console.error('profilesRouter error', err);
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};
