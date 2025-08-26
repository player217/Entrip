import { PrismaClient, BookingStatus } from '@prisma/client';

const prisma = new PrismaClient();

// 등록
export const createBooking = (dto: any) =>
  prisma.booking.create({ data: dto });

// 목록
export const listBookings = (query: any) =>
  prisma.booking.findMany({
    where: { deletedAt: null, ...query.filters },
    orderBy: { startDate: 'asc' },
    skip: query.skip,
    take: query.take
  });

// 상세
export const getBooking = (id: string) =>
  prisma.booking.findUnique({ where: { id } });

// 수정
export const updateBooking = (id: string, dto: any) =>
  prisma.booking.update({ where: { id }, data: dto });

// 상태변경
export const changeStatus = (id: string, status: BookingStatus) =>
  prisma.booking.update({ where: { id }, data: { status } });
EOF < /dev/null
