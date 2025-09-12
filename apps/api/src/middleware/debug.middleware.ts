import { Request, Response, NextFunction } from 'express';

/**
 * 타임아웃 디버깅 미들웨어
 * 느린 요청을 감지하고 성능 문제를 추적합니다.
 */
export const timeoutDebugger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const path = `${req.method} ${req.path}`;
  
  // 요청 시작 로그
  if (req.path.includes('/auth')) {
    console.log(`[Auth Debug] Starting ${path} at ${new Date().toISOString()}`);
  }
  
  // 5초 타임아웃 경고
  const warningTimer = setTimeout(() => {
    console.warn(`⚠️ [Slow Request] ${path} - ${Date.now() - startTime}ms elapsed`);
    console.warn(`  Headers:`, req.headers);
    console.warn(`  Body:`, req.body);
    console.trace('Call stack:');
  }, 5000);
  
  // 10초 심각한 경고
  const criticalTimer = setTimeout(() => {
    console.error(`🔴 [Critical Timeout] ${path} - ${Date.now() - startTime}ms elapsed`);
    console.error(`  This request is taking way too long!`);
    
    // 스택 트레이스 출력
    const stack = new Error().stack;
    console.error(`  Stack trace:`, stack);
  }, 10000);
  
  // 응답 완료 시 정리
  res.on('finish', () => {
    clearTimeout(warningTimer);
    clearTimeout(criticalTimer);
    
    const duration = Date.now() - startTime;
    
    // 성능 로깅 (1초 이상 걸린 요청만)
    if (duration > 1000) {
      console.log(`[Performance] ${path} took ${duration}ms (Status: ${res.statusCode})`);
    }
    
    // Auth 요청 상세 로깅
    if (req.path.includes('/auth')) {
      console.log(`[Auth Debug] Completed ${path} in ${duration}ms with status ${res.statusCode}`);
    }
  });
  
  // 에러 발생 시 정리
  res.on('error', (error) => {
    clearTimeout(warningTimer);
    clearTimeout(criticalTimer);
    console.error(`[Request Error] ${path} failed:`, error);
  });
  
  next();
};

/**
 * 요청 본문 로깅 미들웨어
 * 디버깅을 위해 요청 데이터를 로깅합니다.
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.DEBUG_REQUESTS === 'true') {
    console.log(`[Request] ${req.method} ${req.path}`);
    console.log(`  Query:`, req.query);
    console.log(`  Body:`, req.body);
    console.log(`  Headers:`, {
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent'],
      'authorization': req.headers.authorization ? 'Bearer ***' : 'none'
    });
  }
  next();
};