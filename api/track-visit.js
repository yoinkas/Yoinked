const {
  getList,
  isRedisConfigured,
  pushListItem,
  VISITOR_LOG_KEY,
} = require("../lib/redis");
const { SESSION_COOKIE_NAME, parseCookies, verifySessionToken } = require("../lib/admin-auth");

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(payload));
}

function getClientIp(headers) {
  const forwardedFor = String(headers["x-forwarded-for"] || "").trim();
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = String(headers["x-real-ip"] || "").trim();
  if (realIp) {
    return realIp;
  }

  return "unknown";
}

module.exports = function handler(request, response) {
  if (request.method === "GET") {
    const cookies = parseCookies(request.headers.cookie);
    const token = cookies[SESSION_COOKIE_NAME];
    if (!verifySessionToken(token)) {
      sendJson(response, 401, { error: "Unauthorized" });
      return;
    }

    if (!isRedisConfigured()) {
      sendJson(response, 200, { visitors: [], storage: "logs-only" });
      return;
    }

    getList(VISITOR_LOG_KEY, 0, 99)
      .then((visitors) => {
        sendJson(response, 200, { visitors, storage: "redis" });
      })
      .catch((error) => {
        sendJson(response, 500, { error: error.message || "Failed to load visitors." });
      });
    return;
  }

  if (request.method !== "POST") {
    response.statusCode = 405;
    response.setHeader("Allow", "GET, POST");
    response.end("Method Not Allowed");
    return;
  }

  let body = {};
  try {
    body = typeof request.body === "string"
      ? JSON.parse(request.body || "{}")
      : request.body || {};
  } catch (error) {
    body = {};
  }

  const visitorInfo = {
    timestamp: new Date().toISOString(),
    ip: getClientIp(request.headers),
    userAgent: String(request.headers["user-agent"] || ""),
    referer: String(request.headers.referer || ""),
    host: String(request.headers.host || ""),
    page: String(body.page || ""),
    viewport: String(body.viewport || ""),
    language: String(body.language || ""),
  };

  console.log("Visitor Info:", JSON.stringify(visitorInfo));

  if (!isRedisConfigured()) {
    sendJson(response, 200, { ok: true, storage: "logs-only" });
    return;
  }

  pushListItem(VISITOR_LOG_KEY, visitorInfo, 200)
    .then(() => {
      sendJson(response, 200, { ok: true, storage: "redis" });
    })
    .catch((error) => {
      console.error("Visitor log storage failed:", error);
      sendJson(response, 200, { ok: true, storage: "logs-only" });
    });
};
