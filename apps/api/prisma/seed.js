const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');
  
  // Clear existing data
  await prisma.booking.deleteMany();
  await prisma.user.deleteMany();
  
  // Create users (ADMIN, MANAGER, USER)
  const admin = await prisma.user.create({
    data: {
      email: 'admin@entrip.com',
      name: '관리자',
      password: 'hashed_admin123', // In real app, use bcrypt
      role: 'ADMIN'
    }
  });

  const manager = await prisma.user.create({
    data: {
      email: 'manager@entrip.com',
      name: '매니저',
      password: 'hashed_manager123',
      role: 'MANAGER'
    }
  });

  const user = await prisma.user.create({
    data: {
      email: 'user@entrip.com',
      name: '일반사용자',
      password: 'hashed_user123',
      role: 'USER'
    }
  });

  // Create sample bookings (각각 다른 사용자가 생성)
  const booking1 = await prisma.booking.upsert({
    where: { bookingNumber: 'BK2507130001' },
    update: {},
    create: {
      bookingNumber: 'BK2507130001',
      customerName: '김철수',
      teamName: 'Demo Incentive',
      bookingType: 'BUSINESS',
      destination: 'HND',
      startDate: new Date('2025-08-01'),
      endDate: new Date('2025-08-05'),
      paxCount: 25,
      nights: 4,
      days: 5,
      status: 'CONFIRMED',
      totalPrice: 50000000,
      currency: 'KRW',
      createdBy: admin.id  // ADMIN이 생성
    }
  });

  const booking2 = await prisma.booking.upsert({
    where: { bookingNumber: 'BK2507130002' },
    update: {},
    create: {
      bookingNumber: 'BK2507130002',
      customerName: '이영희',
      teamName: 'Golf Tour Team',
      bookingType: 'GROUP',
      destination: 'CTS',
      startDate: new Date('2025-09-15'),
      endDate: new Date('2025-09-18'),
      paxCount: 16,
      nights: 3,
      days: 4,
      status: 'PENDING',
      totalPrice: 32000000,
      currency: 'KRW',
      createdBy: manager.id  // MANAGER가 생성
    }
  });

  const booking3 = await prisma.booking.upsert({
    where: { bookingNumber: 'BK2507130003' },
    update: {},
    create: {
      bookingNumber: 'BK2507130003',
      customerName: '박민수',
      teamName: 'Honeymoon Package',
      bookingType: 'PACKAGE',
      destination: 'CDG',
      startDate: new Date('2025-07-20'),
      endDate: new Date('2025-07-27'),
      paxCount: 2,
      nights: 7,
      days: 8,
      status: 'CONFIRMED',
      totalPrice: 8000000,
      currency: 'KRW',
      createdBy: user.id  // USER가 생성
    }
  });

  console.log('Created 3 users:', { admin, manager, user });
  console.log('Created 3 bookings:', { booking1, booking2, booking3 });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });