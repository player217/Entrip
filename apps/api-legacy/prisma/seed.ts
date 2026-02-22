import { PrismaClient } from '@prisma/client';
import { UserRole, BookingType, BookingStatus } from '@entrip/shared';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Demo password for all accounts
const DEMO_PASSWORD = 'pass1234';

// Company definitions
const COMPANIES = [
  { code: 'ENTRIP_MAIN', name: '엔트립 본사' },
  { code: 'j1', name: 'J1 여행사' },
  { code: 'star', name: '스타투어' },
  { code: 'happy', name: '해피트래블' }
];

async function main() {
  console.log('🌱 Starting comprehensive multi-tenant database seeding...');

  // Clear existing data in proper order
  console.log('🗑️ Clearing existing data...');
  await prisma.bookingHistory.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  // Hash the demo password once
  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);

  // 1. 사용자 데이터 생성 (회사별)
  console.log('👥 Creating users for multiple companies...');
  
  const users = [];
  const usersByCompany = {};
  
  for (const company of COMPANIES) {
    console.log(`  Creating users for ${company.name} (${company.code})...`);
    usersByCompany[company.code] = [];
    
    // Admin account for each company
    const admin = await prisma.user.create({
      data: {
        email: `admin@${company.code === 'ENTRIP_MAIN' ? 'entrip' : company.code}.com`,
        name: `${company.name} 관리자`,
        password: hashedPassword,
        role: UserRole.ADMIN,
        department: '경영지원팀',
        companyCode: company.code,
        isActive: true
      }
    });
    users.push(admin);
    usersByCompany[company.code].push(admin);
    
    // Managers for each company
    const manager1 = await prisma.user.create({
      data: {
        email: `manager1@${company.code === 'ENTRIP_MAIN' ? 'entrip' : company.code}.com`,
        name: `${company.name} 김민수`,
        password: hashedPassword,
        role: UserRole.MANAGER,
        department: '영업1팀',
        companyCode: company.code,
        isActive: true
      }
    });
    users.push(manager1);
    usersByCompany[company.code].push(manager1);
    
    const manager2 = await prisma.user.create({
      data: {
        email: `manager2@${company.code === 'ENTRIP_MAIN' ? 'entrip' : company.code}.com`,
        name: `${company.name} 이지영`,
        password: hashedPassword,
        role: UserRole.MANAGER,
        department: '영업2팀',
        companyCode: company.code,
        isActive: true
      }
    });
    users.push(manager2);
    usersByCompany[company.code].push(manager2);
    
    // Manager alias account (for tests expecting manager@company.com)
    const managerAlias = await prisma.user.create({
      data: {
        email: `manager@${company.code === 'ENTRIP_MAIN' ? 'entrip' : company.code}.com`,
        name: `${company.name} 매니저`,
        password: hashedPassword,
        role: UserRole.MANAGER,
        department: '영업기획팀',
        companyCode: company.code,
        isActive: true
      }
    });
    users.push(managerAlias);
    usersByCompany[company.code].push(managerAlias);
    
    // Regular users for each company
    for (let i = 1; i <= 3; i++) {
      const userNames = ['박준혁', '최서연', '정태호'];
      const departments = ['영업1팀', '영업2팀', '마케팅팀'];
      
      const user = await prisma.user.create({
        data: {
          email: `user${i}@${company.code === 'ENTRIP_MAIN' ? 'entrip' : company.code}.com`,
          name: `${company.name} ${userNames[i - 1]}`,
          password: hashedPassword,
          role: UserRole.USER,
          department: departments[i - 1],
          companyCode: company.code,
          isActive: true
        }
      });
      users.push(user);
      usersByCompany[company.code].push(user);
    }

    // User alias account (for tests expecting user@company.com)
    const userAlias = await prisma.user.create({
      data: {
        email: `user@${company.code === 'ENTRIP_MAIN' ? 'entrip' : company.code}.com`,
        name: `${company.name} 직원`,
        password: hashedPassword,
        role: UserRole.USER,
        department: '영업지원팀',
        companyCode: company.code,
        isActive: true
      }
    });
    users.push(userAlias);
    usersByCompany[company.code].push(userAlias);
  }

  console.log(`✅ Created ${users.length} users across ${COMPANIES.length} companies`);

  // 2. 계좌 데이터 생성 (회사별)
  console.log('🏦 Creating accounts for each company...');
  
  const accounts = [];
  let accountCounter = 1;
  
  for (const company of COMPANIES) {
    const companyUsers = usersByCompany[company.code];
    const admin = companyUsers.find(u => u.role === UserRole.ADMIN);
    const manager = companyUsers.find(u => u.role === UserRole.MANAGER);
    
    // KRW account for each company
    const krwAccount = await prisma.account.create({
      data: {
        name: `${company.name} 주거래 계좌`,
        accountNumber: `110-${company.code}-${String(accountCounter++).padStart(6, '0')}`,
        bankName: '신한은행',
        currency: 'KRW',
        balance: 50000000 * (company.code === 'ENTRIP_MAIN' ? 2 : 1),
        managerId: admin.id,
        isActive: true
      }
    });
    accounts.push(krwAccount);
    
    // USD account for major companies
    if (['ENTRIP_MAIN', 'j1'].includes(company.code)) {
      const usdAccount = await prisma.account.create({
        data: {
          name: `${company.name} 외화 계좌`,
          accountNumber: `110-${company.code}-${String(accountCounter++).padStart(6, '0')}`,
          bankName: '신한은행',
          currency: 'USD',
          balance: 15000,
          managerId: manager.id,
          isActive: true
        }
      });
      accounts.push(usdAccount);
    }
  }

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

      // Distribute bookings across companies
      // ENTRIP_MAIN: 40%, j1: 30%, star: 20%, happy: 10%
      const companyDistribution = Math.random();
      let selectedCompany;
      if (companyDistribution < 0.4) {
        selectedCompany = 'ENTRIP_MAIN';
      } else if (companyDistribution < 0.7) {
        selectedCompany = 'j1';
      } else if (companyDistribution < 0.9) {
        selectedCompany = 'star';
      } else {
        selectedCompany = 'happy';
      }
      
      // Select a random user from the selected company
      const companyUsers = usersByCompany[selectedCompany];
      const createdBy = companyUsers[Math.floor(Math.random() * companyUsers.length)].id;
      
      // Add required fields for booking
      const managers = ['김민수', '이지영', '박준혁', '최서연', '정태호'];
      const manager = managers[Math.floor(Math.random() * managers.length)];
      
      bookings.push({
        bookingNumber: `BK2025${String(month + 1).padStart(2, '0')}${String(bookingCounter++).padStart(3, '0')}`,
        companyCode: selectedCompany,
        customerName,
        teamName: `${destination} ${teamType}`,
        teamType: teamType,  // Required field
        bookingType,
        origin: '서울',  // Required field
        destination,
        startDate,
        endDate,
        paxCount,
        nights: duration - 1,
        days: duration,
        status,
        manager: manager,  // Required field
        representative: customerName,  // Optional
        contact: `010-${Math.floor(Math.random() * 9000) + 1000}-${Math.floor(Math.random() * 9000) + 1000}`,  // Optional
        email: `${customerName.replace(/[^a-zA-Z]/g, '').toLowerCase()}@example.com`,  // Optional
        totalPrice,
        depositAmount: Math.floor(totalPrice * 0.3), // 30% 계약금
        currency: 'KRW',
        notes: `${teamType} 상품 - ${paxCount}명`,
        memo: `${selectedCompany} 회사 예약`,  // Optional
        createdBy
      });
    }
  }

  // 배치로 예약 생성
  const createdBookings = await prisma.booking.createMany({
    data: bookings
  });

  console.log(`✅ Created ${createdBookings.count} bookings`);
  
  // Print booking distribution by company
  const bookingsByCompany = {};
  for (const booking of bookings) {
    bookingsByCompany[booking.companyCode] = (bookingsByCompany[booking.companyCode] || 0) + 1;
  }
  console.log('📊 Booking distribution by company:');
  for (const [code, count] of Object.entries(bookingsByCompany)) {
    const company = COMPANIES.find(c => c.code === code);
    console.log(`  ${company.name} (${code}): ${count} bookings`);
  }

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

  console.log('🎉 Multi-tenant database seeding completed successfully!');
  console.log('\n📝 Summary:');
  console.log(`  - Companies: ${COMPANIES.length}`);
  console.log(`  - Users: ${users.length} (${users.length / COMPANIES.length} per company)`);
  console.log(`  - Accounts: ${accounts.length}`);
  console.log(`  - Bookings: ${createdBookings.count}`);
  console.log(`  - Transactions: ${transactions.length}`);
  console.log('\n🔑 Demo Password: ' + DEMO_PASSWORD);
  console.log('\n👤 Sample Login Credentials:');
  for (const company of COMPANIES) {
    console.log(`  ${company.name}:`);
    console.log(`    Admin: admin@${company.code === 'ENTRIP_MAIN' ? 'entrip' : company.code}.com / ${DEMO_PASSWORD}`);
    console.log(`    Manager: manager1@${company.code === 'ENTRIP_MAIN' ? 'entrip' : company.code}.com / ${DEMO_PASSWORD}`);
    console.log(`    User: user1@${company.code === 'ENTRIP_MAIN' ? 'entrip' : company.code}.com / ${DEMO_PASSWORD}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
