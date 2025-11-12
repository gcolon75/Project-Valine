function handler(event) {
  var req = event.request;
  if (req.uri.startsWith('/api/')) {
    // remove leading "/api"
    req.uri = req.uri.substring(4);
  }
  return req;
}