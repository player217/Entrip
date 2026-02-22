const path = require('path');
const fs = require('fs');

// Delete the old compiled swagger file if it exists
const swaggerPath = path.join(__dirname, 'dist/swagger.js');
if (fs.existsSync(swaggerPath)) {
  delete require.cache[require.resolve(swaggerPath)];
}

// Compile TypeScript first
const { execSync } = require('child_process');
console.log('Compiling TypeScript...');
execSync('pnpm build', { stdio: 'inherit' });

// Now require the compiled swagger spec
const swaggerSpec = require('./dist/swagger.js').default;

// Write the OpenAPI spec
const outputPath = path.join(__dirname, '../../packages/shared/openapi/openapi.json');
fs.writeFileSync(outputPath, JSON.stringify(swaggerSpec, null, 2));
console.log('OpenAPI JSON generated:', outputPath);