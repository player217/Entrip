import { Booking, BookingStatus } from '@prisma/client';
import { BaseService } from '../../services/base.service';
import prisma from '../../lib/prisma';
import { BookingCreateInput } from './dtos/BookingCreate.dto';
import { BookingUpdateInput } from './dtos/BookingUpdate.dto';
import { BookingStatusPatchInput } from './dtos/BookingStatusPatch.dto';
import { ApiError } from '../../middlewares/error.middleware';

export class BookingsService extends BaseService<Booking> {
  constructor() {
    super(prisma.booking);
  }

  /**
   * Create booking with company code from context
   */
  async createBooking(
    companyCode: string,
    userId: string,
    input: BookingCreateInput
  ): Promise<Booking> {
    // Generate booking number
    const bookingNumber = `BK${Date.now()}`;

    // Map/normalize fields to match Prisma schema
    return this.create(companyCode, userId, {
      ...input,
      // Normalize type to Prisma enum; fallback to FIT
      type: ((): any => {
        const t = (input as any).type;
        const upper = typeof t === 'string' ? t.toUpperCase() : undefined;
        const allowed = ['PACKAGE','FIT','GROUP','BUSINESS','INCENTIVE'];
        return allowed.includes(upper || '') ? upper : 'FIT';
      })(),
      bookingNumber,
      status: BookingStatus.PENDING,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
    });
  }

  /**
   * Update booking with company validation
   */
  async updateBooking(
    id: string,
    companyCode: string,
    input: BookingUpdateInput,
    ifMatch?: string
  ): Promise<Booking> {
    const updateData: any = { ...input };

    // Convert date strings to Date objects if present
    if (input.startDate) {
      updateData.startDate = new Date(input.startDate);
    }
    if (input.endDate) {
      updateData.endDate = new Date(input.endDate);
    }

    // Optimistic locking via If-Match (expects numeric version)
    const { parseIfMatchVersion } = await import('../../lib/etag');
    const expectedVersion = parseIfMatchVersion(ifMatch);
    if (expectedVersion === undefined) {
      throw new ApiError(428, 'Precondition Required: If-Match header (version) is required');
    }

    const result = await this.model.updateMany({
      where: { id, companyCode, deletedAt: null, version: expectedVersion },
      data: {
        ...updateData,
        version: { increment: 1 },
        updatedAt: new Date(),
      },
    });

    if (result.count === 0) {
      throw new ApiError(412, 'Precondition Failed: version mismatch');
    }

    return this.findById(id, companyCode);
  }

  /**
   * Update booking status with company validation
   */
  async updateBookingStatus(
    id: string,
    companyCode: string,
    input: BookingStatusPatchInput
  ): Promise<Booking> {
    // First validate the booking exists and belongs to company
    await this.findById(id, companyCode);

    return this.model.update({
      where: { id },
      data: {
        status: input.status as BookingStatus,
        notes: input.notes,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Soft delete with optimistic lock (require If-Match version)
   */
  async deleteWithLock(id: string, companyCode: string, ifMatch?: string): Promise<void> {
    const { parseIfMatchVersion } = await import('../../lib/etag');
    const expectedVersion = parseIfMatchVersion(ifMatch);
    if (expectedVersion === undefined) {
      throw new ApiError(428, 'Precondition Required: If-Match header (version) is required');
    }

    const result = await this.model.updateMany({
      where: { id, companyCode, deletedAt: null, version: expectedVersion },
      data: { deletedAt: new Date(), updatedAt: new Date() },
    });
    if (result.count === 0) {
      throw new ApiError(412, 'Precondition Failed: version mismatch');
    }
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
        OR: [
          {
            startDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          {
            endDate: {
              gte: startDate,
              lte: endDate,
            },
          },
        ],
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
            customerName: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            teamName: {
              contains: query,
              mode: 'insensitive',
            },
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
