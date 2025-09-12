import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting simple seed...');

  try {
    // Create one demo booking
    const booking = await prisma.booking.create({
      data: {
        teamName: 'Demo Incentive',
        type: 'incentive',
        origin: 'ICN',
        destination: 'HND',
        startDate: new Date('2025-08-01'),
        endDate: new Date('2025-08-05'),
        totalPax: 30,
        coordinator: '홍길동',
        revenue: '12000000',
        status: 'confirmed',
        notes: '도쿄 인센티브 여행 - 4박 5일',
      },
    });

    console.log('✅ Created booking:', booking.id);
    
    // Check total count
    const count = await prisma.booking.count();
    console.log(`📊 Total bookings: ${count}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });