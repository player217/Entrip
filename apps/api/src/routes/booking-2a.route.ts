import { Router, Request } from 'express';
import * as svc from '../services/booking.service';
import { validate } from '../middleware/validate';
import { BookingCreateSchema, BookingUpdateSchema, BookingListSchema, BookingStatusSchema, BookingGetSchema } from '../schemas/booking.schema';
import { BookingResponse, BookingListResponse, BookingCreateResponse, BookingUpdateResponse } from '../schemas/booking.schema';
import { respond, respondWithETag, respondCreated, respondNoContent, createResponse } from '../middleware/respond';
import { ApiError, ErrorCode } from '../middleware/api-error';
import { parseBookingQuery } from '../utils/query-parser';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.middleware';
import { UserRole } from '@entrip/shared';
import { broadcastBookingUpdate, broadcastBulkOperation } from '../ws';
import { IdempotencyManager } from '../lib/idempotency';
import { z } from 'zod';

const r: Router = Router();

// POST는 ADMIN, MANAGER만 가능
r.post('/', 
  authenticate, 
  requireRole([UserRole.ADMIN, UserRole.MANAGER]), 
  IdempotencyManager.middleware({ ttlMinutes: 30 }),
  validate(BookingCreateSchema), 
  respondCreated(
    BookingCreateResponse,
    async (req: Request) => {
      const authReq = req as AuthRequest;
      const idempotencyKey = (req as any).idempotencyKey;
      
      try {
        const validData = (req as any).valid?.body || req.body;
        const b = await svc.createBooking({
          ...validData,
          createdBy: authReq.user!.userId
        }, authReq.user!.companyCode);
        
        // WebSocket으로 브로드캐스트
        broadcastBookingUpdate('create', b.id, b);
        
        // 성공 시 멱등성 응답 저장
        if (idempotencyKey) {
          await IdempotencyManager.saveResponse(idempotencyKey, b);
        }
        
        return createResponse(b);
      } catch (error: any) {
        if (idempotencyKey) {
          await IdempotencyManager.cleanupFailedRequest(idempotencyKey);
        }
        throw error;
      }
    },
    (result) => result.data.version
  )
);

// GET 엔드포인트는 인증 제거 (개발용)
r.get('/', 
  validate(BookingListSchema),
  respond(
    BookingListResponse,
    async (req: Request) => {
      const validQuery = (req as any).valid?.query || req.query;
      const q = { ...parseBookingQuery(validQuery), month: validQuery.month };
      const list = await svc.listBookings(q, 'ENTRIP_MAIN');
      return createResponse(list.items || list, list.meta);
    }
  )
);

r.get('/:id', 
  validate(BookingGetSchema),
  respondWithETag(
    BookingResponse,
    async (req: Request) => {
      const b = await svc.getBooking(req.params.id, 'ENTRIP_MAIN');
      if (!b) {
        throw ApiError.notFound('Booking');
      }
      return createResponse(b);
    },
    (result) => result.data.version
  )
);

// PATCH도 ADMIN, MANAGER만 가능
r.patch('/:id', 
  authenticate, 
  requireRole([UserRole.ADMIN, UserRole.MANAGER]), 
  IdempotencyManager.middleware({ ttlMinutes: 15 }),
  validate(BookingUpdateSchema), 
  respond(
    BookingUpdateResponse,
    async (req: Request) => {
      const authReq = req as AuthRequest;
      const idempotencyKey = (req as any).idempotencyKey;
      
      try {
        // If-Match 헤더 확인 (낙관적 잠금)
        const ifMatch = req.headers['if-match'];
        if (!ifMatch) {
          throw new ApiError(
            ErrorCode.PRECONDITION_REQUIRED,
            'If-Match header is required for updates'
          );
        }
        
        // 현재 버전 확인
        const current = await svc.getBooking(req.params.id, authReq.user!.companyCode);
        if (!current) {
          throw ApiError.notFound('Booking');
        }
        
        const currentEtag = `"${(current as any).version || 1}"`;
        if (ifMatch !== currentEtag) {
          throw new ApiError(
            ErrorCode.PRECONDITION_FAILED,
            'Resource has been modified',
            { currentVersion: (current as any).version }
          );
        }
        
        const validData = (req as any).valid?.body || req.body;
        const expectedVersion = Number(String(ifMatch).replace(/"/g, ''));
        
        const b = await svc.updateBooking(
          req.params.id, 
          validData, 
          authReq.user!.companyCode, 
          authReq.user!.userId,
          expectedVersion
        );
        
        // WebSocket으로 브로드캐스트
        broadcastBookingUpdate('update', req.params.id, b);
        
        // 성공 시 멱등성 응답 저장
        if (idempotencyKey) {
          await IdempotencyManager.saveResponse(idempotencyKey, b);
        }
        
        return createResponse(b);
      } catch (error: any) {
        if (idempotencyKey) {
          await IdempotencyManager.cleanupFailedRequest(idempotencyKey);
        }
        throw error;
      }
    },
    (result) => result.data.version
  )
);

// Status change schema
const StatusChangeSchema = {
  body: z.object({
    status: BookingStatusSchema
  })
};

// 상태 변경도 ADMIN, MANAGER만 가능
r.patch('/:id/status', authenticate, requireRole([UserRole.ADMIN, UserRole.MANAGER]), validate(StatusChangeSchema), respond(BookingUpdateResponse, async (req: Request) => {
  const authReq = req as AuthRequest;
  const validData = (req as any).valid?.body || req.body;
  const { status } = validData;
  
  const b = await svc.changeStatus(req.params.id, status, authReq.user!.companyCode);
  return createResponse(b);
}));

// Bulk Upload - ADMIN, MANAGER만 가능
r.post('/bulk-upload', 
  authenticate, 
  requireRole([UserRole.ADMIN, UserRole.MANAGER]), 
  IdempotencyManager.middleware({ ttlMinutes: 60 }), // 대량 작업은 긴 TTL
  async (req: AuthRequest, res) => {
    const idempotencyKey = (req as any).idempotencyKey;
    
    try {
      const { bookings } = req.body;
      if (!bookings || !Array.isArray(bookings) || bookings.length === 0) {
        return res.status(400).json({ error: 'bookings array is required' });
      }
      
      const created = await svc.bulkCreateBookings(bookings, req.user!.userId, req.user!.companyCode);
      
      // WebSocket으로 브로드캐스트
      broadcastBulkOperation('create', created.length, created.map(b => b.id));
      
      const response = createResponse(created, { created: created.length });
      
      // 성공 시 멱등성 응답 저장
      if (idempotencyKey) {
        await IdempotencyManager.saveResponse(idempotencyKey, response);
      }
      
      res.json(response);
    } catch (error: any) {
      // 실패 시 멱등성 키 정리
      if (idempotencyKey) {
        await IdempotencyManager.cleanupFailedRequest(idempotencyKey);
      }
      res.status(400).json({ error: error.message });
    }
  }
);

// Bulk Restore - ADMIN, MANAGER만 가능 (삭제 취소)
r.post('/bulk-restore', authenticate, requireRole([UserRole.ADMIN, UserRole.MANAGER]), async (req: AuthRequest, res) => {
  try {
    const { bookings } = req.body;
    if (!bookings || !Array.isArray(bookings) || bookings.length === 0) {
      return res.status(400).json({ error: 'bookings array is required' });
    }
    
    const restored = await svc.bulkCreateBookings(bookings, req.user!.userId, req.user!.companyCode);
    const response = createResponse(restored, { restored: restored.length });
    res.json(response);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Bulk DELETE - ADMIN만 가능 (더 구체적인 라우트를 먼저 정의)
r.delete('/bulk', authenticate, requireRole([UserRole.ADMIN]), async (req: AuthRequest, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }
    
    const deleted = await svc.bulkDeleteBookings(ids, req.user!.companyCode);
    const response = createResponse(null, { deleted });
    res.json(response);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE는 ADMIN만 가능
r.delete('/:id', 
  authenticate, 
  requireRole([UserRole.ADMIN]), 
  respondNoContent(
    async (req: Request) => {
      const authReq = req as AuthRequest;
      
      // If-Match 헤더 확인 (삭제 시에도 버전 확인)
      const ifMatch = req.headers['if-match'];
      if (!ifMatch) {
        throw new ApiError(
          ErrorCode.PRECONDITION_REQUIRED,
          'If-Match header is required for deletion'
        );
      }
      
      // 현재 버전 확인
      const current = await svc.getBooking(req.params.id, authReq.user!.companyCode);
      if (!current) {
        throw ApiError.notFound('Booking');
      }
      
      const currentEtag = `"${(current as any).version || 1}"`;
      if (ifMatch !== currentEtag) {
        throw new ApiError(
          ErrorCode.PRECONDITION_FAILED,
          'Resource has been modified',
          { currentVersion: (current as any).version }
        );
      }
      
      await svc.deleteBooking(req.params.id, authReq.user!.companyCode, authReq.user!.userId);
      
      // WebSocket으로 브로드캐스트
      broadcastBookingUpdate('delete', req.params.id, null);
    }
  )
);

export default r;