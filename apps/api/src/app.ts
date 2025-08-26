import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './swagger';
import healthRouter from './routes/health';
import sampleBookingRouter from './routes/sampleBooking';
import { bookingRouter } from './modules/booking';
import { errorHandler } from './middleware/errorHandler';
import { metricsMiddleware, metricsHandler } from './middleware/metrics';
import { fallbackCacheMiddleware, errorFallbackHandler } from './middleware/fallback-cache';

// 환경변수 로드
dotenv.config();

const app: express.Application = express();

// 미들웨어
app.use(cors({
  origin: (origin, callback) => {
    // 개발 환경에서는 localhost의 모든 포트 허용
    if (!origin || origin.startsWith('http://localhost:')) {
      callback(null, true);
    } else if (process.env.CORS_ORIGIN) {
      callback(null, process.env.CORS_ORIGIN.split(',').includes(origin));
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(cookieParser()); // For HttpOnly cookie support

// Monitoring 미들웨어
app.use(metricsMiddleware);
app.use(fallbackCacheMiddleware);

// 요청 로깅 미들웨어
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log(`API: ${req.method} ${req.path}`, {
      query: req.query,
      body: req.body
    });
  }
  next();
});

// Swagger UI - DEV ONLY (requires server restart after env change)
if (process.env.NODE_ENV !== 'production') {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log(`API: Swagger UI enabled at http://localhost:${process.env.PORT || 4000}/docs`);
  }
} else {
  // Production mode - Swagger UI disabled
  // Explicitly handle /docs in production to return 404
  app.get('/docs', (req, res) => {
    res.status(404).json({
      code: 404,
      message: 'Swagger UI is disabled in production',
      details: { path: req.path, method: req.method }
    });
  });
}

// OpenAPI JSON endpoint
app.get('/openapi.json', (req, res) => {
  res.json(swaggerSpec);
});

// Health check endpoint (outside API versioning)
app.get('/healthz', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Metrics endpoint for Prometheus
app.get('/metrics', metricsHandler);

// API 라우트
app.use('/api/v1', healthRouter);
app.use('/api/v1', sampleBookingRouter);
app.use('/api/v1/bookings', bookingRouter);
app.use('/api/bookings', require('./routes/booking.route').default);
app.use('/api/auth', require('./routes/auth-simple').default);
app.use('/auth', require('./routes/auth-simple').default);
app.use('/api', require('./routes/export.route').default);
app.use('/api/flight', require('./routes/flight.route').default);
app.use('/api', require('./routes/stats.route').default);
app.use('/api/messages', require('./routes/message.route').default);

// 404 핸들러
app.use((req, res) => {
  res.status(404).json({ 
    code: 404,
    message: '요청한 엔드포인트를 찾을 수 없습니다',
    details: { path: req.path, method: req.method }
  });
});

// 에러 핸들러 (fallback 먼저, 일반 에러 핸들러 나중)
app.use(errorFallbackHandler);
app.use(errorHandler);

export default app;
export { app };