import { PrismaClient } from '@prisma/client';
import { BookingStatus, BookingType, UserRole } from '@entrip/shared';

const prisma = new PrismaClient();

// 등록
export const createBooking = async (dto: any, companyCode?: string) => {
  // Generate booking number
  const bookingNumber = `BK${Date.now()}`;
  
  // Use provided createdBy or find default user
  let userId = dto.createdBy;
  
  if (!userId) {
    let defaultUser = await prisma.user.findFirst({
      where: { email: 'admin@entrip.com' }
    });
    
    if (!defaultUser) {
      defaultUser = await prisma.user.create({
        data: {
          email: 'admin@entrip.com',
          name: 'Admin User',
          password: 'hashed_password',
          role: UserRole.ADMIN,
          companyCode: companyCode || 'COMPANY_A'
        }
      });
    }
    userId = defaultUser.id;
  }
  
  // Map client to customerName for schema compatibility
  const mappedDto = {
    ...dto,
    customerName: dto.client || dto.customerName,
    teamName: dto.teamName || 'Default Team',
    teamType: dto.teamType || 'GROUP',
    origin: dto.origin || 'Seoul',
    destination: dto.destination || 'TBD',
    paxCount: dto.paxCount || dto.pax || 1,
    nights: dto.nights || 1,
    days: dto.days || 2,
    totalPrice: dto.price || dto.totalPrice,
    currency: dto.currency || 'KRW',
    manager: dto.manager || 'System',
    representative: dto.representative,
    contact: dto.contact,
    email: dto.email,
    memo: dto.memo,
    companyCode: companyCode || 'COMPANY_A'
  };
  
  // Extract related data
  const { flights, vehicles, hotels, settlements, ...bookingData } = mappedDto;
  
  // Create booking with related data using transaction
  return prisma.$transaction(async (tx) => {
    // Create main booking
    const booking = await tx.booking.create({ 
      data: {
        bookingNumber,
        customerName: bookingData.customerName,
        teamName: bookingData.teamName,
        teamType: bookingData.teamType,
        bookingType: bookingData.bookingType,
        origin: bookingData.origin,
        destination: bookingData.destination,
        startDate: new Date(bookingData.startDate || bookingData.departureDate),
        endDate: new Date(bookingData.endDate || bookingData.returnDate),
        paxCount: bookingData.paxCount,
        nights: bookingData.nights,
        days: bookingData.days,
        status: bookingData.bookingStatus || bookingData.status || BookingStatus.PENDING,
        manager: bookingData.manager,
        representative: bookingData.representative,
        contact: bookingData.contact,
        email: bookingData.email,
        totalPrice: bookingData.totalPrice,
        currency: bookingData.currency,
        notes: bookingData.notes,
        memo: bookingData.memo,
        createdBy: userId,
        companyCode: bookingData.companyCode
      }
    });
    
    // Create related flights
    if (flights && flights.length > 0) {
      await tx.flight.createMany({
        data: flights.map((flight: any) => ({
          bookingId: booking.id,
          ...flight
        }))
      });
    }
    
    // Create related vehicles
    if (vehicles && vehicles.length > 0) {
      await tx.vehicle.createMany({
        data: vehicles.map((vehicle: any) => ({
          bookingId: booking.id,
          ...vehicle
        }))
      });
    }
    
    // Create related hotels
    if (hotels && hotels.length > 0) {
      await tx.hotel.createMany({
        data: hotels.map((hotel: any) => ({
          bookingId: booking.id,
          ...hotel
        }))
      });
    }
    
    // Create related settlements
    if (settlements && settlements.length > 0) {
      await tx.settlement.createMany({
        data: settlements.map((settlement: any) => ({
          bookingId: booking.id,
          ...settlement
        }))
      });
    }
    
    // Return booking with all related data
    return tx.booking.findUnique({
      where: { id: booking.id },
      include: {
        flights: true,
        vehicles: true,
        hotels: true,
        settlements: true,
        user: true
      }
    });
  });
};

// 목록
export const listBookings = async (query: any, companyCode?: string) => {
  const where: any = {};
  
  // 회사 코드 필터 - 가장 중요한 필터
  if (companyCode) {
    where.companyCode = companyCode;
  }
  
  // 기존 필터
  if (query.type) where.bookingType = query.type.toUpperCase();
  if (query.status) where.status = query.status.toUpperCase();
  if (query.startDate) where.startDate = query.startDate;
  
  // 월별 필터 추가
  if (query.month) {
    const [year, month] = query.month.split('-').map(Number);
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
    
    where.startDate = {
      gte: startOfMonth,
      lte: endOfMonth
    };
  }
  
  // 고객명 필터 (부분 일치)
  if (query.client) {
    where.customerName = {
      contains: query.client
      // SQLite doesn't support mode: 'insensitive'
    };
  }
  
  // 통합 검색 (예약번호, 고객명, 팀명, 목적지)
  if (query.keyword) {
    where.OR = [
      { bookingNumber: { contains: query.keyword } },
      { customerName: { contains: query.keyword } },
      { teamName: { contains: query.keyword } },
      { destination: { contains: query.keyword } }
    ];
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      skip: query.skip || 0,
      take: query.take || 10,
      orderBy: { startDate: 'asc' },
      include: {
        user: {
          select: { id: true, email: true, name: true, role: true }
        },
        flights: true,
        vehicles: true,
        hotels: true,
        settlements: true
      }
    }),
    prisma.booking.count({ where })
  ]);

  // Map customerName back to client for API consistency
  const mappedBookings = bookings.map(booking => ({
    ...booking,
    client: booking.customerName,
    price: booking.totalPrice
  }));

  return {
    data: mappedBookings,
    pagination: {
      page: Math.floor((query.skip || 0) / (query.take || 10)) + 1,
      limit: query.take || 10,
      total,
      totalPages: Math.ceil(total / (query.take || 10))
    }
  };
};

// 상세
export const getBooking = async (id: string, companyCode?: string) => {
  const where: any = { id };
  
  // 회사 코드가 제공된 경우 필터 추가
  if (companyCode) {
    where.companyCode = companyCode;
  }
  
  const booking = await prisma.booking.findUnique({ 
    where,
    include: {
      user: {
        select: { id: true, email: true, name: true, role: true }
      },
      flights: true,
      vehicles: true,
      hotels: true,
      settlements: true
    }
  });
  
  if (!booking) return null;
  
  // Map customerName back to client for API consistency
  return {
    ...booking,
    client: booking.customerName,
    price: booking.totalPrice
  };
};

// 수정
export const updateBooking = async (id: string, dto: any, companyCode?: string) => {
  // 회사 코드가 제공된 경우 해당 회사의 데이터만 수정 가능
  const where: any = { id };
  if (companyCode) {
    where.companyCode = companyCode;
  }
  
  // Map client to customerName if provided
  const mappedDto = { ...dto };
  if (dto.client) {
    mappedDto.customerName = dto.client;
    delete mappedDto.client;
  }
  if (dto.price) {
    mappedDto.totalPrice = dto.price;
    delete mappedDto.price;
  }
  if (dto.pax) {
    mappedDto.paxCount = dto.pax;
    delete mappedDto.pax;
  }
  if (dto.bookingStatus) {
    mappedDto.status = dto.bookingStatus;
    delete mappedDto.bookingStatus;
  }
  
  // Extract related data
  const { flights, vehicles, hotels, settlements, ...bookingData } = mappedDto;
  
  // Update booking with related data using transaction
  return prisma.$transaction(async (tx) => {
    // Update main booking
    const booking = await tx.booking.update({ 
      where, 
      data: bookingData
    });
    
    // Update related data - delete and recreate for simplicity
    if (flights !== undefined) {
      await tx.flight.deleteMany({ where: { bookingId: id } });
      if (flights && flights.length > 0) {
        await tx.flight.createMany({
          data: flights.map((flight: any) => ({
            bookingId: id,
            ...flight
          }))
        });
      }
    }
    
    if (vehicles !== undefined) {
      await tx.vehicle.deleteMany({ where: { bookingId: id } });
      if (vehicles && vehicles.length > 0) {
        await tx.vehicle.createMany({
          data: vehicles.map((vehicle: any) => ({
            bookingId: id,
            ...vehicle
          }))
        });
      }
    }
    
    if (hotels !== undefined) {
      await tx.hotel.deleteMany({ where: { bookingId: id } });
      if (hotels && hotels.length > 0) {
        await tx.hotel.createMany({
          data: hotels.map((hotel: any) => ({
            bookingId: id,
            ...hotel
          }))
        });
      }
    }
    
    if (settlements !== undefined) {
      await tx.settlement.deleteMany({ where: { bookingId: id } });
      if (settlements && settlements.length > 0) {
        await tx.settlement.createMany({
          data: settlements.map((settlement: any) => ({
            bookingId: id,
            ...settlement
          }))
        });
      }
    }
    
    // Return updated booking with all related data
    const updatedBooking = await tx.booking.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, email: true, name: true, role: true }
        },
        flights: true,
        vehicles: true,
        hotels: true,
        settlements: true
      }
    });
    
    return {
      ...updatedBooking,
      client: updatedBooking?.customerName,
      price: updatedBooking?.totalPrice
    };
  });
};

// 삭제 (ADMIN만 가능)
export const deleteBooking = (id: string, companyCode?: string) => {
  const where: any = { id };
  if (companyCode) {
    where.companyCode = companyCode;
  }
  return prisma.booking.delete({ where });
};

// 상태변경
export const changeStatus = async (id: string, status: BookingStatus, companyCode?: string) => {
  const where: any = { id };
  if (companyCode) {
    where.companyCode = companyCode;
  }
  
  const booking = await prisma.booking.update({ 
    where, 
    data: { status },
    include: {
      user: {
        select: { id: true, email: true, name: true, role: true }
      }
    }
  });
  
  return {
    ...booking,
    client: booking.customerName,
    price: booking.totalPrice
  };
};

// Bulk 삭제
export const bulkDeleteBookings = async (ids: string[], companyCode?: string) => {
  const where: any = {
    id: {
      in: ids
    }
  };
  
  if (companyCode) {
    where.companyCode = companyCode;
  }
  
  const result = await prisma.booking.deleteMany({ where });
  
  return result.count;
};

// Bulk 생성
export const bulkCreateBookings = async (bookings: any[], userId: string, companyCode?: string) => {
  const createdBookings = await Promise.all(
    bookings.map(async (booking) => {
      const bookingNumber = `BK${Date.now()}${Math.floor(Math.random() * 1000)}`;
      
      return prisma.booking.create({
        data: {
          bookingNumber,
          customerName: booking.customerName,
          teamName: booking.teamName || booking.customerName,
          bookingType: booking.bookingType || BookingType.PACKAGE,
          destination: booking.destination,
          startDate: new Date(booking.departureDate),
          endDate: new Date(booking.endDate || booking.returnDate),
          paxCount: booking.numberOfPeople || booking.paxCount || 1,
          nights: booking.nights || 3,
          days: booking.days || 4,
          status: booking.status?.toUpperCase() || BookingStatus.PENDING,
          totalPrice: booking.totalPrice || 0,
          currency: 'KRW',
          notes: booking.notes || '',
          createdBy: userId,
          companyCode: companyCode || 'COMPANY_A'
        }
      });
    })
  );
  
  return createdBookings;
};