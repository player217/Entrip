#!/usr/bin/env bash
ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
cd "$ROOT_DIR"
printf "📡  Ctrl‑C 로 종료\n\n"
docker compose -f docker-compose.dev.yml logs -f --tail=100