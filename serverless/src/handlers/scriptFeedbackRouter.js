// Central router for /script-feedback/* routes.
// Single Lambda dispatches all paths to keep us under the
// CloudFormation 500-resource-per-stack limit.

import * as sf from './scriptFeedback.js';

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
    // Collection routes
    if (method === 'POST' && path === '/script-feedback') {
      return sf.submitRequest(event, context);
    }
    if (method === 'GET' && path === '/script-feedback') {
      return sf.listRequests(event, context);
    }

    // Admin reader management — must come before the generic /:id route
    if (method === 'GET' && path === '/script-feedback/admin/readers') {
      return sf.listReaders(event, context);
    }
    if (method === 'GET' && path === '/script-feedback/admin/users') {
      return sf.searchUsersForAdmin(event, context);
    }
    {
      const m = path.match(/^\/script-feedback\/admin\/readers\/([^/]+)$/);
      if (m && method === 'POST') {
        event.pathParameters = { ...(event.pathParameters || {}), userId: m[1] };
        return sf.setReaderFlag(event, context);
      }
    }

    // Annotation routes (must match before generic /:id routes)
    let m;
    m = path.match(/^\/script-feedback\/annotations\/([^/]+)$/);
    if (m) {
      event.pathParameters = { ...(event.pathParameters || {}), annotationId: m[1] };
      if (method === 'PUT') return sf.updateAnnotation(event, context);
      if (method === 'DELETE') return sf.deleteAnnotation(event, context);
    }

    m = path.match(/^\/script-feedback\/([^/]+)\/annotations$/);
    if (m) {
      event.pathParameters = { ...(event.pathParameters || {}), id: m[1] };
      if (method === 'GET') return sf.listAnnotations(event, context);
      if (method === 'POST') return sf.createAnnotation(event, context);
    }

    // Chat routes (before generic /:id)
    m = path.match(/^\/script-feedback\/([^/]+)\/chat$/);
    if (m) {
      event.pathParameters = { ...(event.pathParameters || {}), id: m[1] };
      if (method === 'GET')  return sf.getChatMessages(event, context);
      if (method === 'POST') return sf.sendChatMessage(event, context);
    }

    // Action routes
    m = path.match(/^\/script-feedback\/([^/]+)\/(approve|deny|accept|submit-notes|reassign|approve-submission|request-revision)$/);
    if (m && method === 'POST') {
      event.pathParameters = { ...(event.pathParameters || {}), id: m[1] };
      const action = m[2];
      if (action === 'approve') return sf.approveRequest(event, context);
      if (action === 'deny') return sf.denyRequest(event, context);
      if (action === 'accept') return sf.acceptRequest(event, context);
      if (action === 'submit-notes') return sf.submitNotes(event, context);
      if (action === 'reassign') return sf.reassignReader(event, context);
      if (action === 'approve-submission') return sf.approveSubmission(event, context);
      if (action === 'request-revision') return sf.requestRevision(event, context);
    }

    // Single-resource fetch (last, to avoid swallowing nested routes above)
    m = path.match(/^\/script-feedback\/([^/]+)$/);
    if (m && method === 'GET') {
      event.pathParameters = { ...(event.pathParameters || {}), id: m[1] };
      return sf.getRequest(event, context);
    }

    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Not found', method, path }),
    };
  } catch (e) {
    console.error('[scriptFeedbackRouter] error', e);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Server error: ' + e.message }),
    };
  }
};
