import { teamBookingService, __setTeamBookingServiceModeForTests } from '../teamBookingService';
import { apiClient } from '../../lib/apiClient';
import type { 
  TeamBooking, 
  CreateTeamBookingPayload,
  UpdateTeamBookingPayload,
  TeamBookingListResponse,
  TeamBookingDetailResponse,
  Participant,
  Cost,
  Payment,
  Manager,
  Transportation,
  Hotel
} from '../../types/team-booking';

jest.mock('../../lib/apiClient', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('teamBookingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __setTeamBookingServiceModeForTests(null);
  });

  afterEach(() => {
    __setTeamBookingServiceModeForTests(null);
  });

  const mockTeamBooking: TeamBooking = {
    id: 'tb-123',
    bookingNumber: 'BK-2024-001',
    teamCode: 'TEAM-001',
    tourName: 'Korea Heritage Tour',
    destination: 'Seoul, Busan, Jeju',
    tourType: 'package',
    departureDate: '2024-03-01',
    returnDate: '2024-03-07',
    nights: 6,
    days: 7,
    transportation: {
      outbound: {
        flights: [{
          flightNumber: 'KE123',
          airline: 'Korean Air',
          departureAirport: 'ICN',
          arrivalAirport: 'GMP',
          departureTime: '2024-03-01T09:00:00Z',
          arrivalTime: '2024-03-01T10:00:00Z',
          class: 'economy'
        }]
      },
      inbound: {
        flights: [{
          flightNumber: 'KE456',
          airline: 'Korean Air',
          departureAirport: 'GMP',
          arrivalAirport: 'ICN',
          departureTime: '2024-03-07T18:00:00Z',
          arrivalTime: '2024-03-07T19:00:00Z',
          class: 'economy'
        }]
      }
    },
    accommodations: [{
      hotelName: 'Seoul Grand Hotel',
      hotelAddress: '123 Gangnam-gu, Seoul',
      checkInDate: '2024-03-01',
      checkOutDate: '2024-03-07',
      roomAllocations: [{
        roomType: 'double',
        guestNames: ['김철수', '이영희'],
        checkInDate: '2024-03-01',
        checkOutDate: '2024-03-07'
      }],
      mealPlan: 'breakfast',
      totalRooms: 10
    }],
    participants: [],
    adultCount: 18,
    childCount: 2,
    infantCount: 0,
    totalCount: 20,
    costs: [],
    pricing: {
      adultPrice: 2500000,
      childPrice: 1800000,
      infantPrice: 0,
      currency: 'KRW'
    },
    settlement: {
      totalRevenue: 48600000,
      totalCost: 35000000,
      profit: 13600000,
      profitMargin: 28,
      payments: [],
      outstandingBalance: 48600000
    },
    customer: {
      organizationName: 'ABC Company',
      organizationType: 'company',
      contacts: [{
        name: '김대표',
        phone: '010-1234-5678',
        email: 'kim@abc.com',
        relationship: 'primary'
      }]
    },
    managers: [{
      id: 'manager-1',
      name: '박매니저',
      role: 'main',
      phone: '010-9876-5432',
      email: 'park@entrip.com'
    }],
    mainManagerId: 'manager-1',
    status: 'confirmed',
    createdAt: '2024-01-01T00:00:00Z',
    createdBy: 'user-1',
    updatedAt: '2024-01-15T00:00:00Z',
    updatedBy: 'user-1'
  };

  describe('createTeamBooking', () => {
    it('should create a new team booking', async () => {
      const payload: CreateTeamBookingPayload = {
        teamCode: 'TEAM-002',
        tourName: 'Jeju Island Tour',
        destination: 'Jeju',
        tourType: 'package',
        departureDate: '2024-04-01',
        returnDate: '2024-04-05',
        customer: {
          organizationName: 'XYZ School',
          organizationType: 'school',
          contacts: [{
            name: '최선생',
            phone: '010-5555-6666',
            relationship: 'primary'
          }]
        },
        mainManagerId: 'manager-2',
        memo: 'School trip for grade 12'
      };

      (apiClient.post as jest.Mock).mockResolvedValue({ data: mockTeamBooking });

      const result = await teamBookingService.createTeamBooking(payload);

      expect(apiClient.post).toHaveBeenCalledWith('/team-bookings', payload);
      expect(result).toEqual(mockTeamBooking);
    });
  });

  describe('getTeamBookings', () => {
    it('should fetch team bookings list', async () => {
      const mockResponse: TeamBookingListResponse = {
        bookings: [mockTeamBooking],
        total: 1,
        page: 1,
        pageSize: 20
      };

      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockResponse });

      const result = await teamBookingService.getTeamBookings();

      expect(apiClient.get).toHaveBeenCalledWith('/team-bookings', { params: undefined });
      expect(result).toEqual(mockResponse);
    });

    it('should pass filter parameters', async () => {
      const filters = {
        status: ['confirmed'] as TeamBooking['status'][],
        startDate: '2024-03-01',
        endDate: '2024-03-31',
        page: 2,
        pageSize: 50,
        sortBy: 'departureDate' as const,
        sortOrder: 'asc' as const
      };

      const mockResponse: TeamBookingListResponse = {
        bookings: [],
        total: 0,
        page: 2,
        pageSize: 50
      };

      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockResponse });

      await teamBookingService.getTeamBookings(filters);

      expect(apiClient.get).toHaveBeenCalledWith('/team-bookings', { params: filters });
    });
  });

  describe('getTeamBookingDetail', () => {
    it('should fetch single team booking detail', async () => {
      const mockResponse: TeamBookingDetailResponse = {
        booking: mockTeamBooking,
        history: []
      };

      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockResponse });

      const result = await teamBookingService.getTeamBookingDetail('tb-123');

      expect(apiClient.get).toHaveBeenCalledWith('/team-bookings/tb-123');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('updateTeamBooking', () => {
    it('should update team booking details', async () => {
      const updates: UpdateTeamBookingPayload = {
        status: 'completed',
        memo: 'Tour completed successfully',
        customer: {
          notes: 'Excellent group'
        }
      };

      const updatedBooking = { ...mockTeamBooking, ...updates };
      (apiClient.patch as jest.Mock).mockResolvedValue({ data: updatedBooking });

      const result = await teamBookingService.updateTeamBooking('tb-123', updates);

      expect(apiClient.patch).toHaveBeenCalledWith('/team-bookings/tb-123', updates);
      expect(result).toEqual(updatedBooking);
    });
  });

  describe('deleteTeamBooking', () => {
    it('should delete a team booking', async () => {
      (apiClient.delete as jest.Mock).mockResolvedValue(undefined);

      await teamBookingService.deleteTeamBooking('tb-123');

      expect(apiClient.delete).toHaveBeenCalledWith('/team-bookings/tb-123');
    });
  });

  describe('Transportation Management', () => {
    it('should update transportation details', async () => {
      const transportation: Transportation = {
        outbound: {
          flights: [{
            flightNumber: 'OZ789',
            airline: 'Asiana',
            departureAirport: 'ICN',
            arrivalAirport: 'CJU',
            departureTime: '2024-04-01T08:00:00Z',
            arrivalTime: '2024-04-01T09:30:00Z',
            class: 'economy'
          }]
        },
        inbound: {
          flights: [{
            flightNumber: 'OZ790',
            airline: 'Asiana',
            departureAirport: 'CJU',
            arrivalAirport: 'ICN',
            departureTime: '2024-04-05T20:00:00Z',
            arrivalTime: '2024-04-05T21:30:00Z',
            class: 'economy'
          }]
        }
      };

      (apiClient.put as jest.Mock).mockResolvedValue({ data: mockTeamBooking });

      const result = await teamBookingService.updateTransportation('tb-123', transportation);

      expect(apiClient.put).toHaveBeenCalledWith(
        '/team-bookings/tb-123/transportation',
        transportation
      );
      expect(result).toEqual(mockTeamBooking);
    });
  });

  describe('Accommodation Management', () => {
    it('should update accommodations', async () => {
      const accommodations: Hotel[] = [{
        hotelName: 'Jeju Paradise Hotel',
        hotelAddress: '456 Seogwipo, Jeju',
        checkInDate: '2024-04-01',
        checkOutDate: '2024-04-05',
        roomAllocations: [{
          roomType: 'twin',
          guestNames: ['박학생', '최학생'],
          checkInDate: '2024-04-01',
          checkOutDate: '2024-04-05'
        }],
        mealPlan: 'half_board',
        totalRooms: 15,
        confirmationNumber: 'CONF123456'
      }];

      (apiClient.put as jest.Mock).mockResolvedValue({ data: mockTeamBooking });

      const result = await teamBookingService.updateAccommodations('tb-123', accommodations);

      expect(apiClient.put).toHaveBeenCalledWith(
        '/team-bookings/tb-123/accommodations',
        { accommodations }
      );
      expect(result).toEqual(mockTeamBooking);
    });
  });

  describe('Participant Management', () => {
    const mockParticipant: Participant = {
      id: 'participant-1',
      name: '홍길동',
      nameEng: 'Hong Gildong',
      gender: 'male',
      birthDate: '1990-01-01',
      phone: '010-2222-3333',
      email: 'hong@example.com',
      roomAssignment: 'Room 201',
      dietaryRestrictions: '해산물 알레르기',
      emergencyContact: {
        name: '홍부모',
        phone: '010-3333-4444',
        relationship: '부모'
      }
    };

    it('should add participants to team booking', async () => {
      const participants = [mockParticipant];
      const updatedBooking = {
        ...mockTeamBooking,
        participants
      };

      (apiClient.post as jest.Mock).mockResolvedValue({ data: updatedBooking });

      const result = await teamBookingService.addParticipants('tb-123', participants);

      expect(apiClient.post).toHaveBeenCalledWith(
        '/team-bookings/tb-123/participants',
        { participants }
      );
      expect(result).toEqual(updatedBooking);
    });

    it('should update participant information', async () => {
      const updates = { dietaryRestrictions: '해산물 알레르기, 땅콩 알레르기' };

      (apiClient.patch as jest.Mock).mockResolvedValue({ data: mockTeamBooking });

      const result = await teamBookingService.updateParticipant('tb-123', 'participant-1', updates);

      expect(apiClient.patch).toHaveBeenCalledWith(
        '/team-bookings/tb-123/participants/participant-1',
        updates
      );
      expect(result).toEqual(mockTeamBooking);
    });

    it('should remove participant from team booking', async () => {
      (apiClient.delete as jest.Mock).mockResolvedValue({ data: mockTeamBooking });

      const result = await teamBookingService.removeParticipant('tb-123', 'participant-1');

      expect(apiClient.delete).toHaveBeenCalledWith(
        '/team-bookings/tb-123/participants/participant-1'
      );
      expect(result).toEqual(mockTeamBooking);
    });
  });

  describe('Financial Management', () => {
    it('should update costs', async () => {
      const costs: Cost[] = [{
        category: 'transportation',
        description: '전세버스 대여',
        amount: 1500000,
        currency: 'KRW',
        quantity: 2,
        total: 3000000,
        notes: '45인승 우등버스'
      }];

      (apiClient.put as jest.Mock).mockResolvedValue({ data: mockTeamBooking });

      const result = await teamBookingService.updateCosts('tb-123', costs);

      expect(apiClient.put).toHaveBeenCalledWith(
        '/team-bookings/tb-123/costs',
        { costs }
      );
      expect(result).toEqual(mockTeamBooking);
    });

    it('should add payment', async () => {
      const payment: Omit<Payment, 'id'> = {
        date: '2024-02-15',
        amount: 10000000,
        currency: 'KRW',
        method: 'transfer',
        payer: 'ABC Company',
        receiver: 'Entrip Travel',
        purpose: 'deposit',
        notes: '계약금 입금'
      };

      (apiClient.post as jest.Mock).mockResolvedValue({ data: mockTeamBooking });

      const result = await teamBookingService.addPayment('tb-123', payment);

      expect(apiClient.post).toHaveBeenCalledWith(
        '/team-bookings/tb-123/payments',
        payment
      );
      expect(result).toEqual(mockTeamBooking);
    });
  });

  describe('Manager Assignment', () => {
    it('should assign managers', async () => {
      const managers: Manager[] = [{
        id: 'manager-2',
        name: '김가이드',
        role: 'guide',
        phone: '010-7777-8888',
        email: 'kim@entrip.com',
        assignedTasks: ['공항 픽업', '호텔 체크인 지원']
      }];

      (apiClient.put as jest.Mock).mockResolvedValue({ data: mockTeamBooking });

      const result = await teamBookingService.assignManagers('tb-123', managers);

      expect(apiClient.put).toHaveBeenCalledWith(
        '/team-bookings/tb-123/managers',
        { managers }
      );
      expect(result).toEqual(mockTeamBooking);
    });
  });

  describe('Status Management', () => {
    it('should update booking status', async () => {
      const status: TeamBooking['status'] = 'in_progress';
      const updatedBooking = { ...mockTeamBooking, status };

      (apiClient.patch as jest.Mock).mockResolvedValue({ data: updatedBooking });

      const result = await teamBookingService.updateStatus('tb-123', status);

      expect(apiClient.patch).toHaveBeenCalledWith(
        '/team-bookings/tb-123/status',
        { status, reason: undefined }
      );
      expect(result.status).toBe(status);
    });

    it('should update status with cancellation reason', async () => {
      const status: TeamBooking['status'] = 'cancelled';
      const reason = '고객 요청';
      const updatedBooking = { 
        ...mockTeamBooking, 
        status,
        cancellationReason: reason
      };

      (apiClient.patch as jest.Mock).mockResolvedValue({ data: updatedBooking });

      const result = await teamBookingService.updateStatus('tb-123', status, reason);

      expect(apiClient.patch).toHaveBeenCalledWith(
        '/team-bookings/tb-123/status',
        { status, reason }
      );
      expect(result.status).toBe(status);
    });
  });

  describe('File Attachment Management', () => {
    it('should upload attachment', async () => {
      const file = new File(['contract content'], 'contract.pdf', { type: 'application/pdf' });
      const category = 'contract';

      (apiClient.post as jest.Mock).mockResolvedValue({ data: mockTeamBooking });

      const result = await teamBookingService.uploadAttachment('tb-123', file, category);

      const expectedFormData = new FormData();
      expectedFormData.append('file', file);
      expectedFormData.append('category', category);

      expect(apiClient.post).toHaveBeenCalledWith(
        '/team-bookings/tb-123/attachments',
        expectedFormData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      expect(result).toEqual(mockTeamBooking);
    });

    it('should delete attachment', async () => {
      (apiClient.delete as jest.Mock).mockResolvedValue({ data: mockTeamBooking });

      const result = await teamBookingService.deleteAttachment('tb-123', 'attachment-1');

      expect(apiClient.delete).toHaveBeenCalledWith(
        '/team-bookings/tb-123/attachments/attachment-1'
      );
      expect(result).toEqual(mockTeamBooking);
    });
  });

  describe('Statistics', () => {
    it('should get booking statistics', async () => {
      const mockStats = {
        totalBookings: 150,
        totalRevenue: 3500000000,
        totalParticipants: 2800,
        byStatus: {
          confirmed: 80,
          in_progress: 30,
          completed: 35,
          cancelled: 5
        },
        byDestination: {
          'Seoul': 45,
          'Jeju': 60,
          'Busan': 45
        },
        byMonth: [
          { month: '2024-01', count: 25, revenue: 580000000 },
          { month: '2024-02', count: 28, revenue: 650000000 }
        ]
      };

      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockStats });

      const result = await teamBookingService.getBookingStatistics({
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      });

      expect(apiClient.get).toHaveBeenCalledWith('/team-bookings/statistics', {
        params: {
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        }
      });
      expect(result).toEqual(mockStats);
    });
  });

  describe('v2 mode interoperability', () => {
    beforeEach(() => {
      __setTeamBookingServiceModeForTests('v2');
    });

    afterEach(() => {
      __setTeamBookingServiceModeForTests(null);
    });

    it('routes create requests to v2 endpoint', async () => {
      const payload = {
        teamCode: 'TEAM-001',
        tourName: 'Heritage Tour',
      } as unknown as CreateTeamBookingPayload;

      (apiClient.post as jest.Mock).mockResolvedValue({ data: mockTeamBooking });

      await teamBookingService.createTeamBooking(payload);

      expect(apiClient.post).toHaveBeenCalledWith('/v2/team-bookings', payload);
    });

    it('routes detail requests to v2 endpoint', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockTeamBooking });

      await teamBookingService.getTeamBookingDetail('tb-123');

      expect(apiClient.get).toHaveBeenCalledWith('/v2/team-bookings/tb-123');
    });

    it('normalizes v2 list payloads to the shared DTO shape', async () => {
      const v2Payload = {
        id: 'uuid-1',
        bookingNumber: 'TB-100',
        code: 'TEAM-100',
        team: { code: 'TEAM-100' },
        programName: 'V2 Heritage Program',
        destinationCity: 'Osaka',
        startDate: '2025-02-01T00:00:00Z',
        endDate: '2025-02-05T00:00:00Z',
        status: 'IN_PROGRESS',
        participantCounts: { adults: 10, children: 2, infants: 1, total: 13 },
        transportation: {
          outbound: {
            flights: [{
              number: 'JL123',
              carrier: 'JAL',
              departure: { airport: 'ICN', time: '2025-02-01T09:00:00+09:00' },
              arrival: { airport: 'KIX', time: '2025-02-01T11:30:00+09:00' },
              cabin: 'business',
              seats: ['12A', '12B']
            }]
          },
          inbound: {
            flights: [{
              number: 'JL456',
              carrier: 'JAL',
              departure: { airport: 'KIX', time: '2025-02-05T18:00:00+09:00' },
              arrival: { airport: 'ICN', time: '2025-02-05T20:30:00+09:00' },
              cabin: 'economy'
            }]
          }
        },
        accommodations: [
          {
            name: 'Osaka Bay Hotel',
            address: '1-1 Naniwa, Osaka',
            startDate: '2025-02-01',
            endDate: '2025-02-05',
            rooms: [
              {
                roomType: 'twin',
                guestNames: ['홍길동', '이영희'],
                checkInDate: '2025-02-01',
                checkOutDate: '2025-02-05'
              }
            ],
            plan: 'full_board',
            roomCount: 5,
            phone: '010-1234-5678',
            confirmation: 'CONF-1'
          }
        ],
        costs: [
          {
            type: 'transportation',
            description: '전세버스',
            amount: '120000',
            currency: 'KRW',
            quantity: 1,
            total: '120000'
          }
        ],
        pricing: {
          adultPrice: '200000',
          childPrice: '150000',
          infantPrice: 0,
          currency: 'usd'
        },
        settlement: {
          totalRevenue: '1200000',
          totalCost: '800000',
          profit: '400000',
          profitMargin: '33',
          payments: [
            {
              paymentId: 'pay-1',
              paidAt: '2025-01-10',
              amount: '400000',
              currency: 'KRW',
              method: 'transfer',
              from: 'Foo Corp',
              to: 'Entrip',
              purpose: 'deposit'
            }
          ],
          outstandingBalance: '800000'
        },
        customer: {
          organizationName: 'Foo Corp',
          type: 'company',
          contacts: [
            {
              name: 'Kim',
              phone: '010-0000-0000',
              relationship: 'primary',
              email: 'kim@example.com'
            }
          ]
        },
        coordinators: [
          {
            id: 'mgr-1',
            fullName: 'Lee Manager',
            role: 'guide',
            phone: '010-2222-3333'
          }
        ],
        attachments: [
          {
            attachmentId: 'att-1',
            filename: 'plan.pdf',
            mimeType: 'application/pdf',
            size: 2048,
            timestamp: '2025-01-05T00:00:00Z',
            category: 'ITINERARY'
          }
        ],
        createdAt: '2025-01-01T00:00:00Z',
        createdBy: 'user-42'
      };

      (apiClient.get as jest.Mock).mockResolvedValue({
        data: {
          data: [v2Payload],
          total: 1,
          page: 1,
          limit: 15
        }
      });

      const result = await teamBookingService.getTeamBookings();
      const booking = result.bookings[0];

      expect(booking.teamCode).toBe('TEAM-100');
      expect(booking.tourName).toBe('V2 Heritage Program');
      expect(booking.transportation.outbound.flights[0]).toMatchObject({
        flightNumber: 'JL123',
        airline: 'JAL',
        departureAirport: 'ICN',
        arrivalAirport: 'KIX',
        class: 'business'
      });
      expect(booking.accommodations[0].hotelName).toBe('Osaka Bay Hotel');
      expect(booking.pricing.currency).toBe('USD');
      expect(booking.managers[0].role).toBe('guide');
      expect(booking.attachments?.[0].category).toBe('itinerary');
      expect(result.total).toBe(1);
    });

    it('normalizes v2 detail payload history entries', async () => {
      const v2Payload = {
        id: 'uuid-2',
        bookingNumber: 'TB-200',
        code: 'TEAM-200',
        programName: 'Pacific Tour',
        destinationCity: 'Fukuoka',
        startDate: '2025-03-10T00:00:00Z',
        endDate: '2025-03-15T00:00:00Z',
        status: 'CONFIRMED',
        transportation: {},
        accommodations: [],
        participants: [],
        pricing: { adultPrice: 0, childPrice: 0, infantPrice: 0, currency: 'KRW' },
        settlement: {},
        customer: {
          organizationName: 'Bar Inc',
          type: 'company',
          contacts: [{ name: 'Park', phone: '010-3333-3333', relationship: 'primary' }]
        },
        managers: []
      };

      (apiClient.get as jest.Mock).mockResolvedValue({
        data: {
          booking: v2Payload,
          history: [
            {
              eventId: 'hist-1',
              type: 'STATUS-CHANGED',
              message: 'Status updated',
              user: 'tester',
              timestamp: '2025-03-01T12:00:00Z',
              changes: { status: ['draft', 'confirmed'] }
            }
          ]
        }
      });

      const result = await teamBookingService.getTeamBookingDetail('uuid-2');

      expect(result.booking.status).toBe('confirmed');
      expect(result.history?.[0]).toMatchObject({
        id: 'hist-1',
        action: 'status_changed',
        description: 'Status updated',
        changedBy: 'tester'
      });
    });
  });
});
