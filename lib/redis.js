const REDIS_URL =
  process.env.UPSTASH_REDIS_REST_KV_REST_API_URL ||
  process.env.UPSTASH_REDIS_REST_URL ||
  process.env.KV_REST_API_URL ||
  "";

const REDIS_TOKEN =
  process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN ||
  process.env.UPSTASH_REDIS_REST_TOKEN ||
  process.env.KV_REST_API_TOKEN ||
  "";

const HOMEPAGE_KEY = "site:homepage";
const VISITOR_LOG_KEY = "site:visitor-log";
const VISITOR_EXCLUDED_IPS_KEY = "site:visitor-excluded-ips";
const PORTFOLIO_RESPONSES_KEY = "site:portfolio-responses";

function isRedisConfigured() {
  return Boolean(REDIS_URL && REDIS_TOKEN);
}

async function redisRequest(command, ...args) {
  if (!isRedisConfigured()) {
    throw new Error("Missing Redis environment variables.");
  }

  const response = await fetch(REDIS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([command, ...args]),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Upstash Redis request failed: ${response.status} ${errorText}`);
  }

  const payload = await response.json();
  if (payload.error) {
    throw new Error(payload.error);
  }

  return payload.result;
}

async function getJson(key) {
  const result = await redisRequest("GET", key);
  if (!result) {
    return null;
  }

  return JSON.parse(result);
}

async function setJson(key, value) {
  await redisRequest("SET", key, JSON.stringify(value));
  return value;
}

async function getList(key, start = 0, stop = -1) {
  const result = await redisRequest("LRANGE", key, start, stop);
  if (!Array.isArray(result)) {
    return [];
  }

  return result.map((item) => {
    try {
      return JSON.parse(item);
    } catch (error) {
      return null;
    }
  }).filter(Boolean);
}

async function pushListItem(key, value, maxItems = 200) {
  await redisRequest("LPUSH", key, JSON.stringify(value));
  if (Number.isFinite(maxItems) && maxItems > 0) {
    await redisRequest("LTRIM", key, 0, maxItems - 1);
  }
  return value;
}

async function addSetItem(key, value) {
  await redisRequest("SADD", key, String(value));
  return value;
}

async function getSetItems(key) {
  const result = await redisRequest("SMEMBERS", key);
  return Array.isArray(result) ? result.map(String) : [];
}

async function deleteKey(key) {
  await redisRequest("DEL", key);
}

module.exports = {
  addSetItem,
  deleteKey,
  getJson,
  getList,
  getSetItems,
  HOMEPAGE_KEY,
  isRedisConfigured,
  PORTFOLIO_RESPONSES_KEY,
  setJson,
  pushListItem,
  VISITOR_EXCLUDED_IPS_KEY,
  VISITOR_LOG_KEY,
};
