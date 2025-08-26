import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// 한국 도시/지역 목록
const koreanCities = [
  '서울', '부산', '대구', '인천', '광주', '대전', '울산', '제주'
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
  '파리', '런던', '로마', '바르셀로나'
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

// 팀 타입에 따른 예약 타입 매핑
const bookingTypeMap = {
  'GOLF': 'GROUP',
  'INCENTIVE': 'GROUP',
  'HONEYMOON': 'PACKAGE',
  'AIRTEL': 'PACKAGE',
  'FIT': 'FIT',
  'GROUP': 'GROUP',
  'MICE': 'BUSINESS'
};

// 팀명 생성 함수
function generateTeamName(type: string, index: number): string {
  const prefixes = {
    'GROUP': ['골프', '그린', '버디', '우수', '베스트'],
    'PACKAGE': ['러브', '스위트', '로맨틱', '허니', '자유'],
    'FIT': ['개별', '맞춤', '프라이빗', '커스텀', '특별'],
    'BUSINESS': ['컨퍼런스', '세미나', '포럼', '심포지엄', '워크샵']
  };
  
  const bookingType = bookingTypeMap[type] || 'FIT';
  const prefix = prefixes[bookingType][index % prefixes[bookingType].length];
  return `${prefix} ${index + 1}팀`;
}

// 랜덤 선택 함수
function randomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// 날짜 생성 함수
function generateDate(daysFromNow: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(0, 0, 0, 0);
  return date;
}

async function main() {
  console.log('🌱 Seeding database with dummy data...');

  try {
    // 기존 데이터 삭제
    await prisma.booking.deleteMany();
    await prisma.user.deleteMany();

    // 사용자 생성
    const managers = [
      { name: '김철수', email: 'kim@entrip.co.kr', department: '영업1팀' },
      { name: '이영희', email: 'lee@entrip.co.kr', department: '영업2팀' },
      { name: '박민수', email: 'park@entrip.co.kr', department: '기획팀' },
      { name: '정수현', email: 'jung@entrip.co.kr', department: '영업1팀' },
      { name: '최지우', email: 'choi@entrip.co.kr', department: '영업2팀' },
      { name: '강민준', email: 'kang@entrip.co.kr', department: '기획팀' }
    ];
    
    const users = [];
    for (const manager of managers) {
      const user = await prisma.user.create({
        data: {
          email: manager.email,
          password: await bcrypt.hash('password123', 10),
          name: manager.name,
          role: 'MANAGER',
          department: manager.department,
          isActive: true
        },
      });
      users.push(user);
    }
    console.log(`✅ Created ${users.length} users`);

    // 예약 생성 (100개)
    const bookings = [];
    const teamTypes = ['GOLF', 'INCENTIVE', 'HONEYMOON', 'AIRTEL', 'FIT', 'GROUP', 'MICE'];
    
    for (let i = 0; i < 100; i++) {
      const teamType = randomItem(teamTypes);
      const destination = randomItem(destinations);
      const origin = randomItem(koreanCities.slice(0, 3)); // 주로 서울, 부산, 대구에서 출발
      
      // 여행 기간 (2~14일)
      const tripDuration = Math.floor(Math.random() * 13) + 2;
      // -30일부터 +90일까지 분산
      const daysOffset = Math.floor(Math.random() * 120) - 30;
      const startDate = generateDate(daysOffset);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + tripDuration);
      
      // 인원수
      const paxCount = teamType === 'HONEYMOON' ? 2 : 
                       teamType === 'FIT' ? Math.floor(Math.random() * 4) + 1 :
                       teamType === 'GROUP' ? Math.floor(Math.random() * 30) + 20 :
                       Math.floor(Math.random() * 15) + 5;
      
      const manager = randomItem(users);
      const status = Math.random() > 0.2 ? 'CONFIRMED' : 
                     Math.random() > 0.5 ? 'PENDING' : 'CANCELLED';
      
      const booking = await prisma.booking.create({
        data: {
          bookingNumber: `ENT${new Date().getFullYear()}${String(i + 1).padStart(5, '0')}`,
          customerName: `고객${i + 1}`,
          teamName: generateTeamName(teamType, i),
          bookingType: bookingTypeMap[teamType] as any,
          destination,
          startDate,
          endDate,
          paxCount,
          nights: tripDuration,
          days: tripDuration + 1,
          status: status as any,
          
          // 금액 정보
          totalPrice: paxCount * (Math.floor(Math.random() * 2000000) + 500000),
          depositAmount: paxCount * (Math.floor(Math.random() * 300000) + 100000),
          currency: 'KRW',
          
          // 항공 및 호텔 정보
          flightInfo: {
            airline: randomItem(airlines),
            flightNumber: randomItem(['KE', 'OZ', 'BX', 'LJ', '7C', 'TW', 'ZE']) + (100 + Math.floor(Math.random() * 900)),
            departure: origin,
            arrival: destination,
            departureTime: new Date(startDate.getTime() + Math.floor(Math.random() * 12 + 6) * 3600000).toISOString()
          },
          
          hotelInfo: {
            name: `${randomItem(hotelChains)} ${destination}`,
            address: `${destination} 시내 중심가`,
            roomType: randomItem(['SINGLE', 'DOUBLE', 'TWIN', 'SUITE']),
            roomCount: Math.ceil(paxCount / 2)
          },
          
          notes: `${teamType} 팀 특별 요청사항`,
          
          // 생성자 정보
          createdBy: manager.id,
          createdAt: new Date(startDate.getTime() - 30 * 24 * 60 * 60 * 1000), // 출발 30일 전 생성
          updatedAt: new Date(),
        },
      });
      
      bookings.push(booking);
      
      if ((i + 1) % 10 === 0) {
        console.log(`✅ Created ${i + 1} bookings...`);
      }
    }

    console.log(`✅ Created ${bookings.length} bookings total`);
    console.log('✅ Seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
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