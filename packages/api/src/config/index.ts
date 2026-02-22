import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Define the configuration schema with validation
const configSchema = z.object({
  // Server Configuration
  // Align default internal port with docker-compose.dev.yml (4000)
  port: z.coerce.number().min(1).max(65535).default(4000),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  apiVersion: z.string().default('v2'),

  // Database Configuration
  databaseUrl: z.string().url(),

  // Authentication Configuration
  jwtSecret: z.string().min(32),
  jwtRefreshSecret: z.string().min(32),
  jwtExpiresIn: z.string().default('24h'),

  // CORS Configuration
  clientUrl: z.string().url().default('http://localhost:3000'),

  // Logging Configuration
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  // Rate Limiting Configuration
  rateLimitWindowMs: z.coerce.number().default(900000), // 15 minutes
  rateLimitMaxRequests: z.coerce.number().default(100),
});

// Parse and validate environment variables
const envConfig = {
  port: process.env.PORT,
  nodeEnv: process.env.NODE_ENV,
  apiVersion: process.env.API_VERSION,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN,
  clientUrl: process.env.CLIENT_URL,
  logLevel: process.env.LOG_LEVEL,
  rateLimitWindowMs: process.env.RATE_LIMIT_WINDOW_MS,
  rateLimitMaxRequests: process.env.RATE_LIMIT_MAX_REQUESTS,
};

// Validate configuration
let config: z.infer<typeof configSchema>;

try {
  config = configSchema.parse(envConfig);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Invalid environment configuration:');
    error.errors.forEach((err) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
    process.exit(1);
  }
  throw error;
}

// Export typed configuration
export const appConfig = {
  server: {
    port: config.port,
    nodeEnv: config.nodeEnv,
    apiVersion: config.apiVersion,
    isDevelopment: config.nodeEnv === 'development',
    isProduction: config.nodeEnv === 'production',
    isTest: config.nodeEnv === 'test',
  },
  database: {
    url: config.databaseUrl,
  },
  auth: {
    jwtSecret: config.jwtSecret,
    jwtRefreshSecret: config.jwtRefreshSecret,
    jwtExpiresIn: config.jwtExpiresIn,
  },
  cors: {
    clientUrl: config.clientUrl,
  },
  logging: {
    level: config.logLevel,
  },
  rateLimit: {
    windowMs: config.rateLimitWindowMs,
    maxRequests: config.rateLimitMaxRequests,
  },
} as const;

// Type export for IntelliSense
export type AppConfig = typeof appConfig;

// Validation helper for runtime checks
export function validateConfig(): void {
  try {
    configSchema.parse(envConfig);
    console.log('✅ Configuration validated successfully');
  } catch (error) {
    console.error('❌ Configuration validation failed:', error);
    throw error;
  }
}

// Environment-specific configurations
export const isDevelopment = appConfig.server.isDevelopment;
export const isProduction = appConfig.server.isProduction;
export const isTest = appConfig.server.isTest;

export default appConfig;
