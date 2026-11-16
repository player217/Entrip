import { defineConfig } from 'tsup';
import { copyFileSync, existsSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
export default defineConfig({
  entry: ['src/index.ts'], format: ['esm'], bundle: true, treeshake: true,
  dts: false, external: ['react', 'react-dom', '@entrip/shared'], minify: false,
  clean: true, sourcemap: true, target: 'esnext', splitting: false, platform: 'browser',
  esbuildOptions(options) { options.jsx = 'automatic'; options.mainFields = ['browser', 'module', 'main']; options.conditions = ['browser', 'import']; },
  onSuccess: async () => {
    if (existsSync('./src/global.css')) copyFileSync('./src/global.css', './dist/global.css');
    rmSync('./dist/.tsbuildinfo', { force: true });
    execFileSync(process.execPath, ['../../node_modules/typescript/bin/tsc', '--emitDeclarationOnly', '--outDir', 'dist/src', '--declaration', 'true'], { stdio: 'inherit' });
  },
});
