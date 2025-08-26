import { PrismaClient, BookingType, BookingStatus, UserRole, ApprovalType, ApprovalStatus, TransactionType } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

const prisma = new PrismaClient()

// 더미 데이터 생성 함수들
function getRandomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

function getRandomFromArray<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

// 2025년 데이터 생성
const year2025Start = new Date('2025-01-01')
const year2025End = new Date('2025-12-31')

// 여행 목적지 리스트
const destinations = [
  '오사카', '도쿄', '후쿠오카', '사이판', '괌', '하와이', '몰디브', '발리', 
  '푸켓', '방콕', '호치민', '다낭', '세부', '보라카이', '코타키나발루', '랑카위',
  '싱가포르', '쿠알라룸푸르', '홍콩', '마카오', '타이베이', '보홀', '프랑크푸르트',
  '파리', '런던', '로마', '바르셀로나', '두바이', '터키', '이스탄불', '카파도키아'
]

// 고객명 리스트 (한국 성씨)
const surnames = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '류', '홍']
const givenNames = ['민수', '영희', '철수', '미영', '현우', '지영', '준호', '수지', '동현', '예은', '상훈', '은지', '진우', '소영', '태민', '다은']

function generateCustomerName(): string {
  return getRandomFromArray(surnames) + getRandomFromArray(givenNames)
}

// 팀명 리스트
const teamNames = [
  '골프동호회', '직장동료', '가족여행', '신혼여행', '친구모임', '동창회', '동호회여행',
  '부부여행', '효도관광', '워크샵', '인센티브', '수학여행', '졸업여행', '동아리'
]

async function main() {
  console.log('🌱 시드 데이터 생성 시작...')
  
  // 1. 사용자 생성
  console.log('👥 사용자 생성 중...')
  const users = []
  
  // 관리자
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@entrip.com',
      name: '시스템 관리자',
      password: 'hashed_password_admin',
      role: UserRole.ADMIN,
      department: 'IT팀'
    }
  })
  users.push(adminUser)
  
  // 매니저들
  for (let i = 0; i < 5; i++) {
    const manager = await prisma.user.create({
      data: {
        email: `manager${i + 1}@entrip.com`,
        name: `${generateCustomerName()} 매니저`,
        password: `hashed_password_manager${i + 1}`,
        role: UserRole.MANAGER,
        department: getRandomFromArray(['영업팀', '기획팀', '운영팀', '마케팅팀'])
      }
    })
    users.push(manager)
  }
  
  // 일반 사용자들
  for (let i = 0; i < 15; i++) {
    const user = await prisma.user.create({
      data: {
        email: `user${i + 1}@entrip.com`,
        name: `${generateCustomerName()} 직원`,
        password: `hashed_password_user${i + 1}`,
        role: UserRole.USER,
        department: getRandomFromArray(['영업팀', '기획팀', '운영팀', '마케팅팀', '총무팀'])
      }
    })
    users.push(user)
  }

  // 2. 계좌 생성
  console.log('🏦 계좌 생성 중...')
  const accounts = []
  const bankNames = ['신한은행', '기업은행', '국민은행', '하나은행', '우리은행']
  
  for (let i = 0; i < 8; i++) {
    const account = await prisma.account.create({
      data: {
        name: `${bankNames[i % bankNames.length]} 여행전용계좌 ${i + 1}`,
        accountNumber: `${1000000000 + i * 111111111}-${String(i + 1).padStart(2, '0')}`,
        bankName: bankNames[i % bankNames.length],
        currency: i < 5 ? 'KRW' : getRandomFromArray(['USD', 'JPY', 'EUR']),
        balance: new Decimal(Math.random() * 50000000 + 10000000), // 1천만원~6천만원
        managerId: users[1 + (i % 5)].id // 매니저들에게 할당
      }
    })
    accounts.push(account)
  }

  // 3. 예약 생성 (2025년 전체)
  console.log('✈️ 예약 데이터 생성 중...')
  const bookings = []
  
  for (let month = 1; month <= 12; month++) {
    const bookingsInMonth = Math.floor(Math.random() * 40) + 60 // 월별 60~100개
    
    for (let i = 0; i < bookingsInMonth; i++) {
      const startDate = getRandomDate(
        new Date(2025, month - 1, 1),
        new Date(2025, month - 1, 28)
      )
      const days = Math.floor(Math.random() * 10) + 3 // 3~12일
      const endDate = new Date(startDate.getTime() + (days - 1) * 24 * 60 * 60 * 1000)
      const paxCount = Math.floor(Math.random() * 30) + 2 // 2~32명
      
      const bookingType = getRandomFromArray(Object.values(BookingType))
      const destination = getRandomFromArray(destinations)
      
      // 가격 계산 (목적지와 인원수 기반)
      const basePrice = getRandomFromArray([800000, 1200000, 1800000, 2500000, 3200000])
      const totalPrice = new Decimal(basePrice * paxCount * (days / 4))
      
      const booking = await prisma.booking.create({
        data: {
          bookingNumber: `ENT${2025}${String(month).padStart(2, '0')}${String(i + 1).padStart(4, '0')}`,
          customerName: generateCustomerName(),
          teamName: getRandomFromArray(teamNames),
          bookingType,
          destination,
          startDate,
          endDate,
          paxCount,
          nights: days - 1,
          days,
          status: getRandomFromArray([
            ...Array(6).fill(BookingStatus.CONFIRMED),
            ...Array(2).fill(BookingStatus.PENDING),
            BookingStatus.CANCELLED
          ]),
          totalPrice,
          depositAmount: new Decimal(totalPrice.toNumber() * 0.3),
          currency: 'KRW',
          flightInfo: {
            departure: '인천국제공항',
            arrival: `${destination} 공항`,
            airline: getRandomFromArray(['대한항공', '아시아나항공', '제주항공', '티웨이항공'])
          },
          hotelInfo: {
            name: `${destination} ${getRandomFromArray(['호텔', '리조트', '펜션'])}`,
            rating: Math.floor(Math.random() * 3) + 3, // 3~5성급
            roomType: getRandomFromArray(['스탠다드', '디럭스', '스위트'])
          },
          notes: Math.random() > 0.7 ? getRandomFromArray([
            '비건 식단 요청',
            '휠체어 이용객 포함',
            '생일 기념 케이크 요청',
            '허니문 패키지',
            '어린이 동반',
            '반려동물 동반'
          ]) : null,
          createdBy: getRandomFromArray(users.slice(6)).id, // 일반 사용자
          updatedBy: Math.random() > 0.8 ? getRandomFromArray(users.slice(1, 6)).id : null
        }
      })
      bookings.push(booking)
    }
  }

  // 4. 예약 이벤트 생성
  console.log('📅 예약 이벤트 생성 중...')
  const typeCodes = ['GF', 'IN', 'HM', 'AT'] // 골프, 인센티브, 허니문, 항공+숙박
  
  for (const booking of bookings.slice(0, 500)) { // 일부 예약만
    const eventCount = Math.floor(Math.random() * 3) + 1
    for (let i = 0; i < eventCount; i++) {
      await prisma.bookingEvent.create({
        data: {
          bookingId: booking.id,
          date: getRandomDate(booking.startDate, booking.endDate),
          typeCode: getRandomFromArray(typeCodes),
          status: booking.status
        }
      })
    }
  }

  // 5. 결재 건 생성
  console.log('📋 결재 건 생성 중...')
  for (let i = 0; i < 200; i++) {
    const approvalType = getRandomFromArray(Object.values(ApprovalType))
    const amount = approvalType === ApprovalType.BOOKING 
      ? new Decimal(Math.random() * 10000000 + 1000000)
      : new Decimal(Math.random() * 5000000 + 500000)
    
    await prisma.approval.create({
      data: {
        approvalNumber: `APP${2025}${String(i + 1).padStart(4, '0')}`,
        type: approvalType,
        title: `${approvalType === ApprovalType.BOOKING ? '예약' : 
                 approvalType === ApprovalType.PAYMENT ? '결제' : 
                 approvalType === ApprovalType.REFUND ? '환불' : '기타'} 결재 요청`,
        content: `${approvalType} 관련 결재를 요청드립니다.`,
        amount,
        status: getRandomFromArray([
          ...Array(4).fill(ApprovalStatus.APPROVED),
          ...Array(2).fill(ApprovalStatus.PENDING),
          ApprovalStatus.REJECTED
        ]),
        requesterId: getRandomFromArray(users.slice(6)).id,
        approverId: getRandomFromArray(users.slice(1, 6)).id,
        approvedAt: Math.random() > 0.3 ? getRandomDate(year2025Start, year2025End) : null,
        bookingId: Math.random() > 0.5 ? getRandomFromArray(bookings).id : null,
        accountId: Math.random() > 0.5 ? getRandomFromArray(accounts).id : null
      }
    })
  }

  // 6. 거래 내역 생성
  console.log('💰 거래 내역 생성 중...')
  for (let i = 0; i < 800; i++) {
    const transactionType = getRandomFromArray(Object.values(TransactionType))
    const account = getRandomFromArray(accounts)
    const amount = new Decimal(Math.random() * 3000000 + 100000)
    
    await prisma.transaction.create({
      data: {
        transactionNumber: `TXN${2025}${String(i + 1).padStart(6, '0')}`,
        type: transactionType,
        amount,
        currency: account.currency,
        exchangeRate: account.currency !== 'KRW' ? new Decimal(Math.random() * 100 + 1000) : null,
        description: `${transactionType === TransactionType.DEPOSIT ? '입금' :
                      transactionType === TransactionType.WITHDRAWAL ? '출금' :
                      transactionType === TransactionType.TRANSFER_IN ? '이체입금' :
                      '이체출금'} - ${getRandomFromArray(['예약금', '잔금', '환불', '수수료', '기타'])}`,
        accountId: account.id,
        counterparty: generateCustomerName(),
        bookingId: Math.random() > 0.3 ? getRandomFromArray(bookings).id : null,
        userId: getRandomFromArray(users).id,
        transactionDate: getRandomDate(year2025Start, year2025End)
      }
    })
  }

  // 7. 환율 정보 생성
  console.log('💱 환율 정보 생성 중...')
  const currencies = [
    { from: 'USD', to: 'KRW', baseRate: 1300 },
    { from: 'JPY', to: 'KRW', baseRate: 9.5 },
    { from: 'EUR', to: 'KRW', baseRate: 1450 },
    { from: 'CNY', to: 'KRW', baseRate: 180 }
  ]
  
  for (const currency of currencies) {
    for (let month = 1; month <= 12; month++) {
      const monthStart = new Date(2025, month - 1, 1)
      const monthEnd = new Date(2025, month, 0)
      
      // 월별 환율 변동
      const rate = new Decimal(
        currency.baseRate * (0.95 + Math.random() * 0.1) // ±5% 변동
      )
      
      await prisma.exchangeRate.create({
        data: {
          fromCurrency: currency.from,
          toCurrency: currency.to,
          rate,
          validFrom: monthStart,
          validUntil: monthEnd,
          source: 'AUTO_GENERATED'
        }
      })
    }
  }

  console.log('✅ 시드 데이터 생성 완료!')
  console.log(`📊 생성된 데이터:`)
  console.log(`   - 사용자: ${users.length}명`)
  console.log(`   - 계좌: ${accounts.length}개`)
  console.log(`   - 예약: ${bookings.length}건`)
  console.log(`   - 결재: 200건`)
  console.log(`   - 거래내역: 800건`)
  console.log(`   - 환율정보: ${currencies.length * 12}건`)
}

main()
  .catch((e) => {
    console.error('❌ 시드 데이터 생성 실패:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })