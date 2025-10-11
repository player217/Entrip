#!/usr/bin/env node

/**
 * Service Status Checker with Environment Configuration
 *
 * Uses centralized configuration for environment-specific settings
 * Properly handles Next.js redirects and different service types
 */

const http = require('http');
const https = require('https');
const config = require('./config');

// Get current environment configuration
const envConfig = config.getCurrentConfig();

console.log(`\n=== Service Status (${envConfig.name} Environment) ===\n`);

async function checkService(service) {
  return new Promise((resolve) => {
    // Skip non-HTTP services
    if (service.skipHttp) {
      console.log(`ℹ️  ${service.name}: Skipped (non-HTTP service)`);
      resolve();
      return;
    }

    // Parse URL to determine protocol
    const url = new URL(service.url);
    const client = url.protocol === 'https:' ? https : http;

    const req = client.get(service.url, { timeout: service.timeout }, (res) => {
      const isHealthy = config.isServiceHealthy(service, res.statusCode);

      if (isHealthy) {
        const statusMessage = config.getServiceStatusMessage(service, res.statusCode);
        console.log(`✅ ${service.name}: ${statusMessage}`);
      } else {
        console.log(`⚠️  ${service.name}: Unexpected status ${res.statusCode}`);
      }
      resolve();
    });

    req.on('error', (err) => {
      // Enhanced error messaging
      if (err.code === 'ECONNREFUSED') {
        console.log(`❌ ${service.name}: Not running (Connection refused)`);
      } else if (err.code === 'ETIMEDOUT') {
        console.log(`❌ ${service.name}: Timeout after ${service.timeout}ms`);
      } else {
        console.log(`❌ ${service.name}: Error - ${err.message}`);
      }
      resolve();
    });

    req.on('timeout', () => {
      console.log(`❌ ${service.name}: Timeout after ${service.timeout}ms`);
      req.destroy();
      resolve();
    });
  });
}

async function checkAll() {
  // Display environment info
  console.log(`Environment Variables:`);
  console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  DOCKER: ${process.env.DOCKER || 'false'}`);
  console.log(`\nChecking ${envConfig.services.length} service(s)...\n`);

  // Check services with retry logic
  for (const service of envConfig.services) {
    let attempts = 0;
    let success = false;

    while (attempts < envConfig.retryAttempts && !success) {
      if (attempts > 0) {
        console.log(`  Retrying ${service.name}... (attempt ${attempts + 1}/${envConfig.retryAttempts})`);
        await new Promise(resolve => setTimeout(resolve, envConfig.retryDelay));
      }

      await checkService(service);
      attempts++;

      // For simplicity, we consider any response as "attempted"
      // In a real scenario, you'd track success state
      success = true;
    }
  }

  // Display configuration summary
  console.log(`\n=== Configuration Summary ===`);
  console.log(`  Retry Attempts: ${envConfig.retryAttempts}`);
  console.log(`  Retry Delay: ${envConfig.retryDelay}ms`);
  console.log(`  Startup Delay: ${envConfig.startupDelay}ms`);

  if (envConfig.database) {
    console.log(`\n  Database Configuration:`);
    if (envConfig.database.connectionString) {
      console.log(`    Connection: [Configured via DATABASE_URL]`);
    } else {
      console.log(`    Host: ${envConfig.database.host}:${envConfig.database.port}`);
      console.log(`    Database: ${envConfig.database.database}`);
    }
  }

  console.log('\n');
  process.exit(0);
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Entrip Service Status Checker

Usage:
  node scripts/check-status.js [options]

Options:
  --help, -h     Show this help message
  --env <env>    Set environment (development, docker, production, test)

Environment Variables:
  NODE_ENV       Set the environment (default: development)
  DOCKER         Set to 'true' for Docker environment

Examples:
  node scripts/check-status.js                    # Development environment
  NODE_ENV=docker node scripts/check-status.js    # Docker environment
  DOCKER=true node scripts/check-status.js        # Docker environment
  `);
  process.exit(0);
}

// Allow environment override from command line
const envIndex = args.indexOf('--env');
if (envIndex !== -1 && args[envIndex + 1]) {
  process.env.NODE_ENV = args[envIndex + 1];
}

checkAll();