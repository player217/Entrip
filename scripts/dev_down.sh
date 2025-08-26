#!/usr/bin/env bash
set -euo pipefail

echo "🛑 Entrip 통합 환경 종료 + 정리"
ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
cd "$ROOT_DIR"

docker compose -f docker-compose.dev.yml down --remove-orphans