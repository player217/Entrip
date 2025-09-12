/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('../../tailwind.config.js')],
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    // UI 패키지는 src 하위만 지정하여 node_modules 스캔 방지
    '../../packages/ui/src/**/*.{ts,tsx}'
  ]
}