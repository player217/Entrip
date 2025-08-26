import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting simple database seeding...');

  // Clear existing data in proper order
  try {
    await prisma.bookingHistory.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.account.deleteMany();
    await prisma.user.deleteMany();
  } catch (e) {
    console.log('⚠️ Some tables may not exist yet, continuing...');
  }

  // 1. 사용자 데이터 생성
  console.log('👥 Creating users...');
  
  const users = await Promise.all([
    prisma.user.create({
      data: {
        id: 'user1',
        email: 'admin@entrip.com',
        name: '관리자',
        password: 'hashed_admin_password',
        role: 'ADMIN',
        department: '경영지원팀',
        isActive: true
      }
    }),
    prisma.user.create({
      data: {
        id: 'user2',
        email: 'manager1@entrip.com',
        name: '김민수',
        password: 'hashed_manager_password',
        role: 'MANAGER',
        department: '영업1팀',
        isActive: true
      }
    }),
    prisma.user.create({
      data: {
        id: 'user3',
        email: 'manager2@entrip.com',
        name: '이지영',
        password: 'hashed_manager_password',
        role: 'MANAGER',
        department: '영업2팀',
        isActive: true
      }
    }),
    prisma.user.create({
      data: {
        id: 'user4',
        email: 'staff1@entrip.com',
        name: '박준혁',
        password: 'hashed_staff_password',
        role: 'USER',
        department: '영업1팀',
        isActive: true
      }
    }),
    prisma.user.create({
      data: {
        id: 'user5',
        email: 'staff2@entrip.com',
        name: '최서연',
        password: 'hashed_staff_password',
        role: 'USER',
        department: '영업2팀',
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
        id: 'account1',
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
        id: 'account2',
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

  const bookings = [];
  let bookingCounter = 1;

  // 2025년 2월~4월 예약 생성 (단순화)
  for (let month = 1; month < 4; month++) {
    const monthlyBookingCount = 10; // 매월 10개씩

    for (let i = 0; i < monthlyBookingCount; i++) {
      const day = Math.floor(Math.random() * 28) + 1;
      const startDate = new Date(2025, month, day);
      const duration = Math.floor(Math.random() * 5) + 2; // 2-6일
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + duration);

      const destination = destinations[Math.floor(Math.random() * destinations.length)];
      const teamType = teamTypes[Math.floor(Math.random() * teamTypes.length)];
      const bookingTypes = ['PACKAGE', 'FIT', 'GROUP', 'BUSINESS'];
      const bookingType = bookingTypes[Math.floor(Math.random() * bookingTypes.length)] as 'PACKAGE' | 'FIT' | 'GROUP' | 'BUSINESS';
      const statuses = ['PENDING', 'CONFIRMED', 'CANCELLED'];
      const status = statuses[Math.random() < 0.7 ? 1 : Math.random() < 0.9 ? 0 : 2] as 'PENDING' | 'CONFIRMED' | 'CANCELLED'; // 70% 확정, 20% 대기, 10% 취소
      const createdBy = users[Math.floor(Math.random() * users.length)].id;

      // 여행 유형별 인원수 조정
      let paxCount = 2;
      if (teamType.includes('가족')) paxCount = Math.floor(Math.random() * 4) + 3;
      else if (teamType.includes('단체') || teamType.includes('수학')) paxCount = Math.floor(Math.random() * 20) + 15;
      else if (teamType.includes('동호회') || teamType.includes('워크샵')) paxCount = Math.floor(Math.random() * 10) + 8;
      else if (teamType.includes('신혼')) paxCount = 2;
      else paxCount = Math.floor(Math.random() * 6) + 2;

      // 목적지별 가격 조정
      const isOverseas = destination.includes('일본') || destination.includes('베트남') ||
        destination.includes('태국') || destination.includes('싱가포르') ||
        destination.includes('홍콩') || destination.includes('대만') || destination.includes('필리핀');

      const basePrice = isOverseas ? 600000 : 200000;
      const pricePerPerson = basePrice + Math.floor(Math.random() * 150000);
      const totalPrice = pricePerPerson * paxCount;

      // 고객명 생성
      const lastNames = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임'];
      const firstNames = ['민수', '지영', '준혁', '서연', '태호', '은영', '동현', '수빈', '현우', '미영'];
      const customerName = lastNames[Math.floor(Math.random() * lastNames.length)] +
        firstNames[Math.floor(Math.random() * firstNames.length)];

      bookings.push({
        id: `booking${bookingCounter}`,
        bookingNumber: `BK2025${String(month + 1).padStart(2, '0')}${String(bookingCounter++).padStart(3, '0')}`,
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
    where: { status: 'CONFIRMED' },
    take: 15 // 확정된 예약 중 15개만
  });

  const transactions = [];
  let transactionCounter = 1;

  for (const booking of confirmedBookings) {
    // 계약금 입금
    if (booking.depositAmount) {
      transactions.push({
        id: `tx${transactionCounter}`,
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

    // 잔금 입금 (50% 확률)
    if (Math.random() < 0.5) {
      const balance = Number(booking.totalPrice) - Number(booking.depositAmount || 0);
      transactions.push({
        id: `tx${transactionCounter}`,
        transactionNumber: `TX2025${String(transactionCounter++).padStart(4, '0')}`,
        type: 'DEPOSIT',
        amount: balance,
        currency: 'KRW',
        description: `${booking.bookingNumber} 잔금`,
        accountId: accounts[0].id,
        bookingId: booking.id,
        userId: booking.createdBy,
        transactionDate: new Date(booking.startDate.getTime() - Math.random() * 86400000 * 5) // 출발 5일 전 이내
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

  const historyData = confirmedBookings.slice(0, 10).map((booking, index) => ({
    id: `history${index + 1}`,
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

  console.log('🎉 Simple database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });