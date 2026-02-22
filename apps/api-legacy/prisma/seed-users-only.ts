import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedUsers() {
  console.log('🌱 Starting user seed...');

  try {
    // Clear existing users
    console.log('🗑️ Clearing existing users...');
    await prisma.user.deleteMany();

    // Company configurations
    const companies = [
      { code: 'J1', name: 'J1 Company' },
      { code: 'HAPPY', name: 'Happy Travel' },
      { code: 'STAR', name: 'Star Tours' },
      { code: 'ENTRIP_MAIN', name: 'Entrip 본사' }
    ];

    // User roles - using string literals since enum doesn't exist
    // const roles = ['ADMIN', 'MANAGER', 'USER'] as const;

    // Create users for each company
    for (const company of companies) {
      console.log(`\n🏢 Creating users for ${company.name} (${company.code})...`);

      // Create admin
      await prisma.user.create({
        data: {
          companyCode: company.code,
          email: `admin@${company.code.toLowerCase()}.com`,
          password: await bcrypt.hash('pass1234', 10),
          role: 'ADMIN',
          name: `${company.name} 관리자`,
          department: 'IT부서',
          isActive: true
        }
      });
      console.log(`  ✅ Created admin@${company.code.toLowerCase()}.com`);

      // Create managers
      for (let i = 1; i <= 2; i++) {
        const username = company.code === 'ENTRIP_MAIN' 
          ? (i === 1 ? 'manager@entrip.com' : `manager${i}@entrip.com`)
          : `manager${i}@${company.code.toLowerCase()}.com`;

        await prisma.user.create({
          data: {
            companyCode: company.code,
            email: username,
            password: await bcrypt.hash('pass1234', 10),
            role: 'MANAGER',
            name: `${company.name} 매니저 ${i}`,
            department: '영업부서',
            isActive: true
          }
        });
        console.log(`  ✅ Created ${username}`);
      }

      // Create regular users (except for ENTRIP_MAIN which has operator)
      if (company.code === 'ENTRIP_MAIN') {
        // Create operator for ENTRIP_MAIN
        await prisma.user.create({
          data: {
            companyCode: company.code,
            email: 'operator@entrip.com',
            password: await bcrypt.hash('pass1234', 10),
            role: 'USER',
            name: 'Entrip 운영자',
            department: '운영팀',
            isActive: true
          }
        });
        console.log(`  ✅ Created operator@entrip.com`);
      } else {
        // Create regular users for other companies
        for (let i = 1; i <= 2; i++) {
          const username = `user${i}@${company.code.toLowerCase()}.com`;
          
          await prisma.user.create({
            data: {
              companyCode: company.code,
              email: username,
              password: await bcrypt.hash('pass1234', 10),
              role: 'USER',
              name: `${company.name} 직원 ${i}`,
              department: '일반부서',
              isActive: true
            }
          });
          console.log(`  ✅ Created ${username}`);
        }
      }
    }

    // Special users from demo accounts
    const specialUsers = [
      { code: 'HAPPY', username: 'happy_manager1@happy.com', name: 'Happy 매니저 1', role: 'MANAGER' as const },
      { code: 'HAPPY', username: 'happy_manager2@happy.com', name: 'Happy 매니저 2', role: 'MANAGER' as const },
      { code: 'STAR', username: 'star_manager@star.com', name: 'Star 매니저', role: 'MANAGER' as const },
      { code: 'STAR', username: 'star_coordinator@star.com', name: 'Star 코디네이터', role: 'USER' as const }
    ];

    console.log('\n🌟 Creating special users...');
    for (const user of specialUsers) {
      try {
        await prisma.user.create({
          data: {
            companyCode: user.code,
            email: user.username,
            password: await bcrypt.hash('pass1234', 10),
            role: user.role,
            name: user.name,
            department: user.role === 'MANAGER' ? '영업부서' : '운영부서',
            isActive: true
          }
        });
        console.log(`  ✅ Created ${user.username}`);
      } catch (e) {
        console.log(`  ⚠️ Skipped ${user.username} (may already exist)`);
      }
    }

    // Show summary
    const userCount = await prisma.user.count();
    const companyCounts = await prisma.user.groupBy({
      by: ['companyCode'],
      _count: true
    });

    console.log('\n📊 User Seed Summary:');
    console.log('====================');
    console.log(`Total users created: ${userCount}`);
    console.log('\nUsers per company:');
    companyCounts.forEach(c => {
      console.log(`  ${c.companyCode}: ${c._count} users`);
    });

    console.log('\n✅ User seed completed successfully!');

  } catch (error) {
    console.error('❌ Error seeding users:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed
seedUsers()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });