#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Find the latest build log
const logsDir = path.join(__dirname, '../logs');
const logFiles = fs.readdirSync(logsDir).filter(f => f.startsWith('build-'));
const latestLog = logFiles.sort().pop();

if (!latestLog) {
  console.error('No build log found');
  process.exit(1);
}

const logContent = fs.readFileSync(path.join(logsDir, latestLog), 'utf8');

// Parse errors and warnings
const errors = [];
const warnings = [];

const lines = logContent.split('\n');
lines.forEach(line => {
  // Match ESLint errors/warnings
  const match = line.match(/^#\d+\s+(\d+\.\d+\s+)?(.+\.tsx?)\s*$/);
  if (match) {
    const file = match[2];
    const nextLineIndex = lines.indexOf(line) + 1;
    if (nextLineIndex < lines.length) {
      const errorLine = lines[nextLineIndex];
      const errorMatch = errorLine.match(/^#\d+\s+\d+\.\d+\s+(\d+):(\d+)\s+(Error|Warning):\s+(.+)\s+(.+)$/);
      if (errorMatch) {
        const entry = {
          file,
          line: parseInt(errorMatch[1]),
          column: parseInt(errorMatch[2]),
          severity: errorMatch[3],
          message: errorMatch[4],
          rule: errorMatch[5]
        };
        
        if (errorMatch[3] === 'Error') {
          errors.push(entry);
        } else {
          warnings.push(entry);
        }
      }
    }
  }
});

// Also check for ESM import error
if (logContent.includes('Module not found: ESM packages')) {
  warnings.push({
    file: 'next.config.js',
    line: 0,
    column: 0,
    severity: 'Warning',
    message: 'ESM packages (supports-color) need to be imported',
    rule: 'esm-import'
  });
}

const result = {
  errors,
  warnings,
  summary: {
    totalErrors: errors.length,
    totalWarnings: warnings.length,
    blockers: errors.filter(e => e.rule === '@typescript-eslint/no-unused-vars').length
  }
};

// Write to tmp/errors.json
fs.mkdirSync(path.join(__dirname, '../tmp'), { recursive: true });
fs.writeFileSync(
  path.join(__dirname, '../tmp/errors.json'),
  JSON.stringify(result, null, 2)
);

console.log(`Found ${result.summary.totalErrors} errors and ${result.summary.totalWarnings} warnings`);
console.log('Written to tmp/errors.json');