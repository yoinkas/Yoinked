const fs = require("fs");
const path = require("path");
const {
  SESSION_COOKIE_NAME,
  buildLoginRedirect,
  isConfigured,
  parseCookies,
  verifySessionToken,
} = require("../lib/admin-auth");

const adminTemplatePath = path.join(process.cwd(), "templates", "admin.html");

module.exports = function handler(request, response) {
  const url = new URL(request.url, `https://${request.headers.host || "localhost"}`);

  if (!isConfigured()) {
    response.statusCode = 500;
    response.setHeader("Content-Type", "text/plain; charset=utf-8");
    response.setHeader("Cache-Control", "no-store");
    response.end("Admin authentication is not configured.");
    return;
  }

  const cookies = parseCookies(request.headers.cookie);
  const token = cookies[SESSION_COOKIE_NAME];
  if (!verifySessionToken(token)) {
    response.statusCode = 307;
    response.setHeader("Location", buildLoginRedirect(url.pathname));
    response.setHeader("Cache-Control", "no-store");
    response.end();
    return;
  }

  const html = fs.readFileSync(adminTemplatePath, "utf8");
  response.statusCode = 200;
  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
  response.end(html);
};

