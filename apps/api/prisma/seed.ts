import { PrismaClient } from '@prisma/client';
import { UserRole, BookingType, BookingStatus } from '@entrip/shared';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive database seeding...');

  // Clear existing data in proper order
  await prisma.bookingHistory.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  // 1. 사용자 데이터 생성
  console.log('👥 Creating users...');
  
  const users = await Promise.all([
    // 관리자 계정
    prisma.user.create({
      data: {
        email: 'admin@entrip.com',
        name: '관리자',
        password: 'hashed_admin_password',
        role: UserRole.ADMIN,
        department: '경영지원팀',
        isActive: true
      }
    }),
    // 매니저 계정들
    prisma.user.create({
      data: {
        email: 'manager1@entrip.com',
        name: '김민수',
        password: 'hashed_manager_password',
        role: UserRole.MANAGER,
        department: '영업1팀',
        isActive: true
      }
    }),
    prisma.user.create({
      data: {
        email: 'manager2@entrip.com',
        name: '이지영',
        password: 'hashed_manager_password',
        role: UserRole.MANAGER,
        department: '영업2팀',
        isActive: true
      }
    }),
    // 일반 직원 계정들
    prisma.user.create({
      data: {
        email: 'user1@entrip.com',
        name: '박준혁',
        password: 'hashed_user_password',
        role: UserRole.USER,
        department: '영업1팀',
        isActive: true
      }
    }),
    prisma.user.create({
      data: {
        email: 'user2@entrip.com',
        name: '최서연',
        password: 'hashed_user_password',
        role: UserRole.USER,
        department: '영업2팀',
        isActive: true
      }
    }),
    prisma.user.create({
      data: {
        email: 'user3@entrip.com',
        name: '정태호',
        password: 'hashed_user_password',
        role: UserRole.USER,
        department: '마케팅팀',
        isActive: true
      }
    }),
    prisma.user.create({
      data: {
        email: 'user4@entrip.com',
        name: '한은영',
        password: 'hashed_user_password',
        role: UserRole.USER,
        department: '기획팀',
        isActive: true
      }
    }),
    prisma.user.create({
      data: {
        email: 'user5@entrip.com',
        name: '송동현',
        password: 'hashed_user_password',
        role: UserRole.USER,
        department: '영업3팀',
        isActive: true
      }
    }),
    // 게스트 계정들
    prisma.user.create({
      data: {
        email: 'guest1@entrip.com',
        name: '김수빈',
        password: 'hashed_guest_password',
        role: UserRole.USER, // GUEST role이 없으면 USER로
        department: '외부',
        isActive: true
      }
    }),
    prisma.user.create({
      data: {
        email: 'guest2@entrip.com',
        name: '이현우',
        password: 'hashed_guest_password',
        role: UserRole.USER, // GUEST role이 없으면 USER로
        department: '외부',
        isActive: true
      }
    })
  ]);

  console.log(`✅ Created ${users.length} users`);

  // 2. 계좌 데이터 생성
  console.log('🏦 Creating accounts...');
  
  const accounts = await Promise.all([
    prisma.account.create({
      data: {
        name: '기업 주거래 계좌',
        accountNumber: '110-123-456789',
        bankName: '신한은행',
        currency: 'KRW',
        balance: 50000000,
        managerId: users[0].id,
        isActive: true
      }
    }),
    prisma.account.create({
      data: {
        name: '외화 전용 계좌',
        accountNumber: '110-987-654321',
        bankName: '신한은행',
        currency: 'USD',
        balance: 15000,
        managerId: users[1].id,
        isActive: true
      }
    })
  ]);

  console.log(`✅ Created ${accounts.length} accounts`);

  // 3. 예약 데이터 생성
  console.log('📅 Creating bookings...');

  const destinations = [
    '제주도', '부산', '경주', '강릉', '전주', '여수', '통영', '거제도',
    '일본 오사카', '일본 도쿄', '일본 후쿠오카', '일본 교토',
    '베트남 다낭', '베트남 호치민', '태국 방콕', '태국 치앙마이',
    '싱가포르', '홍콩', '대만 타이베이', '필리핀 세부'
  ];

  const teamTypes = [
    '가족여행', '신혼여행', '효도관광', '친구여행', '단체여행',
    '수학여행', '워크샵', '동호회', 'VIP투어', '패키지투어'
  ];

  const bookingTypes = [BookingType.PACKAGE, BookingType.FIT, BookingType.GROUP, BookingType.BUSINESS];
  const statuses = [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.CANCELLED];

  const bookings = [];
  let bookingCounter = 1;

  // 2025년 1월부터 10월까지 예약 생성
  for (let month = 0; month < 10; month++) {
    const seasonMultiplier = [0.7, 0.8, 1.0, 1.2, 1.5, 1.3, 1.6, 1.8, 1.4, 1.1][month];
    const monthlyBookingCount = Math.floor((Math.random() * 15 + 15) * seasonMultiplier);

    for (let i = 0; i < monthlyBookingCount; i++) {
      const day = Math.floor(Math.random() * 28) + 1;
      const startDate = new Date(2025, month, day);
      const duration = Math.floor(Math.random() * 7) + 2; // 2-8일
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + duration);

      const destination = destinations[Math.floor(Math.random() * destinations.length)];
      const teamType = teamTypes[Math.floor(Math.random() * teamTypes.length)];
      const bookingType = bookingTypes[Math.floor(Math.random() * bookingTypes.length)];
      const status = statuses[Math.random() < 0.7 ? 1 : Math.random() < 0.9 ? 0 : 2]; // 70% 확정, 20% 대기, 10% 취소
      const createdBy = users[Math.floor(Math.random() * users.length)].id;

      // 여행 유형별 인원수 조정
      let paxCount = 2;
      if (teamType.includes('가족')) paxCount = Math.floor(Math.random() * 4) + 3;
      else if (teamType.includes('단체') || teamType.includes('수학')) paxCount = Math.floor(Math.random() * 30) + 20;
      else if (teamType.includes('동호회') || teamType.includes('워크샵')) paxCount = Math.floor(Math.random() * 15) + 10;
      else if (teamType.includes('신혼')) paxCount = 2;
      else paxCount = Math.floor(Math.random() * 8) + 2;

      // 목적지별 가격 조정
      const isOverseas = destination.includes('일본') || destination.includes('베트남') ||
        destination.includes('태국') || destination.includes('싱가포르') ||
        destination.includes('홍콩') || destination.includes('대만') || destination.includes('필리핀');

      const basePrice = isOverseas ? 800000 : 300000;
      const pricePerPerson = basePrice + Math.floor(Math.random() * 200000);
      const totalPrice = pricePerPerson * paxCount;

      // 고객명 생성
      const lastNames = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임'];
      const firstNames = ['민수', '지영', '준혁', '서연', '태호', '은영', '동현', '수빈', '현우', '미영'];
      const customerName = lastNames[Math.floor(Math.random() * lastNames.length)] +
        firstNames[Math.floor(Math.random() * firstNames.length)];

      bookings.push({
        bookingNumber: `BK2025${String(month + 1).padStart(2, '0')}${String(bookingCounter++).padStart(3, '0')}`,
        companyCode: 'ENTRIP_MAIN', // 회사 코드 추가
        customerName,
        teamName: `${destination} ${teamType}`,
        bookingType,
        destination,
        startDate,
        endDate,
        paxCount,
        nights: duration - 1,
        days: duration,
        status,
        totalPrice,
        depositAmount: Math.floor(totalPrice * 0.3), // 30% 계약금
        currency: 'KRW',
        notes: `${teamType} 상품 - ${paxCount}명`,
        createdBy
      });
    }
  }

  // 배치로 예약 생성
  const createdBookings = await prisma.booking.createMany({
    data: bookings
  });

  console.log(`✅ Created ${createdBookings.count} bookings`);

  // 4. 거래 내역 생성 (일부 예약에 대해)
  console.log('💰 Creating transactions...');

  const confirmedBookings = await prisma.booking.findMany({
    where: { status: BookingStatus.CONFIRMED },
    take: 50 // 확정된 예약 중 50개만
  });

  const transactions = [];
  let transactionCounter = 1;

  for (const booking of confirmedBookings) {
    // 계약금 입금
    if (booking.depositAmount) {
      transactions.push({
        transactionNumber: `TX2025${String(transactionCounter++).padStart(4, '0')}`,
        type: 'DEPOSIT',
        amount: booking.depositAmount,
        currency: 'KRW',
        description: `${booking.bookingNumber} 계약금`,
        accountId: accounts[0].id,
        bookingId: booking.id,
        userId: booking.createdBy,
        transactionDate: new Date(booking.createdAt.getTime() + Math.random() * 86400000) // 예약일 이후 랜덤
      });
    }

    // 잔금 입금 (60% 확률)
    if (Math.random() < 0.6) {
      const totalPrice = Number(booking.totalPrice);
      const depositAmount = Number(booking.depositAmount || 0);
      const balance = totalPrice - depositAmount;
      transactions.push({
        transactionNumber: `TX2025${String(transactionCounter++).padStart(4, '0')}`,
        type: 'DEPOSIT',
        amount: balance,
        currency: 'KRW',
        description: `${booking.bookingNumber} 잔금`,
        accountId: accounts[0].id,
        bookingId: booking.id,
        userId: booking.createdBy,
        transactionDate: new Date(booking.startDate.getTime() - Math.random() * 86400000 * 7) // 출발 1주일 전 이내
      });
    }
  }

  if (transactions.length > 0) {
    const createdTransactions = await prisma.transaction.createMany({
      data: transactions
    });
    console.log(`✅ Created ${createdTransactions.count} transactions`);
  }

  // 5. 예약 히스토리 생성
  console.log('📝 Creating booking history...');

  const historyData = confirmedBookings.slice(0, 30).map(booking => ({
    bookingId: booking.id,
    action: 'STATUS_CHANGE',
    changedFields: ['status'],
    previousValues: { status: 'PENDING' },
    newValues: { status: 'CONFIRMED' },
    changedBy: booking.createdBy
  }));

  if (historyData.length > 0) {
    const createdHistory = await prisma.bookingHistory.createMany({
      data: historyData
    });
    console.log(`✅ Created ${createdHistory.count} booking history entries`);
  }

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });