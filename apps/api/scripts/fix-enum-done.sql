-- ===============================================
-- DONE Enum 제거 및 데이터 마이그레이션 스크립트
-- 실행 전 반드시 백업을 생성하세요!
-- ===============================================

-- 1. 현재 상태 확인
SELECT 'Current BookingStatus enum values:' as info;
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'BookingStatus')
ORDER BY enumsortorder;

SELECT 'Bookings with DONE status:' as info;
SELECT COUNT(*) as done_count 
FROM "Booking" 
WHERE status::text = 'done';

-- 2. 트랜잭션 시작
BEGIN;

-- 3. DONE 상태를 COMPLETED로 마이그레이션
UPDATE "Booking" 
SET status = 'COMPLETED'::"BookingStatus"
WHERE status::text = 'done';

-- 4. Enum 타입 재생성 (PostgreSQL은 ALTER TYPE DROP VALUE 미지원)
-- 기존 타입 백업
ALTER TYPE "BookingStatus" RENAME TO "BookingStatus_old";

-- 새 타입 생성 (DONE 제외, 대문자로 통일)
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');

-- 모든 관련 테이블의 컬럼 타입을 먼저 text로 변경
-- Booking 테이블
ALTER TABLE "Booking" 
  ALTER COLUMN status DROP DEFAULT;
ALTER TABLE "Booking" 
  ALTER COLUMN status TYPE text 
  USING status::text;

-- BookingEvent 테이블 (존재하는 경우)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'BookingEvent' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE "BookingEvent" 
      ALTER COLUMN status DROP DEFAULT;
    ALTER TABLE "BookingEvent" 
      ALTER COLUMN status TYPE text 
      USING status::text;
  END IF;
END $$;

-- 대소문자 통일
UPDATE "Booking" 
SET status = UPPER(status)
WHERE status IS NOT NULL;

UPDATE "BookingEvent" 
SET status = UPPER(status)
WHERE status IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'BookingEvent' 
    AND column_name = 'status'
  );

-- 새 enum 타입으로 변환
ALTER TABLE "Booking" 
  ALTER COLUMN status TYPE "BookingStatus" 
  USING status::"BookingStatus";

-- BookingEvent 테이블도 변환
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'BookingEvent' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE "BookingEvent" 
      ALTER COLUMN status TYPE "BookingStatus" 
      USING status::"BookingStatus";
  END IF;
END $$;

-- 기본값 재설정
ALTER TABLE "Booking" 
  ALTER COLUMN status SET DEFAULT 'PENDING'::"BookingStatus";

-- BookingHistory 테이블도 처리 (존재하는 경우)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'BookingHistory' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE "BookingHistory" 
      ALTER COLUMN status TYPE text 
      USING status::text;
    
    UPDATE "BookingHistory" 
    SET status = UPPER(status)
    WHERE status IS NOT NULL;
    
    ALTER TABLE "BookingHistory" 
      ALTER COLUMN status TYPE "BookingStatus" 
      USING status::"BookingStatus";
  END IF;
END $$;

-- 5. 기존 타입 삭제
DROP TYPE "BookingStatus_old";

-- 6. 결과 확인
SELECT 'New BookingStatus enum values:' as info;
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'BookingStatus')
ORDER BY enumsortorder;

SELECT 'Status distribution after migration:' as info;
SELECT status, COUNT(*) as count 
FROM "Booking" 
GROUP BY status
ORDER BY status;

-- 7. 커밋 (모든 것이 정상이면)
COMMIT;

-- 롤백이 필요한 경우: ROLLBACK;