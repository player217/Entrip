import { PrismaClient, CalendarEvent, CalendarEventStatus } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================
// TYPES
// ============================================

export interface CalendarEventCreateDto {
  title: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  color?: string;
  status?: CalendarEventStatus;
  createdBy?: string;
}

export interface CalendarEventUpdateDto {
  title?: string;
  description?: string;
  location?: string;
  start?: Date;
  end?: Date;
  allDay?: boolean;
  color?: string;
  status?: CalendarEventStatus;
  updatedBy?: string;
}

export interface CalendarQueryDto {
  year: number;
  month: number;
  teamId?: string;
  status?: CalendarEventStatus;
}

// Default colors from design tokens (brand colors)
const DEFAULT_COLORS = [
  '#2563EB', // brand.500 - primary blue
  '#10B981', // success.500 - emerald
  '#F59E0B', // warning.500 - amber
  '#EF4444', // error.500 - red
  '#8B5CF6', // accent.500 - violet
  '#06B6D4', // info.500 - cyan
];

// ============================================
// SERVICE FUNCTIONS
// ============================================

/**
 * Get events for a specific month with optional filters
 */
export const listCalendarEvents = async (query: CalendarQueryDto): Promise<CalendarEvent[]> => {
  const { year, month, status } = query;
  
  // Create date range for the month
  const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
  
  const where = {
    deletedAt: null, // Only non-deleted events
    ...(status && { status }),
    // ...(teamId && { teamId }), // Will be added when Team relation is implemented
    OR: [
      // Event starts within the month
      {
        start: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      // Event ends within the month
      {
        end: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      // Event spans the entire month
      {
        start: { lt: startOfMonth },
        end: { gt: endOfMonth },
      },
    ],
  };

  return prisma.calendarEvent.findMany({
    where,
    orderBy: { start: 'asc' },
  });
};

/**
 * Get a single calendar event by ID
 */
export const getCalendarEventById = async (id: string): Promise<CalendarEvent | null> => {
  return prisma.calendarEvent.findFirst({
    where: {
      id,
      deletedAt: null,
    },
  });
};

/**
 * Create a new calendar event
 */
export const createCalendarEvent = async (dto: CalendarEventCreateDto): Promise<CalendarEvent> => {
  return prisma.calendarEvent.create({
    data: {
      ...dto,
      color: dto.color || getRandomColor(),
    },
  });
};

/**
 * Update an existing calendar event
 */
export const updateCalendarEvent = async (id: string, dto: CalendarEventUpdateDto): Promise<CalendarEvent> => {
  return prisma.calendarEvent.update({
    where: { id },
    data: dto,
  });
};

/**
 * Update calendar event status only
 */
export const updateCalendarEventStatus = async (
  id: string, 
  status: CalendarEventStatus,
  updatedBy?: string
): Promise<CalendarEvent> => {
  return prisma.calendarEvent.update({
    where: { id },
    data: { 
      status,
      updatedBy,
    },
  });
};

/**
 * Soft delete a calendar event
 */
export const deleteCalendarEvent = async (id: string): Promise<CalendarEvent> => {
  return prisma.calendarEvent.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
};

/**
 * Get calendar event statistics
 */
export const getCalendarEventStats = async () => {
  const [total, byStatus, thisMonth, nextMonth] = await Promise.all([
    prisma.calendarEvent.count({ where: { deletedAt: null } }),
    prisma.calendarEvent.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { id: true },
    }),
    prisma.calendarEvent.count({
      where: {
        deletedAt: null,
        start: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
        },
      },
    }),
    prisma.calendarEvent.count({
      where: {
        deletedAt: null,
        start: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
          lt: new Date(new Date().getFullYear(), new Date().getMonth() + 2, 1),
        },
      },
    }),
  ]);

  return {
    total,
    byStatus: byStatus.reduce((acc, item) => {
      acc[item.status] = item._count.id;
      return acc;
    }, {} as Record<CalendarEventStatus, number>),
    thisMonth,
    nextMonth,
  };
};

/**
 * Get upcoming events (next 7 days)
 */
export const getUpcomingEvents = async (limit: number = 10): Promise<CalendarEvent[]> => {
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);

  return prisma.calendarEvent.findMany({
    where: {
      deletedAt: null,
      start: {
        gte: today,
        lte: nextWeek,
      },
    },
    orderBy: { start: 'asc' },
    take: limit,
  });
};

/**
 * Search events by title or description
 */
export const searchCalendarEvents = async (searchTerm: string): Promise<CalendarEvent[]> => {
  return prisma.calendarEvent.findMany({
    where: {
      deletedAt: null,
      OR: [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { location: { contains: searchTerm, mode: 'insensitive' } },
      ],
    },
    orderBy: { start: 'asc' },
  });
};

/**
 * Get a random default color
 */
function getRandomColor(): string {
  return DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)];
}

/**
 * Clean up function to close Prisma connection
 */
export const closePrismaConnection = async () => {
  await prisma.$disconnect();
};