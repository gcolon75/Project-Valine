export const router = async (event) => {
  const path = event.rawPath || event.requestContext?.http?.path || "/";
  const method = (event.requestContext?.http?.method || "GET").toUpperCase();

  // health / hello
  if (method === "GET" && path === "/health") return ok({ ok: true, status: "healthy" });
  if (method === "GET" && path === "/hello") return ok({ message: "Project Valine API is alive ✨" });

  // requests
  if (path === "/requests" && method === "GET") return ok({ items: [] });
  if (path === "/requests" && method === "POST") {
    const body = parseJSON(event.body);
    return created({ received: body ?? {} });
  }

  // requests/{id}/approve|reject
  const approve = path.match(/^\/requests\/([^/]+)\/approve$/);
  const reject = path.match(/^\/requests\/([^/]+)\/reject$/);
  if (approve && method === "POST") return ok({ id: approve[1], status: "approved" });
  if (reject && method === "POST") return ok({ id: reject[1], status: "rejected" });

  return notFound();
};

const ok = (body) => ({
  statusCode: 200,
  headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
  body: JSON.stringify(body),
});

const created = (body) => ({
  statusCode: 201,
  headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
  body: JSON.stringify(body),
});

const notFound = () => ({
  statusCode: 404,
  headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
  body: JSON.stringify({ error: "Not found" }),
});

const parseJSON = (s) => {
  try { return s ? JSON.parse(s) : null; } catch { return null; }
};
