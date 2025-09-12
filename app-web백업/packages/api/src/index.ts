import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

// Middleware imports
import { errorHandler } from './middlewares/error.middleware';

// Route imports
import authRoutes from './routes/auth/auth.route';
import bookingRoutes from './routes/bookings/bookings.route';
import calendarRoutes from './routes/calendar/calendar.route';
import accountsRoutes from './routes/accounts/accounts.route';
import financeRoutes from './routes/finance/finance.route';
import approvalsRoutes from './routes/approvals/approvals.route';
import healthRoutes from './routes/health/health.route';

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

// API Routes
const apiV1 = express.Router();
app.use('/api/v1', apiV1);

// Mount routes
apiV1.use('/health', healthRoutes);
apiV1.use('/auth', authRoutes);
apiV1.use('/bookings', bookingRoutes);
apiV1.use('/calendar', calendarRoutes);
apiV1.use('/accounts', accountsRoutes);
apiV1.use('/finance', financeRoutes);
apiV1.use('/approvals', approvalsRoutes);
// apiV1.use('/payments', paymentRoutes);
// apiV1.use('/messaging', messagingRoutes);
// apiV1.use('/mail', mailRoutes);
// apiV1.use('/notifications', notificationRoutes);

// Swagger documentation
setupSwagger(app);

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3001;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`🚀 API Server running on http://localhost:${PORT}`);
    // eslint-disable-next-line no-console
    console.log(`📚 API Documentation available at http://localhost:${PORT}/api-docs`);
  });
}