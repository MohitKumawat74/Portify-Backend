const { isAdmin } = require('./roleMiddleware');

const adminOnly = isAdmin;

module.exports = { adminOnly };
