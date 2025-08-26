#!/bin/bash

# 로컬 CI 스크립트
# 모든 품질 검사를 한번에 실행

set -e  # 오류 발생시 즉시 중단

echo "🚀 로컬 CI 시작..."

# 1. Design tokens 빌드
echo "📦 Design tokens 빌드 중..."
pnpm run build:tokens

# 2. OpenAPI 타입 생성
echo "📝 OpenAPI 타입 생성 중..."
pnpm run api:types

# 3. TypeScript 타입 체크
echo "🔍 TypeScript 타입 체크 중..."
pnpm run type-check

# 4. ESLint 검사
echo "🎨 ESLint 검사 중..."
pnpm run lint

# 5. 코드 포맷 검사
echo "💅 코드 포맷 검사 중..."
pnpm run format:check

# 6. 테스트 실행 (커버리지 포함)
echo "🧪 테스트 실행 중..."
pnpm test --coverage --passWithNoTests=false

echo "✅ 로컬 CI 완료!"
echo "📊 커버리지 리포트: ./coverage/lcov-report/index.html"