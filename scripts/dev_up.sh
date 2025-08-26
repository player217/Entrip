#!/usr/bin/env bash
set -euo pipefail

echo "🚀 Entrip 통합 개발 환경 기동"

ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
cd "$ROOT_DIR"

# 1. .env 확인
for p in apps/api/.env apps/web/.env; do
  [[ -f "$p" ]] || { echo "❌ $p 가 없습니다"; exit 1; }
done

# 2. Docker Compose 실행
docker compose -f docker-compose.dev.yml up --build -d

# 3. 상태/포트 출력
echo -e "\n🩺  컨테이너 상태:"
docker compose ps

echo -e "\n🌐  접속 주소"
printf "  • API   : http://localhost:4000/docs\n"
printf "  • Web   : http://localhost:3000\n"

echo -e "\n📜  로그 실시간 보기: ./scripts/dev_logs.sh\n"