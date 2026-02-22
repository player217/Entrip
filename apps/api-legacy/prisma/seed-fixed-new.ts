import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding with manual schema...');

  // Clear existing data in proper order
  try {
    await prisma.$executeRaw`DELETE FROM "BookingHistory"`;
    await prisma.$executeRaw`DELETE FROM "Transaction"`;
    await prisma.$executeRaw`DELETE FROM "Booking"`;
    await prisma.$executeRaw`DELETE FROM "Account"`;
    await prisma.$executeRaw`DELETE FROM "User"`;
  } catch (e) {
    console.log('⚠️ Some cleanup failed, continuing...');
  }

  // 1. 사용자 데이터 생성
  console.log('👥 Creating users...');
  
  await prisma.$executeRaw`
    INSERT INTO "User" (id, email, name, password, role, department, "isActive", "createdAt", "updatedAt")
    VALUES 
    ('user1', 'admin@entrip.com', '관리자', 'hashed_admin_password', 'ADMIN', '경영지원팀', true, NOW(), NOW()),
    ('user2', 'manager1@entrip.com', '김민수', 'hashed_manager_password', 'MANAGER', '영업1팀', true, NOW(), NOW()),
    ('user3', 'manager2@entrip.com', '이지영', 'hashed_manager_password', 'MANAGER', '영업2팀', true, NOW(), NOW()),
    ('user4', 'staff1@entrip.com', '박준혁', 'hashed_staff_password', 'USER', '영업1팀', true, NOW(), NOW()),
    ('user5', 'staff2@entrip.com', '최서연', 'hashed_staff_password', 'USER', '영업2팀', true, NOW(), NOW())
  `;

  console.log('✅ Created 5 users');

  // 2. 계좌 데이터 생성
  console.log('🏦 Creating accounts...');
  
  await prisma.$executeRaw`
    INSERT INTO "Account" (id, name, "accountNumber", "bankName", currency, balance, "isActive", "managerId", "createdAt", "updatedAt")
    VALUES 
    ('account1', '기업 주거래 계좌', '110-123-456789', '신한은행', 'KRW', 50000000, true, 'user1', NOW(), NOW()),
    ('account2', '외화 전용 계좌', '110-987-654321', '신한은행', 'USD', 15000, true, 'user2', NOW(), NOW())
  `;

  console.log('✅ Created 2 accounts');

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

  // Generate bookings for Feb-Apr 2025
  let bookingInserts: string[] = [];
  let bookingCounter = 1;

  for (let month = 1; month < 4; month++) {
    for (let i = 0; i < 10; i++) {
      const day = Math.floor(Math.random() * 28) + 1;
      const startDate = `2025-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const duration = Math.floor(Math.random() * 5) + 2;
      const endDateObj = new Date(2025, month, day + duration);
      const endDate = `${endDateObj.getFullYear()}-${String(endDateObj.getMonth() + 1).padStart(2, '0')}-${String(endDateObj.getDate()).padStart(2, '0')}`;

      const destination = destinations[Math.floor(Math.random() * destinations.length)];
      const teamType = teamTypes[Math.floor(Math.random() * teamTypes.length)];
      
      const bookingTypes = ['PACKAGE', 'FIT', 'GROUP', 'BUSINESS'];
      const bookingType = bookingTypes[Math.floor(Math.random() * bookingTypes.length)];
      
      const statuses = ['PENDING', 'CONFIRMED', 'CANCELLED'];
      const status = statuses[Math.random() < 0.7 ? 1 : Math.random() < 0.9 ? 0 : 2];
      
      const createdBy = ['user1', 'user2', 'user3', 'user4', 'user5'][Math.floor(Math.random() * 5)];

      let paxCount = 2;
      if (teamType.includes('가족')) paxCount = Math.floor(Math.random() * 4) + 3;
      else if (teamType.includes('단체') || teamType.includes('수학')) paxCount = Math.floor(Math.random() * 20) + 15;
      else if (teamType.includes('동호회') || teamType.includes('워크샵')) paxCount = Math.floor(Math.random() * 10) + 8;
      else if (teamType.includes('신혼')) paxCount = 2;
      else paxCount = Math.floor(Math.random() * 6) + 2;

      const isOverseas = destination.includes('일본') || destination.includes('베트남') ||
        destination.includes('태국') || destination.includes('싱가포르') ||
        destination.includes('홍콩') || destination.includes('대만') || destination.includes('필리핀');

      const basePrice = isOverseas ? 600000 : 200000;
      const pricePerPerson = basePrice + Math.floor(Math.random() * 150000);
      const totalPrice = pricePerPerson * paxCount;
      const depositAmount = Math.floor(totalPrice * 0.3);

      const lastNames = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임'];
      const firstNames = ['민수', '지영', '준혁', '서연', '태호', '은영', '동현', '수빈', '현우', '미영'];
      const customerName = lastNames[Math.floor(Math.random() * lastNames.length)] +
        firstNames[Math.floor(Math.random() * firstNames.length)];

      const bookingNumber = `BK2025${String(month + 1).padStart(2, '0')}${String(bookingCounter++).padStart(3, '0')}`;
      
      bookingInserts.push(`
        ('booking${bookingCounter - 1}', '${bookingNumber}', '${customerName}', '${destination} ${teamType}', 
         '${bookingType}', '${destination}', '${startDate}', '${endDate}', 
         ${paxCount}, ${duration - 1}, ${duration}, '${status}', 
         ${totalPrice}, ${depositAmount}, 'KRW', '${teamType} 상품 - ${paxCount}명', 
         NOW(), NOW(), '${createdBy}')
      `);
    }
  }

  // Insert bookings using individual inserts for compatibility
  for (let i = 0; i < bookingInserts.length; i++) {
    const values = bookingInserts[i].trim();
    await prisma.$executeRawUnsafe(`
      INSERT INTO "Booking" (id, "bookingNumber", "customerName", "teamName", "bookingType", destination, 
                            "startDate", "endDate", "paxCount", nights, days, status, 
                            "totalPrice", "depositAmount", currency, notes, "createdAt", "updatedAt", "createdBy")
      VALUES ${values}
    `);
  }

  console.log(`✅ Created ${bookingInserts.length} bookings`);

  // 4. 거래 내역 생성
  console.log('💰 Creating transactions...');

  // Get confirmed bookings using raw query
  const confirmedBookings = await prisma.$queryRaw`
    SELECT * FROM "Booking" WHERE status = 'CONFIRMED' LIMIT 15
  ` as any[];

  let transactionInserts: string[] = [];
  let transactionCounter = 1;

  for (const booking of confirmedBookings) {
    // 계약금 입금
    if (booking.depositAmount) {
      transactionInserts.push(`
        ('tx${transactionCounter}', 'TX2025${String(transactionCounter++).padStart(4, '0')}', 
         'DEPOSIT', ${booking.depositAmount}, 'KRW', '${booking.bookingNumber} 계약금', 
         'account1', '${booking.id}', '${booking.createdBy}', NOW(), NOW())
      `);
    }

    // 잔금 입금 (50% 확률)
    if (Math.random() < 0.5) {
      const balance = Number(booking.totalPrice) - Number(booking.depositAmount || 0);
      transactionInserts.push(`
        ('tx${transactionCounter}', 'TX2025${String(transactionCounter++).padStart(4, '0')}', 
         'DEPOSIT', ${balance}, 'KRW', '${booking.bookingNumber} 잔금', 
         'account1', '${booking.id}', '${booking.createdBy}', NOW(), NOW())
      `);
    }
  }

  if (transactionInserts.length > 0) {
    for (const values of transactionInserts) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "Transaction" (id, "transactionNumber", type, amount, currency, description, 
                                  "accountId", "bookingId", "userId", "transactionDate", "createdAt")
        VALUES ${values.trim()}
      `);
    }
    console.log(`✅ Created ${transactionInserts.length} transactions`);
  }

  // 5. 예약 히스토리 생성
  console.log('📝 Creating booking history...');

  const historyBookings = confirmedBookings.slice(0, 10);
  if (historyBookings.length > 0) {
    let historyInserts: string[] = [];
    
    historyBookings.forEach((booking, index) => {
      historyInserts.push(`
        ('history${index + 1}', '${booking.id}', 'STATUS_CHANGE', 
         '["status"]'::jsonb, '{"status": "PENDING"}'::jsonb, '{"status": "CONFIRMED"}'::jsonb, 
         NOW(), '${booking.createdBy}')
      `);
    });

    for (const values of historyInserts) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "BookingHistory" (id, "bookingId", action, "changedFields", "previousValues", "newValues", "changedAt", "changedBy")
        VALUES ${values.trim()}
      `);
    }
    console.log(`✅ Created ${historyInserts.length} booking history entries`);
  }

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });