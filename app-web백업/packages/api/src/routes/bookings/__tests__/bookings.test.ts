import request from 'supertest';
import express from 'express';
import bookingsRouter from '../bookings.route';
import { errorHandler } from '../../../middlewares/error.middleware';
import { bookingsService } from '../bookings.service';

const app = express();
app.use(express.json());
app.use('/api/v1/bookings', bookingsRouter);
app.use(errorHandler);

describe('Bookings API', () => {
  beforeEach(async () => {
    await bookingsService.clearAll();
  });

  describe('POST /api/v1/bookings', () => {
    it('should create a new booking', async () => {
      const bookingData = {
        teamName: 'Test Team',
        type: 'incentive',
        origin: 'Seoul',
        destination: 'Jeju',
        startDate: '2024-03-01',
        endDate: '2024-03-05',
        totalPax: 20,
        coordinator: 'John Doe',
        revenue: 50000000,
      };

      const response = await request(app)
        .post('/api/v1/bookings')
        .send(bookingData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        ...bookingData,
        id: expect.any(String),
        status: 'pending',
      });
    });

    it('should reject invalid booking data', async () => {
      const invalidData = {
        teamName: '', // Empty string should fail
        type: 'invalid-type', // Invalid enum value
        origin: 'Seoul',
        destination: 'Jeju',
        startDate: '2024-03-01',
        endDate: '2024-03-05',
        totalPax: -5, // Negative number
        coordinator: 'John Doe',
      };

      const response = await request(app)
        .post('/api/v1/bookings')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toHaveLength(3); // 3 validation errors
    });
  });

  describe('GET /api/v1/bookings', () => {
    beforeEach(async () => {
      // Create test bookings
      for (let i = 1; i <= 25; i++) {
        await bookingsService.create({
          teamName: `Team ${i}`,
          type: 'incentive',
          origin: 'Seoul',
          destination: 'Jeju',
          startDate: '2024-03-01',
          endDate: '2024-03-05',
          totalPax: 20,
          coordinator: 'John Doe',
        });
      }
    });

    it('should list bookings with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/bookings?page=1&limit=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(10);
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 25,
        pages: 3,
      });
    });

    it('should use default pagination values', async () => {
      const response = await request(app)
        .get('/api/v1/bookings')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(20); // Default limit
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(20);
    });
  });

  describe('GET /api/v1/bookings/:id', () => {
    it('should get a booking by id', async () => {
      const booking = await bookingsService.create({
        teamName: 'Test Team',
        type: 'incentive',
        origin: 'Seoul',
        destination: 'Jeju',
        startDate: '2024-03-01',
        endDate: '2024-03-05',
        totalPax: 20,
        coordinator: 'John Doe',
      });

      const response = await request(app)
        .get(`/api/v1/bookings/${booking.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(booking.id);
    });

    it('should return 404 for non-existent booking', async () => {
      const response = await request(app)
        .get('/api/v1/bookings/999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Booking not found');
    });
  });

  describe('PUT /api/v1/bookings/:id', () => {
    it('should update a booking', async () => {
      const booking = await bookingsService.create({
        teamName: 'Original Team',
        type: 'incentive',
        origin: 'Seoul',
        destination: 'Jeju',
        startDate: '2024-03-01',
        endDate: '2024-03-05',
        totalPax: 20,
        coordinator: 'John Doe',
      });

      const updateData = {
        teamName: 'Updated Team',
        totalPax: 30,
      };

      const response = await request(app)
        .put(`/api/v1/bookings/${booking.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.teamName).toBe('Updated Team');
      expect(response.body.data.totalPax).toBe(30);
      expect(response.body.data.origin).toBe('Seoul'); // Unchanged
    });

    it('should return 404 for non-existent booking', async () => {
      const response = await request(app)
        .put('/api/v1/bookings/999')
        .send({ teamName: 'Updated' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Booking not found');
    });
  });

  describe('PATCH /api/v1/bookings/:id/status', () => {
    it('should update booking status', async () => {
      const booking = await bookingsService.create({
        teamName: 'Test Team',
        type: 'incentive',
        origin: 'Seoul',
        destination: 'Jeju',
        startDate: '2024-03-01',
        endDate: '2024-03-05',
        totalPax: 20,
        coordinator: 'John Doe',
      });

      const response = await request(app)
        .patch(`/api/v1/bookings/${booking.id}/status`)
        .send({
          status: 'confirmed',
          notes: 'Payment received',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('confirmed');
      expect(response.body.data.notes).toBe('Payment received');
    });

    it('should reject invalid status', async () => {
      const booking = await bookingsService.create({
        teamName: 'Test Team',
        type: 'incentive',
        origin: 'Seoul',
        destination: 'Jeju',
        startDate: '2024-03-01',
        endDate: '2024-03-05',
        totalPax: 20,
        coordinator: 'John Doe',
      });

      const response = await request(app)
        .patch(`/api/v1/bookings/${booking.id}/status`)
        .send({
          status: 'invalid-status',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('DELETE /api/v1/bookings/:id', () => {
    it('should delete a booking', async () => {
      const booking = await bookingsService.create({
        teamName: 'Test Team',
        type: 'incentive',
        origin: 'Seoul',
        destination: 'Jeju',
        startDate: '2024-03-01',
        endDate: '2024-03-05',
        totalPax: 20,
        coordinator: 'John Doe',
      });

      await request(app)
        .delete(`/api/v1/bookings/${booking.id}`)
        .expect(204);

      // Verify deletion
      await request(app)
        .get(`/api/v1/bookings/${booking.id}`)
        .expect(404);
    });

    it('should return 404 for non-existent booking', async () => {
      const response = await request(app)
        .delete('/api/v1/bookings/999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Booking not found');
    });
  });
});