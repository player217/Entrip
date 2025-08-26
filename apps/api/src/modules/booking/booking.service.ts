import { PrismaClient, Prisma, BookingStatus } from '@prisma/client';
import { CreateBookingDto, UpdateBookingDto, ListBookingsQueryDto } from './booking.dto';

export class BookingService {
  constructor(private prisma: PrismaClient) {}

  async create(data: CreateBookingDto & { createdBy: string }) {
    // Generate booking number
    const bookingNumber = await this.generateBookingNumber();
    
    const { flightInfo, hotelInfo, insuranceInfo, startDate, endDate, totalPrice, depositAmount, createdBy, customerName, teamName, bookingType, destination, paxCount, nights, days, currency, notes } = data;
    
    return this.prisma.booking.create({
      data: {
        bookingNumber,
        customerName,
        teamName,
        bookingType,
        destination,
        paxCount,
        nights,
        days,
        currency,
        notes,
        companyCode: 'COMPANY_A', // Default company code
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        totalPrice: new Prisma.Decimal(totalPrice),
        depositAmount: depositAmount ? new Prisma.Decimal(depositAmount) : null,
        flightInfo: flightInfo ? (flightInfo as Prisma.InputJsonValue) : Prisma.DbNull,
        hotelInfo: hotelInfo ? (hotelInfo as Prisma.InputJsonValue) : Prisma.DbNull,
        insuranceInfo: insuranceInfo ? (insuranceInfo as Prisma.InputJsonValue) : Prisma.DbNull,
        user: {
          connect: { id: createdBy }
        }
      },
      include: {
        events: true,
      },
    });
  }

  async findAll(query: ListBookingsQueryDto) {
    const { status, dateFrom, dateTo, page, limit } = query;
    
    const where: Prisma.BookingWhereInput = {};
    
    if (status) {
      where.status = status;
    }
    
    if (dateFrom || dateTo) {
      where.startDate = {};
      if (dateFrom) {
        where.startDate.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.startDate.lte = new Date(dateTo);
      }
    }
    
    const [total, bookings] = await Promise.all([
      this.prisma.booking.count({ where }),
      this.prisma.booking.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          events: true,
        },
      }),
    ]);
    
    return {
      data: bookings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    return this.prisma.booking.findUnique({
      where: { id },
      include: {
        events: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async update(id: string, data: UpdateBookingDto & { updatedBy: string }) {
    const { flightInfo, hotelInfo, insuranceInfo, startDate, endDate, totalPrice, depositAmount, ...restData } = data;
    
    const updateData: Prisma.BookingUpdateInput = {
      ...restData,
      updatedBy: data.updatedBy,
    };
    
    // Handle date fields
    if (startDate !== undefined) {
      updateData.startDate = new Date(startDate);
    }
    if (endDate !== undefined) {
      updateData.endDate = new Date(endDate);
    }
    
    // Handle decimal fields
    if (totalPrice !== undefined) {
      updateData.totalPrice = new Prisma.Decimal(totalPrice);
    }
    if (depositAmount !== undefined) {
      updateData.depositAmount = depositAmount ? new Prisma.Decimal(depositAmount) : null;
    }

    // Handle JSON fields
    if (flightInfo !== undefined) {
      updateData.flightInfo = flightInfo ? (flightInfo as Prisma.InputJsonValue) : Prisma.DbNull;
    }
    if (hotelInfo !== undefined) {
      updateData.hotelInfo = hotelInfo ? (hotelInfo as Prisma.InputJsonValue) : Prisma.DbNull;
    }
    if (insuranceInfo !== undefined) {
      updateData.insuranceInfo = insuranceInfo ? (insuranceInfo as Prisma.InputJsonValue) : Prisma.DbNull;
    }
    
    return this.prisma.booking.update({
      where: { id },
      data: updateData,
      include: {
        events: true,
      },
    });
  }

  async delete(id: string) {
    // First delete related events
    await this.prisma.bookingEvent.deleteMany({
      where: { bookingId: id },
    });
    
    // Then delete the booking
    return this.prisma.booking.delete({
      where: { id },
    });
  }

  async createEvent(bookingId: string, data: { date: string; typeCode: string; status: BookingStatus }) {
    return this.prisma.bookingEvent.create({
      data: {
        bookingId,
        date: new Date(data.date),
        typeCode: data.typeCode,
        status: data.status,
      },
    });
  }

  private async generateBookingNumber(): Promise<string> {
    const today = new Date();
    const year = today.getFullYear().toString().slice(-2);
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    
    const prefix = `BK${year}${month}${day}`;
    
    // Find the latest booking number for today
    const latestBooking = await this.prisma.booking.findFirst({
      where: {
        bookingNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        bookingNumber: 'desc',
      },
    });
    
    let sequence = 1;
    if (latestBooking) {
      const lastSequence = parseInt(latestBooking.bookingNumber.slice(-4));
      sequence = lastSequence + 1;
    }
    
    return `${prefix}${sequence.toString().padStart(4, '0')}`;
  }
}