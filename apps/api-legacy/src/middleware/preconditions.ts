import { Request, Response, NextFunction } from 'express';

/** 항상 `"n"` 형태로 따옴표를 포함한 ETag 문자열을 만듭니다. */
export const quoteEtag = (v: number) => `"${v}"`;

/**
 * GET용 304 처리: If-None-Match가 현재 버전과 같으면 304 반환
 */
export const ifNoneMatch =
  (getVersion: (req: Request) => Promise<number | null>) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const inm = req.headers['if-none-match'];
      const v = await getVersion(req);
      if (inm && v !== null && inm === quoteEtag(v)) {
        return res.status(304).send();
      }
      return next();
    } catch (e) {
      return next(e);
    }
  };

/**
 * PATCH/PUT용 428/412 처리: If-Match 없으면 428, 다르면 412
 * 성공 시 res.locals.expectedVersion에 현재 버전(number)을 저장합니다.
 */
export const requireIfMatch =
  (getVersion: (req: Request) => Promise<number | null>) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ifMatch = req.headers['if-match'];
      if (!ifMatch) {
        return res.status(428).json({
          error: 'Precondition Required',
          message: 'If-Match header is required for updates',
        });
      }
      const v = await getVersion(req);
      if (v === null) {
        return res.status(404).json({ error: 'Booking not found' });
      }
      if (ifMatch !== quoteEtag(v)) {
        return res.status(412).json({
          error: 'Precondition Failed',
          message: 'Resource has been modified',
          currentVersion: v,
        });
      }
      (res.locals as any).expectedVersion = v;
      return next();
    } catch (e) {
      return next(e);
    }
  };

/** 응답 직전에 ETag를 자동 세팅하는 얇은 헬퍼 */
export const setEtag = (res: Response, version: number) => {
  res.set('ETag', quoteEtag(version));
};

// 기존 함수들은 deprecated 처리
/** @deprecated Use ifNoneMatch instead */
export const checkIfNoneMatch = ifNoneMatch;

/** 
 * @deprecated Use getBookingVersion directly with new middleware 
 * Middleware to automatically add ETag header to responses
 * @param getVersion Function to extract version from response body
 */
export const withETag = (getVersion: (body: any) => number | string | undefined) =>
  (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    
    res.json = (body: any) => {
      const version = getVersion(body);
      if (version !== undefined) {
        res.set('ETag', `"${version}"`);
      }
      return originalJson(body);
    };
    
    next();
  };

/**
 * Helper function to get version from booking service
 * Can be used with the middleware functions above
 * @deprecated Use getBookingVersion directly in controller
 */
export const getBookingVersion = (bookingService: any) => 
  async (req: Request): Promise<number | null> => {
    const booking = await bookingService.findOne(req.params.id);
    return booking ? booking.version : null;
  };