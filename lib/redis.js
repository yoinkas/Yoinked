import { Redis } from "@upstash/redis";

const url =
  process.env.UPSTASH_REDIS_REST_KV_REST_API_URL ||
  process.env.KV_REST_API_URL;

const token =
  process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN ||
  process.env.KV_REST_API_TOKEN;

if (!url || !token) {
  throw new Error("Missing Redis environment variables.");
}

export const redis = new Redis({ url, token });

export const HOMEPAGE_KEY = "site:homepage";
