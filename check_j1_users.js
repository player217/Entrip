const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkJ1Users() {
  try {
    const users = await prisma.user.findMany({
      where: { companyCode: 'j1' },
      select: {
        id: true,
        email: true,
        name: true,
        companyCode: true,
        role: true,
        isActive: true
      }
    });
    
    console.log('J1 Company Users:');
    console.log(JSON.stringify(users, null, 2));
    console.log(`Total J1 users: ${users.length}`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkJ1Users();