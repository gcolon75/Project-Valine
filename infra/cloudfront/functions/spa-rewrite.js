function handler(event) {
  var req = event.request;
  var uri = req.uri;
  if (uri.startsWith('/api/') || uri.startsWith('/assets/') || uri === '/favicon.ico') return req;
  if (uri.indexOf('.') !== -1) return req;
  req.uri = '/index.html';
  return req;
}
