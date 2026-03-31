const { createClient } = require('redis');

const CACHE_ENABLED = process.env.CACHE_ENABLED !== 'false';
const REDIS_URL = process.env.REDIS_URL || '';
const IN_MEMORY_CACHE = new Map();

let redisClient = null;
let redisInitPromise = null;

const parseInteger = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(1, Math.floor(parsed));
};

const inMemoryGet = (key) => {
  const hit = IN_MEMORY_CACHE.get(key);
  if (!hit) {
    return null;
  }

  if (hit.expiresAt <= Date.now()) {
    IN_MEMORY_CACHE.delete(key);
    return null;
  }

  return hit.value;
};

const inMemorySet = (key, value, ttlSeconds) => {
  const ttl = parseInteger(ttlSeconds, 300);
  IN_MEMORY_CACHE.set(key, {
    value,
    expiresAt: Date.now() + ttl * 1000,
  });
};

const inMemoryDelete = (key) => {
  IN_MEMORY_CACHE.delete(key);
};

const getRedisClient = async () => {
  if (!CACHE_ENABLED || !REDIS_URL) {
    return null;
  }

  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  if (!redisInitPromise) {
    redisInitPromise = (async () => {
      const client = createClient({ url: REDIS_URL });
      client.on('error', () => {});
      await client.connect();
      redisClient = client;
      return redisClient;
    })().catch(() => {
      redisInitPromise = null;
      return null;
    });
  }

  return redisInitPromise;
};

const getJsonCache = async (key) => {
  try {
    const client = await getRedisClient();
    if (client) {
      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    }
  } catch (_error) {
    // Fallback to in-memory cache.
  }

  return inMemoryGet(key);
};

const setJsonCache = async (key, value, ttlSeconds = 300) => {
  try {
    const client = await getRedisClient();
    const payload = JSON.stringify(value);
    if (client) {
      await client.set(key, payload, { EX: parseInteger(ttlSeconds, 300) });
      return;
    }
  } catch (_error) {
    // Fallback to in-memory cache.
  }

  inMemorySet(key, value, ttlSeconds);
};

const deleteCacheKey = async (key) => {
  try {
    const client = await getRedisClient();
    if (client) {
      await client.del(key);
      return;
    }
  } catch (_error) {
    // Fallback to in-memory cache.
  }

  inMemoryDelete(key);
};

module.exports = {
  getJsonCache,
  setJsonCache,
  deleteCacheKey,
  __cacheTestUtils: {
    inMemoryGet,
    inMemorySet,
    inMemoryDelete,
    IN_MEMORY_CACHE,
  },
};
