import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface IdempotencyConfig {
  ttlMinutes?: number; // 기본 30분
  endpoint: string;
  skipFields?: string[]; // 해시에서 제외할 필드들 (timestamp 등)
}

export class IdempotencyManager {
  private static TTL_MINUTES = 30;

  /**
   * 요청 해시 생성 (민감 정보 제외)
   */
  private static generateRequestHash(
    body: any, 
    query: any, 
    skipFields: string[] = []
  ): string {
    // 해시에서 제외할 기본 필드들
    const defaultSkipFields = [
      'timestamp', 
      'requestId', 
      '_t', 
      'csrf',
      'nonce'
    ];
    
    const allSkipFields = [...defaultSkipFields, ...skipFields];
    
    // 객체 깊은 복사 후 제외 필드 제거
    const cleanBody = this.removeFields(JSON.parse(JSON.stringify(body || {})), allSkipFields);
    const cleanQuery = this.removeFields(JSON.parse(JSON.stringify(query || {})), allSkipFields);
    
    const hashInput = {
      body: cleanBody,
      query: cleanQuery
    };
    
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(hashInput, Object.keys(hashInput).sort()))
      .digest('hex');
  }

  /**
   * 객체에서 특정 필드들을 재귀적으로 제거
   */
  private static removeFields(obj: any, fieldsToRemove: string[]): any {
    if (obj === null || typeof obj !== 'object') return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.removeFields(item, fieldsToRemove));
    }
    
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (!fieldsToRemove.includes(key)) {
        cleaned[key] = this.removeFields(value, fieldsToRemove);
      }
    }
    return cleaned;
  }

  /**
   * 멱등성 키 검증 및 처리
   * @param idempotencyKey 클라이언트 제공 멱등성 키
   * @param config 설정 옵션
   * @param requestBody 요청 본문
   * @param requestQuery 요청 쿼리
   * @returns 기존 응답 또는 null (새 요청)
   */
  static async handleIdempotency(
    idempotencyKey: string,
    config: IdempotencyConfig,
    requestBody?: any,
    requestQuery?: any
  ): Promise<any | null> {
    try {
      // 1. 만료된 키 정리 (백그라운드)
      this.cleanupExpiredKeys().catch(console.error);

      // 2. 요청 해시 생성
      const requestHash = this.generateRequestHash(
        requestBody, 
        requestQuery, 
        config.skipFields
      );

      // 3. 기존 키 조회
      const existingKey = await prisma.idempotencyKey.findUnique({
        where: { key: idempotencyKey }
      });

      if (existingKey) {
        // 4. 만료 확인
        if (existingKey.ttl < new Date()) {
          await prisma.idempotencyKey.delete({
            where: { key: idempotencyKey }
          });
          return null; // 새 요청으로 처리
        }

        // 5. 해시 검증 (동일 키, 다른 내용 방지)
        if (existingKey.requestHash !== requestHash) {
          throw new Error(
            'Idempotency key reused with different request content'
          );
        }

        // 6. 기존 응답 반환
        return existingKey.responseBody;
      }

      // 7. 새 키 등록 (응답 저장용 placeholder)
      const ttl = new Date(
        Date.now() + (config.ttlMinutes || this.TTL_MINUTES) * 60 * 1000
      );

      await prisma.idempotencyKey.create({
        data: {
          key: idempotencyKey,
          endpoint: config.endpoint,
          requestHash,
          ttl
        }
      });

      return null; // 새 요청 처리 진행
    } catch (error) {
      console.error('Idempotency handling error:', error);
      throw error;
    }
  }

  /**
   * 성공적인 응답 저장
   */
  static async saveResponse(
    idempotencyKey: string, 
    responseBody: any
  ): Promise<void> {
    try {
      await prisma.idempotencyKey.update({
        where: { key: idempotencyKey },
        data: { responseBody }
      });
    } catch (error) {
      console.error('Failed to save idempotency response:', error);
      // 응답 저장 실패는 비즈니스 로직에 영향 주지 않음
    }
  }

  /**
   * 실패 시 키 정리
   */
  static async cleanupFailedRequest(idempotencyKey: string): Promise<void> {
    try {
      await prisma.idempotencyKey.delete({
        where: { key: idempotencyKey }
      }).catch(() => {
        // 키가 이미 없어도 무시
      });
    } catch (error) {
      console.error('Failed to cleanup idempotency key:', error);
    }
  }

  /**
   * 만료된 키 정리 (백그라운드)
   */
  private static async cleanupExpiredKeys(): Promise<void> {
    try {
      await prisma.idempotencyKey.deleteMany({
        where: {
          ttl: {
            lt: new Date()
          }
        }
      });
    } catch (error) {
      console.error('Failed to cleanup expired keys:', error);
    }
  }

  /**
   * Express 미들웨어 생성기
   */
  static middleware(config: Omit<IdempotencyConfig, 'endpoint'>) {
    return async (req: any, res: any, next: any) => {
      const idempotencyKey = req.headers['idempotency-key'] as string;
      
      if (!idempotencyKey) {
        return next(); // 멱등성 키 없으면 통과
      }

      try {
        const existingResponse = await this.handleIdempotency(
          idempotencyKey,
          {
            ...config,
            endpoint: `${req.method} ${req.path}`
          },
          req.body,
          req.query
        );

        if (existingResponse) {
          // 기존 응답 반환
          return res.status(200).json(existingResponse);
        }

        // 새 요청 - 멱등성 키를 req에 저장
        req.idempotencyKey = idempotencyKey;
        next();
      } catch (error) {
        console.error('Idempotency middleware error:', error);
        return res.status(409).json({
          error: 'Idempotency key conflict',
          message: error.message
        });
      }
    };
  }
}

/**
 * 유틸리티 함수: 멱등성 키 생성 (클라이언트용)
 */
export function generateIdempotencyKey(
  prefix: string = 'req',
  additionalData?: string
): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2);
  const data = additionalData ? `-${additionalData}` : '';
  
  return `${prefix}-${timestamp}-${random}${data}`;
}

export default IdempotencyManager;