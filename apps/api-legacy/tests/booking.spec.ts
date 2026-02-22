import request from 'supertest';
import app from '../src/app';

describe('Bookings API', () => {
  describe('POST /bookings', () => {
    it('should create a new booking', async () => {
      const bookingData = {
        customerName: 'John Doe',
        teamName: 'Test Team',
        bookingType: 'GROUP',
        destination: 'HND',
        startDate: '2025-08-01T00:00:00.000Z',
        endDate: '2025-08-05T00:00:00.000Z',
        paxCount: 25,
        nights: 4,
        days: 5,
        totalPrice: 50000000,
        currency: 'KRW'
      };

      const response = await request(app)
        .post('/bookings')
        .send(bookingData);

      if (response.status !== 201) {
        console.log('Error response:', response.body);
      }
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.teamName).toBe(bookingData.teamName);
    });
  });

  describe('GET /bookings', () => {
    it('should get list of bookings', async () => {
      const response = await request(app)
        .get('/bookings')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /bookings/:id', () => {
    it('should return 404 for non-existent booking', async () => {
      await request(app)
        .get('/bookings/non-existent-id')
        .expect(404);
    });
  });

  describe('PATCH /bookings/:id/status', () => {
    it('should update booking status', async () => {
      // First create a booking
      const bookingData = {
        customerName: 'Jane Doe',
        teamName: 'Status Test Team',
        bookingType: 'BUSINESS',
        destination: 'NRT',
        startDate: '2025-09-01T00:00:00.000Z',
        endDate: '2025-09-05T00:00:00.000Z',
        paxCount: 15,
        nights: 4,
        days: 5,
        totalPrice: 30000000,
        currency: 'KRW'
      };

      const createResponse = await request(app)
        .post('/bookings')
        .send(bookingData)
        .expect(201);

      const bookingId = createResponse.body.id;

      // Update status
      const response = await request(app)
        .patch(`/bookings/${bookingId}/status`)
        .send({ status: 'CONFIRMED' })
        .expect(200);

      expect(response.body.status).toBe('CONFIRMED');
    });
  });

  describe('GET /bookings with filters', () => {
    it('should filter bookings by type', async () => {
      const response = await request(app)
        .get('/bookings?type=GROUP')
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should return 400 for invalid booking data', async () => {
      await request(app)
        .post('/bookings')
        .send({ customerName: '' }) // invalid data
        .expect(400);
    });
  });
});