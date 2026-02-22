import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// 한국인이 자주 가는 여행지
const destinations = {
  japan: ['도쿄', '오사카', '후쿠오카', '홋카이도', '오키나와', '교토', '나고야', '삿포로'],
  sea: ['방콕', '푸켓', '다낭', '세부', '보라카이', '발리', '싱가포르', '코타키나발루'],
  china: ['상하이', '베이징', '청도', '하얼빈', '시안', '장가계'],
  europe: ['파리', '런던', '로마', '바르셀로나', '프라하', '비엔나', '스위스'],
  america: ['LA', '뉴욕', '하와이', '라스베가스', '샌프란시스코', '괌', '사이판'],
  domestic: ['제주도', '부산', '강릉', '경주', '전주', '여수', '통영']
};

// 고객명 생성용
const surnames = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권'];
const givenNames = ['민수', '지영', '준혁', '서연', '태호', '은영', '동현', '수빈', '현우', '미영', '성민', '유진', '재원', '하늘', '시우'];

// 팀 타입별 설정
const teamTypes = {
  family: { name: '가족여행', minPax: 3, maxPax: 5, priceRange: [800000, 1500000] },
  honeymoon: { name: '신혼여행', minPax: 2, maxPax: 2, priceRange: [2000000, 5000000] },
  filial: { name: '효도관광', minPax: 2, maxPax: 4, priceRange: [600000, 1200000] },
  group: { name: '단체여행', minPax: 15, maxPax: 50, priceRange: [500000, 1000000] },
  workshop: { name: '워크샵', minPax: 10, maxPax: 30, priceRange: [400000, 800000] },
  school: { name: '수학여행', minPax: 20, maxPax: 45, priceRange: [300000, 600000] },
  fit: { name: 'FIT', minPax: 1, maxPax: 2, priceRange: [1000000, 3000000] },
  friends: { name: '친구여행', minPax: 2, maxPax: 6, priceRange: [700000, 1400000] }
};

// 항공사 목록
const airlines = {
  fsc: ['대한항공', '아시아나항공'],
  lcc: ['제주항공', '진에어', '티웨이항공', '에어부산', '에어서울', '이스타항공'],
  foreign: ['JAL', 'ANA', '싱가포르항공', '타이항공', '베트남항공', '중국국제항공']
};

// 호텔 체인
const hotelChains = ['힐튼', '메리어트', '인터컨티넨탈', '하얏트', '쉐라톤', '롯데호텔', '신라호텔'];
const roomTypes = ['스탠다드', '슈페리어', '디럭스', '스위트', '프리미엄'];

// 차량 타입
const vehicleTypes = ['미니버스 15인승', '중형버스 25인승', '대형버스 45인승', '프리미엄밴 9인승', '승용차 4인승'];

// 유틸리티 함수
function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function formatDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatTimeString(hours: number, minutes: number): string {
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

// 계절별 가격 조정 계수
function getSeasonalMultiplier(month: number): number {
  const seasonalFactors = [0.8, 0.8, 1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.2, 1.1, 0.9, 0.9];
  return seasonalFactors[month - 1];
}

// 예약번호 생성
let bookingCounter = 1;
function generateBookingNumber(date: Date): string {
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const counter = bookingCounter.toString().padStart(4, '0');
  bookingCounter++;
  return `J1${year}${month}${counter}`;
}

async function main() {
  console.log('🚀 J1 회사 향상된 샘플 데이터 생성 시작...');
  console.log('📅 2025년 풍부하고 다양한 예약 데이터 생성');

  // 1. J1 회사 데이터 정리
  console.log('🧹 기존 J1 데이터 정리 중...');
  
  // 관련 데이터 삭제 (역순)
  await prisma.settlement.deleteMany({ where: { booking: { companyCode: 'j1' } } });
  await prisma.hotel.deleteMany({ where: { booking: { companyCode: 'j1' } } });
  await prisma.vehicle.deleteMany({ where: { booking: { companyCode: 'j1' } } });
  await prisma.flight.deleteMany({ where: { booking: { companyCode: 'j1' } } });
  await prisma.bookingHistory.deleteMany({ where: { booking: { companyCode: 'j1' } } });
  await prisma.bookingEvent.deleteMany({ where: { booking: { companyCode: 'j1' } } });
  await prisma.booking.deleteMany({ where: { companyCode: 'j1' } });
  await prisma.user.deleteMany({ where: { companyCode: 'j1' } });

  // 2. J1 사용자 생성
  console.log('👥 J1 사용자 생성 중...');
  const passwordHash = await bcrypt.hash('pass1234', 10);
  
  const j1Users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'admin@j1.travel',
        name: 'J1 관리자',
        password: passwordHash,
        role: 'ADMIN',
        department: '관리팀',
        companyCode: 'j1',
        isActive: true
      }
    }),
    prisma.user.create({
      data: {
        email: 'manager1@j1.travel',
        name: '김영수',
        password: passwordHash,
        role: 'MANAGER',
        department: '예약팀',
        companyCode: 'j1',
        isActive: true
      }
    }),
    prisma.user.create({
      data: {
        email: 'manager2@j1.travel',
        name: '이미경',
        password: passwordHash,
        role: 'MANAGER',
        department: '운영팀',
        companyCode: 'j1',
        isActive: true
      }
    }),
    prisma.user.create({
      data: {
        email: 'user1@j1.travel',
        name: '박준혁',
        password: passwordHash,
        role: 'USER',
        department: '예약팀',
        companyCode: 'j1',
        isActive: true
      }
    }),
    prisma.user.create({
      data: {
        email: 'user2@j1.travel',
        name: '최서연',
        password: passwordHash,
        role: 'USER',
        department: '운영팀',
        companyCode: 'j1',
        isActive: true
      }
    }),
    prisma.user.create({
      data: {
        email: 'user3@j1.travel',
        name: '정태호',
        password: passwordHash,
        role: 'USER',
        department: '마케팅팀',
        companyCode: 'j1',
        isActive: true
      }
    })
  ]);

  console.log(`✅ ${j1Users.length}명의 J1 사용자 생성 완료`);

  // 3. 예약 데이터 생성
  console.log('📋 다양한 예약 데이터 생성 중...');
  
  const bookings = [];
  const allFlights = [];
  const allHotels = [];
  const allVehicles = [];
  const allSettlements = [];
  const allHistory = [];
  const allEvents = [];

  // 월별 예약 생성 (총 1000개 목표)
  for (let month = 1; month <= 12; month++) {
    const seasonalMultiplier = getSeasonalMultiplier(month);
    const monthlyBookings = Math.floor(83 * seasonalMultiplier); // 평균 83개/월
    
    console.log(`  📅 ${month}월: ${monthlyBookings}개 예약 생성`);

    for (let i = 0; i < monthlyBookings; i++) {
      // 출발일 생성
      const startDate = getRandomDate(
        new Date(2025, month - 1, 1),
        new Date(2025, month - 1, 28)
      );

      // 팀 타입 선택
      const teamTypeKey = getRandomElement(Object.keys(teamTypes)) as keyof typeof teamTypes;
      const teamType = teamTypes[teamTypeKey];

      // 목적지 선택
      const destCategory = getRandomElement(Object.keys(destinations)) as keyof typeof destinations;
      const destination = getRandomElement(destinations[destCategory]);
      const isOverseas = destCategory !== 'domestic';

      // 여행 기간 설정 (해외는 길게, 국내는 짧게)
      const tripDays = isOverseas ? getRandomNumber(3, 10) : getRandomNumber(2, 4);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + tripDays - 1);

      // 인원수 설정
      const paxCount = getRandomNumber(teamType.minPax, teamType.maxPax);

      // 가격 계산
      const basePrice = getRandomNumber(teamType.priceRange[0], teamType.priceRange[1]);
      const totalPrice = basePrice * paxCount * seasonalMultiplier;
      const depositAmount = totalPrice * 0.3; // 30% 계약금

      // 상태 결정 (65% 확정, 25% 대기, 10% 취소)
      const statusRoll = Math.random();
      const status = statusRoll < 0.65 ? 'CONFIRMED' : statusRoll < 0.9 ? 'PENDING' : 'CANCELLED';

      // 매니저 선택
      const manager = getRandomElement(j1Users.filter(u => u.role === 'MANAGER' || u.role === 'ADMIN'));
      const createdBy = getRandomElement(j1Users);

      // 고객 정보
      const customerName = getRandomElement(surnames) + getRandomElement(givenNames);
      const teamName = `${destination} ${teamType.name}`;

      // 예약 생성
      const booking = await prisma.booking.create({
        data: {
          bookingNumber: generateBookingNumber(startDate),
          companyCode: 'j1',
          customerName,
          teamName,
          teamType: teamType.name,
          bookingType: teamTypeKey === 'fit' ? 'FIT' : 
                      teamTypeKey === 'group' || teamTypeKey === 'school' ? 'GROUP' : 
                      teamTypeKey === 'workshop' ? 'BUSINESS' : 'PACKAGE',
          origin: '인천',
          destination,
          startDate,
          endDate,
          paxCount,
          nights: tripDays - 1,
          days: tripDays,
          status,
          manager: manager.name,
          representative: customerName,
          contact: `010-${getRandomNumber(1000, 9999)}-${getRandomNumber(1000, 9999)}`,
          email: `${customerName.toLowerCase()}@email.com`,
          totalPrice,
          depositAmount,
          currency: 'KRW',
          notes: `${teamType.name} - ${destination} ${tripDays}일`,
          memo: `${month}월 ${teamType.name} 상품`,
          createdBy: createdBy.id,
          createdAt: new Date(startDate.getTime() - 30 * 24 * 60 * 60 * 1000), // 30일 전 생성
        }
      });

      // 항공편 정보 추가 (해외 여행만)
      if (isOverseas) {
        // 출발 항공편
        const departureTime = getRandomNumber(6, 20);
        const arrivalTime = (departureTime + getRandomNumber(2, 12)) % 24;
        
        allFlights.push({
          bookingId: booking.id,
          airline: getRandomElement([...airlines.fsc, ...airlines.lcc]),
          flightNo: `KE${getRandomNumber(100, 999)}`,
          departDate: formatDateString(startDate),
          departureTime: formatTimeString(departureTime, getRandomNumber(0, 59)),
          arriveDate: formatDateString(startDate),
          arrivalTime: formatTimeString(arrivalTime, getRandomNumber(0, 59)),
          from: '인천(ICN)',
          to: `${destination}`,
          note: '출발 항공편'
        });

        // 도착 항공편
        allFlights.push({
          bookingId: booking.id,
          airline: getRandomElement([...airlines.fsc, ...airlines.lcc]),
          flightNo: `KE${getRandomNumber(100, 999)}`,
          departDate: formatDateString(endDate),
          departureTime: formatTimeString(getRandomNumber(10, 20), getRandomNumber(0, 59)),
          arriveDate: formatDateString(endDate),
          arrivalTime: formatTimeString(getRandomNumber(14, 23), getRandomNumber(0, 59)),
          from: `${destination}`,
          to: '인천(ICN)',
          note: '도착 항공편'
        });
      }

      // 호텔 정보 추가
      const hotelNights = tripDays - 1;
      if (hotelNights > 0) {
        allHotels.push({
          bookingId: booking.id,
          name: `${destination} ${getRandomElement(hotelChains)}`,
          roomType: getRandomElement(roomTypes),
          checkIn: formatDateString(startDate),
          checkOut: formatDateString(endDate),
          nights: hotelNights,
          breakfast: Math.random() > 0.3 ? '조식 포함' : '조식 불포함',
          address: `${destination} 중심가`,
          phone: `+${getRandomNumber(1, 99)}-${getRandomNumber(100, 999)}-${getRandomNumber(1000, 9999)}`,
          note: `${Math.ceil(paxCount / 2)}개 객실`
        });
      }

      // 차량 정보 추가 (단체 여행만)
      if (paxCount >= 10) {
        allVehicles.push({
          bookingId: booking.id,
          vendor: `${destination} 관광버스`,
          type: paxCount <= 15 ? '미니버스 15인승' : paxCount <= 25 ? '중형버스 25인승' : '대형버스 45인승',
          count: Math.ceil(paxCount / 45),
          passengers: paxCount,
          duration: `${tripDays}일`,
          route: `공항-호텔-관광지-공항`,
          pickupDate: formatDateString(startDate),
          pickupTime: formatTimeString(getRandomNumber(6, 10), 0),
          returnDate: formatDateString(endDate),
          returnTime: formatTimeString(getRandomNumber(16, 20), 0),
          driver: `${getRandomElement(surnames)}기사`,
          phone: `010-${getRandomNumber(1000, 9999)}-${getRandomNumber(1000, 9999)}`,
          note: '전일 관광버스'
        });
      }

      // 정산 정보 추가
      if (status !== 'CANCELLED') {
        // 입금 - 계약금
        allSettlements.push({
          bookingId: booking.id,
          type: 'income',
          currency: 'KRW',
          amount: depositAmount,
          memo: '계약금 입금'
        });

        // 확정된 예약은 잔금도 입금
        if (status === 'CONFIRMED') {
          allSettlements.push({
            bookingId: booking.id,
            type: 'income',
            currency: 'KRW',
            amount: totalPrice - depositAmount,
            memo: '잔금 입금'
          });

          // 출금 - 항공료
          if (isOverseas) {
            allSettlements.push({
              bookingId: booking.id,
              type: 'expense',
              currency: 'KRW',
              amount: totalPrice * 0.4,
              memo: '항공료 지급'
            });
          }

          // 출금 - 호텔비
          allSettlements.push({
            bookingId: booking.id,
            type: 'expense',
            currency: 'KRW',
            amount: totalPrice * 0.3,
            memo: '호텔비 지급'
          });

          // 출금 - 현지 경비
          allSettlements.push({
            bookingId: booking.id,
            type: 'expense',
            currency: 'KRW',
            amount: totalPrice * 0.1,
            memo: '현지 경비'
          });
        }
      }

      // 예약 이력 추가
      if (status === 'CONFIRMED') {
        allHistory.push({
          bookingId: booking.id,
          action: 'STATUS_CHANGE',
          changedFields: { status: ['PENDING', 'CONFIRMED'] },
          previousValues: { status: 'PENDING' },
          newValues: { status: 'CONFIRMED' },
          changedBy: manager.id,
          changedAt: new Date(booking.createdAt.getTime() + 2 * 24 * 60 * 60 * 1000) // 2일 후 확정
        });
      } else if (status === 'CANCELLED') {
        allHistory.push({
          bookingId: booking.id,
          action: 'STATUS_CHANGE',
          changedFields: { status: ['CONFIRMED', 'CANCELLED'] },
          previousValues: { status: 'CONFIRMED' },
          newValues: { status: 'CANCELLED' },
          changedBy: createdBy.id,
          changedAt: new Date(booking.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000) // 7일 후 취소
        });
      }

      // 예약 이벤트 추가
      allEvents.push({
        bookingId: booking.id,
        date: startDate,
        typeCode: 'IN',
        status: booking.status
      });

      if (tripDays > 2) {
        allEvents.push({
          bookingId: booking.id,
          date: new Date(startDate.getTime() + 24 * 60 * 60 * 1000),
          typeCode: 'AT',
          status: booking.status
        });
      }

      allEvents.push({
        bookingId: booking.id,
        date: endDate,
        typeCode: 'HM',
        status: booking.status
      });

      bookings.push(booking);
    }
  }

  // 4. 관련 데이터 일괄 생성
  console.log('✈️ 항공편 정보 생성 중...');
  if (allFlights.length > 0) {
    await prisma.flight.createMany({ data: allFlights });
    console.log(`  ✅ ${allFlights.length}개 항공편 생성`);
  }

  console.log('🏨 호텔 정보 생성 중...');
  if (allHotels.length > 0) {
    await prisma.hotel.createMany({ data: allHotels });
    console.log(`  ✅ ${allHotels.length}개 호텔 예약 생성`);
  }

  console.log('🚌 차량 정보 생성 중...');
  if (allVehicles.length > 0) {
    await prisma.vehicle.createMany({ data: allVehicles });
    console.log(`  ✅ ${allVehicles.length}개 차량 예약 생성`);
  }

  console.log('💰 정산 정보 생성 중...');
  if (allSettlements.length > 0) {
    await prisma.settlement.createMany({ data: allSettlements });
    console.log(`  ✅ ${allSettlements.length}개 정산 내역 생성`);
  }

  console.log('📝 예약 이력 생성 중...');
  if (allHistory.length > 0) {
    await prisma.bookingHistory.createMany({ data: allHistory });
    console.log(`  ✅ ${allHistory.length}개 이력 생성`);
  }

  console.log('📅 예약 이벤트 생성 중...');
  if (allEvents.length > 0) {
    await prisma.bookingEvent.createMany({ data: allEvents });
    console.log(`  ✅ ${allEvents.length}개 이벤트 생성`);
  }

  // 5. 통계 출력
  console.log('\n📊 생성 완료 통계:');
  
  const stats = await prisma.booking.groupBy({
    by: ['status'],
    where: { companyCode: 'j1' },
    _count: true
  });

  const monthlyStats = await prisma.booking.groupBy({
    by: ['status'],
    where: { 
      companyCode: 'j1',
      startDate: {
        gte: new Date('2025-01-01'),
        lt: new Date('2026-01-01')
      }
    },
    _sum: {
      totalPrice: true,
      paxCount: true
    },
    _count: true
  });

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📌 J1 회사 2025년 샘플 데이터 생성 완료!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`👥 사용자: ${j1Users.length}명`);
  console.log(`📋 총 예약: ${bookings.length}건`);
  
  stats.forEach(s => {
    const percentage = ((s._count / bookings.length) * 100).toFixed(1);
    console.log(`  - ${s.status}: ${s._count}건 (${percentage}%)`);
  });

  const totalRevenue = monthlyStats.reduce((sum, s) => sum + Number(s._sum.totalPrice || 0), 0);
  const totalPax = monthlyStats.reduce((sum, s) => sum + Number(s._sum.paxCount || 0), 0);
  
  console.log(`💰 총 매출: ${totalRevenue.toLocaleString()}원`);
  console.log(`👨‍👩‍👧‍👦 총 여행객: ${totalPax.toLocaleString()}명`);
  console.log(`✈️ 항공편: ${allFlights.length}개`);
  console.log(`🏨 호텔: ${allHotels.length}개`);
  console.log(`🚌 차량: ${allVehicles.length}개`);
  console.log(`💳 정산: ${allSettlements.length}건`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('❌ 오류 발생:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });