require('dotenv').config();

const connectDB = require('../config/db');
const Portfolio = require('../models/Portfolio');
const User = require('../models/User');

const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9_-]{1,30}[a-z0-9])?$/;

const normalizeUsername = (value) => {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '');
};

const toSafeBaseUsername = (input, fallbackToken) => {
  let candidate = normalizeUsername(input);
  if (!candidate || !USERNAME_PATTERN.test(candidate)) {
    candidate = normalizeUsername(`user-${fallbackToken}`);
  }

  if (!USERNAME_PATTERN.test(candidate)) {
    candidate = `user${String(fallbackToken).replace(/[^a-z0-9]/g, '').slice(-6)}`;
  }

  return candidate.slice(0, 32);
};

const ensureUniqueUsername = (base, usedSet) => {
  if (!usedSet.has(base)) {
    usedSet.add(base);
    return base;
  }

  let suffix = 2;
  while (suffix < 100000) {
    const suffixToken = `-${suffix}`;
    const trimmedBase = base.slice(0, Math.max(1, 32 - suffixToken.length));
    const candidate = `${trimmedBase}${suffixToken}`;
    if (!usedSet.has(candidate)) {
      usedSet.add(candidate);
      return candidate;
    }
    suffix += 1;
  }

  throw new Error('Unable to generate unique username during migration.');
};

const run = async () => {
  await connectDB();

  const portfolios = await Portfolio.find({})
    .select('_id userId username createdAt')
    .sort({ createdAt: 1, _id: 1 })
    .lean();

  const userIds = [...new Set(portfolios.map((p) => String(p.userId || '')).filter(Boolean))];
  const users = await User.find({ _id: { $in: userIds } })
    .select('_id name email')
    .lean();

  const userById = new Map(users.map((user) => [String(user._id), user]));

  const usedUsernames = new Set();
  const operations = [];

  for (const portfolio of portfolios) {
    const owner = userById.get(String(portfolio.userId || '')) || {};
    const fallbackToken = String(portfolio._id).slice(-6);

    const base = toSafeBaseUsername(
      portfolio.username || owner.name || (owner.email ? owner.email.split('@')[0] : ''),
      fallbackToken
    );

    const uniqueUsername = ensureUniqueUsername(base, usedUsernames);

    if (portfolio.username !== uniqueUsername) {
      operations.push({
        updateOne: {
          filter: { _id: portfolio._id },
          update: { $set: { username: uniqueUsername } },
        },
      });
    }
  }

  if (!operations.length) {
    console.log('Migration complete. No username updates were required.');
    process.exit(0);
  }

  const result = await Portfolio.bulkWrite(operations, { ordered: false });
  console.log(
    `Migration complete. Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}, Updated docs: ${operations.length}`
  );
  process.exit(0);
};

run().catch((error) => {
  console.error('Portfolio username migration failed:', error);
  process.exit(1);
});
