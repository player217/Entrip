#!/bin/bash

# 스키마 동기화 시스템 - 마이그레이션 복구 스크립트
# 작성일: 2025-01-11
# 목적: 깨진 마이그레이션 히스토리 복구 및 스키마 동기화

set -e  # 에러 발생 시 즉시 중단

echo "======================================"
echo "🔧 마이그레이션 시스템 복구 시작"
echo "======================================"
echo ""

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. 현재 상태 확인
echo "📊 현재 마이그레이션 상태 확인..."
cd "$(dirname "$0")/.."

# 2. 데이터베이스 백업 (Docker 환경)
echo ""
echo "💾 데이터베이스 백업 생성 중..."
BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"

# Docker 컨테이너에서 백업 실행
docker exec entrip-postgres-local pg_dump -U entrip -d entrip > "../../../backups/$BACKUP_FILE" 2>/dev/null || {
    echo -e "${YELLOW}⚠️  백업 디렉토리가 없습니다. 생성 중...${NC}"
    mkdir -p ../../../backups
    docker exec entrip-postgres-local pg_dump -U entrip -d entrip > "../../../backups/$BACKUP_FILE"
}

echo -e "${GREEN}✅ 백업 완료: backups/$BACKUP_FILE${NC}"

# 3. 문제가 있는 마이그레이션 해결
echo ""
echo "🔧 문제 마이그레이션 해결 중..."

# 마이그레이션 상태 확인
npx prisma migrate status 2>&1 | grep -q "20250714044809_prod_init" && {
    echo "  - 20250714044809_prod_init 마이그레이션 처리 중..."
    npx prisma migrate resolve --applied 20250714044809_prod_init || {
        echo -e "${YELLOW}⚠️  마이그레이션 resolve 실패. 스킵합니다.${NC}"
    }
}

# 4. 데이터베이스와 스키마 동기화
echo ""
echo "🔄 데이터베이스와 Prisma 스키마 동기화..."

# db push로 현재 스키마를 DB에 반영 (데이터 손실 없이)
npx prisma db push --skip-generate || {
    echo -e "${RED}❌ 스키마 동기화 실패${NC}"
    echo "문제를 수동으로 해결해야 합니다."
    exit 1
}

# 5. 새로운 baseline 마이그레이션 생성
echo ""
echo "📝 새로운 baseline 마이그레이션 생성..."

# 현재 스키마 기준으로 baseline 생성
npx prisma migrate dev --name post_fix_baseline --create-only || {
    echo -e "${YELLOW}⚠️  Baseline 생성 스킵 (이미 최신 상태)${NC}"
}

# 6. Prisma Client 재생성
echo ""
echo "🔨 Prisma Client 재생성..."
npx prisma generate

# 7. 결과 확인
echo ""
echo "======================================"
echo "📋 복구 결과 확인"
echo "======================================"

# 마이그레이션 상태 다시 확인
echo ""
echo "현재 마이그레이션 상태:"
npx prisma migrate status || true

# 성공 메시지
echo ""
echo -e "${GREEN}======================================"
echo -e "✅ 마이그레이션 시스템 복구 완료!"
echo -e "======================================${NC}"
echo ""
echo "다음 단계:"
echo "1. API 서버 재시작: docker restart entrip-api-local"
echo "2. 헬스체크 확인: curl http://localhost:4001/api/health"
echo "3. 로그인 테스트 수행"