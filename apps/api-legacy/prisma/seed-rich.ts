import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// 한국 도시/지역 목록
const koreanCities = [
  '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종',
  '제주', '강릉', '경주', '여수', '전주', '통영', '포항', '안동'
];

// 해외 인기 여행지
const destinations = [
  '도쿄', '오사카', '교토', '후쿠오카', '삿포로',
  '방콕', '치앙마이', '푸켓', '파타야',
  '싱가포르', '쿠알라룸푸르', '페낭',
  '하노이', '호치민', '다낭', '나트랑',
  '홍콩', '마카오', '상하이', '베이징',
  '타이베이', '가오슝',
  '발리', '자카르타',
  '마닐라', '세부', '보라카이',
  '하와이', '괌', '사이판',
  '파리', '런던', '로마', '바르셀로나',
  '뉴욕', '로스앤젤레스', '샌프란시스코',
  '시드니', '멜버른', '골드코스트'
];

// 항공사 목록
const airlines = [
  '대한항공', '아시아나항공', '진에어', '에어부산', '제주항공',
  '티웨이항공', '이스타항공', '에어프레미아'
];

// 호텔 체인
const hotelChains = [
  '힐튼', '하얏트', '메리어트', '쉐라톤', '인터컨티넨탈',
  '페닌슐라', '콘래드', '그랜드하얏트', '롯데호텔', '신라호텔'
];

// 팀 타입
const teamTypes = ['GOLF', 'INCENTIVE', 'HONEYMOON', 'AIRTEL', 'FIT', 'GROUP', 'MICE'];

// 예약 상태
const bookingStatuses = ['PENDING', 'CONFIRMED', 'CANCELLED'];

// 팀명 생성 함수
function generateTeamName(type: string): string {
  const prefixes = {
    GOLF: ['골프', '그린', '버디', '이글', '홀인원'],
    INCENTIVE: ['성과', '우수', '베스트', '엘리트', '프리미엄'],
    HONEYMOON: ['러브', '스위트', '로맨틱', '허니', '웨딩'],
    AIRTEL: ['자유', '편안한', '힐링', '휴식', '프리'],
    FIT: ['개별', '맞춤', '프라이빗', '커스텀', '특별'],
    GROUP: ['단체', '모임', '클럽', '동호회', '협회'],
    MICE: ['컨퍼런스', '세미나', '포럼', '심포지엄', '워크샵']
  };
  
  const suffixes = ['여행', '투어', '트립', '팀', '그룹'];
  const prefix = prefixes[type][Math.floor(Math.random() * prefixes[type].length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  
  return `${prefix} ${suffix}`;
}

// 날짜 생성 함수 (과거 30일 ~ 미래 90일)
function generateDate(startOffset: number, endOffset: number): Date {
  const start = new Date();
  start.setDate(start.getDate() + startOffset);
  const end = new Date();
  end.setDate(end.getDate() + endOffset);
  
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function main() {
  console.log('🌱 Seeding rich dummy data...');

  // 기존 데이터 삭제
  await prisma.booking.deleteMany();
  await prisma.user.deleteMany();

  // 사용자 생성
  const users = [];
  const managers = ['김철수', '이영희', '박민수', '정수현', '최지우', '강민준'];
  
  for (const name of managers) {
    const user = await prisma.user.create({
      data: {
        email: `${name.toLowerCase().replace(/\s/g, '')}@entrip.co.kr`,
        password: await bcrypt.hash('password123', 10),
        name,
        role: 'MANAGER',
        phone: faker.phone.number('010-####-####'),
      },
    });
    users.push(user);
  }

  // 예약 생성 (200개)
  const bookings = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30); // 30일 전부터
  
  for (let i = 0; i < 200; i++) {
    const teamType = teamTypes[Math.floor(Math.random() * teamTypes.length)];
    const destination = destinations[Math.floor(Math.random() * destinations.length)];
    const origin = koreanCities[Math.floor(Math.random() * 3)]; // 주로 서울, 부산, 대구에서 출발
    
    // 여행 기간 (2~14일)
    const tripDuration = Math.floor(Math.random() * 13) + 2;
    const departureDate = generateDate(-30, 90);
    const returnDate = new Date(departureDate);
    returnDate.setDate(returnDate.getDate() + tripDuration);
    
    // 인원수
    const paxCount = teamType === 'HONEYMOON' ? 2 : 
                     teamType === 'FIT' ? Math.floor(Math.random() * 4) + 1 :
                     teamType === 'GROUP' ? Math.floor(Math.random() * 30) + 20 :
                     Math.floor(Math.random() * 15) + 5;
    
    const booking = await prisma.booking.create({
      data: {
        code: `ENT${new Date().getFullYear()}${String(i + 1).padStart(5, '0')}`,
        title: `${generateTeamName(teamType)} - ${destination}`,
        type: teamType,
        status: Math.random() > 0.2 ? 'CONFIRMED' : 
                Math.random() > 0.5 ? 'PENDING' : 'CANCELLED',
        startDate: departureDate,
        endDate: returnDate,
        origin,
        destination,
        paxCount,
        adultCount: teamType === 'HONEYMOON' ? 2 : Math.floor(paxCount * 0.8),
        childCount: teamType === 'HONEYMOON' ? 0 : Math.floor(paxCount * 0.15),
        infantCount: teamType === 'HONEYMOON' ? 0 : paxCount - Math.floor(paxCount * 0.8) - Math.floor(paxCount * 0.15),
        
        // 항공 정보
        airline: airlines[Math.floor(Math.random() * airlines.length)],
        flightNumber: `${faker.string.alpha({ length: 2, casing: 'upper' })}${faker.number.int({ min: 100, max: 999 })}`,
        departureTime: faker.date.between({ 
          from: departureDate, 
          to: new Date(departureDate.getTime() + 24 * 60 * 60 * 1000) 
        }).toISOString(),
        
        // 호텔 정보
        hotelName: `${hotelChains[Math.floor(Math.random() * hotelChains.length)]} ${destination}`,
        hotelAddress: faker.location.streetAddress(),
        roomType: ['SINGLE', 'DOUBLE', 'TWIN', 'SUITE'][Math.floor(Math.random() * 4)],
        roomCount: Math.ceil(paxCount / 2),
        
        // 가격 정보
        totalAmount: paxCount * (Math.floor(Math.random() * 2000000) + 500000),
        depositAmount: paxCount * (Math.floor(Math.random() * 300000) + 100000),
        balanceAmount: 0,
        currency: 'KRW',
        
        // 기타 정보
        notes: faker.lorem.sentences(2),
        specialRequests: Math.random() > 0.7 ? faker.lorem.sentence() : null,
        
        // 담당자
        managerId: users[Math.floor(Math.random() * users.length)].id,
        managerName: users[Math.floor(Math.random() * users.length)].name,
        
        // 고객 정보
        customerName: faker.person.fullName(),
        customerPhone: faker.phone.number('010-####-####'),
        customerEmail: faker.internet.email(),
        
        createdAt: new Date(departureDate.getTime() - 30 * 24 * 60 * 60 * 1000), // 출발 30일 전 생성
        updatedAt: new Date(),
      },
    });
    
    bookings.push(booking);
    
    if ((i + 1) % 10 === 0) {
      console.log(`✅ Created ${i + 1} bookings...`);
    }
  }

  console.log(`✅ Created ${bookings.length} bookings`);
  console.log(`✅ Created ${users.length} users`);
  console.log('✅ Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });