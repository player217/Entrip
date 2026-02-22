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

// 팀 타입
const teamTypes = ['GOLF', 'INCENTIVE', 'HONEYMOON', 'AIRTEL', 'FIT', 'GROUP', 'MICE'];

// 팀명 생성 함수
function generateTeamName(type: string, index: number): string {
  const prefixes = {
    GOLF: ['골프', '그린', '버디', '이글', '홀인원'],
    INCENTIVE: ['성과', '우수', '베스트', '엘리트', '프리미엄'],
    HONEYMOON: ['러브', '스위트', '로맨틱', '허니', '웨딩'],
    AIRTEL: ['자유', '편안한', '힐링', '휴식', '프리'],
    FIT: ['개별', '맞춤', '프라이빗', '커스텀', '특별'],
    GROUP: ['단체', '모임', '클럽', '동호회', '협회'],
    MICE: ['컨퍼런스', '세미나', '포럼', '심포지엄', '워크샵']
  };
  
  const prefix = prefixes[type][index % prefixes[type].length];
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
  console.log('🌱 Seeding database with rich dummy data...');

  try {
    // 기존 데이터 삭제
    await prisma.booking.deleteMany();
    await prisma.user.deleteMany();

    // 사용자 생성
    const managers = [
      { name: '김철수', email: 'kim@entrip.co.kr' },
      { name: '이영희', email: 'lee@entrip.co.kr' },
      { name: '박민수', email: 'park@entrip.co.kr' },
      { name: '정수현', email: 'jung@entrip.co.kr' },
      { name: '최지우', email: 'choi@entrip.co.kr' },
      { name: '강민준', email: 'kang@entrip.co.kr' }
    ];
    
    const users = [];
    for (const manager of managers) {
      const user = await prisma.user.create({
        data: {
          email: manager.email,
          password: await bcrypt.hash('password123', 10),
          name: manager.name,
          role: 'MANAGER',
          phone: '010-' + Math.floor(1000 + Math.random() * 9000) + '-' + Math.floor(1000 + Math.random() * 9000),
        },
      });
      users.push(user);
    }
    console.log(`✅ Created ${users.length} users`);

    // 예약 생성 (150개)
    const bookings = [];
    
    for (let i = 0; i < 150; i++) {
      const teamType = randomItem(teamTypes);
      const destination = randomItem(destinations);
      const origin = randomItem(koreanCities.slice(0, 3)); // 주로 서울, 부산, 대구에서 출발
      
      // 여행 기간 (2~14일)
      const tripDuration = Math.floor(Math.random() * 13) + 2;
      // -30일부터 +90일까지 분산
      const daysOffset = Math.floor(Math.random() * 120) - 30;
      const departureDate = generateDate(daysOffset);
      const returnDate = new Date(departureDate);
      returnDate.setDate(returnDate.getDate() + tripDuration);
      
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
          code: `ENT${new Date().getFullYear()}${String(i + 1).padStart(5, '0')}`,
          title: `${generateTeamName(teamType, i)} - ${destination}`,
          type: teamType,
          status: status,
          startDate: departureDate,
          endDate: returnDate,
          origin,
          destination,
          paxCount,
          adultCount: teamType === 'HONEYMOON' ? 2 : Math.floor(paxCount * 0.8),
          childCount: teamType === 'HONEYMOON' ? 0 : Math.floor(paxCount * 0.15),
          infantCount: teamType === 'HONEYMOON' ? 0 : paxCount - Math.floor(paxCount * 0.8) - Math.floor(paxCount * 0.15),
          
          // 항공 정보
          airline: randomItem(airlines),
          flightNumber: randomItem(['KE', 'OZ', 'BX', 'LJ', '7C', 'TW', 'ZE']) + (100 + Math.floor(Math.random() * 900)),
          departureTime: new Date(departureDate.getTime() + Math.floor(Math.random() * 12 + 6) * 3600000).toISOString(),
          
          // 호텔 정보
          hotelName: `${randomItem(hotelChains)} ${destination}`,
          hotelAddress: `${destination} 시내 중심가`,
          roomType: randomItem(['SINGLE', 'DOUBLE', 'TWIN', 'SUITE']),
          roomCount: Math.ceil(paxCount / 2),
          
          // 가격 정보
          totalAmount: paxCount * (Math.floor(Math.random() * 2000000) + 500000),
          depositAmount: paxCount * (Math.floor(Math.random() * 300000) + 100000),
          balanceAmount: 0,
          currency: 'KRW',
          
          // 기타 정보
          notes: `${teamType} 팀 특별 요청사항`,
          specialRequests: Math.random() > 0.7 ? '채식주의자 식사 준비' : null,
          
          // 담당자
          managerId: manager.id,
          managerName: manager.name,
          
          // 고객 정보
          customerName: `고객${i + 1}`,
          customerPhone: '010-' + Math.floor(1000 + Math.random() * 9000) + '-' + Math.floor(1000 + Math.random() * 9000),
          customerEmail: `customer${i + 1}@example.com`,
          
          createdAt: new Date(departureDate.getTime() - 30 * 24 * 60 * 60 * 1000), // 출발 30일 전 생성
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