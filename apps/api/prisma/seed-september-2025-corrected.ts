import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { addDays, setHours, setMinutes } from 'date-fns';

const prisma = new PrismaClient();

// September 2025 date range
const SEPTEMBER_2025_START = new Date('2025-09-01T00:00:00Z');
const SEPTEMBER_2025_END = new Date('2025-09-30T23:59:59Z');

// Company configurations with realistic booking patterns
const COMPANY_CONFIGS = [
  {
    companyCode: 'J1',
    bookingsCount: 300,
    teams: ['영업팀', '개발팀', '마케팅팀', '인사팀', '재무팀'],
    customers: ['삼성전자', 'LG전자', '현대자동차', 'SK하이닉스', '네이버', '카카오', '쿠팡', '배달의민족'],
    destinations: ['서울', '부산', '제주', '강릉', '경주', '전주', '여수', '대구', '인천', '광주'],
    managers: ['J1 매니저1', 'J1 관리자', 'J1 일반사용자'],
    userIds: ['j1_manager_001', 'j1_admin_001', 'j1_user_001']
  },
  {
    companyCode: 'HAPPY',
    bookingsCount: 300,
    teams: ['고객지원팀', '영업팀', '기획팀', '디자인팀', '운영팀'],
    customers: ['현대백화점', '롯데백화점', '신세계', 'CJ그룹', '포스코', '한화그룹', 'GS그룹', '두산그룹'],
    destinations: ['서울', '제주', '부산', '경주', '속초', '가평', '양평', '춘천', '평창', '정동진'],
    managers: ['HAPPY 관리자', 'HAPPY 매니저'],
    userIds: ['happy_admin_001', 'happy_manager_001']
  },
  {
    companyCode: 'STAR',
    bookingsCount: 300,
    teams: ['제작팀', '연출팀', '마케팅팀', '홍보팀', 'A&R팀'],
    customers: ['YG엔터', 'SM엔터', 'JYP엔터', 'HYBE', '안테나', '카카오엔터', 'CJ ENM', 'JTBC'],
    destinations: ['서울', '제주', '부산', '강릉', '파주', '남양주', '양평', '가평', '춘천', '대전'],
    managers: ['STAR 관리자', 'STAR 매니저'],
    userIds: ['star_admin_001', 'star_manager_001']
  },
  {
    companyCode: 'ENTRIP_MAIN',
    bookingsCount: 300,
    teams: ['플랫폼개발팀', '비즈니스팀', '운영팀', '고객성공팀', '데이터팀'],
    customers: ['내부행사', '파트너사', '협력업체', 'B2B고객사', '투자사', '정부기관', '스타트업', '대기업'],
    destinations: ['서울', '판교', '강남', '을지로', '성수', '한남', '제주', '부산', '대구', '광주'],
    managers: ['ENTRIP 관리자', 'ENTRIP 매니저1', 'ENTRIP 운영자'],
    userIds: ['entrip_admin_001', 'entrip_manager_001', 'entrip_operator_001']
  }
];

// Status distribution: 70% CONFIRMED, 20% PENDING, 10% CANCELLED
const getRandomStatus = (): 'CONFIRMED' | 'PENDING' | 'CANCELLED' => {
  const rand = Math.random();
  if (rand < 0.7) return 'CONFIRMED';
  if (rand < 0.9) return 'PENDING';
  return 'CANCELLED';
};

// Generate random date in September 2025
const getRandomSeptemberDate = (): Date => {
  const dayOffset = Math.floor(Math.random() * 30); // 0-29 days
  return addDays(SEPTEMBER_2025_START, dayOffset);
};

// Generate booking duration (1-5 days)
const getBookingDuration = (): number => {
  const weights = [0.4, 0.3, 0.2, 0.08, 0.02]; // 1day: 40%, 2days: 30%, 3days: 20%, 4days: 8%, 5days: 2%
  const rand = Math.random();
  let cumulative = 0;
  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i];
    if (rand < cumulative) return i + 1;
  }
  return 1;
};

// Generate team size
const getTeamSize = (): number => {
  return faker.number.int({ min: 5, max: 50 });
};

// Generate cost with realistic ranges (in KRW)
const generateCosts = (teamSize: number, duration: number) => {
  const perPersonDaily = faker.number.int({ min: 100000, max: 500000 });
  const estimatedTotalCost = perPersonDaily * teamSize * duration;
  const finalCost = estimatedTotalCost * (0.9 + Math.random() * 0.2); // ±10% variation
  
  return {
    estimatedTotalCost: Math.round(estimatedTotalCost),
    finalCost: Math.round(finalCost)
  };
};

// Generate unique booking number
const generateBookingNumber = (companyCode: string, index: number): string => {
  return `${companyCode}-2025-09-${String(index + 1).padStart(4, '0')}`;
};

async function seedSeptember2025Corrected() {
  console.log('🌱 Starting September 2025 seed data generation (Corrected Version)...');
  console.log(`📅 Date range: ${SEPTEMBER_2025_START.toISOString()} to ${SEPTEMBER_2025_END.toISOString()}`);

  try {
    // First, verify users exist for each company
    for (const config of COMPANY_CONFIGS) {
      const users = await prisma.user.findMany({
        where: { companyCode: config.companyCode }
      });
      
      if (users.length === 0) {
        console.error(`❌ No users found for company ${config.companyCode}. Please run user creation first.`);
        return;
      }
      console.log(`✅ Found ${users.length} users for ${config.companyCode}`);
    }

    // Generate bookings for each company
    let totalCreated = 0;
    
    for (const config of COMPANY_CONFIGS) {
      console.log(`\n🏢 Generating ${config.bookingsCount} bookings for ${config.companyCode}...`);
      
      // Create bookings in batches of 50 to avoid memory issues
      const batchSize = 50;
      const totalBatches = Math.ceil(config.bookingsCount / batchSize);
      let companyTotal = 0;
      
      for (let batch = 0; batch < totalBatches; batch++) {
        const batchStart = batch * batchSize;
        const batchEnd = Math.min((batch + 1) * batchSize, config.bookingsCount);
        const batchBookings = [];
        
        for (let i = batchStart; i < batchEnd; i++) {
          const startDate = getRandomSeptemberDate();
          const duration = getBookingDuration();
          const endDate = addDays(startDate, duration - 1);
          const teamSize = getTeamSize();
          const { estimatedTotalCost, finalCost } = generateCosts(teamSize, duration);
          const status = getRandomStatus();
          
          // Set times: check-in at 14:00, check-out at 11:00
          const startDateTime = setMinutes(setHours(startDate, 14), 0);
          const endDateTime = setMinutes(setHours(endDate, 11), 0);
          
          // Match the actual database schema
          const booking = {
            id: `${config.companyCode.toLowerCase()}_booking_${Date.now()}_${i}`,
            bookingNumber: generateBookingNumber(config.companyCode, i),
            companyCode: config.companyCode,
            customerName: faker.helpers.arrayElement(config.customers),
            teamName: faker.helpers.arrayElement(config.teams),
            teamType: 'GROUP', // matches database default
            bookingType: 'PACKAGE' as const, // Required BookingType enum field
            origin: '서울', // matches database requirement
            destination: faker.helpers.arrayElement(config.destinations),
            startDate: startDateTime,
            endDate: endDateTime,
            paxCount: teamSize,
            nights: duration - 1,
            days: duration,
            status: status as any,
            manager: faker.helpers.arrayElement(config.managers),
            
            // Customer contact info
            representative: `${faker.person.lastName()}${faker.person.firstName()}`,
            contact: faker.phone.number(),
            email: faker.internet.email(),
            
            // Financial info
            totalPrice: finalCost,
            depositAmount: status === 'CONFIRMED' ? Math.round(finalCost * 0.3) : null,
            currency: 'KRW',
            
            // Additional info
            notes: Math.random() > 0.7 ? faker.lorem.sentence() : null,
            memo: Math.random() > 0.8 ? `${faker.lorem.sentence().substring(0, 100)}` : null,
            
            // Metadata
            createdAt: faker.date.between({ 
              from: new Date('2025-08-01'), 
              to: new Date('2025-08-31') 
            }),
            updatedAt: new Date(),
            version: 1,
            
            // User assignment (createdBy is required for foreign key)
            createdBy: faker.helpers.arrayElement(config.userIds),
          };
          
          batchBookings.push(booking);
        }
        
        // Insert batch
        const created = await prisma.booking.createMany({
          data: batchBookings,
          skipDuplicates: true
        });
        
        companyTotal += created.count;
        console.log(`   Batch ${batch + 1}/${totalBatches}: Created ${created.count} bookings`);
      }
      
      totalCreated += companyTotal;
      console.log(`✅ Total created for ${config.companyCode}: ${companyTotal} bookings`);
      
      // Show sample of created bookings
      const samples = await prisma.booking.findMany({
        where: { 
          companyCode: config.companyCode,
          startDate: { gte: SEPTEMBER_2025_START, lte: SEPTEMBER_2025_END }
        },
        take: 3,
        orderBy: { createdAt: 'desc' }
      });
      
      console.log(`📋 Sample bookings for ${config.companyCode}:`);
      samples.forEach(s => {
        console.log(`   - ${s.teamName} → ${s.destination} (${s.startDate.toLocaleDateString()} - ${s.endDate.toLocaleDateString()}) [${s.status}]`);
      });
    }
    
    // Final statistics
    console.log('\n📊 September 2025 Seed Data Summary:');
    console.log('=====================================');
    
    for (const config of COMPANY_CONFIGS) {
      const stats = await prisma.booking.groupBy({
        by: ['status'],
        where: { 
          companyCode: config.companyCode,
          startDate: { gte: SEPTEMBER_2025_START, lte: SEPTEMBER_2025_END }
        },
        _count: true
      });
      
      console.log(`\n${config.companyCode}:`);
      stats.forEach(stat => {
        console.log(`  ${stat.status}: ${stat._count} bookings`);
      });
      
      const total = stats.reduce((sum, stat) => sum + stat._count, 0);
      console.log(`  TOTAL: ${total} bookings`);
    }
    
    // Overall database statistics
    const overallCount = await prisma.booking.count({
      where: {
        startDate: { gte: SEPTEMBER_2025_START, lte: SEPTEMBER_2025_END }
      }
    });
    
    console.log('\n✅ September 2025 seed data generation completed!');
    console.log(`📈 Total bookings created: ${totalCreated}`);
    console.log(`📊 Database total for September 2025: ${overallCount} bookings`);
    
  } catch (error) {
    console.error('❌ Error seeding September 2025 data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed
seedSeptember2025Corrected()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });