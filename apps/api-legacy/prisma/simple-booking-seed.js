const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Rich booking data generator without User dependency
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
const teamTypes = ['단체', '개별', '기업', '인센티브', '연수', '수학여행'];
const bookingTypes = ['DOMESTIC', 'INTERNATIONAL', 'PACKAGE', 'FLIGHT_ONLY', 'HOTEL_ONLY'];
const statuses = ['PENDING', 'CONFIRMED', 'CANCELED', 'COMPLETED'];
const managers = [
  '김매니저', '박팀장', '이부장', '최과장', '정대리', '한주임',
  '송매니저', '유팀장', '임부장', '조과장', '신대리', '홍주임'
];

const generateBookingNumber = (companyCode, index) => {
  const date = new Date().getFullYear().toString().slice(-2);
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  return `${companyCode.toUpperCase()}${date}${month}${String(index).padStart(4, '0')}`;
};

const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

const getRandomDate = (start, end) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

const generateFlightInfo = (origin, destination) => ({
  outbound: {
    airline: getRandomElement(['KE', 'OZ', 'BX', '7C', 'LJ', 'TW', 'ZE']),
    flightNo: `${getRandomElement(['KE', 'OZ', 'BX'])}-${Math.floor(Math.random() * 9000 + 1000)}`,
    departure: {
      airport: origin === '서울' ? 'ICN' : origin === '부산' ? 'PUS' : 'CJU',
      city: origin,
      time: `${String(Math.floor(Math.random() * 12) + 6).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`
    },
    arrival: {
      airport: getRandomElement(['NRT', 'KIX', 'BKK', 'PVG', 'HKG']),
      city: destination,
      time: `${String(Math.floor(Math.random() * 12) + 10).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`
    },
    class: getRandomElement(['이코노미', '비즈니스', '퍼스트']),
    price: Math.floor(Math.random() * 2000000) + 300000
  },
  inbound: {
    airline: getRandomElement(['KE', 'OZ', 'BX', '7C', 'LJ', 'TW', 'ZE']),
    flightNo: `${getRandomElement(['KE', 'OZ', 'BX'])}-${Math.floor(Math.random() * 9000 + 1000)}`,
    departure: {
      airport: getRandomElement(['NRT', 'KIX', 'BKK', 'PVG', 'HKG']),
      city: destination,
      time: `${String(Math.floor(Math.random() * 12) + 10).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`
    },
    arrival: {
      airport: origin === '서울' ? 'ICN' : origin === '부산' ? 'PUS' : 'CJU',
      city: origin,
      time: `${String(Math.floor(Math.random() * 12) + 16).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`
    },
    class: getRandomElement(['이코노미', '비즈니스', '퍼스트']),
    price: Math.floor(Math.random() * 2000000) + 300000
  }
});

const generateHotelInfo = (destination, nights) => ({
  name: `${destination} ${getRandomElement(['호텔', '리조트', '펜션', '게스트하우스'])} ${getRandomElement(['파라다이스', '그랜드', '로얄', '임페리얼', '선샤인', '오션뷰'])}`,
  address: `${destination} 중심가`,
  checkIn: '15:00',
  checkOut: '11:00',
  roomType: getRandomElement(['스탠다드', '디럭스', '스위트', '프리미엄']),
  roomCount: Math.floor(Math.random() * 10) + 1,
  pricePerNight: Math.floor(Math.random() * 300000) + 80000,
  totalNights: nights,
  amenities: getRandomElement([
    ['WiFi', '조식', '수영장'], 
    ['WiFi', '피트니스', '스파'], 
    ['WiFi', '조식', '비즈니스센터'],
    ['WiFi', '수영장', '레스토랑']
  ]),
  rating: (Math.random() * 2 + 3).toFixed(1)
});

const generateInsuranceInfo = (paxCount, days) => ({
  company: getRandomElement(['삼성화재', '현대해상', '메리츠화재', 'DB손해보험', 'KB손해보험']),
  planName: getRandomElement(['프리미엄플랜', '스탠다드플랜', '기본플랜', 'VIP플랜']),
  coverage: {
    medical: '1억원',
    accident: '5천만원',
    baggage: '100만원',
    cancellation: '300만원'
  },
  pricePerPerson: Math.floor(Math.random() * 50000) + 15000,
  totalPrice: Math.floor(Math.random() * 50000 + 15000) * paxCount,
  validPeriod: `${days}일`
});

const generateRichBookingData = async () => {
  console.log('🌱 Starting rich booking data generation...');
  
  let totalBookings = 0;
  
  for (const companyCode of companies) {
    console.log(`\n📊 Generating bookings for ${companyCode}...`);
    
    for (let month = 0; month < 3; month++) {
      const startDate = new Date(2025, month + 1, 1); // Jan, Feb, Mar 2025
      const endDate = new Date(2025, month + 2, 0);
      
      for (let i = 1; i <= 100; i++) {
        const bookingStartDate = getRandomDate(startDate, endDate);
        const days = Math.floor(Math.random() * 10) + 3;
        const nights = days - 1;
        const bookingEndDate = new Date(bookingStartDate);
        bookingEndDate.setDate(bookingEndDate.getDate() + days);
        
        const paxCount = Math.floor(Math.random() * 50) + 1;
        const origin = getRandomElement(origins);
        const destination = getRandomElement(destinations);
        const bookingType = getRandomElement(bookingTypes);
        
        // Generate rich data
        const flightInfo = generateFlightInfo(origin, destination);
        const hotelInfo = generateHotelInfo(destination, nights);
        const insuranceInfo = generateInsuranceInfo(paxCount, days);
        
        // Calculate total price
        const flightPrice = (flightInfo.outbound.price + flightInfo.inbound.price) * paxCount;
        const hotelPrice = hotelInfo.pricePerNight * nights;
        const insurancePrice = insuranceInfo.totalPrice;
        const totalPrice = flightPrice + hotelPrice + insurancePrice;
        
        const bookingData = {
          id: `${companyCode}_${String(month + 1).padStart(2, '0')}_${String(i).padStart(3, '0')}`,
          bookingNumber: generateBookingNumber(companyCode, (month * 100) + i),
          companyCode: companyCode,
          customerName: `${getRandomElement(['김', '이', '박', '최', '정', '한', '조', '윤', '임', '송'])}${getRandomElement(['철수', '영희', '민수', '지영', '상현', '은경', '준호', '미나', '성훈', '예진'])}`,
          teamName: `${destination} ${getRandomElement(['여행단', '관광단', '연수단', '투어그룹', '여행팀'])}`,
          teamType: getRandomElement(teamTypes),
          bookingType: bookingType,
          origin: origin,
          destination: destination,
          startDate: bookingStartDate,
          endDate: bookingEndDate,
          paxCount: paxCount,
          nights: nights,
          days: days,
          status: getRandomElement(statuses),
          manager: getRandomElement(managers),
          representative: `${getRandomElement(['김', '이', '박', '최'])}${getRandomElement(['대표', '팀장', '과장', '부장'])}`,
          contact: `010-${Math.floor(Math.random() * 9000) + 1000}-${Math.floor(Math.random() * 9000) + 1000}`,
          email: `customer${i}@${companyCode.toLowerCase()}.com`,
          totalPrice: totalPrice,
          depositAmount: Math.floor(totalPrice * 0.3),
          currency: 'KRW',
          flightInfo: flightInfo,
          hotelInfo: hotelInfo,
          insuranceInfo: insuranceInfo,
          notes: `${destination} ${days}일 ${nights}박 ${paxCount}명 여행 - ${bookingType}`,
          memo: `${companyCode} 회사 ${destination} 여행 (${month + 1}월 ${i}번째)`,
          createdBy: `${companyCode}-system`,
          updatedBy: `${companyCode}-system`,
          version: 1
        };

        try {
          await prisma.booking.create({
            data: bookingData
          });
          totalBookings++;
          
          if (totalBookings % 50 === 0) {
            console.log(`  ✅ ${totalBookings} bookings created so far...`);
          }
        } catch (error) {
          console.error(`❌ Error creating booking ${bookingData.id}:`, error.message);
        }
      }
      
      console.log(`  📅 Month ${month + 1}: 100 bookings created for ${companyCode}`);
    }
    
    console.log(`✅ Completed ${companyCode}: 300 total bookings`);
  }

  console.log(`\n🎉 Rich booking data generation completed!`);
  console.log(`📊 Total bookings created: ${totalBookings}`);
  console.log(`🏢 Companies: ${companies.length}`);
  console.log(`📅 Months per company: 3`);
  console.log(`📋 Bookings per month: 100`);
};

async function main() {
  console.log('🚀 Starting rich booking data seed...');
  
  try {
    await generateRichBookingData();
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