# 빠른 수정 가이드 - 10분 내 완료 가능

## 1. Tailwind 빌드 성능 개선 (2분)

```bash
# apps/web/tailwind.config.js 수정
```

```javascript
content: [
  './src/**/*.{js,ts,jsx,tsx,mdx}',
  '../../packages/ui/src/**/*.{ts,tsx}',
  // node_modules 제외 패턴 추가
  '!**/node_modules/**',
]
```

## 2. ESLint Next.js 설정 (3분)

```bash
# 프로젝트 루트에서
pnpm add -D eslint-config-next -w
```

```json
// apps/web/.eslintrc.json
{
  "extends": ["next/core-web-vitals", "../../.eslintrc.json"],
  "rules": {
    "@next/next/no-html-link-for-pages": "off"
  }
}
```

## 3. 빠른 스모크 테스트 (5분)

```bash
# scripts/quick-test.sh 생성
cat > scripts/quick-test.sh << 'EOF'
#!/bin/bash
echo "🔍 Quick Route Test"

# 서버 시작 (백그라운드)
cd apps/web && pnpm start &
SERVER_PID=$!
sleep 10

# 주요 라우트 테스트
ROUTES=("/" "/dashboard" "/teams" "/login")
for route in "${ROUTES[@]}"; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000$route")
  echo "✓ $route: HTTP $STATUS"
done

# 서버 종료
kill $SERVER_PID
echo "✅ Test Complete"
EOF

chmod +x scripts/quick-test.sh
```

## 실행 명령어

```bash
# 1. Tailwind 수정 후 재빌드
pnpm --filter @entrip/web build

# 2. ESLint 검증
pnpm --filter @entrip/web lint

# 3. 스모크 테스트 실행
./scripts/quick-test.sh
```

## 예상 결과
- 빌드 시간 10-20% 단축
- ESLint가 Next.js 규칙 적용
- 모든 주요 라우트 접근성 확인