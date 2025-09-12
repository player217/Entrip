#!/bin/bash

# ===============================================
# 데이터베이스 백업 및 Enum 수정 스크립트
# ===============================================

set -e  # 에러 발생 시 즉시 중단

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 타임스탬프
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
BACKUP_FILE="${BACKUP_DIR}/booking_backup_${TIMESTAMP}.sql"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Database Enum Fix Script${NC}"
echo -e "${GREEN}========================================${NC}\n"

# 1. 백업 디렉토리 생성
echo -e "${YELLOW}1. Creating backup directory...${NC}"
mkdir -p ${BACKUP_DIR}

# 2. 데이터베이스 백업
echo -e "${YELLOW}2. Creating database backup...${NC}"
docker exec entrip-postgres-local pg_dump -U entrip -d entrip -t 'public."Booking"' > ${BACKUP_FILE}

if [ -f ${BACKUP_FILE} ]; then
    echo -e "${GREEN}✅ Backup created: ${BACKUP_FILE}${NC}"
    echo -e "   File size: $(ls -lh ${BACKUP_FILE} | awk '{print $5}')"
else
    echo -e "${RED}❌ Backup failed!${NC}"
    exit 1
fi

# 3. 현재 enum 상태 확인
echo -e "\n${YELLOW}3. Current enum status:${NC}"
docker exec entrip-postgres-local psql -U entrip -d entrip -c "
SELECT enumlabel, enumsortorder 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'BookingStatus')
ORDER BY enumsortorder;
"

# 4. DONE 상태 레코드 수 확인
echo -e "\n${YELLOW}4. Checking records with 'done' status:${NC}"
DONE_COUNT=$(docker exec entrip-postgres-local psql -U entrip -d entrip -t -c "
SELECT COUNT(*) FROM \"Booking\" WHERE status::text = 'done';
" | tr -d ' ')

echo -e "Found ${GREEN}${DONE_COUNT}${NC} records with 'done' status"

# 5. 사용자 확인
echo -e "\n${YELLOW}⚠️  WARNING: This will modify the database schema!${NC}"
echo -e "The following actions will be performed:"
echo -e "  1. Migrate all 'done' status to 'COMPLETED'"
echo -e "  2. Remove 'done' from BookingStatus enum"
echo -e "  3. Standardize all enum values to UPPERCASE"
echo -e "\nBackup has been created at: ${BACKUP_FILE}"
read -p "Do you want to proceed? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo -e "${RED}Operation cancelled by user${NC}"
    exit 0
fi

# 6. SQL 스크립트 실행
echo -e "\n${YELLOW}5. Executing enum fix script...${NC}"
docker exec -i entrip-postgres-local psql -U entrip -d entrip < ./scripts/fix-enum-done.sql

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Enum fix completed successfully!${NC}"
else
    echo -e "${RED}❌ Enum fix failed! Check the error above.${NC}"
    echo -e "${YELLOW}To restore from backup, run:${NC}"
    echo -e "docker exec -i entrip-postgres-local psql -U entrip -d entrip < ${BACKUP_FILE}"
    exit 1
fi

# 7. 최종 상태 확인
echo -e "\n${YELLOW}6. Final enum status:${NC}"
docker exec entrip-postgres-local psql -U entrip -d entrip -c "
SELECT enumlabel, enumsortorder 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'BookingStatus')
ORDER BY enumsortorder;
"

echo -e "\n${YELLOW}7. Status distribution:${NC}"
docker exec entrip-postgres-local psql -U entrip -d entrip -c "
SELECT status, COUNT(*) as count 
FROM \"Booking\" 
GROUP BY status
ORDER BY status;
"

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Enum fix completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "\nBackup saved at: ${BACKUP_FILE}"
echo -e "To verify the fix, run:"
echo -e "  curl http://localhost:4001/api/schema/health/schema"