#!/usr/bin/env ts-node

/**
 * 1️⃣ packages/ui/src 로 모든 TSX/TS 파일 이동
 * 2️⃣ 기존 빌드 산출물(index.js 등) 삭제
 * 3️⃣ package.json / tsconfig.json 자동 패치
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { glob } from 'glob';

const UI_ROOT = join(__dirname, 'packages/ui');

// 1. 소스 이동 ---------------------------------------------------------------
(async () => {
  console.log('🚀 Starting UI migration to src structure...\n');

  // Get all TS/TSX files and folders to move
  const files = await new Promise<string[]>((resolve, reject) => {
    glob(['*.ts', '*.tsx', 'compounds/**/*', 'primitives/**/*', 'feedback/**/*', 'hooks/**/*', 'utils.ts', '!index.js', '!dist/**', '!node_modules/**'], 
      { cwd: UI_ROOT }, 
      (err, matches) => {
        if (err) reject(err);
        else resolve(matches);
      }
    );
  });

  await fs.mkdir(join(UI_ROOT, 'src'), { recursive: true });

  // Move all source files to src/
  await Promise.all(
    files.map(async (file) => {
      const from = join(UI_ROOT, file);
      const to = join(UI_ROOT, 'src', file);
      
      try {
        const stat = await fs.stat(from);
        if (stat.isDirectory()) {
          // Create directory and copy contents
          await fs.mkdir(to, { recursive: true });
          const dirFiles = await fs.readdir(from, { withFileTypes: true });
          for (const dirFile of dirFiles) {
            if (dirFile.isFile()) {
              await fs.rename(join(from, dirFile.name), join(to, dirFile.name));
            }
          }
          // Remove empty directory
          try {
            await fs.rmdir(from);
          } catch { /* ignore if not empty */ }
        } else {
          // Create parent directory if needed
          await fs.mkdir(dirname(to), { recursive: true });
          await fs.rename(from, to);
        }
        console.log('moved:', file, '→ src/' + file);
      } catch (err) {
        console.log('skip:', file, '(already moved or not found)');
      }
    })
  );

  // 2. 빌드 산출물 제거 ------------------------------------------------------
  const buildOutputs = ['index.js', 'index.d.ts', 'dist'];
  await Promise.all(
    buildOutputs.map(async (f) => {
      try { 
        await fs.rm(join(UI_ROOT, f), { recursive: true }); 
        console.log('removed:', f);
      }
      catch { /* ignore */ }
    })
  );

  // 3. Create new barrel export file
  const indexContent = `// Primitives
export * from './primitives/Button';
export * from './primitives/Input';
export * from './primitives/Card';
export * from './primitives/Icon';
export * from './primitives/Select';
export * from './primitives/Modal';
export * from './primitives/TextArea';

// Compounds
export * from './compounds/ChartCard';
export * from './compounds/DataGrid';
export * from './compounds/CalendarMonth';
export * from './compounds/CalendarWeek';
export * from './compounds/ExchangeTicker';
export * from './compounds/DualChartCard';
export * from './compounds/CommandBar';
export * from './compounds/Flow';
export * from './compounds/TabContainer';
export * from './compounds/ChromeTabContainer';
export * from './compounds/BookingItem';
export * from './compounds/MonthlySummaryFooter';
export * from './compounds/BookingModal';
export * from './compounds/QuickBookingModal';
export * from './compounds/EditBookingModal';
export * from './compounds/NewTeamModal';

// Feedback
export * from './feedback/Loader';
export * from './feedback/ErrorState';
export * from './feedback/Skeleton';
export * from './feedback/Spinner';

// Hooks
export * from './hooks/useDataGridCore';

// Utils
export * from './utils';
`;

  await fs.writeFile(join(UI_ROOT, 'src', 'index.ts'), indexContent);
  console.log('✔ Created src/index.ts barrel export');

  // 4. package.json 패치 -----------------------------------------------------
  const pkgPath = join(UI_ROOT, 'package.json');
  const pkgRaw = await fs.readFile(pkgPath, 'utf8');
  const pkg = JSON.parse(pkgRaw);

  pkg.main = './dist/index.js';
  pkg.types = './dist/index.d.ts';
  pkg.module = './dist/index.mjs';
  pkg.files = ['dist'];                 // 배포 시 dist 만 포함
  pkg.exports = {
    '.': {
      'import': './dist/index.mjs',
      'require': './dist/index.js',
      'types': './dist/index.d.ts'
    }
  };
  pkg.scripts = {
    ...pkg.scripts,
    "build": "tsup src/index.ts --dts --format esm,cjs --out-dir dist --minify",
    "dev":   "tsup src/index.ts --dts --watch --out-dir dist --onSuccess \"echo '✅ UI package rebuilt'\""
  };

  // Add tsup if not present
  pkg.devDependencies = pkg.devDependencies || {};
  if (!pkg.devDependencies.tsup) {
    pkg.devDependencies.tsup = '^8.0.0';
  }

  await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log('✔ package.json patched');

  // 5. tsconfig.json 패치 ----------------------------------------------------
  const tsconfigPath = join(UI_ROOT, 'tsconfig.json');
  const tsconfigRaw = await fs.readFile(tsconfigPath, 'utf8');
  const tsconfig = JSON.parse(tsconfigRaw);

  tsconfig.compilerOptions = tsconfig.compilerOptions || {};
  tsconfig.compilerOptions.outDir = './dist';
  tsconfig.compilerOptions.rootDir = './src';
  tsconfig.compilerOptions.declaration = true;
  tsconfig.compilerOptions.declarationDir = './dist';
  tsconfig.include = ['src/**/*'];
  tsconfig.exclude = ['node_modules', 'dist', '**/*.test.ts', '**/*.test.tsx'];

  await fs.writeFile(tsconfigPath, JSON.stringify(tsconfig, null, 2) + '\n');
  console.log('✔ tsconfig.json patched');

  console.log('\n🎉 Migration completed!');
  console.log('\nNext steps:');
  console.log('1. cd packages/ui && pnpm install  # Install tsup');
  console.log('2. pnpm build -F @entrip/ui        # First build');
  console.log('3. pnpm dev                        # Start dev servers');
})().catch(console.error);