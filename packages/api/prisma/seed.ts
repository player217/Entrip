import { PrismaClient, BookingType, BookingStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting to seed database...');

  // Clear existing data (optional - be careful in production)
  console.log('🧹 Cleaning existing bookings...');
  await prisma.booking.deleteMany();

  // Create demo bookings
  console.log('📝 Creating demo bookings...');
  
  const bookings = [
    {
      teamName: 'Demo Incentive Team',
      type: BookingType.incentive,
      origin: 'ICN',
      destination: 'HND',
      startDate: new Date('2025-08-01'),
      endDate: new Date('2025-08-05'),
      totalPax: 30,
      coordinator: '홍길동',
      revenue: '12000000',
      status: BookingStatus.confirmed,
      notes: '도쿄 인센티브 여행 - 4박 5일',
    },
    {
      teamName: 'Golf Trip Busan',
      type: BookingType.golf,
      origin: 'ICN',
      destination: 'PUS',
      startDate: new Date('2025-07-15'),
      endDate: new Date('2025-07-17'),
      totalPax: 16,
      coordinator: '김영희',
      revenue: '8500000',
      status: BookingStatus.pending,
      notes: '부산 골프 여행 - 2박 3일',
    },
    {
      teamName: 'Honeymoon Package',
      type: BookingType.honeymoon,
      origin: 'ICN',
      destination: 'CDG',
      startDate: new Date('2025-09-10'),
      endDate: new Date('2025-09-20'),
      totalPax: 2,
      coordinator: '박민수',
      revenue: '15000000',
      status: BookingStatus.confirmed,
      notes: '파리 신혼여행 - 10박 11일',
    },
    {
      teamName: 'Business Trip',
      type: BookingType.etc,
      origin: 'ICN',
      destination: 'NRT',
      startDate: new Date('2025-06-25'),
      endDate: new Date('2025-06-27'),
      totalPax: 5,
      coordinator: '이철수',
      revenue: '3500000',
      status: BookingStatus.done,
      notes: '도쿄 비즈니스 출장',
    },
    {
      teamName: 'Family Vacation',
      type: BookingType.etc,
      origin: 'ICN',
      destination: 'BKK',
      startDate: new Date('2025-08-15'),
      endDate: new Date('2025-08-22'),
      totalPax: 8,
      coordinator: '최지영',
      revenue: '6800000',
      status: BookingStatus.pending,
      notes: '방콕 가족 휴가 - 7박 8일',
    },
    {
      teamName: 'Corporate Retreat',
      type: BookingType.incentive,
      origin: 'ICN',
      destination: 'SIN',
      startDate: new Date('2025-10-05'),
      endDate: new Date('2025-10-08'),
      totalPax: 45,
      coordinator: '정우진',
      revenue: '18000000',
      status: BookingStatus.confirmed,
      notes: '싱가포르 기업 워크샵',
    },
    {
      teamName: 'Weekend Golf',
      type: BookingType.golf,
      origin: 'ICN',
      destination: 'CJU',
      startDate: new Date('2025-07-05'),
      endDate: new Date('2025-07-07'),
      totalPax: 12,
      coordinator: '강동현',
      revenue: '4200000',
      status: BookingStatus.cancelled,
      notes: '제주도 골프 - 취소된 예약',
    },
  ];

  const createdBookings = await prisma.booking.createMany({
    data: bookings,
  });

  console.log(`✅ Created ${createdBookings.count} bookings`);

  // Display statistics
  const stats = await prisma.booking.groupBy({
    by: ['status'],
    _count: { id: true },
  });

  console.log('📊 Booking statistics:');
  stats.forEach(stat => {
    console.log(`  ${stat.status}: ${stat._count.id} bookings`);
  });

  console.log('🎉 Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });