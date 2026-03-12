const crypto = require("crypto");

const SESSION_COOKIE_NAME = "boxladder_admin_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || "";
}

function getSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || getAdminPassword();
}

function isConfigured() {
  return Boolean(getAdminPassword() && getSessionSecret());
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function verifyPassword(password) {
  return safeEqual(password, getAdminPassword());
}

function signExpiry(expiresAt) {
  return crypto.createHmac("sha256", getSessionSecret()).update(String(expiresAt)).digest("hex");
}

function createSessionToken() {
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  return `${expiresAt}.${signExpiry(expiresAt)}`;
}

function verifySessionToken(token) {
  if (!token) {
    return false;
  }

  const [expiresAtRaw, signature] = String(token).split(".");
  const expiresAt = Number(expiresAtRaw);
  if (!expiresAtRaw || !signature || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    return false;
  }

  return safeEqual(signature, signExpiry(expiresAtRaw));
}

function parseCookies(headerValue) {
  return String(headerValue || "")
    .split(";")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .reduce((cookies, segment) => {
      const separatorIndex = segment.indexOf("=");
      if (separatorIndex < 0) {
        return cookies;
      }

      const key = segment.slice(0, separatorIndex).trim();
      const value = segment.slice(separatorIndex + 1).trim();
      cookies[key] = decodeURIComponent(value);
      return cookies;
    }, {});
}

function buildSessionCookie(token) {
  return [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
  ].join("; ");
}

function buildLogoutCookie() {
  return [
    `${SESSION_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    "Max-Age=0",
  ].join("; ");
}

function buildLoginRedirect(pathname) {
  return `/login/?next=${encodeURIComponent(pathname || "/admin")}`;
}

module.exports = {
  SESSION_COOKIE_NAME,
  buildLoginRedirect,
  buildLogoutCookie,
  buildSessionCookie,
  createSessionToken,
  isConfigured,
  parseCookies,
  verifyPassword,
  verifySessionToken,
};

