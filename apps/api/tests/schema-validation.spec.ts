import { describe, it, expect } from '@jest/globals';
import { 
  BookingCreateSchema,
  BookingUpdateSchema,
  BookingListSchema,
  Booking,
  BookingListItem,
  BookingResponse,
  BookingListResponse,
  CurrencyEnum,
  BookingStatusSchema
} from '../src/schemas/booking.schema';

import {
  ErrorResponse,
  StatusSchema,
  IfMatchHeader,
  IfNoneMatchHeader,
  CursorQuery,
  PaginationQuery,
  ValidationPatterns
} from '../src/schemas/common.schema';

describe('Schema Validation', () => {
  describe('Common Schemas', () => {
    describe('StatusSchema', () => {
      it('should accept valid status values', () => {
        const validStatuses = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REFUNDED'];
        
        validStatuses.forEach(status => {
          expect(() => StatusSchema.parse(status)).not.toThrow();
        });
      });

      it('should reject invalid status values', () => {
        const invalidStatuses = ['INVALID', 'pending', '', null, undefined];
        
        invalidStatuses.forEach(status => {
          expect(() => StatusSchema.parse(status)).toThrow();
        });
      });
    });

    describe('ErrorResponse', () => {
      it('should accept valid error response', () => {
        const validError = {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: [{ field: 'name', message: 'Required', code: 'required' }],
            traceId: 'trace-123'
          }
        };

        expect(() => ErrorResponse.parse(validError)).not.toThrow();
      });

      it('should accept error with null details', () => {
        const validError = {
          error: {
            code: 'NOT_FOUND',
            message: 'Resource not found',
            details: null,
            traceId: null
          }
        };

        expect(() => ErrorResponse.parse(validError)).not.toThrow();
      });

      it('should reject invalid error response', () => {
        const invalidError = {
          error: {
            message: 'Missing code field'
            // code field is required
          }
        };

        expect(() => ErrorResponse.parse(invalidError)).toThrow();
      });
    });

    describe('Header Schemas', () => {
      it('should accept valid If-Match header', () => {
        const validHeaders = [
          { 'if-match': '"123"' },
          {},
          { 'if-match': '"etag-value"', 'other-header': 'value' }
        ];

        validHeaders.forEach(headers => {
          expect(() => IfMatchHeader.parse(headers)).not.toThrow();
        });
      });

      it('should accept valid If-None-Match header', () => {
        const validHeaders = [
          { 'if-none-match': '"123"' },
          {},
          { 'if-none-match': '"etag-value"', 'other-header': 'value' }
        ];

        validHeaders.forEach(headers => {
          expect(() => IfNoneMatchHeader.parse(headers)).not.toThrow();
        });
      });
    });

    describe('Pagination Schemas', () => {
      it('should accept valid cursor query', () => {
        const validQueries = [
          {},
          { limit: 10 },
          { cursor: 'cursor123', limit: 50 },
          { sort: 'createdAt:desc,status:asc' }
        ];

        validQueries.forEach(query => {
          expect(() => CursorQuery.parse(query)).not.toThrow();
        });
      });

      it('should apply defaults for cursor query', () => {
        const result = CursorQuery.parse({});
        expect(result.limit).toBe(20);
      });

      it('should reject invalid cursor query', () => {
        const invalidQueries = [
          { limit: 0 },
          { limit: 101 },
          { sort: 'invalid;sort' }
        ];

        invalidQueries.forEach(query => {
          expect(() => CursorQuery.parse(query)).toThrow();
        });
      });
    });

    describe('ValidationPatterns', () => {
      it('should validate Korean phone numbers correctly', () => {
        const validPhones = ['010-1234-5678', '01012345678', '011-123-4567'];
        const invalidPhones = ['123-456-7890', '010-12-345', '+82-10-1234-5678'];

        validPhones.forEach(phone => {
          expect(ValidationPatterns.phoneRegex.test(phone)).toBe(true);
        });

        invalidPhones.forEach(phone => {
          expect(ValidationPatterns.phoneRegex.test(phone)).toBe(false);
        });
      });

      it('should validate amounts correctly', () => {
        const validAmounts = ['100', '100.50', '0.99', '1000000.00'];
        const invalidAmounts = ['100.', '.50', '100.123', 'abc'];

        validAmounts.forEach(amount => {
          expect(ValidationPatterns.amountRegex.test(amount)).toBe(true);
        });

        invalidAmounts.forEach(amount => {
          expect(ValidationPatterns.amountRegex.test(amount)).toBe(false);
        });
      });

      it('should validate airport codes correctly', () => {
        const validCodes = ['ICN', 'JFK', 'LAX'];
        const invalidCodes = ['icn', 'ICNN', 'IC', '123'];

        validCodes.forEach(code => {
          expect(ValidationPatterns.airportCodeRegex.test(code)).toBe(true);
        });

        invalidCodes.forEach(code => {
          expect(ValidationPatterns.airportCodeRegex.test(code)).toBe(false);
        });
      });
    });
  });

  describe('Booking Schemas', () => {
    describe('CurrencyEnum', () => {
      it('should accept valid currencies', () => {
        const validCurrencies = ['KRW', 'USD', 'EUR', 'JPY', 'CNY', 'GBP'];
        
        validCurrencies.forEach(currency => {
          expect(() => CurrencyEnum.parse(currency)).not.toThrow();
        });
      });

      it('should reject invalid currencies', () => {
        const invalidCurrencies = ['krw', 'INVALID', '', null];
        
        invalidCurrencies.forEach(currency => {
          expect(() => CurrencyEnum.parse(currency)).toThrow();
        });
      });
    });

    describe('BookingCreateSchema', () => {
      const validBookingData = {
        code: 'BK-2025-001',
        customerName: '홍길동',
        customerPhone: '010-1234-5678',
        customerEmail: 'hong@example.com',
        itineraryFrom: 'ICN',
        itineraryTo: 'JFK',
        departAt: '2025-03-01T10:00:00.000Z',
        arriveAt: '2025-03-01T22:00:00.000Z',
        currency: 'KRW' as const,
        amount: '1500000.00',
        managerId: '550e8400-e29b-41d4-a716-446655440001',
        companyCode: 'ENTRIP_MAIN',
        notes: 'Business trip',
        metadata: { source: 'web' }
      };

      it('should accept valid booking creation data', () => {
        expect(() => BookingCreateSchema.body.parse(validBookingData)).not.toThrow();
      });

      it('should accept minimal required fields', () => {
        const minimalData = {
          code: 'BK-001',
          customerName: '고객',
          customerPhone: '010-1234-5678',
          itineraryFrom: 'ICN',
          itineraryTo: 'JFK',
          departAt: '2025-03-01T10:00:00.000Z',
          arriveAt: '2025-03-01T22:00:00.000Z',
          amount: '100000.00'
        };

        expect(() => BookingCreateSchema.body.parse(minimalData)).not.toThrow();
      });

      it('should apply currency default', () => {
        const data = {
          ...validBookingData,
          currency: undefined
        };
        delete data.currency;

        const result = BookingCreateSchema.body.parse(data);
        expect(result.currency).toBe('KRW');
      });

      it('should reject invalid booking data', () => {
        const invalidCases = [
          { ...validBookingData, code: 'ab' }, // too short
          { ...validBookingData, customerName: '' }, // empty name
          { ...validBookingData, customerPhone: '123-456-7890' }, // invalid phone
          { ...validBookingData, customerEmail: 'invalid-email' }, // invalid email
          { ...validBookingData, itineraryFrom: 'IC' }, // invalid airport code
          { ...validBookingData, itineraryTo: 'JFKK' }, // invalid airport code
          { ...validBookingData, departAt: 'invalid-date' }, // invalid datetime
          { ...validBookingData, amount: 'not-a-number' }, // invalid amount
          { ...validBookingData, managerId: 'not-uuid' }, // invalid UUID
        ];

        invalidCases.forEach((data, index) => {
          expect(() => BookingCreateSchema.body.parse(data)).toThrow(`Case ${index} should fail`);
        });
      });

      it('should enforce business rules', () => {
        // Same departure and arrival
        const sameAirports = {
          ...validBookingData,
          itineraryFrom: 'ICN',
          itineraryTo: 'ICN'
        };
        expect(() => BookingCreateSchema.body.parse(sameAirports)).toThrow();

        // Departure after arrival
        const invalidTimes = {
          ...validBookingData,
          departAt: '2025-03-01T22:00:00.000Z',
          arriveAt: '2025-03-01T10:00:00.000Z'
        };
        expect(() => BookingCreateSchema.body.parse(invalidTimes)).toThrow();
      });
    });

    describe('BookingUpdateSchema', () => {
      it('should accept partial update data', () => {
        const updateData = {
          customerName: '새 이름',
          status: 'CONFIRMED' as const,
          notes: '업데이트된 노트'
        };

        expect(() => BookingUpdateSchema.body.parse(updateData)).not.toThrow();
      });

      it('should accept empty update (all fields optional)', () => {
        expect(() => BookingUpdateSchema.body.parse({})).not.toThrow();
      });

      it('should validate individual fields when provided', () => {
        const invalidUpdate = {
          customerPhone: 'invalid-phone',
          customerEmail: 'invalid-email'
        };

        expect(() => BookingUpdateSchema.body.parse(invalidUpdate)).toThrow();
      });
    });

    describe('BookingListSchema', () => {
      it('should accept valid query parameters', () => {
        const validQuery = {
          limit: 50,
          offset: 0,
          cursor: 'cursor123',
          sort: 'createdAt',
          order: 'desc' as const,
          status: 'CONFIRMED' as const,
          companyCode: 'ENTRIP',
          fromDate: '2025-01-01T00:00:00.000Z',
          toDate: '2025-12-31T23:59:59.999Z',
          search: 'search term'
        };

        expect(() => BookingListSchema.query.parse(validQuery)).not.toThrow();
      });

      it('should apply defaults', () => {
        const result = BookingListSchema.query.parse({});
        expect(result.limit).toBe(20);
        expect(result.offset).toBe(0);
        expect(result.sort).toBe('createdAt');
        expect(result.order).toBe('desc');
      });

      it('should enforce limits', () => {
        const invalidQueries = [
          { limit: 0 },
          { limit: 101 },
          { offset: -1 }
        ];

        invalidQueries.forEach(query => {
          expect(() => BookingListSchema.query.parse(query)).toThrow();
        });
      });
    });

    describe('Booking Response Schemas', () => {
      const sampleBooking = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        code: 'BK-2025-001',
        amount: '1500000.00',
        currency: 'KRW' as const,
        status: 'CONFIRMED' as const,
        customerName: '홍길동',
        customerPhone: '010-1234-5678',
        customerEmail: 'hong@example.com',
        itineraryFrom: 'ICN',
        itineraryTo: 'JFK',
        departAt: '2025-03-01T10:00:00.000Z',
        arriveAt: '2025-03-01T22:00:00.000Z',
        managerId: null,
        companyCode: 'ENTRIP_MAIN',
        notes: null,
        version: 1,
        createdAt: '2025-01-28T10:00:00.000Z',
        updatedAt: '2025-01-28T10:00:00.000Z'
      };

      it('should validate complete Booking schema', () => {
        expect(() => Booking.parse(sampleBooking)).not.toThrow();
      });

      it('should validate BookingListItem schema', () => {
        expect(() => BookingListItem.parse(sampleBooking)).not.toThrow();
      });

      it('should validate BookingResponse schema', () => {
        const response = { data: sampleBooking };
        expect(() => BookingResponse.parse(response)).not.toThrow();
      });

      it('should validate BookingListResponse schema', () => {
        const listResponse = {
          data: [sampleBooking],
          meta: {
            nextCursor: 'cursor123',
            previousCursor: null,
            limit: 20,
            total: 1,
            page: 1,
            totalPages: 1
          }
        };

        expect(() => BookingListResponse.parse(listResponse)).not.toThrow();
      });

      it('should validate BookingListResponse without meta', () => {
        const listResponse = {
          data: [sampleBooking]
        };

        expect(() => BookingListResponse.parse(listResponse)).not.toThrow();
      });

      it('should reject invalid booking data', () => {
        const invalidBooking = {
          ...sampleBooking,
          id: 'not-a-uuid',
          currency: 'INVALID',
          status: 'INVALID_STATUS'
        };

        expect(() => Booking.parse(invalidBooking)).toThrow();
      });
    });
  });
});