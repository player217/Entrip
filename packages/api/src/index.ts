import express, { Application } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';

// Configuration
import { appConfig, validateConfig } from './config';

// Logging
import { logger } from './lib/logger';

// Middleware imports
import { errorHandler } from './middlewares/error.middleware';
import { loggingMiddleware, errorLoggingMiddleware } from './middlewares/logging.middleware';
import { apiRateLimit } from './middlewares/rateLimit.middleware';
import { requestId } from './middlewares/requestId.middleware';
import { ipValidation } from './middlewares/ipValidation.middleware';

// WebSocket import
import { initializeWebSocket } from './ws';

// Route imports
import authRoutes from './routes/auth/auth.route';
import usersRoutes from './routes/users/users.route';
import bookingRoutes from './routes/bookings/bookings.route';
import calendarRoutes from './routes/calendar/calendar.route';
import accountsRoutes from './routes/accounts/accounts.route';
import financeRoutes from './routes/finance/finance.route';
import approvalsRoutes from './routes/approvals/approvals.route';
import healthRoutes from './routes/health/health.route';
import metricsRoutes from './routes/metrics/metrics.route';
import notificationsRoutes from './routes/notifications/notifications.route';
import teamBookingsRoutes from './routes/team-bookings/team-bookings.route';

// Swagger
import { setupSwagger } from './docs/swagger';

// Validate configuration on startup
validateConfig();

// Create Express app
export const app: Application = express();

// Global middlewares
app.use(loggingMiddleware);
app.use(requestId);
app.use(ipValidation);

// Enhanced Helmet security configuration - All TypeScript errors resolved
app.use(helmet({
  // Content Security Policy - Prevents XSS attacks
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      blockAllMixedContent: [],
      fontSrc: ["'self'", "https:", "data:"],
      frameAncestors: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      objectSrc: ["'none'"],
      scriptSrc: appConfig.server.isProduction
        ? ["'self'"]
        : ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Development only
      scriptSrcAttr: ["'none'"],
      styleSrc: ["'self'", "https:", "'unsafe-inline'"],
      upgradeInsecureRequests: appConfig.server.isProduction ? [] : null,
    },
  },

  // Cross-Origin Embedder Policy - Enables SharedArrayBuffer and high-resolution timers
  crossOriginEmbedderPolicy: appConfig.server.isProduction
    ? { policy: "require-corp" }
    : false,

  // Cross-Origin Opener Policy - Prevents certain cross-origin attacks
  crossOriginOpenerPolicy: { policy: "same-origin" },

  // Cross-Origin Resource Policy - Prevents certain cross-origin attacks
  crossOriginResourcePolicy: { policy: "cross-origin" },

  // DNS Prefetch Control - Controls DNS prefetching
  dnsPrefetchControl: { allow: false },

  // Referrer Policy - Controls referrer header
  referrerPolicy: { policy: ["no-referrer", "strict-origin-when-cross-origin"] },

  // HTTP Strict Transport Security - Forces HTTPS
  hsts: appConfig.server.isProduction
    ? {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
      }
    : false,

  // IE No Open - Sets X-Download-Options for IE8+
  ieNoOpen: true,

  // No Sniff - Prevents MIME sniffing
  noSniff: true,

  // Origin Agent Cluster - Enables origin-keyed agent clustering
  originAgentCluster: true,

  // Permissions Policy - Controls browser features
  permittedCrossDomainPolicies: false,

  // X-Frame-Options - Prevents clickjacking
  frameguard: { action: 'deny' },

  // Hide X-Powered-By header
  hidePoweredBy: true,

  // Additional production-only security enhancements
  ...(appConfig.server.isProduction && {
    contentSecurityPolicyReportOnly: false,
    // HSTS settings already configured above, no need to duplicate
  })
}));
// Enhanced CORS Configuration with Security Validation
const getAllowedOrigins = (): string[] => {
  const origins = [appConfig.cors.clientUrl];

  // Add environment-specific origins
  if (appConfig.server.isDevelopment) {
    origins.push('http://localhost:3000', 'http://127.0.0.1:3000');
  } else if (appConfig.server.isProduction) {
    // Add production domains here
    // origins.push('https://your-production-domain.com');
  }

  return origins;
};

app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();

    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin && appConfig.server.isDevelopment) {
      return callback(null, true);
    }

    // Check if origin is allowed
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked request from unauthorized origin', {
        origin,
        allowedOrigins,
        userAgent: 'Unknown',
        timestamp: new Date().toISOString(),
      });
      callback(new Error('Not allowed by CORS policy'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With', 'If-Match', 'X-Request-ID'],
  exposedHeaders: ['ETag', 'X-Request-ID'],
  // Security headers
  optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  maxAge: appConfig.server.isProduction ? 86400 : 3600, // Cache preflight for 24h (prod) or 1h (dev)
  preflightContinue: false, // Pass control to next handler
}));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes with v2 prefix for new API
const apiV2 = express.Router();

// Apply rate limiting to all API routes
apiV2.use(apiRateLimit);

app.use('/api/v2', apiV2);

// Mount routes
apiV2.use('/health', healthRoutes);
apiV2.use('/auth', authRoutes);
apiV2.use('/users', usersRoutes);
apiV2.use('/bookings', bookingRoutes);
apiV2.use('/calendar', calendarRoutes);
apiV2.use('/accounts', accountsRoutes);
apiV2.use('/finance', financeRoutes);
apiV2.use('/approvals', approvalsRoutes);
apiV2.use('/metrics', metricsRoutes);
apiV2.use('/notifications', notificationsRoutes);
apiV2.use('/team-bookings', teamBookingsRoutes);
// apiV1.use('/payments', paymentRoutes);
// apiV1.use('/messaging', messagingRoutes);
// apiV1.use('/mail', mailRoutes);

// Swagger documentation
setupSwagger(app);

// Error handling middleware (must be last)
app.use(errorLoggingMiddleware);
app.use(errorHandler);

// Start server with WebSocket support
const PORT = appConfig.server.port;

if (!appConfig.server.isTest) {
  const server = createServer(app);

  // Initialize WebSocket
  const io = initializeWebSocket(server);
  app.set('io', io); // Store io instance in app for routes to use

  server.listen(PORT, () => {
    logger.info('🚀 API v2 Server started successfully', {
      port: PORT,
      environment: appConfig.server.nodeEnv,
      apiVersion: appConfig.server.apiVersion,
      docsUrl: `http://localhost:${PORT}/api-docs`,
      wsUrl: `ws://localhost:${PORT}`,
    });
  });
}
