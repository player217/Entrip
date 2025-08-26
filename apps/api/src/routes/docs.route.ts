import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import fs from 'fs';

const router = Router();

/**
 * Documentation route for serving OpenAPI specification
 * Serves the generated OpenAPI JSON via Swagger UI
 */

const getOpenAPISpec = () => {
  try {
    const openApiPath = path.join(process.cwd(), 'openapi', 'openapi.json');
    
    // Check if file exists
    if (!fs.existsSync(openApiPath)) {
      // Generate OpenAPI spec on the fly if it doesn't exist
      const { execSync } = require('child_process');
      execSync('npm run openapi:gen', { cwd: process.cwd() });
    }
    
    const openApiSpec = JSON.parse(fs.readFileSync(openApiPath, 'utf8'));
    return openApiSpec;
  } catch (error) {
    console.error('Failed to load OpenAPI specification:', error);
    // Return minimal spec as fallback
    return {
      openapi: '3.0.3',
      info: {
        title: 'Entrip API',
        version: '2.0.0',
        description: 'API documentation is currently being generated...'
      },
      paths: {}
    };
  }
};

// Swagger UI configuration
const swaggerOptions = {
  explorer: true,
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    tryItOutEnabled: true,
    filter: true,
    docExpansion: 'list',
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 2,
  },
  customCss: `
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info .title { color: #3b4151; }
    .swagger-ui .scheme-container { background: #fafafa; padding: 15px; }
  `,
  customSiteTitle: 'Entrip API Documentation'
};

// Serve OpenAPI JSON
router.get('/openapi.json', (req, res) => {
  try {
    const spec = getOpenAPISpec();
    res.json(spec);
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'OPENAPI_GENERATION_ERROR',
        message: 'Failed to generate OpenAPI specification',
        details: null,
        traceId: req.headers['x-trace-id'] || null
      }
    });
  }
});

// Health check for documentation service
router.get('/health', (req, res) => {
  res.json({
    data: {
      service: 'documentation',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '2.0.0'
    }
  });
});

// Serve Swagger UI documentation
router.use('/docs', swaggerUi.serve, swaggerUi.setup(getOpenAPISpec(), swaggerOptions));

// Redirect root to docs
router.get('/', (req, res) => {
  res.redirect('/api/docs/docs');
});

export default router;