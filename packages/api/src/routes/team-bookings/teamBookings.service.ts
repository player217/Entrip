import { Booking, BookingStatus } from '@prisma/client';
import prisma from '../../lib/prisma';
import { BaseService, PaginationOptions, PaginatedResult } from '../../services/base.service';

type StatusV2 = 'draft' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

const mapV2StatusToPrisma = (values?: unknown): BookingStatus[] | undefined => {
  if (!values) return undefined;
  const arr = Array.isArray(values) ? values : [values];
  const mapped = arr
    .map((v) => String(v).toLowerCase().trim())
    .map<BookingStatus | undefined>((s) => {
      switch (s) {
        case 'draft':
          return BookingStatus.PENDING;
        case 'confirmed':
          return BookingStatus.CONFIRMED;
        case 'in_progress':
        case 'in-progress':
        case 'inprogress':
          return BookingStatus.IN_PROGRESS;
        case 'cancelled':
          return BookingStatus.CANCELLED;
        case 'completed':
          return BookingStatus.COMPLETED;
        default:
          return undefined;
      }
    })
    .filter((v): v is BookingStatus => !!v);
  return mapped.length ? mapped : undefined;
};

export class TeamBookingsService extends BaseService<Booking> {
  constructor() {
    super(prisma.booking);
  }

  async list(
    companyCode: string,
    query: Record<string, unknown>,
    options: PaginationOptions
  ): Promise<PaginatedResult<Booking>> {
    const { startDate, endDate, destination, customerName, teamCode, status, sortBy, sortOrder } = query as any;

    const and: any[] = [];
    if (startDate) and.push({ startDate: { gte: new Date(String(startDate)) } });
    if (endDate) and.push({ endDate: { lte: new Date(String(endDate)) } });
    if (destination) and.push({ destination: { contains: String(destination), mode: 'insensitive' } });
    if (customerName) and.push({ customerName: { contains: String(customerName), mode: 'insensitive' } });
    if (teamCode) and.push({ teamName: { contains: String(teamCode), mode: 'insensitive' } });

    const statuses = mapV2StatusToPrisma(status);
    if (statuses && statuses.length) {
      and.push({ status: { in: statuses } });
    }

    // Build order mapping
    const orderMap: Record<string, string> = {
      departureDate: 'startDate',
      createdAt: 'createdAt',
      teamCode: 'teamName',
      status: 'status',
    };
    const orderByField = orderMap[String(sortBy || '')] || 'createdAt';
    const orderDir: 'asc' | 'desc' = (String(sortOrder || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc');

    const where = this.withCompanyFilter(companyCode, and.length ? { AND: and } : {});

    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.model.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderByField]: orderDir },
      }),
      this.model.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getHistory(bookingId: string, companyCode: string) {
    // Ensure access
    await this.findById(bookingId, companyCode);

    const history = await prisma.bookingHistory.findMany({
      where: { bookingId, companyCode },
      orderBy: { changedAt: 'desc' },
      take: 100,
    });

    return history.map((h) => ({
      id: h.id,
      action: ((): 'created' | 'updated' | 'status_changed' | 'payment_added' => {
        const a = (h.action || '').toLowerCase();
        if (a.includes('status')) return 'status_changed';
        if (a.includes('payment')) return 'payment_added';
        if (a.includes('create')) return 'created';
        return 'updated';
      })(),
      description: `Action: ${h.action}`,
      changedBy: h.changedBy,
      changedAt: h.changedAt.toISOString(),
      changes: h.newValues ?? undefined,
    }));
  }
}

export const teamBookingsService = new TeamBookingsService();

