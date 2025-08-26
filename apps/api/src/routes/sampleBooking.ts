import { Router } from 'express';
import { logger } from '../lib/logger';
import { PrismaClient } from '@prisma/client';

const router: Router = Router();
const prisma = new PrismaClient();

// Database-connected booking interface
interface SampleBooking {
  id: string;
  customerName: string;
  destination: string;
  startDate: string;
  endDate: string;
  paxCount: number;
  status: string;
  totalPrice: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * @openapi
 * /api/v1/bookings:
 *   get:
 *     operationId: getAllBookings
 *     tags: [Bookings]
 *     summary: 예약 목록 조회
 *     description: 모든 예약 목록을 조회합니다.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/BookingStatus'
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/Limit'
 *     responses:
 *       200:
 *         description: 예약 목록
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedBookings'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/bookings', async (req, res) => {
  try {
    const { status, page = 1, limit = 10, month } = req.query;
    
    logger.info('Fetching bookings from database', { status, page, limit, month });
    logger.info('Month filter details:', { 
      month, 
      hasMonth: !!month,
      monthType: typeof month 
    });
    
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};
    
    if (status) {
      where.status = status.toString().toUpperCase();
    }
    
    // 월별 필터 추가
    if (month) {
      const [year, monthNum] = month.toString().split('-').map(Number);
      const startOfMonth = new Date(year, monthNum - 1, 1);
      const endOfMonth = new Date(year, monthNum, 0, 23, 59, 59, 999);
      
      logger.info('Date filter:', {
        year,
        monthNum,
        startOfMonth: startOfMonth.toISOString(),
        endOfMonth: endOfMonth.toISOString()
      });
      
      where.startDate = {
        gte: startOfMonth,
        lte: endOfMonth
      };
    }
    
    logger.info('Final where clause:', JSON.stringify(where));
    
    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { startDate: 'asc' },
        select: {
          id: true,
          customerName: true,
          destination: true,
          startDate: true,
          endDate: true,
          paxCount: true,
          status: true,
          totalPrice: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      prisma.booking.count({ where })
    ]);
    
    // Format for frontend compatibility
    const formattedBookings = bookings.map(booking => ({
      ...booking,
      status: booking.status.toLowerCase(),
      totalPrice: Number(booking.totalPrice),
      startDate: booking.startDate.toISOString().split('T')[0],
      endDate: booking.endDate.toISOString().split('T')[0],
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString()
    }));
    
    res.json({
      data: formattedBookings,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total
      }
    });
  } catch (error) {
    logger.error('Error fetching bookings:', error);
    res.status(500).json({ 
      code: 500,
      message: '예약 목록 조회 중 오류가 발생했습니다',
      details: { error: error.message }
    });
  }
});

/**
 * @openapi
 * /api/v1/bookings/{id}:
 *   get:
 *     operationId: getBookingById
 *     tags: [Bookings]
 *     summary: 예약 상세 조회
 *     description: 특정 예약의 상세 정보를 조회합니다.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/Id'
 *     responses:
 *       200:
 *         description: 예약 정보
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Booking'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const booking = await prisma.booking.findUnique({
      where: { id },
      select: {
        id: true,
        customerName: true,
        destination: true,
        startDate: true,
        endDate: true,
        paxCount: true,
        status: true,
        totalPrice: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    if (!booking) {
      return res.status(404).json({ 
        code: 404,
        message: '요청한 예약을 찾을 수 없습니다',
        details: { id }
      });
    }
    
    // Format for frontend compatibility
    const formattedBooking = {
      ...booking,
      status: booking.status.toLowerCase(),
      totalPrice: Number(booking.totalPrice),
      startDate: booking.startDate.toISOString().split('T')[0],
      endDate: booking.endDate.toISOString().split('T')[0],
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString()
    };
    
    res.json(formattedBooking);
  } catch (error) {
    logger.error('Error fetching booking:', error);
    res.status(500).json({ 
      code: 500,
      message: '예약 조회 중 오류가 발생했습니다',
      details: { error: error.message }
    });
  }
});

/**
 * @openapi
 * /api/v1/bookings:
 *   post:
 *     operationId: createBooking
 *     tags: [Bookings]
 *     summary: 새 예약 생성
 *     description: 새로운 예약을 생성합니다.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BookingCreateDTO'
 *     responses:
 *       201:
 *         description: 예약이 성공적으로 생성됨
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Booking'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/bookings', async (req, res) => {
  try {
    const { customerName, destination, startDate, endDate, paxCount, totalPrice } = req.body;
    
    if (!customerName || !destination || !startDate || !endDate || !paxCount) {
      const missingFields = [];
      if (!customerName) missingFields.push('customerName');
      if (!destination) missingFields.push('destination');
      if (!startDate) missingFields.push('startDate');
      if (!endDate) missingFields.push('endDate');
      if (!paxCount) missingFields.push('paxCount');
      
      return res.status(400).json({ 
        code: 400,
        message: '필수 필드가 누락되었습니다',
        details: { missingFields }
      });
    }
    
    // Find a default user for createdBy
    let defaultUser = await prisma.user.findFirst({
      where: { email: 'admin@entrip.com' }
    });
    
    if (!defaultUser) {
      return res.status(500).json({
        code: 500,
        message: '기본 사용자를 찾을 수 없습니다',
        details: { error: 'Default user not found' }
      });
    }
    
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    const days = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24));
    
    const newBooking = await prisma.booking.create({
      data: {
        bookingNumber: `BK${Date.now()}`,
        customerName,
        teamName: `${destination} 여행`,
        bookingType: 'PACKAGE',
        destination,
        startDate: startDateObj,
        endDate: endDateObj,
        paxCount,
        nights: Math.max(1, days - 1),
        days: Math.max(1, days),
        status: 'PENDING',
        totalPrice: totalPrice || 0,
        currency: 'KRW',
        companyCode: 'COMPANY_A',
        createdBy: defaultUser.id
      },
      select: {
        id: true,
        customerName: true,
        destination: true,
        startDate: true,
        endDate: true,
        paxCount: true,
        status: true,
        totalPrice: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    // Format for frontend compatibility
    const formattedBooking = {
      ...newBooking,
      status: newBooking.status.toLowerCase(),
      totalPrice: Number(newBooking.totalPrice),
      startDate: newBooking.startDate.toISOString().split('T')[0],
      endDate: newBooking.endDate.toISOString().split('T')[0],
      createdAt: newBooking.createdAt.toISOString(),
      updatedAt: newBooking.updatedAt.toISOString()
    };
    
    logger.info('Created new booking', formattedBooking);
    
    res.status(201).json(formattedBooking);
  } catch (error) {
    logger.error('Error creating booking:', error);
    res.status(500).json({ 
      code: 500,
      message: '예약 생성 중 오류가 발생했습니다',
      details: { error: error.message }
    });
  }
});

/**
 * @openapi
 * /api/v1/bookings/{id}:
 *   put:
 *     operationId: updateBooking
 *     tags: [Bookings]
 *     summary: 예약 정보 수정
 *     description: 기존 예약 정보를 수정합니다.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/Id'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BookingUpdateDTO'
 *     responses:
 *       200:
 *         description: 예약이 성공적으로 수정됨
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Booking'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *   patch:
 *     operationId: partialUpdateBooking
 *     tags: [Bookings]
 *     summary: 예약 부분 수정
 *     description: 예약의 특정 필드만 부분적으로 수정합니다.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/Id'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BookingUpdateDTO'
 *     responses:
 *       200:
 *         description: 예약이 성공적으로 수정됨
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Booking'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.put('/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { customerName, destination, startDate, endDate, paxCount, totalPrice, status } = req.body;
    
    const existingBooking = await prisma.booking.findUnique({
      where: { id }
    });
    
    if (!existingBooking) {
      return res.status(404).json({ 
        code: 404,
        message: '요청한 예약을 찾을 수 없습니다',
        details: { id }
      });
    }
    
    const startDateObj = startDate ? new Date(startDate) : existingBooking.startDate;
    const endDateObj = endDate ? new Date(endDate) : existingBooking.endDate;
    const days = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24));
    
    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: {
        ...(customerName && { customerName }),
        ...(destination && { destination }),
        ...(startDate && { startDate: startDateObj }),
        ...(endDate && { 
          endDate: endDateObj,
          days: Math.max(1, days),
          nights: Math.max(1, days - 1)
        }),
        ...(paxCount && { paxCount }),
        ...(totalPrice !== undefined && { totalPrice }),
        ...(status && { status: status.toUpperCase() })
      },
      select: {
        id: true,
        customerName: true,
        destination: true,
        startDate: true,
        endDate: true,
        paxCount: true,
        status: true,
        totalPrice: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    // Format for frontend compatibility
    const formattedBooking = {
      ...updatedBooking,
      status: updatedBooking.status.toLowerCase(),
      totalPrice: Number(updatedBooking.totalPrice),
      startDate: updatedBooking.startDate.toISOString().split('T')[0],
      endDate: updatedBooking.endDate.toISOString().split('T')[0],
      createdAt: updatedBooking.createdAt.toISOString(),
      updatedAt: updatedBooking.updatedAt.toISOString()
    };
    
    logger.info('Updated booking', { id, updates: req.body });
    
    res.json(formattedBooking);
  } catch (error) {
    logger.error('Error updating booking:', error);
    res.status(500).json({ 
      code: 500,
      message: '예약 수정 중 오류가 발생했습니다',
      details: { error: error.message }
    });
  }
});

// PATCH endpoint for partial updates  
router.patch('/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { customerName, destination, startDate, endDate, paxCount, totalPrice, status } = req.body;
    
    const existingBooking = await prisma.booking.findUnique({
      where: { id }
    });
    
    if (!existingBooking) {
      return res.status(404).json({ 
        code: 404,
        message: '요청한 예약을 찾을 수 없습니다',
        details: { id }
      });
    }
    
    const updateData: any = {};
    
    if (customerName) updateData.customerName = customerName;
    if (destination) updateData.destination = destination;
    if (paxCount) updateData.paxCount = paxCount;
    if (totalPrice !== undefined) updateData.totalPrice = totalPrice;
    if (status) updateData.status = status.toUpperCase();
    
    if (startDate || endDate) {
      const startDateObj = startDate ? new Date(startDate) : existingBooking.startDate;
      const endDateObj = endDate ? new Date(endDate) : existingBooking.endDate;
      const days = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24));
      
      if (startDate) updateData.startDate = startDateObj;
      if (endDate) updateData.endDate = endDateObj;
      updateData.days = Math.max(1, days);
      updateData.nights = Math.max(1, days - 1);
    }
    
    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        customerName: true,
        destination: true,
        startDate: true,
        endDate: true,
        paxCount: true,
        status: true,
        totalPrice: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    // Format for frontend compatibility
    const formattedBooking = {
      ...updatedBooking,
      status: updatedBooking.status.toLowerCase(),
      totalPrice: Number(updatedBooking.totalPrice),
      startDate: updatedBooking.startDate.toISOString().split('T')[0],
      endDate: updatedBooking.endDate.toISOString().split('T')[0],
      createdAt: updatedBooking.createdAt.toISOString(),
      updatedAt: updatedBooking.updatedAt.toISOString()
    };
    
    logger.info('Partially updated booking', { id, updates: req.body });
    
    res.json(formattedBooking);
  } catch (error) {
    logger.error('Error updating booking:', error);
    res.status(500).json({ 
      code: 500,
      message: '예약 부분 수정 중 오류가 발생했습니다',
      details: { error: error.message }
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
 *     description: 특정 예약을 삭제합니다.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/Id'
 *     responses:
 *       204:
 *         $ref: '#/components/responses/NoContent'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete('/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const existingBooking = await prisma.booking.findUnique({
      where: { id }
    });
    
    if (!existingBooking) {
      return res.status(404).json({ 
        code: 404,
        message: '요청한 예약을 찾을 수 없습니다',
        details: { id }
      });
    }
    
    await prisma.booking.delete({
      where: { id }
    });
    
    logger.info('Deleted booking', { id });
    
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting booking:', error);
    res.status(500).json({ 
      code: 500,
      message: '예약 삭제 중 오류가 발생했습니다',
      details: { error: error.message }
    });
  }
});

export default router;