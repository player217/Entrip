const { PrismaClient } = require('@prisma/client');

async function testDatabaseConnection() {
  const prisma = new PrismaClient({
    log: ['query', 'error', 'info', 'warn'],
  });

  try {
    console.log('🔌 데이터베이스 연결 테스트 시작...');

    // 연결 테스트
    await prisma.$connect();
    console.log('✅ 데이터베이스 연결 성공');

    // 기본 쿼리 테스트
    const result = await prisma.$queryRaw`SELECT NOW() as currentTime`;
    console.log('✅ 기본 쿼리 실행 성공:', result);

    // User 테이블 존재 확인
    try {
      const userCount = await prisma.user.count();
      console.log(`✅ User 테이블 확인: ${userCount}개 레코드 존재`);
    } catch (error) {
      console.log('❌ User 테이블 접근 실패:', error.message);
    }

    // Booking 테이블 존재 확인
    try {
      const bookingCount = await prisma.booking.count();
      console.log(`✅ Booking 테이블 확인: ${bookingCount}개 레코드 존재`);
    } catch (error) {
      console.log('❌ Booking 테이블 접근 실패:', error.message);
    }

  } catch (error) {
    console.error('❌ 데이터베이스 연결 실패:', error.message);
    console.error('상세 오류:', error);
  } finally {
    await prisma.$disconnect();
    console.log('🔌 데이터베이스 연결 종료');
  }
}

testDatabaseConnection();