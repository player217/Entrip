import { containsText } from '../../lib/db-dialect';
import { randomUUID } from 'crypto';
import { Booking, BookingStatus, BookingType, Prisma } from '@prisma/client';
import { BaseService } from '../../services/base.service';
import prisma from '../../lib/prisma';
import { BookingCreateInput } from './dtos/BookingCreate.dto';
import { BookingUpdateInput } from './dtos/BookingUpdate.dto';
import { BookingStatusPatchInput } from './dtos/BookingStatusPatch.dto';
import { ApiError } from '../../middlewares/error.middleware';

export class BookingsService extends BaseService<Booking> {
  constructor() {
    super('booking');
  }

  /**
   * Create booking with company code from context
   */
  async createBooking(
    companyCode: string,
    userId: string,
    input: BookingCreateInput
  ): Promise<Booking> {
    const type = this.normalizeType(input.type);
    return prisma.$transaction(async tx => {
      const booking = await tx.booking.create({ data: {
        ...input, type, bookingNumber: `BK-${randomUUID()}`,
        status: input.status ?? BookingStatus.PENDING,
        revenue: input.revenue ?? input.totalPrice ?? 0, totalPrice: input.revenue ?? input.totalPrice ?? 0,
        companyCode, userId, createdBy: userId, updatedBy: userId,
        startDate: new Date(input.startDate), endDate: new Date(input.endDate),
      } });
      await tx.bookingHistory.create({ data: {
        bookingId: booking.id, companyCode, changedBy: userId, action: 'create',
        changedFields: Object.keys(input), newValues: JSON.parse(JSON.stringify(booking)),
      } });
      return booking;
    });
  }

  private normalizeType(type: string): BookingType {
    const aliases: Record<string, BookingType> = { incentive: 'INCENTIVE', golf: 'FIT', honeymoon: 'PACKAGE',
      airtel: 'FIT', workshop: 'BUSINESS', reward: 'BUSINESS', teambuilding: 'GROUP' };
    return aliases[type] ?? type as BookingType;
  }

  async detail(id: string, companyCode: string) {
    const active = { companyCode, deletedAt: null };
    const booking = await prisma.booking.findFirst({
      where: { id, ...active },
      include: {
        user: { select: { name: true } },
        flights: { where: active, orderBy: [{ departureTime: 'asc' }, { id: 'asc' }] },
        hotels: { where: active, orderBy: [{ checkInDate: 'asc' }, { id: 'asc' }] },
        vehicles: { where: active, orderBy: [{ pickupTime: 'asc' }, { id: 'asc' }] },
        settlements: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
        history: { where: { companyCode }, orderBy: { changedAt: 'desc' }, take: 100, include: { user: { select: { name: true } } } },
      },
    });
    if (!booking) throw new ApiError(404, 'Booking not found');
    return booking;
  }

  /**
   * Update booking with company validation
   */
  async updateBooking(
    id: string, companyCode: string, input: BookingUpdateInput, ifMatch?: string, userId?: string
  ): Promise<Booking> {
    const { parseIfMatchVersion } = await import('../../lib/etag');
    const expectedVersion = parseIfMatchVersion(ifMatch);
    if (expectedVersion === undefined) throw new ApiError(428, 'If-Match version is required');
    return prisma.$transaction(async tx => {
      const previous = await tx.booking.findFirst({ where: { id, companyCode, deletedAt: null } });
      if (!previous) throw new ApiError(404, 'Booking not found');
      if (previous.version !== expectedVersion) throw new ApiError(412, 'Precondition Failed: version mismatch');
      const start = input.startDate ? new Date(input.startDate) : previous.startDate;
      const end = input.endDate ? new Date(input.endDate) : previous.endDate;
      if (end < start) throw new ApiError(400, 'End date must be on or after start date');
      const data: Prisma.BookingUpdateManyMutationInput = {
        ...input, type: input.type ? this.normalizeType(input.type) : undefined,
        startDate: start, endDate: end, version: { increment: 1 }, updatedBy: userId,
        ...((input.revenue ?? input.totalPrice) !== undefined ? { totalPrice: input.revenue ?? input.totalPrice, revenue: input.revenue ?? input.totalPrice } : {}),
      };
      const result = await tx.booking.updateMany({ where: { id, companyCode, deletedAt: null, version: expectedVersion }, data });
      if (result.count !== 1) throw new ApiError(412, '다른 사용자가 변경했습니다. 다시 불러온 후 수정하세요.');
      const booking = await tx.booking.findUniqueOrThrow({ where: { id } });
      const changedBy = userId ?? previous.userId;
      if (changedBy) await tx.bookingHistory.create({ data: {
        bookingId: id, companyCode, changedBy, action: 'update', changedFields: Object.keys(input),
        previousValues: JSON.parse(JSON.stringify(previous)), newValues: JSON.parse(JSON.stringify(booking)),
      } });
      return booking;
    });
  }

  /**
   * Update booking status with company validation
   */
  async updateBookingStatus(id: string, companyCode: string, input: BookingStatusPatchInput, ifMatch?: string, userId?: string): Promise<Booking> {
    return this.updateBooking(id, companyCode, input, ifMatch, userId);
  }

  /**
   * Soft delete with optimistic lock (require If-Match version)
   */
  async deleteWithLock(id: string, companyCode: string, ifMatch?: string, userId?: string): Promise<void> {
    const { parseIfMatchVersion } = await import('../../lib/etag');
    const expectedVersion = parseIfMatchVersion(ifMatch);
    if (expectedVersion === undefined) throw new ApiError(428, 'If-Match version is required');
    await prisma.$transaction(async tx => {
      const previous = await tx.booking.findFirst({ where: { id, companyCode } });
      if (!previous) throw new ApiError(404, 'Booking not found');
      if (previous.deletedAt || previous.version !== expectedVersion) throw new ApiError(412, 'Precondition Failed: version mismatch');
      const result = await tx.booking.updateMany({ where: { id, companyCode, deletedAt: null, version: expectedVersion },
        data: { deletedAt: new Date(), updatedBy: userId, version: { increment: 1 } } });
      if (result.count !== 1) throw new ApiError(412, 'Precondition Failed: version mismatch');
      const changedBy = userId ?? previous.userId;
      if (changedBy) await tx.bookingHistory.create({ data: { bookingId: id, companyCode, changedBy, action: 'delete',
        changedFields: ['deletedAt'], previousValues: JSON.parse(JSON.stringify(previous)) } });
    });
  }

  /**
   * Get booking statistics for a company
   */
  async getStats(companyCode: string) {
    const [total, pending, confirmed, completed, cancelled] = await Promise.all([
      this.count(companyCode),
      this.count(companyCode, { status: BookingStatus.PENDING }),
      this.count(companyCode, { status: BookingStatus.CONFIRMED }),
      this.count(companyCode, { status: BookingStatus.COMPLETED }),
      this.count(companyCode, { status: BookingStatus.CANCELLED }),
    ]);

    return {
      total,
      byStatus: {
        pending,
        confirmed,
        completed,
        cancelled,
      },
    };
  }

  /**
   * Get bookings for a specific date range
   */
  async findByDateRange(
    companyCode: string,
    startDate: Date,
    endDate: Date
  ): Promise<Booking[]> {
    return this.model.findMany({
      where: {
        companyCode,
        deletedAt: null,
        startDate: { lte: endDate }, endDate: { gte: startDate },
      },
      orderBy: {
        startDate: 'asc',
      },
    });
  }

  /**
   * Search bookings by customer name or team name
   */
  async search(
    companyCode: string,
    query: string
  ): Promise<Booking[]> {
    return this.model.findMany({
      where: {
        companyCode,
        deletedAt: null,
        OR: [
          {
            customerName: containsText(query),
          },
          {
            teamName: containsText(query),
          },
        ],
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
    });
  }
}

export const bookingsService = new BookingsService();
