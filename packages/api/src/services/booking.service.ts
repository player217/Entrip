import { PrismaClient, Booking, BookingStatus, BookingType } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================
// TYPES
// ============================================

export interface BookingCreateDto {
  teamName: string;
  type: BookingType;
  origin: string;
  destination: string;
  startDate: Date;
  endDate: Date;
  totalPax?: number;
  coordinator: string;
  revenue?: number;
  notes?: string;
  status?: BookingStatus;
}

export interface BookingUpdateDto {
  teamName?: string;
  type?: BookingType;
  origin?: string;
  destination?: string;
  startDate?: Date;
  endDate?: Date;
  totalPax?: number;
  coordinator?: string;
  revenue?: number;
  notes?: string;
  status?: BookingStatus;
}

export interface ListQuery {
  page?: number;
  limit?: number;
  status?: BookingStatus;
  startDate?: Date;
  endDate?: Date;
}

// ============================================
// SERVICE FUNCTIONS
// ============================================

/**
 * Create a new booking
 */
export const createBooking = async (dto: BookingCreateDto): Promise<Booking> => {
  return prisma.booking.create({
    data: {
      ...dto,
      revenue: dto.revenue ? String(dto.revenue) : null, // Convert to string for SQLite Decimal
    },
  });
};

/**
 * List bookings with pagination and filters
 */
export const listBookings = async (query: ListQuery = {}): Promise<{
  data: Booking[];
  total: number;
  page: number;
  limit: number;
}> => {
  const { page = 1, limit = 10, status, startDate, endDate } = query;
  const skip = (page - 1) * limit;

  const where = {
    deletedAt: null, // Only non-deleted bookings
    ...(status && { status }),
    ...(startDate && endDate && {
      startDate: { gte: startDate },
      endDate: { lte: endDate },
    }),
  };

  const [data, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.booking.count({ where }),
  ]);

  return {
    data,
    total,
    page,
    limit,
  };
};

/**
 * Get a single booking by ID
 */
export const getBookingById = async (id: string): Promise<Booking | null> => {
  return prisma.booking.findFirst({
    where: {
      id,
      deletedAt: null,
    },
  });
};

/**
 * Update a booking
 */
export const updateBooking = async (id: string, dto: BookingUpdateDto): Promise<Booking> => {
  return prisma.booking.update({
    where: { id },
    data: {
      ...dto,
      revenue: dto.revenue ? String(dto.revenue) : undefined,
    },
  });
};

/**
 * Update booking status (PATCH /bookings/:id/status)
 */
export const updateBookingStatus = async (id: string, status: BookingStatus): Promise<Booking> => {
  return prisma.booking.update({
    where: { id },
    data: { status },
  });
};

/**
 * Soft delete a booking
 */
export const deleteBooking = async (id: string): Promise<Booking> => {
  return prisma.booking.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
};

/**
 * Get booking statistics
 */
export const getBookingStats = async () => {
  const [total, byStatus, recentBookings] = await Promise.all([
    prisma.booking.count({ where: { deletedAt: null } }),
    prisma.booking.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { id: true },
    }),
    prisma.booking.count({
      where: {
        deletedAt: null,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
      },
    }),
  ]);

  return {
    total,
    byStatus: byStatus.reduce((acc, item) => {
      acc[item.status] = item._count.id;
      return acc;
    }, {} as Record<BookingStatus, number>),
    recentBookings,
  };
};

/**
 * Clean up function to close Prisma connection
 */
export const closePrismaConnection = async () => {
  await prisma.$disconnect();
};