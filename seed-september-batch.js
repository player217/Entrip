// Simple Node.js script to seed bookings directly using SQL
const { execSync } = require('child_process');

// Company configurations
const companies = [
  {
    code: 'J1',
    teams: ['영업팀', '개발팀', '마케팅팀', '인사팀', '재무팀'],
    customers: ['삼성전자', 'LG전자', '현대자동차', 'SK하이닉스', '네이버', '카카오', '쿠팡'],
    destinations: ['서울', '부산', '제주', '강릉', '경주', '전주', '여수', '대구', '인천', '광주'],
    managers: ['J1 관리자', 'J1 매니저1', 'J1 일반사용자']
  },
  {
    code: 'HAPPY',
    teams: ['고객지원팀', '영업팀', '기획팀', '디자인팀', '운영팀'],
    customers: ['현대백화점', '롯데백화점', '신세계', 'CJ그룹', '포스코', '한화그룹'],
    destinations: ['서울', '제주', '부산', '경주', '속초', '가평', '양평', '춘천'],
    managers: ['HAPPY 관리자', 'HAPPY 매니저']
  },
  {
    code: 'STAR',
    teams: ['제작팀', '연출팀', '마케팅팀', '홍보팀', 'A&R팀'],
    customers: ['YG엔터', 'SM엔터', 'JYP엔터', 'HYBE', '안테나', '카카오엔터'],
    destinations: ['서울', '제주', '부산', '강릉', '파주', '남양주', '양평', '가평'],
    managers: ['STAR 관리자', 'STAR 매니저']
  },
  {
    code: 'ENTRIP_MAIN',
    teams: ['플랫폼개발팀', '비즈니스팀', '운영팀', '고객성공팀', '데이터팀'],
    customers: ['내부행사', '파트너사', '협력업체', 'B2B고객사', '투자사', '정부기관'],
    destinations: ['서울', '판교', '강남', '을지로', '성수', '한남', '제주', '부산'],
    managers: ['ENTRIP 관리자', 'ENTRIP 매니저1', 'ENTRIP 운영자']
  }
];

// Helper functions
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomDate = () => {
  const day = randomInt(1, 30);
  return `2025-09-${String(day).padStart(2, '0')}`;
};

const getRandomStatus = () => {
  const rand = Math.random();
  if (rand < 0.7) return 'CONFIRMED';
  if (rand < 0.9) return 'PENDING';
  return 'CANCELLED';
};

// Function to execute SQL
function executeSQL(sql) {
  const command = `docker exec -i entrip-postgres-local psql -U entrip -d entrip -c "${sql.replace(/"/g, '\\"')}"`;
  try {
    const result = execSync(command, { encoding: 'utf8', cwd: '/c/Users/PC/Documents/project/Entrip' });
    return result;
  } catch (error) {
    console.error('SQL Error:', error.message);
    throw error;
  }
}

// Main seeding function
async function seedBookings() {
  console.log('🌱 Starting September 2025 booking seed...');
  
  let totalCreated = 0;
  
  for (const company of companies) {
    console.log(`\n🏢 Creating 300 bookings for ${company.code}...`);
    
    // Create bookings in batches of 50
    for (let batch = 0; batch < 6; batch++) {
      const batchStart = batch * 50;
      const batchEnd = Math.min((batch + 1) * 50, 300);
      
      console.log(`  📦 Batch ${batch + 1}/6: Creating bookings ${batchStart + 1}-${batchEnd}...`);
      
      for (let i = batchStart; i < batchEnd; i++) {
        const startDate = randomDate();
        const nights = randomInt(0, 4);
        const days = nights + 1;
        const endDate = new Date(startDate + 'T00:00:00');
        endDate.setDate(endDate.getDate() + nights);
        const endDateStr = endDate.toISOString().split('T')[0];
        
        const teamSize = randomInt(5, 50);
        const totalPrice = randomInt(100000, 500000) * teamSize * days;
        const status = getRandomStatus();
        
        const booking = {
          id: `${company.code.toLowerCase()}_booking_${Date.now()}_${i}`,
          bookingNumber: `${company.code}-2025-09-${String(i + 1).padStart(4, '0')}`,
          companyCode: company.code,
          customerName: randomChoice(company.customers),
          teamName: randomChoice(company.teams),
          teamType: 'GROUP',
          type: 'PACKAGE',
          origin: '서울',
          destination: randomChoice(company.destinations),
          startDate: `${startDate} 14:00:00`,
          endDate: `${endDateStr} 11:00:00`,
          paxCount: teamSize,
          nights: nights,
          days: days,
          status: status,
          manager: randomChoice(company.managers),
          coordinator: randomChoice(company.managers),
          representative: `Representative ${i + 1}`,
          contact: `010-${String(randomInt(1000, 9999))}-${String(randomInt(1000, 9999))}`,
          email: `customer${i + 1}@${company.code.toLowerCase()}.com`,
          totalPrice: totalPrice,
          depositAmount: status === 'CONFIRMED' ? Math.round(totalPrice * 0.3) : null,
          currency: 'KRW',
          notes: Math.random() < 0.3 ? `Special requirements for booking ${i + 1}` : null,
          memo: Math.random() < 0.2 ? `Internal memo ${i + 1}` : null
        };
        
        const sql = `INSERT INTO "Booking" (
          id, "bookingNumber", "companyCode", "customerName", "teamName", 
          "teamType", type, origin, destination, "startDate", "endDate",
          "paxCount", nights, days, status, manager, coordinator,
          representative, contact, email, "totalPrice", "depositAmount",
          currency, notes, memo, "createdAt", "updatedAt", version
        ) VALUES (
          '${booking.id}',
          '${booking.bookingNumber}',
          '${booking.companyCode}',
          '${booking.customerName}',
          '${booking.teamName}',
          '${booking.teamType}',
          '${booking.type}',
          '${booking.origin}',
          '${booking.destination}',
          '${booking.startDate}'::TIMESTAMP,
          '${booking.endDate}'::TIMESTAMP,
          ${booking.paxCount},
          ${booking.nights},
          ${booking.days},
          '${booking.status}',
          '${booking.manager}',
          '${booking.coordinator}',
          '${booking.representative}',
          '${booking.contact}',
          '${booking.email}',
          ${booking.totalPrice},
          ${booking.depositAmount || 'NULL'},
          '${booking.currency}',
          ${booking.notes ? `'${booking.notes}'` : 'NULL'},
          ${booking.memo ? `'${booking.memo}'` : 'NULL'},
          NOW(),
          NOW(),
          1
        );`;
        
        try {
          executeSQL(sql);
          totalCreated++;
        } catch (error) {
          console.error(`Failed to insert booking ${i + 1} for ${company.code}:`, error.message);
        }
      }
      
      console.log(`    ✅ Batch ${batch + 1} completed`);
    }
    
    console.log(`✅ Completed ${company.code}: 300 bookings created`);
  }
  
  // Final verification
  console.log('\n📊 Final Statistics:');
  try {
    const result = executeSQL(`
      SELECT "companyCode", status, COUNT(*) as booking_count 
      FROM "Booking" 
      WHERE "startDate" >= '2025-09-01' AND "startDate" < '2025-10-01' 
      GROUP BY "companyCode", status 
      ORDER BY "companyCode", status;
    `);
    console.log(result);
    
    const totalResult = executeSQL(`
      SELECT COUNT(*) as total_september_bookings
      FROM "Booking" 
      WHERE "startDate" >= '2025-09-01' AND "startDate" < '2025-10-01';
    `);
    console.log('Total September 2025 bookings:', totalResult);
  } catch (error) {
    console.error('Error getting statistics:', error.message);
  }
  
  console.log('\n✅ September 2025 booking seed completed!');
  console.log(`📈 Total bookings attempted: ${totalCreated}`);
}

// Run the seed
seedBookings().catch(console.error);