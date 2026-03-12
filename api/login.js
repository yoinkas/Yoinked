const {
  buildSessionCookie,
  createSessionToken,
  isConfigured,
  verifyPassword,
} = require("../lib/admin-auth");

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.statusCode = 405;
    response.setHeader("Allow", "POST");
    response.end("Method Not Allowed");
    return;
  }

  if (!isConfigured()) {
    response.statusCode = 500;
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.end(JSON.stringify({ error: "Admin authentication is not configured." }));
    return;
  }

  const body = typeof request.body === "string" ? JSON.parse(request.body || "{}") : request.body || {};
  const password = String(body.password || "");

  if (!verifyPassword(password)) {
    response.statusCode = 401;
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.end(JSON.stringify({ error: "Incorrect password." }));
    return;
  }

  response.statusCode = 200;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Set-Cookie", buildSessionCookie(createSessionToken()));
  response.end(JSON.stringify({ ok: true }));
};

