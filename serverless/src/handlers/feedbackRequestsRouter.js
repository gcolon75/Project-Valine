// Central router for peer feedback request endpoints.
// Single Lambda dispatches all 10 routes to keep us under the
// CloudFormation 500-resource-per-stack limit.

import * as fr from './feedbackRequests.js';

function normalizePath(rawPath) {
  let path = rawPath || '';
  const stage = process.env.STAGE;
  if (stage && path.startsWith(`/${stage}/`)) {
    path = path.slice(stage.length + 1);
  }
  return path;
}

export const handler = async (event, context) => {
  const httpMethod = event.requestContext?.http?.method || event.httpMethod || 'GET';
  const rawPath = event.requestContext?.http?.path || event.rawPath || event.path || '';
  const method = httpMethod.toUpperCase();
  const path = normalizePath(rawPath);

  try {
    let m;

    // POST /posts/:id/feedback-request
    m = path.match(/^\/posts\/([^/]+)\/feedback-request$/);
    if (m && method === 'POST') {
      event.pathParameters = { ...(event.pathParameters || {}), id: m[1] };
      return fr.createFeedbackRequest(event, context);
    }

    // GET /posts/:id/feedback-status
    m = path.match(/^\/posts\/([^/]+)\/feedback-status$/);
    if (m && method === 'GET') {
      event.pathParameters = { ...(event.pathParameters || {}), id: m[1] };
      return fr.getFeedbackStatus(event, context);
    }

    // /feedback-requests
    if (path === '/feedback-requests' && method === 'GET') {
      return fr.listFeedbackRequests(event, context);
    }

    // /feedback-requests/:id/annotations  (must come before /feedback-requests/:id)
    m = path.match(/^\/feedback-requests\/([^/]+)\/annotations$/);
    if (m) {
      event.pathParameters = { ...(event.pathParameters || {}), id: m[1] };
      if (method === 'GET') return fr.getAnnotations(event, context);
      if (method === 'POST') return fr.createAnnotation(event, context);
    }

    // /feedback-requests/:id/approve
    m = path.match(/^\/feedback-requests\/([^/]+)\/(approve|deny)$/);
    if (m && method === 'POST') {
      event.pathParameters = { ...(event.pathParameters || {}), id: m[1] };
      if (m[2] === 'approve') return fr.approveFeedbackRequest(event, context);
      if (m[2] === 'deny') return fr.denyFeedbackRequest(event, context);
    }

    // /feedback-requests/:id
    m = path.match(/^\/feedback-requests\/([^/]+)$/);
    if (m && method === 'GET') {
      event.pathParameters = { ...(event.pathParameters || {}), id: m[1] };
      return fr.getFeedbackRequest(event, context);
    }

    // /annotations/:id
    m = path.match(/^\/annotations\/([^/]+)$/);
    if (m) {
      event.pathParameters = { ...(event.pathParameters || {}), id: m[1] };
      if (method === 'PUT') return fr.updateAnnotation(event, context);
      if (method === 'DELETE') return fr.deleteAnnotation(event, context);
    }

    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Not found', method, path }),
    };
  } catch (e) {
    console.error('[feedbackRequestsRouter] error', e);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Server error: ' + e.message }),
    };
  }
};
