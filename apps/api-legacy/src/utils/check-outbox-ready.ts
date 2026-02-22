import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Outbox 테이블 준비 상태 확인
 */
export async function checkOutboxReady(): Promise<boolean> {
  try {
    // Outbox 테이블 존재 및 접근 가능 여부 확인
    const count = await prisma.outbox.count();
    console.log(`[Outbox] Table ready with ${count} pending messages`);
    
    // 테이블이 존재하고 접근 가능하면 true
    return true;
  } catch (error) {
    console.error('[Outbox] Table not ready:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}