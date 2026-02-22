/**
 * Environment Configuration for Entrip Development
 *
 * This configuration provides environment-specific settings for development and Docker environments.
 * It enables proper service detection and retry strategies based on the runtime environment.
 */

const path = require('path');

// Detect environment
const isDocker = process.env.DOCKER === 'true' || process.env.NODE_ENV === 'docker';
const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
const isProduction = process.env.NODE_ENV === 'production';

// Service configurations by environment
const config = {
  development: {
    name: 'Development',
    services: [
      {
        name: 'Web App',
        url: 'http://localhost:3000',
        timeout: 2000,
        type: 'nextjs',
        expectedStatuses: [200, 307, 302, 301] // Next.js redirects are normal
      },
      {
        name: 'API v1',
        url: 'http://localhost:4001/api/health',
        timeout: 2000,
        type: 'api',
        expectedStatuses: [200, 204]
      },
      {
        name: 'API v2',
        url: 'http://localhost:4002/api/v2/health',
        timeout: 2000,
        type: 'api',
        expectedStatuses: [200, 204]
      }
    ],
    retryAttempts: 3,
    retryDelay: 1000,
    startupDelay: 5000, // How long to wait after starting services
    database: {
      host: 'localhost',
      port: 5432,
      database: 'entrip',
      user: 'entrip',
      password: 'entrip'
    },
    prisma: {
      databaseUrl: 'postgresql://entrip:entrip@localhost:5432/entrip',
      binaryTargets: ['native', 'windows']
    }
  },

  docker: {
    name: 'Docker',
    services: [
      {
        name: 'Web App',
        url: 'http://web:3000',
        timeout: 5000,
        type: 'nextjs',
        expectedStatuses: [200, 307, 302, 301]
      },
      {
        name: 'API v1',
        url: 'http://api:4000/api/health',
        timeout: 5000,
        type: 'api',
        expectedStatuses: [200, 204]
      },
      {
        name: 'API v2',
        url: 'http://api-v2:4002/api/v2/health',
        timeout: 5000,
        type: 'api',
        expectedStatuses: [200, 204]
      },
      {
        name: 'Database',
        url: 'postgres://postgres:5432',
        timeout: 5000,
        type: 'database',
        skipHttp: true
      }
    ],
    retryAttempts: 5,
    retryDelay: 2000,
    startupDelay: 10000, // Docker containers need more time
    database: {
      host: 'postgres',
      port: 5432,
      database: 'entrip',
      user: 'postgres',
      password: 'postgres'
    },
    prisma: {
      databaseUrl: 'postgresql://postgres:postgres@postgres:5432/entrip',
      binaryTargets: ['native', 'linux-musl', 'debian-openssl-1.1.x']
    }
  },

  production: {
    name: 'Production',
    services: [
      {
        name: 'Web App',
        url: process.env.WEB_URL || 'https://entrip.io',
        timeout: 10000,
        type: 'nextjs',
        expectedStatuses: [200, 307, 302, 301]
      },
      {
        name: 'API',
        url: process.env.API_URL || 'https://api.entrip.io/health',
        timeout: 10000,
        type: 'api',
        expectedStatuses: [200, 204]
      }
    ],
    retryAttempts: 3,
    retryDelay: 3000,
    startupDelay: 0, // Already running in production
    database: {
      connectionString: process.env.DATABASE_URL
    },
    prisma: {
      databaseUrl: process.env.DATABASE_URL,
      binaryTargets: ['native']
    }
  },

  test: {
    name: 'Test',
    services: [],
    retryAttempts: 1,
    retryDelay: 100,
    startupDelay: 0,
    database: {
      host: 'localhost',
      port: 5433, // Different port for test DB
      database: 'entrip_test',
      user: 'entrip',
      password: 'entrip'
    },
    prisma: {
      databaseUrl: 'postgresql://entrip:entrip@localhost:5433/entrip_test',
      binaryTargets: ['native']
    }
  }
};

// Get current environment configuration
function getCurrentConfig() {
  if (isDocker) return config.docker;
  if (isProduction) return config.production;
  if (process.env.NODE_ENV === 'test') return config.test;
  return config.development;
}

// Check if a service is healthy based on its type
function isServiceHealthy(service, statusCode) {
  if (!service.expectedStatuses) {
    // Default expected statuses by type
    switch (service.type) {
      case 'nextjs':
        return [200, 307, 302, 301].includes(statusCode);
      case 'api':
        return [200, 204].includes(statusCode);
      case 'database':
        return statusCode === 0; // Special case for DB
      default:
        return statusCode === 200;
    }
  }
  return service.expectedStatuses.includes(statusCode);
}

// Get service status message
function getServiceStatusMessage(service, statusCode) {
  if (service.type === 'nextjs' && statusCode === 307) {
    return 'Running (Auth redirect active)';
  }
  if (service.type === 'nextjs' && (statusCode === 302 || statusCode === 301)) {
    return 'Running (Redirecting)';
  }
  if (statusCode === 204) {
    return 'Running (No content)';
  }
  if (statusCode === 200) {
    return 'Running';
  }
  return `Unexpected status ${statusCode}`;
}

// Generate environment variables for services
function getEnvironmentVariables(env = 'development') {
  const cfg = config[env] || config.development;

  return {
    NODE_ENV: env,
    DATABASE_URL: cfg.prisma.databaseUrl,
    NEXT_PUBLIC_API_URL: env === 'docker' ? 'http://api:4000' : 'http://localhost:4001',
    INTERNAL_API_URL: env === 'docker' ? 'http://api:4000' : 'http://localhost:4001',
    NEXT_PUBLIC_API_V2_URL: env === 'docker' ? 'http://api-v2:4002' : 'http://localhost:4002',
    INTERNAL_API_V2_URL: env === 'docker' ? 'http://api-v2:4002' : 'http://localhost:4002',
    NEXT_PUBLIC_WS_URL: env === 'docker' ? 'ws://api:4000' : 'ws://localhost:4001',
    WS_URL: env === 'docker' ? 'ws://api:4000' : 'ws://localhost:4001'
  };
}

// Get command for starting a service
function getStartCommand(service, env = 'development') {
  const commands = {
    web: 'pnpm dev',
    'api-v1': 'pnpm dev',
    'api-v2': 'pnpm dev',
    storybook: 'pnpm storybook'
  };

  return commands[service] || 'pnpm dev';
}

// Get service directory path
function getServicePath(service, projectRoot) {
  const paths = {
    web: path.join(projectRoot, 'apps', 'web'),
    'api-v1': path.join(projectRoot, 'apps', 'api'),
    'api-v2': path.join(projectRoot, 'packages', 'api'),
    storybook: projectRoot
  };

  return paths[service] || projectRoot;
}

module.exports = {
  config,
  getCurrentConfig,
  isServiceHealthy,
  getServiceStatusMessage,
  getEnvironmentVariables,
  getStartCommand,
  getServicePath,

  // Export environment detection
  isDocker,
  isDevelopment,
  isProduction
};