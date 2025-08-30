import { v4 as uuid } from 'uuid';
import type { Request, Response, NextFunction } from 'express';

// Express 요청 객체에 id 프로퍼티 추가를 위한 인터페이스 확장
declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

/**
 * Request ID 미들웨어
 * - 모든 요청에 고유 ID 할당
 * - 클라이언트가 X-Request-Id 헤더로 전달한 값 사용 가능
 * - 응답 헤더에 X-Request-Id 포함
 * - 로깅 및 추적에 활용
 */
export function requestId() {
  return (req: Request, res: Response, next: NextFunction) => {
    // 클라이언트가 제공한 ID 또는 새 UUID 생성
    req.id = (req.headers['x-request-id'] as string) ?? uuid();
    
    // 응답 헤더에 Request ID 포함
    res.setHeader('X-Request-Id', req.id);
    
    // 로깅을 위한 컨텍스트 설정
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Request ID: ${req.id}`);
    }
    
    next();
  };
}