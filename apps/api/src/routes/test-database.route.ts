import { Router, Request } from 'express';
import { respond, respondCreated, createResponse } from '../middleware/respond';
import { BookingResponse, BookingCreateResponse } from '../schemas/booking.schema';
import { respondWithETag } from '../middleware/respond';
import { z } from 'zod';
import { ApiError, ErrorCode } from '../middleware/api-error';

const router = Router();

// In-memory test database for Phase 2A testing
let testBookings: any[] = [];
let nextId = 1;

// Mock booking creation for 201 + ETag testing
router.post('/bookings', 
  respondCreated(
    BookingCreateResponse,
    async (req: Request) => {
      const booking = {
        id: `test-${nextId++}`,
        code: req.body.code || `BK-${Date.now()}`,
        amount: req.body.amount || "100.00",
        currency: req.body.currency || "KRW",
        status: req.body.status || "PENDING",
        customerName: req.body.customerName || "Test Customer",
        customerPhone: req.body.customerPhone || "010-1234-5678",
        customerEmail: req.body.customerEmail,
        itineraryFrom: req.body.itineraryFrom || "ICN",
        itineraryTo: req.body.itineraryTo || "NRT", 
        departAt: req.body.departAt || new Date().toISOString(),
        arriveAt: req.body.arriveAt || new Date(Date.now() + 3600000).toISOString(),
        managerId: null,
        companyCode: req.body.companyCode || "ENTRIP_MAIN",
        notes: req.body.notes,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      testBookings.push(booking);
      return createResponse(booking);
    },
    (result) => result.data.version
  )
);

// Mock booking retrieval for ETag testing
router.get('/bookings/:id',
  respond(
    BookingResponse,
    async (req: Request) => {
      const booking = testBookings.find(b => b.id === req.params.id);
      if (!booking) {
        throw ApiError.notFound('Booking');
      }
      return createResponse(booking);
    },
    (result) => result.data.version
  )
);

// Mock booking update for 412/428 testing
router.patch('/bookings/:id',
  respondWithETag(
    BookingResponse,
    async (req: Request) => {
      // Check If-Match header for optimistic locking
      const ifMatch = req.headers['if-match'];
      if (!ifMatch) {
        throw new ApiError(
          ErrorCode.PRECONDITION_REQUIRED,
          'If-Match header is required for updates'
        );
      }
      
      const booking = testBookings.find(b => b.id === req.params.id);
      if (!booking) {
        throw ApiError.notFound('Booking');
      }
      
      const currentEtag = `"${booking.version}"`;
      if (ifMatch !== currentEtag) {
        throw new ApiError(
          ErrorCode.PRECONDITION_FAILED,
          'Resource has been modified',
          { currentVersion: booking.version }
        );
      }
      
      // Update booking
      Object.assign(booking, req.body, {
        version: booking.version + 1,
        updatedAt: new Date().toISOString()
      });
      
      return createResponse(booking);
    },
    (result) => result.data.version
  )
);

// Clear test data
router.delete('/bookings',
  respond(
    z.object({ data: z.object({ cleared: z.number() }) }),
    async (req: Request) => {
      const count = testBookings.length;
      testBookings = [];
      nextId = 1;
      return createResponse({ cleared: count });
    }
  )
);

export default router;