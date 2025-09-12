import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { startOfMonth, endOfMonth, addDays, setHours, setMinutes } from 'date-fns';

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
    locations: ['서울', '부산', '제주', '강릉', '경주', '전주', '여수', '대구', '인천', '광주'],
    purposes: ['워크샵', '세미나', '팀빌딩', '신입사원 연수', '리더십 교육', '전략회의', '성과공유회', '송년회 준비'],
    managerEmails: ['manager1@j1.com', 'manager2@j1.com', 'manager3@j1.com']
  },
  {
    companyCode: 'HAPPY',
    bookingsCount: 300,
    teams: ['고객지원팀', '영업팀', '기획팀', '디자인팀', '운영팀'],
    customers: ['현대백화점', '롯데백화점', '신세계', 'CJ그룹', '포스코', '한화그룹', 'GS그룹', '두산그룹'],
    locations: ['서울', '제주', '부산', '경주', '속초', '가평', '양평', '춘천', '평창', '정동진'],
    purposes: ['고객 접대', 'VIP 투어', '직원 복지', '팀 워크샵', '교육 연수', '프로젝트 킥오프', '분기 회의'],
    managerEmails: ['happy_manager1@happy.com', 'happy_manager2@happy.com']
  },
  {
    companyCode: 'STAR',
    bookingsCount: 300,
    teams: ['제작팀', '연출팀', '마케팅팀', '홍보팀', 'A&R팀'],
    customers: ['YG엔터', 'SM엔터', 'JYP엔터', 'HYBE', '안테나', '카카오엔터', 'CJ ENM', 'JTBC'],
    locations: ['서울', '제주', '부산', '강릉', '파주', '남양주', '양평', '가평', '춘천', '대전'],
    purposes: ['뮤직비디오 촬영', '콘서트 준비', '팬미팅', '앨범 제작회의', '아티스트 워크샵', '스태프 회의', '기획 미팅'],
    managerEmails: ['star_manager@star.com', 'star_coordinator@star.com']
  },
  {
    companyCode: 'ENTRIP_MAIN',
    bookingsCount: 300,
    teams: ['플랫폼개발팀', '비즈니스팀', '운영팀', '고객성공팀', '데이터팀'],
    customers: ['내부행사', '파트너사', '협력업체', 'B2B고객사', '투자사', '정부기관', '스타트업', '대기업'],
    locations: ['서울', '판교', '강남', '을지로', '성수', '한남', '제주', '부산', '대구', '광주'],
    purposes: ['전사회의', '제품발표회', '파트너미팅', '투자자미팅', '직원교육', '해커톤', '네트워킹', '서비스런칭'],
    managerEmails: ['admin@entrip.com', 'manager@entrip.com', 'operator@entrip.com']
  }
];

// Transportation options
const TRANSPORTATION_TYPES = ['버스', '기차', '항공', '자차', '렌터카', '도보'];

// Accommodation types
const ACCOMMODATION_TYPES = ['호텔', '리조트', '펜션', '게스트하우스', '에어비앤비', '콘도'];

// Status distribution: 70% CONFIRMED, 20% PENDING, 10% CANCELLED
const getRandomStatus = () => {
  const rand = Math.random();
  if (rand < 0.7) return 'CONFIRMED';
  if (rand < 0.9) return 'PENDING';
  return 'CANCELLED';
};

// Generate random date in September 2025
const getRandomSeptemberDate = () => {
  const dayOffset = Math.floor(Math.random() * 30); // 0-29 days
  return addDays(SEPTEMBER_2025_START, dayOffset);
};

// Generate booking duration (1-5 days)
const getBookingDuration = () => {
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
const getTeamSize = () => {
  return faker.number.int({ min: 5, max: 50 });
};

// Generate cost with realistic ranges
const generateCosts = (teamSize: number, duration: number) => {
  const perPersonDaily = faker.number.int({ min: 100000, max: 500000 });
  const estimatedTotalCost = perPersonDaily * teamSize * duration;
  const finalCost = estimatedTotalCost * (0.9 + Math.random() * 0.2); // ±10% variation
  
  return {
    estimatedTotalCost: Math.round(estimatedTotalCost),
    finalCost: Math.round(finalCost)
  };
};

async function seedSeptember2025() {
  console.log('🌱 Starting September 2025 seed data generation...');
  console.log(`📅 Date range: ${SEPTEMBER_2025_START.toISOString()} to ${SEPTEMBER_2025_END.toISOString()}`);

  try {
    // First, verify users exist for each company
    for (const config of COMPANY_CONFIGS) {
      const users = await prisma.user.findMany({
        where: { companyCode: config.companyCode }
      });
      
      if (users.length === 0) {
        console.error(`❌ No users found for company ${config.companyCode}. Please run user seed first.`);
        return;
      }
      console.log(`✅ Found ${users.length} users for ${config.companyCode}`);
    }

    // Generate bookings for each company
    let totalCreated = 0;
    
    for (const config of COMPANY_CONFIGS) {
      console.log(`\n🏢 Generating ${config.bookingsCount} bookings for ${config.companyCode}...`);
      
      const bookings = [];
      
      for (let i = 0; i < config.bookingsCount; i++) {
        const startDate = getRandomSeptemberDate();
        const duration = getBookingDuration();
        const endDate = addDays(startDate, duration - 1);
        const teamSize = getTeamSize();
        const { estimatedTotalCost, finalCost } = generateCosts(teamSize, duration);
        const status = getRandomStatus();
        
        // Set times: check-in at 14:00, check-out at 11:00
        const startDateTime = setMinutes(setHours(startDate, 14), 0);
        const endDateTime = setMinutes(setHours(endDate, 11), 0);
        
        const booking = {
          companyCode: config.companyCode,
          bookingType: 'TEAM_PACKAGE' as const,
          status: status as any,
          teamName: faker.helpers.arrayElement(config.teams),
          customerName: faker.helpers.arrayElement(config.customers),
          purpose: faker.helpers.arrayElement(config.purposes),
          
          // Dates in September 2025
          startDate: startDateTime,
          endDate: endDateTime,
          
          // Location details
          destination: faker.helpers.arrayElement(config.locations),
          accommodation: faker.helpers.arrayElement(ACCOMMODATION_TYPES),
          transportation: faker.helpers.arrayElement(TRANSPORTATION_TYPES),
          
          // Team details
          teamSize: teamSize,
          estimatedTotalCost: estimatedTotalCost,
          finalCost: status === 'CONFIRMED' ? finalCost : null,
          
          // Manager assignment
          managerEmail: faker.helpers.arrayElement(config.managerEmails),
          managerName: `${config.companyCode} 담당자 ${i % 3 + 1}`,
          managerPhone: faker.phone.number('010-####-####'),
          
          // Additional details
          specialRequests: Math.random() > 0.7 ? faker.lorem.sentence() : null,
          internalNotes: Math.random() > 0.8 ? `내부 메모: ${faker.lorem.sentence()}` : null,
          paymentMethod: faker.helpers.arrayElement(['계좌이체', '카드결제', '현금', '후불정산']),
          paymentStatus: status === 'CONFIRMED' 
            ? faker.helpers.arrayElement(['PAID', 'PENDING', 'PARTIAL'])
            : 'PENDING',
          
          // Metadata
          createdAt: faker.date.between({ 
            from: new Date('2025-08-01'), 
            to: new Date('2025-08-31') 
          }),
          updatedAt: new Date(),
          
          // Reference numbers
          referenceNumber: `${config.companyCode}-2025-09-${String(i + 1).padStart(4, '0')}`,
          contractNumber: status === 'CONFIRMED' 
            ? `CONTRACT-${config.companyCode}-${Date.now()}-${i}`
            : null
        };
        
        bookings.push(booking);
      }
      
      // Batch insert for better performance
      const created = await prisma.booking.createMany({
        data: bookings,
        skipDuplicates: true
      });
      
      totalCreated += created.count;
      console.log(`✅ Created ${created.count} bookings for ${config.companyCode}`);
      
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
    
    console.log('\n✅ September 2025 seed data generation completed!');
    console.log(`📈 Total bookings created: ${totalCreated}`);
    
  } catch (error) {
    console.error('❌ Error seeding September 2025 data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed
seedSeptember2025()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });