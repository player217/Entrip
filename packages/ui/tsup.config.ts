import { defineConfig } from 'tsup'
import { mkdirSync, copyFileSync, existsSync } from 'fs'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  bundle: true,
  treeshake: true,
  dts: {
    resolve: true,
    entry: './src/index.ts',
  },
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
  onSuccess: () => {
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
      
      // index.d.ts 복사 (있다면)
      const typesSrc = './src/index.d.ts'
      const typesDist = './dist/types/index.d.ts'
      
      if (existsSync(typesSrc)) {
        mkdirSync('./dist/types', { recursive: true })
        copyFileSync(typesSrc, typesDist)
        console.log('✅ Copied type definitions')
      }
      
      console.log('✅ UI package rebuilt successfully')
    } catch (error) {
      console.error('⚠️ Copy operation failed (non-critical):', error)
      // 복사 실패는 빌드를 중단시키지 않음
    }
  }
})