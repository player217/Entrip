#!/usr/bin/env bash
set -euo pipefail

echo "🚀 Entrip 간단 개발 환경 기동 (PostgreSQL only)"

ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
cd "$ROOT_DIR"

# 1. PostgreSQL만 실행
docker compose -f docker-compose.dev.yml up postgres -d

# 2. DB 준비될 때까지 대기
echo "⏳ PostgreSQL 준비 중..."
sleep 5

# 3. 상태 출력
echo -e "\n🩺  PostgreSQL 상태:"
docker compose -f docker-compose.dev.yml ps

echo -e "\n🌐  실행 방법"
echo "1. API 서버 실행:"
echo "   cd apps/api"
echo "   pnpm install"
echo "   pnpm prisma:migrate:dev"
echo "   pnpm prisma:seed"
echo "   pnpm dev"
echo ""
echo "2. 프론트엔드 실행:"
echo "   pnpm install"
echo "   pnpm build:tokens"
echo "   pnpm dev"
echo ""
echo "3. PostgreSQL 접속:"
echo "   psql postgres://entrip:entrip@localhost:5432/entrip"