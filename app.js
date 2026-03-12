const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const portfolioRoutes = require('./routes/portfolioRoutes');
const templateRoutes = require('./routes/templateRoutes');
const planRoutes = require('./routes/planRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const themeRoutes = require('./routes/themeRoutes');
const contactRoutes = require('./routes/contactRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

// ─── Body Parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── CORS ─────────────────────────────────────────────────────────────────────
// CORS configuration: allow frontend origins and support credentials
(() => {
  const CLIENT_URL = process.env.CLIENT_URL || '';
  const devOrigins = ['http://localhost:3000', 'http://localhost:5173'];
  const corsOptions = {
    origin: (origin, callback) => {
      // Allow non-browser requests like curl or server-to-server (no origin)
      if (!origin) return callback(null, true);
      // In development allow any origin to simplify local testing
      if (process.env.NODE_ENV !== 'production') return callback(null, true);
      if (process.env.CORS_ALLOW_ALL === 'true') return callback(null, true);
      if (CLIENT_URL && origin === CLIENT_URL) return callback(null, true);
      if (devOrigins.includes(origin)) return callback(null, true);
      // Deny explicitly by returning false (no error thrown)
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
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/portfolios', portfolioRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/admin/analytics', analyticsRoutes);
app.use('/api/admin/themes', themeRoutes);
app.use('/api/contact', contactRoutes);

// ─── Error Handling ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;

