const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { xss } = require('express-xss-sanitizer');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const portfolioRoutes = require('./routes/portfolioRoutes');
const templateRoutes = require('./routes/templateRoutes');
const planRoutes = require('./routes/planRoutes');
const planManagementRoutes = require('./routes/planManagementRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const themeRoutes = require('./routes/themeRoutes');
const contactRoutes = require('./routes/contactRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();
// When running behind proxies (tunnels, load balancers) express should trust
// the proxy to allow correct IP resolution for rate-limiting and other logic.
// Set to `1` to trust the first proxy in front of the app (appropriate for
// many tunnel/dev setups). Adjust as needed for production deployment.
app.set('trust proxy', 1);

// Express 5 exposes req.query as a getter-only property. Mutating nested keys
// is safe, but reassigning req.query is not.
function sanitizeMongoKeys(value) {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeMongoKeys(item));
  }

  if (value && typeof value === 'object') {
    const clean = {};
    for (const [key, nested] of Object.entries(value)) {
      const safeKey = key.replace(/\$/g, '').replace(/\./g, '');
      clean[safeKey] = sanitizeMongoKeys(nested);
    }
    return clean;
  }

  return value;
}

function mongoSanitizeCompat(req, _res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeMongoKeys(req.body);
  }

  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeMongoKeys(req.params);
  }

  if (req.query && typeof req.query === 'object') {
    const sanitizedQuery = sanitizeMongoKeys(req.query);

    for (const key of Object.keys(req.query)) {
      if (!(key in sanitizedQuery)) {
        delete req.query[key];
      }
    }

    for (const [key, value] of Object.entries(sanitizedQuery)) {
      req.query[key] = value;
    }
  }

  next();
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX || 300),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    errorCode: 'RATE_LIMITED',
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_AUTH_MAX || 20),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
    errorCode: 'RATE_LIMITED',
  },
});

app.use(helmet());
app.use(mongoSanitizeCompat);
app.use(xss());
app.use(hpp());
app.use(cookieParser());
app.use('/api', apiLimiter);

// ─── Body Parsers ─────────────────────────────────────────────────────────────
app.use(
  express.json({
    limit: '10mb',
    verify: (req, _res, buffer) => {
      if (req.originalUrl.startsWith('/api/payment/webhook')) {
        req.rawBody = buffer.toString('utf8');
      }
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── CORS ─────────────────────────────────────────────────────────────────────
// CORS configuration: allow frontend origins and support credentials
(() => {
  const CLIENT_URL = process.env.CLIENT_URL || '';
  const configuredOrigins = [
    CLIENT_URL,
    ...(process.env.CORS_ALLOWED_ORIGINS || '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  ];
  const devOrigins = ['http://localhost:3000', 'http://localhost:5173'];
  const corsOptions = {
    origin: (origin, callback) => {
      // Allow non-browser requests like curl or server-to-server (no origin)
      if (!origin) return callback(null, true);
      // In development allow any origin to simplify local testing
      if (process.env.NODE_ENV !== 'production') return callback(null, true);
      if (process.env.CORS_ALLOW_ALL === 'true') return callback(null, true);
      if (configuredOrigins.includes(origin)) return callback(null, true);
      if (devOrigins.includes(origin)) return callback(null, true);
      // Deny explicitly by returning false (no error thrown)
      console.warn(`[CORS] Blocked origin: ${origin}`);
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'x-refresh-token',
      'Cookie',
    ],
    exposedHeaders: ['Authorization', 'x-refresh-token'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  };

  app.use(cors(corsOptions));
  // Handle preflight requests for any path without registering a route
  app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
      return cors(corsOptions)(req, res, next);
    }
    return next();
  });
})();

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is up and running.',
    timestamp: new Date().toISOString(),
  });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/portfolios', portfolioRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/plan', planManagementRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin/analytics', analyticsRoutes);
app.use('/api/admin/themes', themeRoutes);
app.use('/api/contact', contactRoutes);

// ─── Error Handling ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;

