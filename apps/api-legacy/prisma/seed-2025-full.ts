// Enhanced seed script with company codes and rich 2025 data
import { Decimal } from '@prisma/client/runtime/library'

// Company definitions
const companies = [
  { code: 'ENTRIP_MAIN', name: '엔트립 본사' },
  { code: 'ENTRIP_BRANCH', name: '엔트립 지점' },
  { code: 'PARTNER_TRAVEL', name: '파트너 여행사' },
  { code: 'GLOBAL_TOURS', name: '글로벌 투어' }
]

// Expanded destinations by category
const destinations = {
  domestic: [
    '제주도', '부산', '강릉', '경주', '전주', '여수', '속초', '포항', '통영', '안동',
    '춘천', '정선', '태안', '보령', '군산', '목포', '순천', '담양', '하동', '남해'
  ],
  asia: [
    '일본 도쿄', '일본 오사카', '일본 후쿠오카', '일본 홋카이도', '일본 오키나와',
    '태국 방콕', '태국 푸켓', '태국 파타야', '태국 치앙마이', '태국 사무이',
    '베트남 하노이', '베트남 호치민', '베트남 다낭', '베트남 나트랑', '베트남 푸꾸옥',
    '싱가포르', '홍콩', '마카오', '대만 타이베이', '필리핀 세부', '필리핀 보라카이',
    '말레이시아 쿠알라룸푸르', '인도네시아 발리', '캄보디아 앙코르와트', '라오스 루앙프라방'
  ],
  europe: [
    '프랑스 파리', '영국 런던', '독일 베를린', '이탈리아 로마', '스페인 바르셀로나',
    '네덜란드 암스테르담', '체코 프라하', '오스트리아 비엔나', '스위스 취리히',
    '그리스 아테네', '터키 이스탄불', '포르투갈 리스본', '헝가리 부다페스트'
  ],
  america: [
    '미국 뉴욕', '미국 로스앤젤레스', '미국 라스베가스', '미국 하와이', '미국 시카고',
    '캐나다 밴쿠버', '캐나다 토론토', '브라질 리우데자네이루', '아르헨티나 부에노스아이레스',
    '페루 마추픽추', '멕시코 칸쿤', '칠레 산티아고'
  ],
  oceania: [
    '호주 시드니', '호주 멜버른', '호주 골드코스트', '뉴질랜드 오클랜드',
    '뉴질랜드 퀸스타운', '괌', '사이판', '팔라우', '피지'
  ],
  africa_middle: [
    '이집트 카이로', '남아공 케이프타운', '케냐 나이로비', '모로코 마라케시',
    '두바이', '터키 카파도키아', '요단 페트라', '이스라엘 예루살렘'
  ]
}

// Travel types with Korean names (matching database enum)
const travelTypes = {
  'PACKAGE': '패키지',
  'FIT': '개별여행',
  'GROUP': '단체여행',
  'BUSINESS': '비즈니스'
}

// Booking statuses
const bookingStatuses = ['CONFIRMED', 'PENDING', 'CANCELLED'] as const

// Customer names pool
const customerNames = [
  '김민수', '이지영', '박준혁', '최서연', '정태호', '한소미', '오진우', '윤아름',
  '강동현', '임나영', '조승현', '황지은', '신민철', '배윤정', '문준영', '서하은',
  '류성민', '노예진', '홍승우', '차민지', '남태건', '권수지', '유준호', '송다영',
  '안병준', '전효정', '김상혁', '이미나', '박철수', '최영희', '정동훈', '한미경',
  '오성택', '윤정민', '강수현', '임도영', '조미래', '황태영', '신지혜', '배준서',
  '문혜진', '서준호', '류민경', '노성진', '홍아라', '차준혁', '남윤아', '권태민',
  '유소영', '송현우', '안지원', '전민수', '김다혜', '이현우', '박미소', '최준영',
  '정나윤', '한상민', '오채원', '윤지훈', '강미영', '임준서', '조다은', '황민호'
]

// Manager names
const managers = ['김민수', '이지영', '박준혁', '최서연', '정태호']

// Generate random booking data
function generateBookingData(year: number, month: number) {
  const bookings = []
  const monthlyBookingCount = Math.floor(Math.random() * 50) + 30 // 30-80 bookings per month
  
  for (let i = 0; i < monthlyBookingCount; i++) {
    const companyIndex = Math.floor(Math.random() * companies.length)
    const company = companies[companyIndex]
    
    // Select destination category based on booking type
    const bookingTypeKeys = Object.keys(travelTypes)
    const bookingType = bookingTypeKeys[Math.floor(Math.random() * bookingTypeKeys.length)]
    
    let destinationCategory: string
    let destination: string
    
    if (bookingType === 'PACKAGE') {
      // Package trips tend to be popular destinations
      destinationCategory = Math.random() > 0.6 ? 'asia' : 
                           Math.random() > 0.3 ? 'europe' : 'domestic'
    } else if (bookingType === 'FIT') {
      // FIT tends to be exotic locations
      destinationCategory = Math.random() > 0.7 ? 'europe' : 
                           Math.random() > 0.5 ? 'oceania' : 'asia'
    } else if (bookingType === 'BUSINESS') {
      // Business trips tend to be major cities
      destinationCategory = Math.random() > 0.5 ? 'asia' : 'america'
    } else {
      // Random selection for group trips
      const categories = Object.keys(destinations)
      destinationCategory = categories[Math.floor(Math.random() * categories.length)]
    }
    
    const categoryDestinations = destinations[destinationCategory as keyof typeof destinations]
    destination = categoryDestinations[Math.floor(Math.random() * categoryDestinations.length)]
    
    // Generate realistic dates
    const startDay = Math.floor(Math.random() * 28) + 1
    const startDate = new Date(year, month - 1, startDay)
    
    // Duration based on destination and type
    let duration: number
    if (destinationCategory === 'domestic') {
      duration = Math.floor(Math.random() * 3) + 2 // 2-4 days
    } else if (destinationCategory === 'asia') {
      duration = Math.floor(Math.random() * 4) + 3 // 3-6 days
    } else {
      duration = Math.floor(Math.random() * 8) + 5 // 5-12 days
    }
    
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + duration - 1)
    
    // Skip if end date is in next month
    if (endDate.getMonth() !== month - 1) continue
    
    const paxCount = Math.floor(Math.random() * 30) + 2 // 2-31 people
    const customerName = customerNames[Math.floor(Math.random() * customerNames.length)]
    const manager = managers[Math.floor(Math.random() * managers.length)]
    
    // Price calculation based on destination and pax count
    let basePrice: number
    if (destinationCategory === 'domestic') {
      basePrice = Math.floor(Math.random() * 200000) + 100000 // 100K-300K
    } else if (destinationCategory === 'asia') {
      basePrice = Math.floor(Math.random() * 800000) + 400000 // 400K-1.2M
    } else if (destinationCategory === 'europe' || destinationCategory === 'america') {
      basePrice = Math.floor(Math.random() * 2000000) + 1000000 // 1M-3M
    } else {
      basePrice = Math.floor(Math.random() * 1500000) + 500000 // 500K-2M
    }
    
    const totalPrice = basePrice * paxCount
    const depositAmount = Math.floor(totalPrice * (0.2 + Math.random() * 0.3)) // 20-50% deposit
    
    // Status distribution: 70% confirmed, 20% pending, 10% cancelled
    let status: typeof bookingStatuses[number]
    const statusRand = Math.random()
    if (statusRand < 0.7) {
      status = 'CONFIRMED'
    } else if (statusRand < 0.9) {
      status = 'PENDING'
    } else {
      status = 'CANCELLED'
    }
    
    const bookingId = `booking_${year}_${String(month).padStart(2, '0')}_${company.code}_${String(i + 1).padStart(3, '0')}`
    const bookingNumber = `BK${year}${String(month).padStart(2, '0')}${String(i + 1).padStart(4, '0')}`
    
    bookings.push({
      id: bookingId,
      bookingNumber,
      customerName,
      teamName: `${destination} ${travelTypes[bookingType as keyof typeof travelTypes]}`,
      bookingType: bookingType as 'PACKAGE' | 'FIT' | 'GROUP' | 'BUSINESS',
      destination,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      paxCount,
      nights: duration - 1,
      days: duration,
      status,
      totalPrice,
      depositAmount,
      currency: 'KRW',
      notes: `${travelTypes[bookingType as keyof typeof travelTypes]} 상품 - ${paxCount}명`,
      createdBy: `user_${company.code}_${Math.floor(Math.random() * 5) + 1}`,
      companyCode: company.code
    })
  }
  
  return bookings
}

// Generate users for each company
function generateUsers() {
  const users = []
  
  companies.forEach((company, companyIndex) => {
    for (let i = 1; i <= 5; i++) {
      const manager = managers[(companyIndex * 5 + i - 1) % managers.length]
      users.push({
        id: `user_${company.code}_${i}`,
        email: `user${i}@${company.code.toLowerCase()}.com`,
        name: manager,
        password: 'hashed_password_123',
        role: i === 1 ? 'ADMIN' : 'USER',
        department: i <= 2 ? '영업팀' : i <= 4 ? '운영팀' : '관리팀',
        isActive: true,
        companyCode: company.code
      })
    }
  })
  
  return users
}

// Generate accounts for each company
function generateAccounts() {
  const accounts = []
  
  companies.forEach((company, companyIndex) => {
    accounts.push({
      id: `account_${company.code}`,
      accountName: `${company.name} 주계좌`,
      accountNumber: `123-456-${String(companyIndex + 1).padStart(6, '0')}`,
      bankName: ['국민은행', '신한은행', '우리은행', 'KEB하나은행'][companyIndex % 4],
      balance: new Decimal(Math.floor(Math.random() * 500000000) + 100000000), // 100M-600M
      currency: 'KRW',
      managerId: `user_${company.code}_1`,
      companyCode: company.code
    })
  })
  
  return accounts
}

// Main execution
async function main() {
  console.log('🌱 Starting comprehensive 2025 seeding with company codes...')
  
  // Generate all data
  const users = generateUsers()
  const accounts = generateAccounts()
  let allBookings: any[] = []
  
  // Generate bookings for all 12 months of 2025
  for (let month = 1; month <= 12; month++) {
    console.log(`📅 Generating data for ${month}월...`)
    const monthlyBookings = generateBookingData(2025, month)
    allBookings = [...allBookings, ...monthlyBookings]
  }
  
  console.log(`📊 Generated totals:`)
  console.log(`   - ${companies.length} companies`)
  console.log(`   - ${users.length} users`)
  console.log(`   - ${accounts.length} accounts`) 
  console.log(`   - ${allBookings.length} bookings`)
  
  // Company distribution
  companies.forEach(company => {
    const companyBookings = allBookings.filter(b => b.companyCode === company.code)
    console.log(`   - ${company.name}: ${companyBookings.length} bookings`)
  })
  
  // Write data files for manual insertion
  const fs = await import('fs')
  const path = await import('path')
  
  // Write users data
  const usersSQL = users.map(user => 
    `INSERT INTO "User" (id, email, name, password, role, department, "isActive", "companyCode") 
     VALUES ('${user.id}', '${user.email}', '${user.name}', '${user.password}', '${user.role}', '${user.department}', ${user.isActive}, '${user.companyCode}');`
  ).join('\n')
  
  fs.writeFileSync(path.join(process.cwd(), 'insert-users-2025.sql'), usersSQL)
  
  // Write accounts data  
  const accountsSQL = accounts.map(account =>
    `INSERT INTO "Account" (id, name, "accountNumber", "bankName", balance, currency, "managerId", "companyCode") 
     VALUES ('${account.id}', '${account.accountName}', '${account.accountNumber}', '${account.bankName}', ${account.balance}, '${account.currency}', '${account.managerId}', '${account.companyCode}');`
  ).join('\n')
  
  fs.writeFileSync(path.join(process.cwd(), 'insert-accounts-2025.sql'), accountsSQL)
  
  // Write bookings data in chunks
  const bookingsPerFile = 500
  const bookingChunks = []
  for (let i = 0; i < allBookings.length; i += bookingsPerFile) {
    bookingChunks.push(allBookings.slice(i, i + bookingsPerFile))
  }
  
  bookingChunks.forEach((chunk, index) => {
    const bookingsSQL = chunk.map(booking =>
      `INSERT INTO "Booking" (id, "bookingNumber", "customerName", "teamName", "bookingType", destination, "startDate", "endDate", "paxCount", nights, days, status, "totalPrice", "depositAmount", currency, notes, "createdBy", "companyCode") 
       VALUES ('${booking.id}', '${booking.bookingNumber}', '${booking.customerName}', '${booking.teamName}', '${booking.bookingType}', '${booking.destination}', '${booking.startDate}', '${booking.endDate}', ${booking.paxCount}, ${booking.nights}, ${booking.days}, '${booking.status}', ${booking.totalPrice}, ${booking.depositAmount}, '${booking.currency}', '${booking.notes}', '${booking.createdBy}', '${booking.companyCode}');`
    ).join('\n')
    
    fs.writeFileSync(path.join(process.cwd(), `insert-bookings-2025-part${index + 1}.sql`), bookingsSQL)
  })
  
  console.log('✅ SQL files generated successfully!')
  console.log(`   - insert-users-2025.sql`)
  console.log(`   - insert-accounts-2025.sql`) 
  console.log(`   - insert-bookings-2025-part*.sql (${bookingChunks.length} files)`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })