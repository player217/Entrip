import { BookingService } from '../src/modules/booking/booking.service';
import { PrismaClient, BookingStatus, BookingType } from '@prisma/client';
import { CreateBookingDto } from '../src/modules/booking/booking.dto';

// Mock PrismaClient
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    booking: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    bookingEvent: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
    BookingStatus: {
      PENDING: 'PENDING',
      CONFIRMED: 'CONFIRMED',
      CANCELLED: 'CANCELLED',
    },
    BookingType: {
      PACKAGE: 'PACKAGE',
      FIT: 'FIT',
      GROUP: 'GROUP',
    },
    Prisma: {
      Decimal: jest.fn((value) => ({ value })),
      DbNull: Symbol('DbNull'),
    },
  };
});

describe('BookingService', () => {
  let service: BookingService;
  let prisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    prisma = new PrismaClient() as jest.Mocked<PrismaClient>;
    service = new BookingService(prisma);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a booking with valid data', async () => {
      const createDto: CreateBookingDto = {
        customerName: '홍길동',
        teamName: 'A팀',
        bookingType: BookingType.PACKAGE,
        destination: '제주도',
        startDate: '2025-03-01T00:00:00Z',
        endDate: '2025-03-03T00:00:00Z',
        paxCount: 4,
        nights: 2,
        days: 3,
        totalPrice: 1200000,
        depositAmount: 300000,
        currency: 'KRW',
        flightInfo: { airline: 'KE', flightNo: '1234' },
        hotelInfo: { name: '제주호텔', roomType: 'TWIN' },
      };

      const mockBooking = {
        id: '123',
        bookingNumber: 'BK25030100001',
        ...createDto,
        status: BookingStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
        events: [],
      };

      (prisma.booking.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.booking.create as jest.Mock).mockResolvedValue(mockBooking);

      const result = await service.create({ ...createDto, createdBy: 'user123' });

      expect(prisma.booking.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          customerName: '홍길동',
          teamName: 'A팀',
          bookingNumber: expect.stringMatching(/^BK\d{10}$/),
          flightInfo: { airline: 'KE', flightNo: '1234' },
          hotelInfo: { name: '제주호텔', roomType: 'TWIN' },
        }),
        include: { events: true },
      });

      expect(result).toEqual(mockBooking);
    });

    it('should handle null JSON fields correctly', async () => {
      const createDto: CreateBookingDto = {
        customerName: '김철수',
        teamName: 'B팀',
        bookingType: BookingType.FIT,
        destination: '부산',
        startDate: '2025-03-05T00:00:00Z',
        endDate: '2025-03-06T00:00:00Z',
        paxCount: 2,
        nights: 1,
        days: 2,
        totalPrice: 500000,
        currency: 'KRW',
        // No JSON fields provided
      };

      const mockBooking = {
        id: '456',
        bookingNumber: 'BK25030500001',
        ...createDto,
        status: BookingStatus.PENDING,
        flightInfo: null,
        hotelInfo: null,
        insuranceInfo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        events: [],
      };

      (prisma.booking.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.booking.create as jest.Mock).mockResolvedValue(mockBooking);

      await service.create({ ...createDto, createdBy: 'user456' });

      expect(prisma.booking.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          flightInfo: expect.anything(), // Should be Prisma.DbNull
          hotelInfo: expect.anything(),
          insuranceInfo: expect.anything(),
        }),
        include: { events: true },
      });
    });
  });

  describe('update', () => {
    it('should update booking with partial data', async () => {
      const updateData = {
        customerName: '홍길동(수정)',
        totalPrice: 1500000,
        flightInfo: { airline: 'OZ', flightNo: '5678' },
      };

      const mockUpdatedBooking = {
        id: '123',
        bookingNumber: 'BK25030100001',
        customerName: '홍길동(수정)',
        totalPrice: 1500000,
        flightInfo: { airline: 'OZ', flightNo: '5678' },
        updatedAt: new Date(),
        events: [],
      };

      (prisma.booking.update as jest.Mock).mockResolvedValue(mockUpdatedBooking);

      const result = await service.update('123', { ...updateData, updatedBy: 'user123' });

      expect(prisma.booking.update).toHaveBeenCalledWith({
        where: { id: '123' },
        data: expect.objectContaining({
          customerName: '홍길동(수정)',
          flightInfo: { airline: 'OZ', flightNo: '5678' },
          updatedBy: 'user123',
        }),
        include: { events: true },
      });

      expect(result).toEqual(mockUpdatedBooking);
    });

    it('should handle null JSON fields in update', async () => {
      const updateData: Partial<CreateBookingDto> = {
        flightInfo: undefined,
        hotelInfo: undefined, // Should not be included in update
      };

      (prisma.booking.update as jest.Mock).mockResolvedValue({
        id: '123',
        flightInfo: null,
        hotelInfo: { name: '기존호텔' }, // Unchanged
      });

      await service.update('123', { ...updateData, updatedBy: 'user123' });

      expect(prisma.booking.update).toHaveBeenCalledWith({
        where: { id: '123' },
        data: expect.objectContaining({
          flightInfo: expect.anything(), // Should be Prisma.DbNull
          updatedBy: 'user123',
        }),
        include: { events: true },
      });

      // hotelInfo should not be in the update data
      const callArgs = (prisma.booking.update as jest.Mock).mock.calls[0][0];
      expect(callArgs.data).not.toHaveProperty('hotelInfo');
    });
  });

  describe('generateBookingNumber', () => {
    it('should generate unique booking numbers', async () => {
      // First booking of the day
      (prisma.booking.findFirst as jest.Mock).mockResolvedValue(null);
      
      await service.create({
        customerName: '테스트1',
        teamName: 'A팀',
        bookingType: BookingType.PACKAGE,
        destination: '서울',
        startDate: '2025-03-01T00:00:00Z',
        endDate: '2025-03-02T00:00:00Z',
        paxCount: 1,
        nights: 1,
        days: 2,
        totalPrice: 100000,
        currency: 'KRW',
        createdBy: 'test',
      });

      const createCall = (prisma.booking.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.bookingNumber).toMatch(/^BK\d{10}$/);
      expect(createCall.data.bookingNumber).toMatch(/0001$/);
    });
  });
});