const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Minimal booking data generator
const companies = ['j1', 'star', 'happy', 'ENTRIP_MAIN'];

const destinations = [
  '도쿄', '오사카', '교토', '후쿠오카', '삿포로', '나고야', 
  '방콕', '파타야', '푸켓', '치앙마이', '호치민', '다낭', 
  '하노이', '나트랑', '홍콩', '마카오', '대만', '세부', 
  '보라카이', '팔라완', '싱가포르', '쿠알라룸푸르', '코타키나발루',
  '발리', '자카르타', '롬복', '시드니', '멜버른', '골드코스트',
  '뉴질랜드', '그리스', '터키', '이탈리아', '프랑스', '스페인'
];

const origins = ['서울', '부산', '제주', '대구', '광주', '인천'];

// Database-compatible enum values
const bookingTypes = ['incentive', 'golf', 'honeymoon', 'airtel', 'etc'];
const statuses = ['pending', 'confirmed', 'done', 'cancelled'];

const coordinators = [
  '김매니저', '박팀장', '이부장', '최과장', '정대리', '한주임',
  '송매니저', '유팀장', '임부장', '조과장', '신대리', '홍주임'
];

const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

const getRandomDate = (start, end) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

const generateMinimalBookingData = async () => {
  console.log('🌱 Starting minimal booking data generation...');
  
  let totalBookings = 0;
  
  for (const companyCode of companies) {
    console.log(`\n📊 Generating bookings for ${companyCode}...`);
    
    for (let month = 0; month < 3; month++) {
      const startDate = new Date(2025, month + 1, 1); // Jan, Feb, Mar 2025
      const endDate = new Date(2025, month + 2, 0);
      
      for (let i = 1; i <= 100; i++) {
        const bookingStartDate = getRandomDate(startDate, endDate);
        const days = Math.floor(Math.random() * 10) + 3;
        const bookingEndDate = new Date(bookingStartDate);
        bookingEndDate.setDate(bookingEndDate.getDate() + days);
        
        const paxCount = Math.floor(Math.random() * 50) + 1;
        const origin = getRandomElement(origins);
        const destination = getRandomElement(destinations);
        const bookingType = getRandomElement(bookingTypes);
        const status = getRandomElement(statuses);
        const coordinator = getRandomElement(coordinators);
        
        // Generate revenue between 500,000 and 10,000,000 KRW
        const revenue = Math.floor(Math.random() * 9500000) + 500000;
        
        // Only include required fields
        const bookingData = {
          id: `${companyCode}_${String(month + 1).padStart(2, '0')}_${String(i).padStart(3, '0')}`,
          teamName: `${destination} ${getRandomElement(['여행단', '관광단', '연수단', '투어그룹', '여행팀'])}`,
          type: bookingType,
          origin: origin,
          destination: destination,
          startDate: bookingStartDate,
          endDate: bookingEndDate,
          totalPax: paxCount,
          coordinator: coordinator,
          status: status,
          companyCode: companyCode,
          updatedAt: new Date()  // Required field
        };

        // Optional fields (only if revenue exists)
        if (revenue) {
          bookingData.revenue = revenue;
        }

        try {
          await prisma.booking.create({
            data: bookingData
          });
          totalBookings++;
          
          if (totalBookings % 100 === 0) {
            console.log(`  ✅ ${totalBookings} bookings created so far...`);
          }
        } catch (error) {
          console.error(`❌ Error creating booking ${bookingData.id}:`, error.message);
          // Log first few errors to understand the issue
          if (totalBookings < 3) {
            console.error(`Full error:`, error);
          }
        }
      }
      
      console.log(`  📅 Month ${month + 1}: 100 bookings attempted for ${companyCode}`);
    }
    
    console.log(`✅ Completed ${companyCode} processing`);
  }

  console.log(`\n🎉 Minimal booking data generation completed!`);
  console.log(`📊 Total bookings created: ${totalBookings}`);
  console.log(`🏢 Companies: ${companies.length}`);
  console.log(`📅 Months per company: 3`);
  console.log(`📋 Bookings per month: 100`);
};

async function main() {
  console.log('🚀 Starting minimal booking data seed...');
  
  try {
    await generateMinimalBookingData();
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });