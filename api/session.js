const { SESSION_COOKIE_NAME, parseCookies, verifySessionToken } = require("../lib/admin-auth");

module.exports = function handler(request, response) {
  const cookies = parseCookies(request.headers.cookie);
  const token = cookies[SESSION_COOKIE_NAME];

  response.statusCode = 200;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify({ authenticated: verifySessionToken(token) }));
};

