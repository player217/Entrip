import bcrypt from 'bcryptjs';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    // Create test user with known password
    const hashedPassword = await bcrypt.hash('test123', 10);

    const user = await prisma.user.create({
      data: {
        email: 'test@j1.com',
        name: 'Test User',
        password: hashedPassword,
        role: UserRole.ADMIN,
        companyCode: 'j1',
        isActive: true,
      }
    });

    console.log('✅ Test user created successfully:');
    console.log({
      email: user.email,
      name: user.name,
      companyCode: user.companyCode,
      role: user.role,
      plainPassword: 'test123'
    });

  } catch (error) {
    console.error('Error creating test user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();