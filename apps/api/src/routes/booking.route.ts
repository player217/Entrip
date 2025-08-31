import { Router } from 'express';
import * as svc from '../services/booking.service';
import { validate } from '../middleware/validate';
import { createBookingSchema, updateBookingSchema, statusSchema } from '../validators/booking.validator';
import { toApiBooking } from '../services/booking.mapper';
import { parseBookingQuery } from '../utils/query-parser';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.middleware';
import { UserRole } from '@entrip/shared';
import { broadcastBookingUpdate, broadcastBulkOperation } from '../ws';
import { IdempotencyManager } from '../lib/idempotency';

const r: Router = Router();

// POST는 ADMIN, MANAGER만 가능
r.post('/', 
  authenticate, 
  requireRole([UserRole.ADMIN, UserRole.MANAGER]), 
  IdempotencyManager.middleware({ ttlMinutes: 30 }),
  validate({ body: createBookingSchema }),
  async (req: AuthRequest, res) => {
    const idempotencyKey = (req as any).idempotencyKey;
    
    try {
      const b = await svc.createBooking({
        ...req.body,
        createdBy: req.user!.userId  // 현재 사용자 ID 사용
      }, req.user!.companyCode);  // 회사 코드 전달
      
      // WebSocket으로 브로드캐스트
      broadcastBookingUpdate('create', b.id, b);
      
      // 성공 시 멱등성 응답 저장
      if (idempotencyKey) {
        await IdempotencyManager.saveResponse(idempotencyKey, b);
      }
      
      // Convert to API format and set ETag
      const apiBooking = toApiBooking(b);
      res.set('ETag', `"${b.version}"`);
      res.status(201).json(apiBooking);
    } catch (error: any) {
      // 실패 시 멱등성 키 정리
      if (idempotencyKey) {
        await IdempotencyManager.cleanupFailedRequest(idempotencyKey);
      }
      res.status(400).json({ error: error.message });
    }
  }
);

// GET 엔드포인트 - 인증 필수 (보안 강화)
r.get('/', 
  authenticate,  // 🔒 인증 미들웨어 추가 - 회사별 데이터 격리 보장
  async (req: AuthRequest, res) => {
    try {
      // 원본 query를 전달하도록 수정 (month 파라미터 포함)
      const q = { ...parseBookingQuery(req.query), month: req.query.month };
      
      // 인증된 사용자의 회사 코드 사용 (필수값)
      const companyCode = req.user!.companyCode;
      
      // 회사 코드가 없으면 에러 (추가 보안)
      if (!companyCode) {
        return res.status(403).json({ 
          error: 'Company code is required for data access' 
        });
      }
      
      const list = await svc.listBookings(q, companyCode);
      
      // Convert all bookings to API format
      const apiBookings = list.map(toApiBooking);
      res.json(apiBookings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

r.get('/:id', 
  authenticate,  // 🔒 인증 미들웨어 추가 - 개별 예약 조회도 보호
  async (req: AuthRequest, res) => {
    try {
      const companyCode = req.user!.companyCode;
      
      // 회사 코드가 없으면 에러
      if (!companyCode) {
        return res.status(403).json({ 
          error: 'Company code is required for data access' 
        });
      }
      
      const b = await svc.getBooking(req.params.id, companyCode);
      if (!b) return res.status(404).json({ error: 'Booking not found' });
      
      // Check If-None-Match header for 304 response
      const ifNoneMatch = req.headers['if-none-match'];
      const currentETag = `"${b.version}"`;
      
      if (ifNoneMatch && ifNoneMatch === currentETag) {
        return res.status(304).send(); // Not Modified
      }
      
      // Convert to API format and set ETag
      const apiBooking = toApiBooking(b);
      res.set('ETag', currentETag);
      res.json(apiBooking);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

// PATCH도 ADMIN, MANAGER만 가능
r.patch('/:id', 
  authenticate, 
  requireRole([UserRole.ADMIN, UserRole.MANAGER]), 
  IdempotencyManager.middleware({ ttlMinutes: 15 }),
  validate({ body: updateBookingSchema }),
  async (req: AuthRequest, res) => {
    const idempotencyKey = (req as any).idempotencyKey;
    
    try {
      // Check If-Match header for optimistic locking
      const ifMatch = req.headers['if-match'];
      if (!ifMatch) {
        return res.status(428).json({ 
          error: 'Precondition Required',
          message: 'If-Match header is required for updates'
        });
      }
      
      // Get current booking to check version
      const currentBooking = await svc.getBooking(req.params.id, req.user!.companyCode);
      if (!currentBooking) {
        return res.status(404).json({ error: 'Booking not found' });
      }
      
      const currentETag = `"${currentBooking.version}"`;
      if (ifMatch !== currentETag) {
        return res.status(412).json({ 
          error: 'Precondition Failed',
          message: 'Resource has been modified',
          currentVersion: currentBooking.version
        });
      }
      
      const b = await svc.updateBooking(req.params.id, req.body, req.user!.companyCode, req.user!.userId);  // 회사별 필터링 + 액터 ID
      
      // WebSocket으로 브로드캐스트
      broadcastBookingUpdate('update', req.params.id, b);
      
      // 성공 시 멱등성 응답 저장
      if (idempotencyKey) {
        await IdempotencyManager.saveResponse(idempotencyKey, b);
      }
      
      // Convert to API format and set new ETag
      const apiBooking = toApiBooking(b);
      res.set('ETag', `"${b.version}"`);
      res.json(apiBooking);
    } catch (error: any) {
      // 실패 시 멱등성 키 정리
      if (idempotencyKey) {
        await IdempotencyManager.cleanupFailedRequest(idempotencyKey);
      }
      res.status(400).json({ error: error.message });
    }
  }
);

// 상태 변경도 ADMIN, MANAGER만 가능
r.patch('/:id/status', authenticate, requireRole([UserRole.ADMIN, UserRole.MANAGER]), validate({ body: statusSchema }), async (req: AuthRequest, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    const b = await svc.changeStatus(req.params.id, status, req.user!.companyCode);  // 회사별 필터링
    
    // Convert to API format and set ETag
    const apiBooking = toApiBooking(b);
    res.set('ETag', `"${b.version}"`);
    res.json(apiBooking);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

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
      
      // Convert to API format
      const apiBookings = created.map(toApiBooking);
      const response = { created: created.length, bookings: apiBookings };
      
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
    const apiBookings = restored.map(toApiBooking);
    res.json({ restored: restored.length, bookings: apiBookings });
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
    res.json({ deleted });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE는 ADMIN만 가능
r.delete('/:id', authenticate, requireRole([UserRole.ADMIN]), async (req: AuthRequest, res) => {
  try {
    await svc.deleteBooking(req.params.id, req.user!.companyCode, req.user!.userId);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default r;