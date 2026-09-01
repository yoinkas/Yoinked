const crypto = require("crypto");

const PORTFOLIO_COOKIE_NAME = "yoinked_portfolio_session";
const PORTFOLIO_PIN_HASH = "6809a3f5e28cdb72d7d21ee9dab766bf3b2f434ad47cd8e0433f3c02fcbbb512";
const SESSION_MAX_AGE_SECONDS = 60 * 60;

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function hashPin(pin) {
  return crypto.createHash("sha256").update(String(pin || "").trim().toLowerCase()).digest("hex");
}

function getSessionSecret() {
  return process.env.PORTFOLIO_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET || PORTFOLIO_PIN_HASH;
}

function verifyPin(pin) {
  return safeEqual(hashPin(pin), PORTFOLIO_PIN_HASH);
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
    `${PORTFOLIO_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/portfolio",
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
  ].join("; ");
}

module.exports = {
  PORTFOLIO_COOKIE_NAME,
  buildSessionCookie,
  createSessionToken,
  parseCookies,
  verifyPin,
  verifySessionToken,
};
