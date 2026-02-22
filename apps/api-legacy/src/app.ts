import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './swagger';
import healthRouter from './routes/health';
// import sampleBookingRouter from './routes/sampleBooking';  // Removed - conflicts with modules/booking
import { bookingRouter } from './modules/booking';
import docsRouter from './routes/docs.route';
import { requestId } from './middleware/request-id';
import { errorHandler } from './middleware/errorHandler';
import { metricsMiddleware, metricsHandler } from './middleware/metrics';
import { fallbackCacheMiddleware, errorFallbackHandler } from './middleware/fallback-cache';
import { outboxDispatcher } from './lib/outbox-dispatcher';
import { timeoutDebugger, requestLogger } from './middleware/debug.middleware';
import { getMonitoringScheduler } from './services/monitoring-scheduler.service';
// D2.2: Import security middleware
import { 
  securityHeaders, 
  rateLimiter, 
  authRateLimiter, 
  requestSizeLimit, 
  ipValidation, 
  securityResponseHeaders 
} from './middleware/security.middleware';

// 환경변수 로드
dotenv.config();

const app: express.Application = express();

// Outbox dispatcher 시작 (조건부 활성화)
if (process.env.NODE_ENV !== 'test') {
  // Outbox 테이블 준비 상태 확인 후 활성화
  import('./utils/check-outbox-ready').then(({ checkOutboxReady }) => {
    checkOutboxReady().then(ready => {
      if (ready) {
        outboxDispatcher.start();
        console.log('✅ Outbox dispatcher started for reliable message delivery');
        
        // Graceful shutdown 처리
        process.on('SIGTERM', () => {
          console.log('🛑 SIGTERM received, stopping outbox dispatcher...');
          outboxDispatcher.stop();
        });
        
        process.on('SIGINT', () => {
          console.log('🛑 SIGINT received, stopping outbox dispatcher...');
          outboxDispatcher.stop();
        });
      } else {
        console.warn('⚠️ Outbox dispatcher disabled - table not ready');
      }
    });
  }).catch(err => {
    console.error('❌ Failed to check outbox readiness:', err);
  });
}

// Schema Monitoring 시작 (지연 시작으로 초기화 타이밍 문제 해결)
if (process.env.NODE_ENV !== 'test') {
  setTimeout(() => {
    const monitoring = getMonitoringScheduler();
    monitoring.start();
    console.log('✅ Schema monitoring started (delayed initialization)');
    
    // Graceful shutdown 처리
    process.on('SIGTERM', () => {
      console.log('🛑 SIGTERM received, stopping schema monitoring...');
      monitoring.stop();
    });
    
    process.on('SIGINT', () => {
      console.log('🛑 SIGINT received, stopping schema monitoring...');
      monitoring.stop();
    });
  }, 5000); // 5초 지연 시작
}

// Trust proxy 설정 (Docker 환경)
app.set('trust proxy', true);

// D2.2: Security middleware - applied first for maximum protection
app.use(securityHeaders);
app.use(ipValidation);
app.use(requestSizeLimit);
app.use(rateLimiter);
app.use(securityResponseHeaders);

// Request ID를 가장 먼저 적용 (모든 요청 추적)
app.use(requestId());

// 타임아웃 디버거 추가 (느린 요청 감지)
app.use(timeoutDebugger);

// 요청 로거 (DEBUG_REQUESTS=true일 때만 활성화)
if (process.env.DEBUG_REQUESTS === 'true') {
  app.use(requestLogger);
}

// D2.2: Enhanced CORS Configuration with Security Hardening
app.use(cors({
  origin: (origin, callback) => {
    // D2.2: Secure origin validation with environment-specific policies
    console.log(`[D2.2] CORS origin check: ${origin}`);
    
    // Allow same-origin requests (no origin header)
    if (!origin) {
      callback(null, true);
      return;
    }
    
    // Production environment - strict whitelist
    if (process.env.NODE_ENV === 'production') {
      const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [];
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`[D2.2] CORS blocked origin in production: ${origin}`);
        callback(new Error('Not allowed by CORS policy'));
      }
      return;
    }
    
    // Development environment - controlled localhost access
    const localhostPattern = /^http:\/\/localhost:(3000|3001|4001)$/;
    const dockerPattern = /^http:\/\/(web|api):(3000|4000)$/;
    
    if (localhostPattern.test(origin) || dockerPattern.test(origin)) {
      callback(null, true);
    } else if (process.env.CORS_ORIGIN && process.env.CORS_ORIGIN.split(',').includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[D2.2] CORS blocked unauthorized origin: ${origin}`);
      callback(new Error('Not allowed by CORS policy'));
    }
  },
  credentials: true,
  // D2.2: Additional CORS security options
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With', 
    'Content-Type', 
    'Accept',
    'Authorization',
    'X-Request-ID',
    'X-API-Version'
  ],
  exposedHeaders: ['X-Request-ID', 'X-API-Version'],
  maxAge: 86400, // 24 hours preflight cache
  preflightContinue: false,
  optionsSuccessStatus: 204
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

// Documentation routes (schema-based OpenAPI)
app.use('/api/docs', docsRouter);

// Backward compatibility alias for OpenAPI JSON
app.get('/api/openapi.json', (_req, res) => {
  try {
    const specPath = path.join(process.cwd(), 'openapi', 'openapi.json');
    const spec = fs.readFileSync(specPath, 'utf-8');
    res.type('application/json').send(spec);
  } catch (error) {
    console.error('Failed to load OpenAPI spec for alias:', error);
    res.status(500).json({
      error: {
        code: 'OPENAPI_LOAD_ERROR',
        message: 'Failed to load OpenAPI specification',
        details: null,
        traceId: null
      }
    });
  }
});

// API 라우트
app.use('/api/v1', healthRouter);
app.use('/api/v1/bookings', bookingRouter);  // 메인 예약 라우트 - 인증 및 회사 필터링 적용
// app.use('/api/v1', sampleBookingRouter);      // 샘플 라우트 비활성화 - bookingRouter와 충돌
// booking-2a.route는 이미 v1으로 통합됨 - 제거
app.use('/api/auth', require('./routes/auth-simple').default);
app.use('/auth', require('./routes/auth-simple').default);
app.use('/api', require('./routes/export.route').default);
app.use('/api/flight', require('./routes/flight.route').default);
app.use('/api', require('./routes/stats.route').default);
app.use('/api/messages', require('./routes/message.route').default);

// Data integrity and health monitoring routes
app.use('/api/data', require('./routes/data-health.route').default);

// Schema health monitoring routes
app.use('/api/schema', require('./routes/schema-health.route').default);

// Monitoring dashboard
app.use('/api/monitoring', require('./routes/monitoring-dashboard.route').default);

// Integration resilience routes
app.use('/api/integration', require('./routes/integration-example').default);
app.use('/api/health', require('./routes/health.route').default);
// Demo-only endpoints (dev flag)
if (process.env.ENABLE_DEMO_ENDPOINTS === 'true' || process.env.NODE_ENV !== 'production') {
  app.use('/api', require('./routes/demo.route').default);
  console.log('🧪 Demo endpoints enabled: /api/demo-accounts');
}

// Test routes - controlled by environment variable
if (process.env.ENABLE_TEST_ROUTES === 'true') {
  app.use('/api/test-respond', require('./routes/test-respond.route').default);
  app.use('/api/test-db', require('./routes/test-database.route').default);
  app.use('/api/test-outbox', require('./routes/test-outbox.route').default);
  
  console.log('⚠️  Test routes enabled (ENABLE_TEST_ROUTES=true):', [
    '/api/test-respond',
    '/api/test-db',
    '/api/test-outbox'
  ]);
}

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
