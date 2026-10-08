const {
  addSetItem,
  getList,
  getSetItems,
  isRedisConfigured,
  pushListItem,
  VISITOR_EXCLUDED_IPS_KEY,
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

function getConfiguredExcludedIps() {
  return String(process.env.VISITOR_EXCLUDED_IPS || "")
    .split(",")
    .map((ip) => ip.trim())
    .filter(Boolean);
}

function getLocation(headers) {
  const latitude = Number.parseFloat(String(headers["x-vercel-ip-latitude"] || ""));
  const longitude = Number.parseFloat(String(headers["x-vercel-ip-longitude"] || ""));
  return {
    city: String(headers["x-vercel-ip-city"] || ""),
    region: String(headers["x-vercel-ip-country-region"] || ""),
    country: String(headers["x-vercel-ip-country"] || ""),
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
  };
}

module.exports = function handler(request, response) {
  if (request.method === "GET") {
    const cookies = parseCookies(request.headers.cookie);
    const token = cookies[SESSION_COOKIE_NAME];
    if (!verifySessionToken(token)) {
      sendJson(response, 401, { error: "Unauthorized" });
      return;
    }

    const adminIp = getClientIp(request.headers);
    if (!isRedisConfigured()) {
      sendJson(response, 200, { visitors: [], storage: "logs-only", adminIp });
      return;
    }

    Promise.all([
      getList(VISITOR_LOG_KEY, 0, 199),
      getSetItems(VISITOR_EXCLUDED_IPS_KEY),
      adminIp !== "unknown" ? addSetItem(VISITOR_EXCLUDED_IPS_KEY, adminIp) : Promise.resolve(),
    ])
      .then(([visitors, savedExcludedIps]) => {
        const excludedIps = new Set([...savedExcludedIps, ...getConfiguredExcludedIps(), adminIp]);
        sendJson(response, 200, {
          visitors: visitors.filter((visitor) => !excludedIps.has(String(visitor.ip || ""))),
          storage: "redis",
          adminIp,
        });
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

  const visitorIp = getClientIp(request.headers);
  const visitorInfo = {
    timestamp: new Date().toISOString(),
    ip: visitorIp,
    userAgent: String(request.headers["user-agent"] || ""),
    referer: String(request.headers.referer || ""),
    host: String(request.headers.host || ""),
    page: String(body.page || ""),
    viewport: String(body.viewport || ""),
    language: String(body.language || ""),
    location: getLocation(request.headers),
  };

  if (getConfiguredExcludedIps().includes(visitorIp)) {
    sendJson(response, 200, { ok: true, excluded: true });
    return;
  }

  if (!isRedisConfigured()) {
    console.log("Visitor Info:", JSON.stringify(visitorInfo));
    sendJson(response, 200, { ok: true, storage: "logs-only" });
    return;
  }

  Promise.all([getSetItems(VISITOR_EXCLUDED_IPS_KEY)])
    .then(([savedExcludedIps]) => {
      const excludedIps = new Set([...savedExcludedIps, ...getConfiguredExcludedIps()]);
      if (excludedIps.has(visitorIp)) {
        return null;
      }
      console.log("Visitor Info:", JSON.stringify(visitorInfo));
      return pushListItem(VISITOR_LOG_KEY, visitorInfo, 200);
    })
    .then(() => {
      sendJson(response, 200, { ok: true, storage: "redis" });
    })
    .catch((error) => {
      console.error("Visitor log storage failed:", error);
      sendJson(response, 200, { ok: true, storage: "logs-only" });
    });
};
