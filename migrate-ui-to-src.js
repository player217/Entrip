/**
 * 1️⃣ packages/ui/src 로 모든 TSX/TS 파일 이동
 * 2️⃣ 기존 빌드 산출물(index.js 등) 삭제
 * 3️⃣ package.json / tsconfig.json 자동 패치
 */

const fs = require('fs').promises;
const path = require('path');

const UI_ROOT = path.join(__dirname, 'packages/ui');

// 1. 소스 이동 ---------------------------------------------------------------
(async () => {
  console.log('🚀 Starting UI migration to src structure...\n');

  // Create src directory
  await fs.mkdir(path.join(UI_ROOT, 'src'), { recursive: true });

  // Get all folders to move
  const foldersToMove = ['compounds', 'primitives', 'feedback', 'hooks'];
  
  for (const folder of foldersToMove) {
    const fromPath = path.join(UI_ROOT, folder);
    const toPath = path.join(UI_ROOT, 'src', folder);
    
    try {
      const stat = await fs.stat(fromPath);
      if (stat.isDirectory()) {
        await fs.mkdir(toPath, { recursive: true });
        
        // Copy all files in the directory
        const files = await fs.readdir(fromPath, { withFileTypes: true });
        
        async function copyRecursive(srcDir, destDir) {
          const items = await fs.readdir(srcDir, { withFileTypes: true });
          for (const item of items) {
            const srcPath = path.join(srcDir, item.name);
            const destPath = path.join(destDir, item.name);
            
            if (item.isDirectory()) {
              await fs.mkdir(destPath, { recursive: true });
              await copyRecursive(srcPath, destPath);
            } else {
              await fs.copyFile(srcPath, destPath);
            }
          }
        }
        
        await copyRecursive(fromPath, toPath);
        await fs.rm(fromPath, { recursive: true });
        console.log('moved:', folder, '→ src/' + folder);
      }
    } catch (err) {
      console.log('skip:', folder, '(not found or already moved)');
    }
  }

  // Move individual files
  const filesToMove = ['utils.ts', 'index.ts'];
  for (const file of filesToMove) {
    try {
      const from = path.join(UI_ROOT, file);
      const to = path.join(UI_ROOT, 'src', file);
      await fs.copyFile(from, to);
      await fs.unlink(from);
      console.log('moved:', file, '→ src/' + file);
    } catch (err) {
      console.log('skip:', file, '(not found)');
    }
  }

  // 2. 빌드 산출물 제거 ------------------------------------------------------
  const buildOutputs = ['index.js', 'index.d.ts', 'dist'];
  await Promise.all(
    buildOutputs.map(async (f) => {
      try { 
        await fs.rm(path.join(UI_ROOT, f), { recursive: true }); 
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

  await fs.writeFile(path.join(UI_ROOT, 'src', 'index.ts'), indexContent);
  console.log('✔ Created src/index.ts barrel export');

  // 4. package.json 패치 -----------------------------------------------------
  const pkgPath = path.join(UI_ROOT, 'package.json');
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
    },
    './global.css': './global.css'
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
  const tsconfigPath = path.join(UI_ROOT, 'tsconfig.json');
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