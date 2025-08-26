import swaggerSpec from './src/swagger';
import * as fs from 'fs';
import * as path from 'path';

// Generate the OpenAPI JSON file
const outputPath = path.resolve(__dirname, '../../packages/shared/openapi/openapi.json');

// Ensure directory exists
const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Write the spec
fs.writeFileSync(outputPath, JSON.stringify(swaggerSpec, null, 2));
// eslint-disable-next-line no-console
console.log('OpenAPI JSON generated:', outputPath);