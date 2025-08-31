import { PrismaClient } from '@prisma/client';
import { BookingStatus, BookingType, UserRole } from '@entrip/shared';
import { fromApiCreateRequest, fromApiUpdateRequest } from './booking.mapper';

const prisma = new PrismaClient();

// Outbox 패턴을 위한 유틸리티 함수
const addToOutbox = async (tx: any, topic: string, payload: any) => {
  await tx.outbox.create({
    data: {
      topic,
      payload,
      createdAt: new Date()
    }
  });
};

// 감사 로그 추가 유틸리티
const addAuditLog = async (tx: any, actorId: string, action: string, entity: string, entityId?: string, detail?: any) => {
  await tx.auditLog.create({
    data: {
      actorId,
      action,
      entity,
      entityId,
      detail,
      createdAt: new Date()
    }
  });
};

// 등록
export const createBooking = async (dto: any, companyCode: string) => {
  // companyCode 필수 체크
  if (!companyCode) {
    throw new Error('Company code is required for creating bookings');
  }
  
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
  
  // Convert API request to DB format
  const dbData = fromApiCreateRequest(dto);
  
  // Extract complex fields
  const { flights, vehicles, hotels, settlements, ...bookingData } = {
    ...dbData,
    companyCode: companyCode || 'COMPANY_A',
    memo: dto.memo
  };
  
  // Create booking with related data using transaction with outbox pattern
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
        startDate: bookingData.startDate,
        endDate: bookingData.endDate,
        paxCount: bookingData.paxCount,
        nights: bookingData.nights,
        days: bookingData.days,
        status: BookingStatus.PENDING,
        manager: bookingData.manager,
        representative: bookingData.representative,
        contact: bookingData.contact,
        email: bookingData.email,
        totalPrice: bookingData.totalPrice,
        depositAmount: bookingData.depositAmount,
        currency: bookingData.currency,
        notes: bookingData.notes,
        memo: bookingData.memo,
        createdBy: userId,
        companyCode: bookingData.companyCode
      }
    });
    
    // 감사 로그 추가
    await addAuditLog(
      tx, 
      userId, 
      'CREATE', 
      'Booking', 
      booking.id, 
      { bookingNumber, customerName: bookingData.customerName, totalPrice: bookingData.totalPrice }
    );
    
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
    
    // Outbox 메시지 추가 (WebSocket 브로드캐스트용)
    await addToOutbox(tx, 'booking:created', {
      bookingId: booking.id,
      companyCode: bookingData.companyCode,
      type: 'create',
      data: booking
    });
    
    // 이메일 알림용 메시지 (이메일이 있는 경우)
    if (bookingData.email) {
      await addToOutbox(tx, 'notification:email', {
        to: bookingData.email,
        template: 'booking_created',
        data: {
          bookingNumber,
          customerName: bookingData.customerName,
          destination: bookingData.destination,
          startDate: bookingData.startDate
        }
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
export const listBookings = async (query: any, companyCode: string) => {
  // companyCode 필수 체크
  if (!companyCode) {
    throw new Error('Company code is required for listing bookings');
  }
  
  const where: any = {};
  
  // 회사 코드 필터 - 가장 중요한 필터 (필수)
  where.companyCode = companyCode;
  
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
export const getBooking = async (id: string, companyCode: string) => {
  // companyCode 필수 체크
  if (!companyCode) {
    throw new Error('Company code is required for retrieving bookings');
  }
  
  const where: any = { 
    id,
    companyCode  // 필수 조건
  };
  
  const booking = await prisma.booking.findFirst({ 
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
export const updateBooking = async (id: string, dto: any, companyCode: string, actorId?: string) => {
  // companyCode 필수 체크
  if (!companyCode) {
    throw new Error('Company code is required for updating bookings');
  }
  
  // 해당 회사의 데이터만 수정 가능
  const where: any = { 
    id,
    companyCode  // 필수 조건
  };
  
  // Convert API request to DB format
  const bookingData = fromApiUpdateRequest(dto);
  
  // Update booking with related data using transaction
  return prisma.$transaction(async (tx) => {
    // 기존 데이터 조회 (변경 사항 추적용)
    const originalBooking = await tx.booking.findFirst({ where });
    if (!originalBooking) {
      throw new Error('Booking not found');
    }
    
    // Update main booking - use just the ID for update
    const booking = await tx.booking.update({ 
      where: { id }, 
      data: bookingData
    });
    
    // 감사 로그 추가
    await addAuditLog(
      tx, 
      actorId || 'system', 
      'UPDATE', 
      'Booking', 
      id, 
      { 
        changes: Object.keys(bookingData),
        originalValues: Object.keys(bookingData).reduce((acc: any, key) => {
          acc[key] = originalBooking[key];
          return acc;
        }, {}),
        newValues: bookingData
      }
    );
    
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
    
    // Outbox 메시지 추가 (WebSocket 브로드캐스트용)
    await addToOutbox(tx, 'booking:updated', {
      bookingId: id,
      companyCode: originalBooking.companyCode,
      type: 'update',
      data: booking,
      changes: Object.keys(bookingData)
    });
    
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
export const deleteBooking = async (id: string, companyCode: string, actorId?: string) => {
  // companyCode 필수 체크
  if (!companyCode) {
    throw new Error('Company code is required for deleting bookings');
  }
  
  const where: any = { 
    id,
    companyCode  // 필수 조건
  };
  
  return prisma.$transaction(async (tx) => {
    // 삭제 전 데이터 조회
    const bookingToDelete = await tx.booking.findUnique({ where });
    if (!bookingToDelete) {
      throw new Error('Booking not found');
    }
    
    // 실제 삭제
    const deleted = await tx.booking.delete({ where });
    
    // 감사 로그 추가
    await addAuditLog(
      tx, 
      actorId || 'system', 
      'DELETE', 
      'Booking', 
      id, 
      { 
        deletedData: {
          bookingNumber: bookingToDelete.bookingNumber,
          customerName: bookingToDelete.customerName,
          totalPrice: bookingToDelete.totalPrice
        }
      }
    );
    
    // Outbox 메시지 추가
    await addToOutbox(tx, 'booking:deleted', {
      bookingId: id,
      companyCode: bookingToDelete.companyCode,
      type: 'delete',
      data: { bookingNumber: bookingToDelete.bookingNumber }
    });
    
    return deleted;
  });
};

// 상태변경
export const changeStatus = async (id: string, status: BookingStatus, companyCode: string) => {
  // companyCode 필수 체크
  if (!companyCode) {
    throw new Error('Company code is required for changing booking status');
  }
  
  const where: any = { 
    id,
    companyCode  // 필수 조건
  };
  
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
export const bulkDeleteBookings = async (ids: string[], companyCode: string) => {
  // companyCode 필수 체크
  if (!companyCode) {
    throw new Error('Company code is required for bulk deleting bookings');
  }
  
  const where: any = {
    id: {
      in: ids
    },
    companyCode  // 필수 조건 - 해당 회사의 예약만 삭제 가능
  };
  
  const result = await prisma.booking.deleteMany({ where });
  
  return result.count;
};

// Bulk 생성 (트랜잭션으로 원자성 보장)
export const bulkCreateBookings = async (bookings: any[], userId: string, companyCode: string) => {
  // companyCode 필수 체크
  if (!companyCode) {
    throw new Error('Company code is required for bulk creating bookings');
  }
  return prisma.$transaction(async (tx) => {
    const createdBookings = [];
    
    for (const booking of bookings) {
      const bookingNumber = `BK${Date.now()}${Math.floor(Math.random() * 1000)}`;
      
      const created = await tx.booking.create({
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
      
      createdBookings.push(created);
      
      // 감사 로그 추가
      await addAuditLog(
        tx, 
        userId, 
        'BULK_CREATE', 
        'Booking', 
        created.id, 
        { bookingNumber, customerName: booking.customerName }
      );
    }
    
    // Outbox 메시지 추가 (대량 생성 알림)
    await addToOutbox(tx, 'booking:bulk_created', {
      count: createdBookings.length,
      companyCode: companyCode || 'COMPANY_A',
      bookingIds: createdBookings.map(b => b.id),
      actorId: userId
    });
    
    return createdBookings;
  });
};