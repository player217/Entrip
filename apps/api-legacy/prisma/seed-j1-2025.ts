import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// 한국 여행 목적지 리스트
const destinations = [
  '일본 도쿄', '일본 오사카', '일본 후쿠오카', '일본 홋카이도', '일본 오키나와',
  '태국 방콕', '태국 푸켓', '태국 치앙마이', '태국 파타야',
  '베트남 호치민', '베트남 하노이', '베트남 다낭', '베트남 나트랑',
  '중국 상하이', '중국 베이징', '중국 시안', '중국 청두',
  '대만 타이베이', '대만 가오슝', '대만 타이중',
  '싱가포르', '홍콩', '마카오',
  '필리핀 세부', '필리핀 보라카이', '필리핀 마닐라',
  '인도네시아 발리', '인도네시아 자카르타',
  '말레이시아 쿠알라룸푸르', '말레이시아 코타키나발루',
  '유럽 프랑스', '유럽 이탈리아', '유럽 스페인', '유럽 독일', '유럽 영국',
  '미국 뉴욕', '미국 LA', '미국 하와이', '미국 라스베가스',
  '호주 시드니', '호주 멜버른', '호주 골드코스트',
  '뉴질랜드 오클랜드', '뉴질랜드 크라이스트처치'
];

// 고객 이름 생성용
const surnames = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '전', '홍'];
const givenNames = ['민수', '지영', '준혁', '서연', '태호', '예은', '동현', '수빈', '현우', '가영', '성민', '유진', '재원', '하늘', '시우', '다은', '준서', '소연', '민지', '건우'];

// 팀명 생성용
const teamPrefixes = ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '수원', '고양', '용인', '성남', '청주', '천안', '전주', '안산', '안양', '포항', '창원', '마산', '진주'];
const teamSuffixes = ['여행단', '관광회', '투어클럽', '트레킹팀', '휴양단', '힐링팀', '패키지팀', '골프단', '미식단', '문화탐방단'];

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

let bookingCounter = 1;

function generateBookingNumber(month: number): string {
  const year = '25'; // 2025년
  const monthStr = month.toString().padStart(2, '0');
  const counter = bookingCounter.toString().padStart(4, '0');
  bookingCounter++;
  return `J1${year}${monthStr}${counter}`;
}

async function main() {
  console.log('🚀 J1 회사 및 2025년 샘플 데이터 생성 시작...');

  // 1. 기존 J1 데이터 정리
  console.log('📦 기존 J1 데이터 정리 중...');
  await prisma.booking.deleteMany({
    where: { companyCode: 'j1' }
  });
  await prisma.user.deleteMany({
    where: { email: { contains: '@j1.travel' } }
  });

  // 2. J1 사용자 생성
  console.log('👥 J1 사용자 생성 중...');
  const passwordHash = await bcrypt.hash('pass1234', 10);
  
  const j1Users = [
    {
      id: 'j1-admin',
      email: 'admin@j1.travel',
      name: 'J1 관리자',
      password: passwordHash,
      role: 'ADMIN',
      department: '관리팀',
    },
    {
      id: 'j1-manager1',
      email: 'manager1@j1.travel', 
      name: '김매니저',
      password: passwordHash,
      role: 'MANAGER',
      department: '예약팀',
    },
    {
      id: 'j1-manager2',
      email: 'manager2@j1.travel',
      name: '이매니저', 
      password: passwordHash,
      role: 'MANAGER',
      department: '운영팀',
    },
    {
      id: 'j1-user1',
      email: 'user1@j1.travel',
      name: '박직원',
      password: passwordHash,
      role: 'USER', 
      department: '예약팀',
    },
    {
      id: 'j1-user2',
      email: 'user2@j1.travel',
      name: '최직원',
      password: passwordHash,
      role: 'USER',
      department: '운영팀',
    }
  ];

  for (const user of j1Users) {
    await prisma.user.create({
      data: user as any
    });
  }

  // 3. 2025년 월별 예약 데이터 생성 (월별 50-80개)
  console.log('📅 2025년 월별 예약 데이터 생성 중...');
  
  for (let month = 1; month <= 12; month++) {
    const bookingsPerMonth = Math.floor(Math.random() * 31) + 50; // 50-80개
    console.log(`   ${month}월: ${bookingsPerMonth}개 예약 생성...`);
    
    for (let i = 0; i < bookingsPerMonth; i++) {
      // 랜덤 출발일 (해당 월 내)
      const startDate = getRandomDate(
        new Date(2025, month - 1, 1),
        new Date(2025, month - 1, 28)
      );
      
      // 여행 기간 (1-14일)
      const tripDays = Math.floor(Math.random() * 14) + 1;
      const endDate = new Date(startDate.getTime() + (tripDays - 1) * 24 * 60 * 60 * 1000);
      
      // 예약 데이터 생성
      const customerName = getRandomElement(surnames) + getRandomElement(givenNames);
      const teamName = getRandomElement(teamPrefixes) + getRandomElement(teamSuffixes);
      const destination = getRandomElement(destinations);
      const paxCount = Math.floor(Math.random() * 25) + 1; // 1-25명
      const pricePerPax = Math.floor(Math.random() * 2000000) + 300000; // 30만-230만원
      const totalPrice = paxCount * pricePerPax;
      
      const booking = {
        bookingNumber: generateBookingNumber(month),
        companyCode: 'j1',
        customerName,
        teamName,
        bookingType: getRandomElement(['PACKAGE', 'FIT', 'GROUP', 'BUSINESS']),
        destination,
        startDate,
        endDate,
        paxCount,
        nights: tripDays - 1,
        days: tripDays,
        status: getRandomElement(['PENDING', 'CONFIRMED', 'CANCELLED']),
        totalPrice,
        depositAmount: totalPrice * 0.3, // 30% 계약금
        currency: 'KRW',
        createdBy: getRandomElement(j1Users).id,
        flightInfo: {
          departure: '인천국제공항',
          arrival: destination.includes('일본') ? '나리타공항' : 
                   destination.includes('태국') ? '수완나품공항' :
                   destination.includes('베트남') ? '탄손냣공항' : '현지공항',
          airline: getRandomElement(['대한항공', '아시아나항공', '제주항공', '진에어', '티웨이항공'])
        },
        hotelInfo: {
          hotelName: `${destination} ${getRandomElement(['호텔', '리조트', '펜션', '게스트하우스'])}`,
          roomType: getRandomElement(['스탠다드', '디럭스', '스위트', '프리미엄']),
          checkIn: startDate.toISOString().split('T')[0],
          checkOut: endDate.toISOString().split('T')[0]
        },
        notes: `${month}월 ${getRandomElement(['단체여행', '워크숍', '연수', '포상여행', '가족여행', '신혼여행'])}`
      };

      await prisma.booking.create({
        data: booking
      });
    }
  }

  // 4. 통계 출력
  const totalBookings = await prisma.booking.count({
    where: { companyCode: 'j1' }
  });
  
  const bookingsByMonth = await prisma.booking.groupBy({
    by: ['companyCode'],
    where: { 
      companyCode: 'j1',
      startDate: {
        gte: new Date('2025-01-01'),
        lt: new Date('2026-01-01')
      }
    },
    _count: true
  });

  console.log('✅ 데이터 생성 완료!');
  console.log(`   - J1 사용자: ${j1Users.length}명`);
  console.log(`   - 2025년 예약: ${totalBookings}건`);
  console.log(`   - 월평균 예약: ${Math.floor(totalBookings / 12)}건`);
}

main()
  .catch((e) => {
    console.error('❌ 오류 발생:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });