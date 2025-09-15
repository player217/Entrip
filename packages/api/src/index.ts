import express, { Application } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

// Middleware imports
import { errorHandler } from './middlewares/error.middleware';

// WebSocket import
import { initializeWebSocket } from './ws';

// Route imports
import authRoutes from './routes/auth/auth.route';
import bookingRoutes from './routes/bookings/bookings.route';
import calendarRoutes from './routes/calendar/calendar.route';
import accountsRoutes from './routes/accounts/accounts.route';
import financeRoutes from './routes/finance/finance.route';
import approvalsRoutes from './routes/approvals/approvals.route';
import healthRoutes from './routes/health/health.route';
import metricsRoutes from './routes/metrics/metrics.route';

// Swagger
import { setupSwagger } from './docs/swagger';

// Load environment variables
dotenv.config();

// Create Express app
export const app: Application = express();

// Global middlewares
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes with v2 prefix for new API
const apiV2 = express.Router();
app.use('/api/v2', apiV2);

// Mount routes
apiV2.use('/health', healthRoutes);
apiV2.use('/auth', authRoutes);
apiV2.use('/bookings', bookingRoutes);
apiV2.use('/calendar', calendarRoutes);
apiV2.use('/accounts', accountsRoutes);
apiV2.use('/finance', financeRoutes);
apiV2.use('/approvals', approvalsRoutes);
apiV2.use('/metrics', metricsRoutes);
// apiV1.use('/payments', paymentRoutes);
// apiV1.use('/messaging', messagingRoutes);
// apiV1.use('/mail', mailRoutes);
// apiV1.use('/notifications', notificationRoutes);

// Swagger documentation
setupSwagger(app);

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server with WebSocket support
const PORT = 4000; // Hard-coded port to bypass environment variable issues

if (process.env.NODE_ENV !== 'test') {
  const server = createServer(app);

  // Initialize WebSocket
  const io = initializeWebSocket(server);
  app.set('io', io); // Store io instance in app for routes to use

  server.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`🚀 API v2 Server running on http://localhost:${PORT}`);
    // eslint-disable-next-line no-console
    console.log(`📚 API Documentation available at http://localhost:${PORT}/api-docs`);
    // eslint-disable-next-line no-console
    console.log(`🔗 WebSocket available at ws://localhost:${PORT}`);
  });
}