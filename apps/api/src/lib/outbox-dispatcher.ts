import { PrismaClient } from '@prisma/client';
import { broadcastBookingUpdate, broadcastBulkOperation } from '../ws';

const prisma = new PrismaClient();

export interface OutboxMessage {
  id: string;
  topic: string;
  payload: any;
  createdAt: Date;
  deliveredAt?: Date | null;
  attempts: number;
}

export class OutboxDispatcher {
  private isRunning = false;
  private intervalMs: number;
  private maxRetries: number;
  private batchSize: number;

  constructor(options: {
    intervalMs?: number;
    maxRetries?: number;
    batchSize?: number;
  } = {}) {
    this.intervalMs = options.intervalMs || 5000; // 5초마다 실행
    this.maxRetries = options.maxRetries || 5;
    this.batchSize = options.batchSize || 50;
  }

  /**
   * Outbox dispatcher 시작
   */
  start(): void {
    if (this.isRunning) {
      console.log('Outbox dispatcher is already running');
      return;
    }

    this.isRunning = true;
    console.log(`Starting outbox dispatcher (interval: ${this.intervalMs}ms)`);
    
    this.processLoop();
  }

  /**
   * Outbox dispatcher 중지
   */
  stop(): void {
    console.log('Stopping outbox dispatcher');
    this.isRunning = false;
  }

  /**
   * 메인 처리 루프
   */
  private async processLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        await this.processOutboxMessages();
        await this.sleep(this.intervalMs);
      } catch (error) {
        console.error('Error in outbox processing loop:', error);
        await this.sleep(this.intervalMs); // 에러 시에도 계속 실행
      }
    }
  }

  /**
   * 미처리 Outbox 메시지들 처리
   */
  private async processOutboxMessages(): Promise<void> {
    try {
      // 미처리 메시지 조회 (전송되지 않았고, 재시도 횟수가 최대값 미만)
      const messages = await prisma.outbox.findMany({
        where: {
          deliveredAt: null,
          attempts: {
            lt: this.maxRetries
          }
        },
        orderBy: {
          createdAt: 'asc'
        },
        take: this.batchSize
      });

      if (messages.length === 0) {
        return; // 처리할 메시지 없음
      }

      console.log(`Processing ${messages.length} outbox messages`);

      // 각 메시지 처리
      for (const message of messages) {
        await this.processMessage(message);
      }

      // 오래된 성공 메시지 정리 (24시간 이상 된 것)
      await this.cleanupOldMessages();

    } catch (error) {
      console.error('Error processing outbox messages:', error);
    }
  }

  /**
   * 개별 메시지 처리
   */
  private async processMessage(message: OutboxMessage): Promise<void> {
    try {
      console.log(`Processing message: ${message.topic} (attempt: ${message.attempts + 1})`);

      // 토픽별로 처리 로직 분기
      let success = false;

      switch (message.topic) {
        case 'booking:created':
        case 'booking:updated':
        case 'booking:deleted':
          success = await this.handleBookingMessage(message);
          break;

        case 'booking:bulk_created':
          success = await this.handleBulkBookingMessage(message);
          break;

        case 'notification:email':
          success = await this.handleEmailNotification(message);
          break;

        default:
          console.warn(`Unknown topic: ${message.topic}`);
          success = false;
      }

      // 결과에 따라 상태 업데이트
      if (success) {
        await this.markAsDelivered(message.id);
        console.log(`Message ${message.id} delivered successfully`);
      } else {
        await this.incrementAttempts(message.id);
        console.log(`Message ${message.id} failed, attempts: ${message.attempts + 1}`);
      }

    } catch (error) {
      console.error(`Error processing message ${message.id}:`, error);
      await this.incrementAttempts(message.id);
    }
  }

  /**
   * 예약 관련 메시지 처리 (WebSocket 브로드캐스트)
   */
  private async handleBookingMessage(message: OutboxMessage): Promise<boolean> {
    try {
      const { bookingId, type, data } = message.payload;

      // WebSocket 브로드캐스트
      switch (type) {
        case 'create':
          broadcastBookingUpdate('create', bookingId, data);
          break;
        case 'update':
          broadcastBookingUpdate('update', bookingId, data);
          break;
        case 'delete':
          broadcastBookingUpdate('delete', bookingId, data);
          break;
        default:
          console.warn(`Unknown booking message type: ${type}`);
          return false;
      }

      return true;
    } catch (error) {
      console.error('Error handling booking message:', error);
      return false;
    }
  }

  /**
   * 대량 예약 메시지 처리
   */
  private async handleBulkBookingMessage(message: OutboxMessage): Promise<boolean> {
    try {
      const { count, bookingIds } = message.payload;

      // WebSocket 브로드캐스트
      broadcastBulkOperation('create', count, bookingIds);

      return true;
    } catch (error) {
      console.error('Error handling bulk booking message:', error);
      return false;
    }
  }

  /**
   * 이메일 알림 처리 (현재는 로깅만, 추후 실제 이메일 서비스 연동)
   */
  private async handleEmailNotification(message: OutboxMessage): Promise<boolean> {
    try {
      const { to, template, data } = message.payload;

      // 현재는 로깅만 처리 (추후 실제 이메일 서비스 연동)
      console.log(`Email notification: ${template} to ${to}`, data);

      // TODO: 실제 이메일 서비스 (SendGrid, AWS SES 등) 연동
      // await emailService.send({ to, template, data });

      return true;
    } catch (error) {
      console.error('Error handling email notification:', error);
      return false;
    }
  }

  /**
   * 메시지를 전송 완료로 표시
   */
  private async markAsDelivered(messageId: string): Promise<void> {
    await prisma.outbox.update({
      where: { id: messageId },
      data: { 
        deliveredAt: new Date(),
        attempts: { increment: 1 }
      }
    });
  }

  /**
   * 재시도 횟수 증가
   */
  private async incrementAttempts(messageId: string): Promise<void> {
    await prisma.outbox.update({
      where: { id: messageId },
      data: { 
        attempts: { increment: 1 }
      }
    });
  }

  /**
   * 오래된 메시지 정리 (24시간 이상 전송된 메시지)
   */
  private async cleanupOldMessages(): Promise<void> {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const deleted = await prisma.outbox.deleteMany({
        where: {
          deliveredAt: {
            not: null,
            lt: twentyFourHoursAgo
          }
        }
      });

      if (deleted.count > 0) {
        console.log(`Cleaned up ${deleted.count} old outbox messages`);
      }
    } catch (error) {
      console.error('Error cleaning up old messages:', error);
    }
  }

  /**
   * 최대 재시도 횟수를 초과한 실패 메시지들을 조회
   */
  async getFailedMessages(): Promise<OutboxMessage[]> {
    return prisma.outbox.findMany({
      where: {
        deliveredAt: null,
        attempts: {
          gte: this.maxRetries
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
  }

  /**
   * 실패한 메시지 재시도 (수동으로 호출)
   */
  async retryFailedMessage(messageId: string): Promise<boolean> {
    try {
      // 재시도 횟수 리셋
      await prisma.outbox.update({
        where: { id: messageId },
        data: { attempts: 0 }
      });

      console.log(`Reset attempts for message ${messageId}, will be retried in next cycle`);
      return true;
    } catch (error) {
      console.error(`Error retrying message ${messageId}:`, error);
      return false;
    }
  }

  /**
   * 현재 통계 조회
   */
  async getStats(): Promise<{
    pending: number;
    delivered: number;
    failed: number;
    total: number;
  }> {
    const [pending, delivered, failed, total] = await Promise.all([
      prisma.outbox.count({
        where: {
          deliveredAt: null,
          attempts: { lt: this.maxRetries }
        }
      }),
      prisma.outbox.count({
        where: {
          deliveredAt: { not: null }
        }
      }),
      prisma.outbox.count({
        where: {
          deliveredAt: null,
          attempts: { gte: this.maxRetries }
        }
      }),
      prisma.outbox.count()
    ]);

    return { pending, delivered, failed, total };
  }

  /**
   * Sleep 유틸리티
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 싱글톤 인스턴스
export const outboxDispatcher = new OutboxDispatcher({
  intervalMs: 5000,    // 5초마다
  maxRetries: 5,       // 최대 5회 재시도
  batchSize: 50        // 한 번에 50개씩 처리
});

export default outboxDispatcher;