import { Router, Request } from 'express';
import { BookingService } from './booking.service';
import { CreateBookingDtoSchema, UpdateBookingDtoSchema, ListBookingsQueryDtoSchema } from './booking.dto';
import prisma from '../../lib/prisma';
import { ZodError } from 'zod';
import { logger } from '../../lib/logger';
import { ifNoneMatch, requireIfMatch, setEtag } from '../../middleware/preconditions';

interface PrismaError extends Error {
  code?: string;
}

const router: Router = Router();
const bookingService = new BookingService(prisma);

// 버전 조회 헬퍼 (재사용)
const getBookingVersion = async (req: Request): Promise<number | null> => {
  const companyCode = (req as any).user?.companyCode;
  const booking = await bookingService.findOne(req.params.id, companyCode);
  return booking ? booking.version : null;
};

/**
 * @openapi
 * /api/v1/bookings:
 *   get:
 *     operationId: listBookings
 *     tags: [Bookings]
 *     summary: 예약 목록 조회
 *     description: 예약 목록을 필터링하여 조회합니다.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, CONFIRMED, CANCELLED]
 *         description: 예약 상태 필터
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 시작일 필터 (이후)
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 시작일 필터 (이전)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 페이지 번호
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 100
 *         description: 페이지당 항목 수
 *     responses:
 *       200:
 *         description: 예약 목록
 */
router.get('/', async (req, res) => {
  try {
    const query = ListBookingsQueryDtoSchema.parse(req.query);
    const companyCode = (req as any).user?.companyCode;
    const result = await bookingService.findAll(query, companyCode);
    res.json(result);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return res.status(400).json({
        code: 400,
        message: '잘못된 요청 파라미터입니다',
        details: error instanceof ZodError ? error.errors : undefined,
      });
    }
    logger.error('Error listing bookings:', error);
    res.status(500).json({
      code: 500,
      message: '예약 목록을 조회하는 중 오류가 발생했습니다',
    });
  }
});

/**
 * @openapi
 * /api/v1/bookings/{id}:
 *   get:
 *     operationId: getBooking
 *     tags: [Bookings]
 *     summary: 예약 상세 조회
 *     description: 특정 예약의 상세 정보를 조회합니다.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 예약 ID
 *     responses:
 *       200:
 *         description: 예약 상세 정보
 *       404:
 *         description: 예약을 찾을 수 없음
 */
router.get('/:id',
  ifNoneMatch(getBookingVersion),
  async (req, res) => {
    try {
      const companyCode = (req as any).user?.companyCode;
      const booking = await bookingService.findOne(req.params.id, companyCode);
      if (!booking) {
        return res.status(404).json({
          code: 404,
          message: '예약을 찾을 수 없습니다',
        });
      }
      
      setEtag(res, booking.version);
      res.json(booking);
    } catch (error) {
      logger.error('Error getting booking:', error);
      res.status(500).json({
        code: 500,
        message: '예약을 조회하는 중 오류가 발생했습니다',
      });
    }
  }
);

/**
 * @openapi
 * /api/v1/bookings:
 *   post:
 *     operationId: createBooking
 *     tags: [Bookings]
 *     summary: 예약 생성
 *     description: 새로운 예약을 생성합니다.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateBookingDto'
 *     responses:
 *       201:
 *         description: 생성된 예약
 *       400:
 *         description: 잘못된 요청
 */
router.post('/', async (req, res) => {
  try {
    const data = CreateBookingDtoSchema.parse(req.body);
    // TODO: Get createdBy from auth middleware
    const user = (req as any).user;
    const booking = await bookingService.create({
      ...data,
      createdBy: user?.userId || 'system',
      companyCode: user?.companyCode
    });
    
    setEtag(res, booking.version);
    res.status(201).json(booking);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return res.status(400).json({
        code: 400,
        message: '잘못된 요청 데이터입니다',
        details: error instanceof ZodError ? error.errors : undefined,
      });
    }
    logger.error('Error creating booking:', error);
    res.status(500).json({
      code: 500,
      message: '예약을 생성하는 중 오류가 발생했습니다',
    });
  }
});

/**
 * @openapi
 * /api/v1/bookings/{id}:
 *   patch:
 *     operationId: updateBooking
 *     tags: [Bookings]
 *     summary: 예약 수정
 *     description: 예약 정보를 부분적으로 수정합니다.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 예약 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateBookingDto'
 *     responses:
 *       200:
 *         description: 수정된 예약
 *       404:
 *         description: 예약을 찾을 수 없음
 */
router.patch('/:id',
  requireIfMatch(getBookingVersion),
  async (req, res) => {
    try {
      const expectedVersion = (res.locals as any).expectedVersion as number;
      const data = UpdateBookingDtoSchema.parse(req.body);
      
      const user = (req as any).user;
      const booking = await bookingService.update(
        req.params.id, 
        {
          ...data,
          updatedBy: user?.userId || 'system',
        },
        expectedVersion,  // 미들웨어에서 검증된 버전
        user?.companyCode  // Pass company code for filtering
      );
      
      setEtag(res, booking.version);
      res.json(booking);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return res.status(400).json({
        code: 400,
        message: '잘못된 요청 데이터입니다',
        details: error instanceof ZodError ? error.errors : undefined,
      });
    }
    if (error instanceof Error && 'code' in error && (error as PrismaError).code === 'P2025') {
      return res.status(404).json({
        code: 404,
        message: '예약을 찾을 수 없습니다',
      });
    }
    logger.error('Error updating booking:', error);
    res.status(500).json({
      code: 500,
      message: '예약을 수정하는 중 오류가 발생했습니다',
    });
  }
});

/**
 * @openapi
 * /api/v1/bookings/{id}:
 *   delete:
 *     operationId: deleteBooking
 *     tags: [Bookings]
 *     summary: 예약 삭제
 *     description: 예약을 삭제합니다.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 예약 ID
 *     responses:
 *       204:
 *         description: 삭제 성공
 *       404:
 *         description: 예약을 찾을 수 없음
 */
router.delete('/:id', async (req, res) => {
  try {
    const companyCode = (req as any).user?.companyCode;
    await bookingService.delete(req.params.id, companyCode);
    res.status(204).send();
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as PrismaError).code === 'P2025') {
      return res.status(404).json({
        code: 404,
        message: '예약을 찾을 수 없습니다',
      });
    }
    logger.error('Error deleting booking:', error);
    res.status(500).json({
      code: 500,
      message: '예약을 삭제하는 중 오류가 발생했습니다',
    });
  }
});

export default router;