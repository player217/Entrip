const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testPrismaQuery() {
  try {
    console.log('Testing Prisma query...');
    
    // First, let's see what users exist
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        companyCode: true,
        isActive: true
      },
      take: 5
    });
    
    console.log('Sample users:', JSON.stringify(allUsers, null, 2));
    
    // Now test the exact query from auth-simple.ts
    console.log('\nTesting auth query...');
    const user = await prisma.user.findFirst({
      where: {
        companyCode: 'j1',
        email: 'admin@j1.com',
        isActive: true
      }
    });
    
    console.log('Found user:', user ? 'YES' : 'NO');
    if (user) {
      console.log('User details:', {
        id: user.id,
        email: user.email,
        companyCode: user.companyCode,
        role: user.role
      });
    }
    
  } catch (error) {
    console.error('Prisma test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPrismaQuery();