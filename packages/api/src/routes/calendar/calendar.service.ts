import { CalendarEvent, CalendarEventStatus } from '@prisma/client';
import { BaseService } from '../../services/base.service';
import prisma from '../../lib/prisma';
import { CalendarCreateInput } from './dtos/CalendarCreate.dto';
import { CalendarUpdateInput } from './dtos/CalendarUpdate.dto';
import { CalendarQueryInput } from './dtos/CalendarQuery.dto';
import { CalendarStatusPatchInput } from './dtos/CalendarStatusPatch.dto';
import { ApiError } from '../../middlewares/error.middleware';

// Default colors from design tokens (brand colors)
const DEFAULT_COLORS = [
  '#2563EB', // brand.500 - primary blue
  '#10B981', // success.500 - emerald
  '#F59E0B', // warning.500 - amber
  '#EF4444', // error.500 - red
  '#8B5CF6', // accent.500 - violet
  '#06B6D4', // info.500 - cyan
];

export class CalendarService extends BaseService<CalendarEvent> {
  constructor() {
    super(prisma.calendarEvent);
  }

  /**
   * Get events for a specific month with company isolation
   */
  async list(companyCode: string, query: CalendarQueryInput): Promise<CalendarEvent[]> {
    const { year, month, teamId } = query;

    // Create date range for the month in UTC
    const startOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(year, month - 1 + 1, 0, 23, 59, 59, 999));

    const whereClause: any = {
      companyCode,
      deletedAt: null,
      OR: [
        {
          startTime: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        {
          endTime: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        {
          AND: [
            { startTime: { lt: startOfMonth } },
            { endTime: { gt: endOfMonth } },
          ],
        },
      ],
    };

    // Filter by team if specified
    if (teamId) {
      whereClause.teamId = teamId;
    }

    return this.model.findMany({
      where: whereClause,
      orderBy: {
        startTime: 'asc',
      },
      include: {
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            customerName: true,
            teamName: true,
          },
        },
      },
    });
  }

  /**
   * Create a calendar event with company code
   */
  async createEvent(
    companyCode: string,
    userId: string,
    input: CalendarCreateInput
  ): Promise<CalendarEvent> {
    const eventData: any = {
      title: input.title,
      startTime: new Date(input.start),
      endTime: new Date(input.end),
      allDay: input.allDay || false,
      color: input.color || this.getRandomColor(),
      description: input.description,
      location: input.location,
      status: CalendarEventStatus.CONFIRMED,
      companyCode,
      createdById: userId,
    };

    // If teamId is provided, verify it exists
    if (input.teamId) {
      eventData.teamId = input.teamId;
    }

    // If bookingId is provided, link to booking
    if (input.bookingId) {
      const booking = await prisma.booking.findFirst({
        where: {
          id: input.bookingId,
          companyCode,
          deletedAt: null,
        },
      });

      if (!booking) {
        throw new ApiError(404, 'Booking not found or access denied');
      }

      eventData.bookingId = input.bookingId;
    }

    return this.model.create({
      data: eventData,
      include: {
        booking: true,
      },
    });
  }

  /**
   * Update calendar event with company validation
   */
  async updateEvent(
    id: string,
    companyCode: string,
    userId: string,
    input: CalendarUpdateInput
  ): Promise<CalendarEvent> {
    // First validate the event exists and belongs to company
    await this.findById(id, companyCode);

    const updateData: any = {
      title: input.title,
      startTime: new Date(input.start),
      endTime: new Date(input.end),
      allDay: input.allDay || false,
      color: input.color,
      description: input.description,
      location: input.location,
      updatedAt: new Date(),
    };

    if (input.status) {
      updateData.status = input.status as CalendarEventStatus;
    }

    if (input.teamId !== undefined) {
      updateData.teamId = input.teamId;
    }

    return this.model.update({
      where: { id },
      data: updateData,
      include: {
        booking: true,
      },
    });
  }

  /**
   * Update event status with company validation
   */
  async updateEventStatus(
    id: string,
    companyCode: string,
    input: CalendarStatusPatchInput
  ): Promise<CalendarEvent> {
    // First validate the event exists and belongs to company
    await this.findById(id, companyCode);

    return this.model.update({
      where: { id },
      data: {
        status: input.status as CalendarEventStatus,
        updatedAt: new Date(),
      },
      include: {
        booking: true,
      },
    });
  }

  /**
   * Get events for a date range
   */
  async findByDateRange(
    companyCode: string,
    startDate: Date,
    endDate: Date
  ): Promise<CalendarEvent[]> {
    return this.model.findMany({
      where: {
        companyCode,
        deletedAt: null,
        OR: [
          {
            startTime: {
              gte: startDate,
              lte: endDate,
            },
          },
          {
            endTime: {
              gte: startDate,
              lte: endDate,
            },
          },
        ],
      },
      orderBy: {
        startTime: 'asc',
      },
      include: {
        booking: true,
      },
    });
  }

  /**
   * Get events for a specific booking
   */
  async findByBookingId(
    companyCode: string,
    bookingId: string
  ): Promise<CalendarEvent[]> {
    return this.model.findMany({
      where: {
        companyCode,
        bookingId,
        deletedAt: null,
      },
      orderBy: {
        startTime: 'asc',
      },
    });
  }

  /**
   * Get calendar statistics
   */
  async getStats(companyCode: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [total, thisMonth, confirmed, pending, cancelled] = await Promise.all([
      this.count(companyCode),
      this.model.count({
        where: {
          companyCode,
          deletedAt: null,
          startTime: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      }),
      this.count(companyCode, { status: CalendarEventStatus.CONFIRMED }),
      this.count(companyCode, { status: CalendarEventStatus.PENDING }),
      this.count(companyCode, { status: CalendarEventStatus.CANCELLED }),
    ]);

    return {
      total,
      thisMonth,
      byStatus: {
        confirmed,
        pending,
        cancelled,
      },
    };
  }

  /**
   * Get a random default color
   */
  private getRandomColor(): string {
    return DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)];
  }
}

// Export singleton instance
export const calendarService = new CalendarService();