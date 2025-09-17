const { PrismaClient } = require('@prisma/client');

async function testMultitenancy() {
  const prisma = new PrismaClient({
    log: ['error'],
  });

  try {
    console.log('🏢 멀티테넌시 데이터 격리 테스트 시작...\n');

    // 테스트 데이터 정리
    await prisma.user.deleteMany({});
    await prisma.booking.deleteMany({});
    console.log('✅ 기존 테스트 데이터 정리 완료');

    // 1. 두 회사의 사용자 생성
    const companyAUser = await prisma.user.create({
      data: {
        name: 'Company A Admin',
        email: 'admin@company-a.com',
        password: 'hashed_password_a',
        companyCode: 'COMPANY_A',
        role: 'ADMIN',
        isActive: true,
      },
    });

    const companyBUser = await prisma.user.create({
      data: {
        name: 'Company B Admin',
        email: 'admin@company-b.com',
        password: 'hashed_password_b',
        companyCode: 'COMPANY_B',
        role: 'ADMIN',
        isActive: true,
      },
    });

    console.log('✅ 두 회사의 사용자 생성 완료');
    console.log(`   - Company A 사용자 ID: ${companyAUser.id}`);
    console.log(`   - Company B 사용자 ID: ${companyBUser.id}\n`);

    // 2. 각 회사의 예약 데이터 생성
    const companyABooking = await prisma.booking.create({
      data: {
        teamName: 'Team Alpha',
        type: 'incentive',
        origin: 'Seoul',
        destination: 'Busan',
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-01-20'),
        coordinator: 'Kim Manager A',
        status: 'confirmed',
        companyCode: 'COMPANY_A',
        userId: companyAUser.id,
      },
    });

    const companyBBooking = await prisma.booking.create({
      data: {
        teamName: 'Team Beta',
        type: 'golf',
        origin: 'Tokyo',
        destination: 'Osaka',
        startDate: new Date('2024-02-10'),
        endDate: new Date('2024-02-15'),
        coordinator: 'Park Manager B',
        status: 'pending',
        companyCode: 'COMPANY_B',
        userId: companyBUser.id,
      },
    });

    console.log('✅ 각 회사의 예약 데이터 생성 완료');
    console.log(`   - Company A 예약 ID: ${companyABooking.id}`);
    console.log(`   - Company B 예약 ID: ${companyBBooking.id}\n`);

    // 3. 회사별 데이터 조회 테스트
    console.log('🔍 회사별 데이터 격리 테스트...');

    // Company A 관점에서 조회
    const companyAUsers = await prisma.user.findMany({
      where: { companyCode: 'COMPANY_A' },
    });
    const companyABookings = await prisma.booking.findMany({
      where: { companyCode: 'COMPANY_A' },
    });

    console.log(`✅ Company A 조회 결과:`);
    console.log(`   - 사용자 수: ${companyAUsers.length} (예상: 1)`);
    console.log(`   - 예약 수: ${companyABookings.length} (예상: 1)`);
    console.log(`   - 예약 번호: ${companyABookings[0]?.bookingNumber}`);

    // Company B 관점에서 조회
    const companyBUsers = await prisma.user.findMany({
      where: { companyCode: 'COMPANY_B' },
    });
    const companyBBookings = await prisma.booking.findMany({
      where: { companyCode: 'COMPANY_B' },
    });

    console.log(`✅ Company B 조회 결과:`);
    console.log(`   - 사용자 수: ${companyBUsers.length} (예상: 1)`);
    console.log(`   - 예약 수: ${companyBBookings.length} (예상: 1)`);
    console.log(`   - 예약 번호: ${companyBBookings[0]?.bookingNumber}\n`);

    // 4. 크로스 컴퍼니 접근 방지 테스트
    console.log('🚫 크로스 컴퍼니 접근 방지 테스트...');

    // Company A 사용자가 Company B 예약에 접근 시도
    const crossAccessBooking = await prisma.booking.findFirst({
      where: {
        id: companyBBooking.id,
        companyCode: 'COMPANY_A', // 잘못된 회사 코드
      },
    });

    if (crossAccessBooking === null) {
      console.log('✅ 크로스 컴퍼니 접근 차단 성공');
    } else {
      console.log('❌ 크로스 컴퍼니 접근 차단 실패');
    }

    // 5. 전체 데이터 확인 (관리자 관점)
    const totalUsers = await prisma.user.count();
    const totalBookings = await prisma.booking.count();

    console.log(`\n📊 전체 데이터 현황:`);
    console.log(`   - 전체 사용자: ${totalUsers}`);
    console.log(`   - 전체 예약: ${totalBookings}`);

    // 6. 검증 결과
    console.log('\n🎯 멀티테넌시 테스트 결과:');
    const isCompanyAIsolated = companyAUsers.length === 1 && companyABookings.length === 1;
    const isCompanyBIsolated = companyBUsers.length === 1 && companyBBookings.length === 1;
    const isCrossAccessBlocked = crossAccessBooking === null;

    if (isCompanyAIsolated && isCompanyBIsolated && isCrossAccessBlocked) {
      console.log('✅ 모든 멀티테넌시 테스트 통과!');
      console.log('   - Company A 데이터 격리: ✅');
      console.log('   - Company B 데이터 격리: ✅');
      console.log('   - 크로스 접근 차단: ✅');
    } else {
      console.log('❌ 일부 멀티테넌시 테스트 실패');
      console.log(`   - Company A 데이터 격리: ${isCompanyAIsolated ? '✅' : '❌'}`);
      console.log(`   - Company B 데이터 격리: ${isCompanyBIsolated ? '✅' : '❌'}`);
      console.log(`   - 크로스 접근 차단: ${isCrossAccessBlocked ? '✅' : '❌'}`);
    }

  } catch (error) {
    console.error('❌ 멀티테넌시 테스트 실패:', error.message);
    console.error('상세 오류:', error);
  } finally {
    await prisma.$disconnect();
    console.log('\n🔌 데이터베이스 연결 종료');
  }
}

testMultitenancy();