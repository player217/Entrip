import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Load mock users data
  const mockUsersPath = path.join(__dirname, '../src/data/mock-users.json');
  const mockData = JSON.parse(fs.readFileSync(mockUsersPath, 'utf-8'));
  const mockUsers = mockData.users;

  // Hash password
  const hashedPassword = await bcrypt.hash('pass1234', 10);

  // Seed users
  for (const user of mockUsers) {
    try {
      await prisma.user.create({
        data: {
          id: user.id,
          companyCode: user.companyCode,
          name: user.name || user.username.split('@')[0],
          department: user.department || null,
          email: user.email,
          password: hashedPassword,
          role: user.role,
          isActive: true,
          createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
          updatedAt: user.updatedAt ? new Date(user.updatedAt) : new Date(),
        },
      });
      console.log(`✅ Created user: ${user.email} (${user.name || user.username.split('@')[0]})`);
    } catch (error) {
      console.error(`❌ Failed to create user ${user.email}:`, error);
    }
  }

  console.log('✅ Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });