import { Router } from 'express';
import * as svc from '../services/booking.service';
import { validate } from '../middleware/validate';
import { createBookingSchema, updateBookingSchema, statusSchema } from '../validators/booking.validator';
import { parseBookingQuery } from '../utils/query-parser';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.middleware';
import { UserRole } from '@entrip/shared';
import { broadcastBookingUpdate, broadcastBulkOperation } from '../ws';

const r: Router = Router();

// POST는 ADMIN, MANAGER만 가능
r.post('/', authenticate, requireRole([UserRole.ADMIN, UserRole.MANAGER]), validate(createBookingSchema), async (req: AuthRequest, res) => {
  try {
    const b = await svc.createBooking({
      ...req.body,
      createdBy: req.user!.userId  // 현재 사용자 ID 사용
    }, req.user!.companyCode);  // 회사 코드 전달
    
    // WebSocket으로 브로드캐스트
    broadcastBookingUpdate('create', b.id, b);
    
    res.status(201).json(b);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// GET 엔드포인트는 인증 제거 (개발용)
r.get('/', async (req: any, res) => {
  try {
    // 원본 query를 전달하도록 수정 (month 파라미터 포함)
    const q = { ...parseBookingQuery(req.query), month: req.query.month };
    // 인증 없이 모든 데이터 반환 (개발용)
    const list = await svc.listBookings(q, 'ENTRIP_MAIN');  // ENTRIP_MAIN 회사 데이터 기본 사용
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

r.get('/:id', async (req: any, res) => {
  try {
    const b = await svc.getBooking(req.params.id, 'ENTRIP_MAIN');  // ENTRIP_MAIN 회사 데이터 기본 사용
    if (!b) return res.status(404).json({ error: 'Booking not found' });
    res.json(b);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH도 ADMIN, MANAGER만 가능
r.patch('/:id', authenticate, requireRole([UserRole.ADMIN, UserRole.MANAGER]), validate(updateBookingSchema), async (req: AuthRequest, res) => {
  try {
    const b = await svc.updateBooking(req.params.id, req.body, req.user!.companyCode);  // 회사별 필터링
    
    // WebSocket으로 브로드캐스트
    broadcastBookingUpdate('update', req.params.id, b);
    
    res.json(b);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 상태 변경도 ADMIN, MANAGER만 가능
r.patch('/:id/status', authenticate, requireRole([UserRole.ADMIN, UserRole.MANAGER]), validate(statusSchema), async (req: AuthRequest, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    const b = await svc.changeStatus(req.params.id, status, req.user!.companyCode);  // 회사별 필터링
    res.json(b);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Bulk Upload - ADMIN, MANAGER만 가능
r.post('/bulk-upload', authenticate, requireRole([UserRole.ADMIN, UserRole.MANAGER]), async (req: AuthRequest, res) => {
  try {
    const { bookings } = req.body;
    if (!bookings || !Array.isArray(bookings) || bookings.length === 0) {
      return res.status(400).json({ error: 'bookings array is required' });
    }
    
    const created = await svc.bulkCreateBookings(bookings, req.user!.userId, req.user!.companyCode);
    
    // WebSocket으로 브로드캐스트
    broadcastBulkOperation('create', created.length, created.map(b => b.id));
    
    res.json({ created: created.length, bookings: created });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Bulk Restore - ADMIN, MANAGER만 가능 (삭제 취소)
r.post('/bulk-restore', authenticate, requireRole([UserRole.ADMIN, UserRole.MANAGER]), async (req: AuthRequest, res) => {
  try {
    const { bookings } = req.body;
    if (!bookings || !Array.isArray(bookings) || bookings.length === 0) {
      return res.status(400).json({ error: 'bookings array is required' });
    }
    
    const restored = await svc.bulkCreateBookings(bookings, req.user!.userId, req.user!.companyCode);
    res.json({ restored: restored.length, bookings: restored });
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
    await svc.deleteBooking(req.params.id, req.user!.companyCode);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default r;