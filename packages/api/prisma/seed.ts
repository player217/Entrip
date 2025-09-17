import { PrismaClient, BookingType, BookingStatus, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting to seed database...');

  // Clear existing data (optional - be careful in production)
  console.log('🧹 Cleaning existing data...');
  await prisma.booking.deleteMany();
  await prisma.user.deleteMany();

  // Create users for multiple companies
  console.log('👥 Creating users for multiple companies...');

  const defaultPassword = await bcrypt.hash('pass1234', 10);

  const users = [
    // J1 여행사
    {
      email: 'admin@j1.com',
      name: 'J1 관리자',
      password: defaultPassword,
      role: UserRole.ADMIN,
      companyCode: 'j1',
      department: '경영지원팀',
      isActive: true,
    },
    {
      email: 'manager@j1.com',
      name: 'J1 매니저',
      password: defaultPassword,
      role: UserRole.MANAGER,
      companyCode: 'j1',
      department: '영업팀',
      isActive: true,
    },
    {
      email: 'user1@j1.com',
      name: 'J1 직원1',
      password: defaultPassword,
      role: UserRole.USER,
      companyCode: 'j1',
      department: '영업팀',
      isActive: true,
    },

    // 스타투어
    {
      email: 'admin@star.com',
      name: '스타 관리자',
      password: defaultPassword,
      role: UserRole.ADMIN,
      companyCode: 'star',
      department: '경영지원팀',
      isActive: true,
    },
    {
      email: 'user@star.com',
      name: '스타 직원',
      password: defaultPassword,
      role: UserRole.USER,
      companyCode: 'star',
      department: '기획팀',
      isActive: true,
    },

    // 해피트래블
    {
      email: 'admin@happy.com',
      name: '해피 관리자',
      password: defaultPassword,
      role: UserRole.ADMIN,
      companyCode: 'happy',
      department: '경영지원팀',
      isActive: true,
    },
    {
      email: 'manager@happy.com',
      name: '해피 매니저',
      password: defaultPassword,
      role: UserRole.MANAGER,
      companyCode: 'happy',
      department: '마케팅팀',
      isActive: true,
    },

    // Entrip 메인
    {
      email: 'admin@entrip.com',
      name: 'Entrip 관리자',
      password: defaultPassword,
      role: UserRole.ADMIN,
      companyCode: 'entrip',
      department: '시스템팀',
      isActive: true,
    },
    {
      email: 'demo@entrip.com',
      name: '데모 사용자',
      password: defaultPassword,
      role: UserRole.USER,
      companyCode: 'entrip',
      department: '데모팀',
      isActive: true,
    },
  ];

  const createdUsers = await Promise.all(
    users.map(user => prisma.user.create({ data: user }))
  );

  console.log(`✅ Created ${createdUsers.length} users`);

  // Get user IDs for booking assignment
  const j1Admin = createdUsers.find(u => u.email === 'admin@j1.com');
  const starAdmin = createdUsers.find(u => u.email === 'admin@star.com');
  const happyAdmin = createdUsers.find(u => u.email === 'admin@happy.com');
  const entripAdmin = createdUsers.find(u => u.email === 'admin@entrip.com');

  // Create demo bookings with company assignments
  console.log('📝 Creating demo bookings...');

  const bookings = [
    // J1 여행사 예약
    {
      companyCode: 'j1',
      userId: j1Admin?.id,
      teamName: 'J1 기업 인센티브 - 삼성전자',
      type: BookingType.incentive,
      origin: 'ICN',
      destination: 'HND',
      startDate: new Date('2025-09-01'),
      endDate: new Date('2025-09-05'),
      totalPax: 30,
      coordinator: '홍길동',
      revenue: '12000000',
      status: BookingStatus.confirmed,
      notes: '도쿄 인센티브 여행 - 4박 5일',
    },
    {
      companyCode: 'j1',
      userId: j1Admin?.id,
      teamName: 'J1 골프 패키지 - LG전자',
      type: BookingType.golf,
      origin: 'ICN',
      destination: 'PUS',
      startDate: new Date('2025-09-15'),
      endDate: new Date('2025-09-17'),
      totalPax: 16,
      coordinator: '김영희',
      revenue: '8500000',
      status: BookingStatus.pending,
      notes: '부산 골프 여행 - 2박 3일',
    },
    {
      companyCode: 'j1',
      userId: j1Admin?.id,
      teamName: 'J1 신혼여행 - 김철수&이영희',
      type: BookingType.honeymoon,
      origin: 'ICN',
      destination: 'CDG',
      startDate: new Date('2025-10-10'),
      endDate: new Date('2025-10-20'),
      totalPax: 2,
      coordinator: '박민수',
      revenue: '15000000',
      status: BookingStatus.confirmed,
      notes: '파리 신혼여행 - 10박 11일',
    },

    // 스타투어 예약
    {
      companyCode: 'star',
      userId: starAdmin?.id,
      teamName: '스타 비즈니스 출장 - 현대자동차',
      type: BookingType.etc,
      origin: 'ICN',
      destination: 'NRT',
      startDate: new Date('2025-09-25'),
      endDate: new Date('2025-09-27'),
      totalPax: 5,
      coordinator: '이철수',
      revenue: '3500000',
      status: BookingStatus.done,
      notes: '도쿄 비즈니스 출장',
    },
    {
      companyCode: 'star',
      userId: starAdmin?.id,
      teamName: '스타 가족 여행 - 정상훈 가족',
      type: BookingType.etc,
      origin: 'ICN',
      destination: 'BKK',
      startDate: new Date('2025-09-15'),
      endDate: new Date('2025-09-22'),
      totalPax: 8,
      coordinator: '최지영',
      revenue: '6800000',
      status: BookingStatus.pending,
      notes: '방콕 가족 휴가 - 7박 8일',
    },

    // 해피트래블 예약
    {
      companyCode: 'happy',
      userId: happyAdmin?.id,
      teamName: '해피 기업 워크샵 - SK텔레콤',
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
      companyCode: 'happy',
      userId: happyAdmin?.id,
      teamName: '해피 골프 여행 - KT 임원진',
      type: BookingType.golf,
      origin: 'ICN',
      destination: 'CJU',
      startDate: new Date('2025-09-05'),
      endDate: new Date('2025-09-07'),
      totalPax: 12,
      coordinator: '강동현',
      revenue: '4200000',
      status: BookingStatus.cancelled,
      notes: '제주도 골프 - 취소된 예약',
    },

    // Entrip 데모 예약
    {
      companyCode: 'entrip',
      userId: entripAdmin?.id,
      teamName: '데모 인센티브 - 데모 회사',
      type: BookingType.incentive,
      origin: 'ICN',
      destination: 'LAX',
      startDate: new Date('2025-11-01'),
      endDate: new Date('2025-11-08'),
      totalPax: 20,
      coordinator: '데모 담당자',
      revenue: '25000000',
      status: BookingStatus.pending,
      notes: 'LA 인센티브 여행 - 7박 8일',
    },
  ];

  const createdBookings = await prisma.booking.createMany({
    data: bookings,
  });

  console.log(`✅ Created ${createdBookings.count} bookings`);

  // Display statistics
  const bookingStats = await prisma.booking.groupBy({
    by: ['status'],
    _count: { id: true },
  });

  const companyStats = await prisma.booking.groupBy({
    by: ['companyCode'],
    _count: { id: true },
  });

  const userStats = await prisma.user.groupBy({
    by: ['companyCode', 'role'],
    _count: { id: true },
  });

  console.log('📊 Booking statistics by status:');
  bookingStats.forEach(stat => {
    console.log(`  ${stat.status}: ${stat._count.id} bookings`);
  });

  console.log('🏢 Booking statistics by company:');
  companyStats.forEach(stat => {
    console.log(`  ${stat.companyCode}: ${stat._count.id} bookings`);
  });

  console.log('👥 User statistics by company and role:');
  userStats.forEach(stat => {
    console.log(`  ${stat.companyCode} - ${stat.role}: ${stat._count.id} users`);
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