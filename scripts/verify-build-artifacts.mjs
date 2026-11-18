import { statSync } from 'node:fs';
const required = ['apps/web/.next/BUILD_ID', 'packages/api/dist/index.js', 'packages/ui/dist/index.mjs', 'packages/ui/dist/src/index.d.ts', 'packages/ui/dist/global.css'];
for (const filename of required) if (!statSync(filename).size) throw new Error(`Empty build artifact: ${filename}`);
console.log('Verified web, API, UI JavaScript, declarations and styles.');
