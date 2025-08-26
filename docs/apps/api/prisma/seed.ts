import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');
  
  await prisma.booking.createMany({
    data: [
      {
        teamName: 'Demo Incentive',
        type: 'incentive',
        origin: 'ICN',
        destination: 'HND',
        startDate: new Date('2025-08-01'),
        endDate: new Date('2025-08-05'),
        totalPax: 25,
        coordinator: '홍길동',
        revenue: 12000000,
        status: 'confirmed'
      },
      {
        teamName: 'Golf Tour Team',
        type: 'golf',
        origin: 'ICN',
        destination: 'CTS',
        startDate: new Date('2025-09-15'),
        endDate: new Date('2025-09-18'),
        totalPax: 16,
        coordinator: '김골프',
        revenue: 8500000,
        status: 'pending'
      },
      {
        teamName: 'Honeymoon Package',
        type: 'honeymoon',
        origin: 'ICN',
        destination: 'CDG',
        startDate: new Date('2025-07-20'),
        endDate: new Date('2025-07-27'),
        totalPax: 2,
        coordinator: '박신혼',
        revenue: 3200000,
        status: 'confirmed'
      }
    ]
  });
  
  console.log('✅ Seeding completed\!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
EOF < /dev/null
