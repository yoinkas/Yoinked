const { getHomepageDefaults } = require("../lib/homepage-defaults");
const { getJson, HOMEPAGE_KEY, isRedisConfigured, setJson } = require("../lib/redis");
const { SESSION_COOKIE_NAME, parseCookies, verifySessionToken } = require("../lib/admin-auth");

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(payload));
}

function normalizeOrder(order, validIds, fallbackOrder) {
  const seen = new Set();
  const normalized = [];
  const preferred = Array.isArray(order) ? order : fallbackOrder;

  preferred.forEach((item) => {
    if (validIds.includes(item) && !seen.has(item)) {
      seen.add(item);
      normalized.push(item);
    }
  });

  validIds.forEach((item) => {
    if (!seen.has(item)) {
      seen.add(item);
      normalized.push(item);
    }
  });

  return normalized;
}

function normalizeHomepageContent(input) {
  const defaults = getHomepageDefaults();
  const content = input && typeof input === "object" ? input : {};
  const featuredWriteups = (Array.isArray(content.featuredWriteups) ? content.featuredWriteups : defaults.featuredWriteups)
    .filter((item) => item && typeof item === "object")
    .map((item, index) => ({
      id: String(item.id || `featured-writeup-${Date.now()}-${index}`),
      title: String(item.title || "").trim() || "New write-up",
      imageSrc: String(item.imageSrc || "").trim(),
      imageAlt: String(item.imageAlt || "").trim(),
      buttonText: String(item.buttonText || "").trim() || "Open Write-Up",
      buttonHref: String(item.buttonHref || "").trim(),
      notes: String(item.notes || "").trim(),
    }));
  const customSections = (Array.isArray(content.customSections) ? content.customSections : [])
    .filter((section) => section && typeof section === "object")
    .map((section) => ({
      id: String(section.id || `section-${Date.now()}`),
      kicker: String(section.kicker || "").trim(),
      title: String(section.title || "").trim() || "New section",
      body: String(section.body || "").trim(),
      buttonText: String(section.buttonText || "").trim(),
      buttonHref: String(section.buttonHref || "").trim(),
      embedUrl: String(section.embedUrl || "").trim(),
    }));
  const sectionIds = ["hero", "about", "recent", "contact", ...customSections.map((section) => `custom:${section.id}`)];

  return {
    ...defaults,
    ...content,
    hiddenSections: Array.isArray(content.hiddenSections) ? content.hiddenSections : [],
    customSections,
    sectionOrder: normalizeOrder(content.sectionOrder, sectionIds, sectionIds),
    aboutCardOrder: normalizeOrder(content.aboutCardOrder, defaults.aboutCardOrder, defaults.aboutCardOrder),
    recentCardOrder: normalizeOrder(content.recentCardOrder, defaults.recentCardOrder, defaults.recentCardOrder),
    featuredWriteups,
    heroEmbedUrl: String(content.heroEmbedUrl || "").trim(),
    heroMediaPosition: content.heroMediaPosition === "left" ? "left" : "right",
  };
}

async function loadHomepageContent() {
  const defaults = getHomepageDefaults();
  if (!isRedisConfigured()) {
    return defaults;
  }

  try {
    const stored = await getJson(HOMEPAGE_KEY);
    if (!stored) {
      return defaults;
    }

    return normalizeHomepageContent(stored);
  } catch (error) {
    return defaults;
  }
}

module.exports = async function handler(request, response) {
  if (request.method === "GET") {
    const homepage = await loadHomepageContent();
    sendJson(response, 200, { homepage });
    return;
  }

  if (request.method !== "POST") {
    response.statusCode = 405;
    response.setHeader("Allow", "GET, POST");
    response.end("Method Not Allowed");
    return;
  }

  const cookies = parseCookies(request.headers.cookie);
  const token = cookies[SESSION_COOKIE_NAME];
  if (!verifySessionToken(token)) {
    sendJson(response, 401, { error: "Unauthorized" });
    return;
  }

  if (!isRedisConfigured()) {
    sendJson(response, 500, { error: "Redis is not configured." });
    return;
  }

  try {
    const body = typeof request.body === "string" ? JSON.parse(request.body || "{}") : request.body || {};
    const homepage = normalizeHomepageContent(body.homepage);
    await setJson(HOMEPAGE_KEY, homepage);
    sendJson(response, 200, { ok: true, homepage });
  } catch (error) {
    sendJson(response, 500, { error: error.message || "Failed to save homepage." });
  }
};
