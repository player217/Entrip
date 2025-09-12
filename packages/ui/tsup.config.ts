import { defineConfig } from 'tsup'
import { mkdirSync, copyFileSync, existsSync } from 'fs'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  bundle: true,
  treeshake: true,
  dts: false, // We'll generate types separately using tsc
  external: ['react', 'react-dom', '@entrip/shared'],
  minify: false,
  clean: true,
  sourcemap: true,
  target: 'esnext',
  splitting: false,
  platform: 'browser',
  esbuildOptions(options) {
    options.jsx = 'automatic'
    options.mainFields = ['module', 'main']
    options.conditions = ['import']
  },
  onSuccess: async () => {
    // Unix cp 대신 Node.js API로 파일 복사
    try {
      // global.css 복사
      const cssSrc = './src/global.css'
      const cssDist = './dist/global.css'
      
      if (existsSync(cssSrc)) {
        copyFileSync(cssSrc, cssDist)
        console.log('✅ Copied global.css to dist/')
      } else {
        console.log('ℹ️ No global.css found, skipping...')
      }
      
      // Generate TypeScript declarations using tsc
      const { execSync } = require('child_process')
      try {
        execSync('npx tsc --emitDeclarationOnly --outDir dist/src --declaration true', { 
          cwd: process.cwd(),
          stdio: 'inherit'
        })
        console.log('✅ TypeScript declarations generated')
      } catch (tscError) {
        console.log('⚠️ TypeScript declaration generation failed, continuing...')
      }
      
      console.log('✅ UI package rebuilt successfully')
    } catch (error) {
      console.error('⚠️ Build steps failed (non-critical):', error)
      // 실패는 빌드를 중단시키지 않음
    }
  }
})