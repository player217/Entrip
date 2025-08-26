import request from 'supertest';
import app from '../src/app';

describe('Bookings API', () => {
  
  describe('POST /bookings', () => {
    it('should create a new booking and return 201', async () => {
      const bookingData = {
        teamName: 'Test Team',
        type: 'golf',
        origin: 'ICN',
        destination: 'CTS',
        startDate: '2025-09-01',
        endDate: '2025-09-05',
        totalPax: 12,
        coordinator: '테스터'
      };

      const response = await request(app)
        .post('/bookings')
        .send(bookingData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.teamName).toBe('Test Team');
      expect(response.body.type).toBe('golf');
    });
  });

  describe('GET /bookings', () => {
    it('should return array of bookings', async () => {
      const response = await request(app)
        .get('/bookings')
        .expect(200)
        .expect('Content-Type', /json/);

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
        teamName: 'Status Test',
        type: 'incentive',
        origin: 'ICN',
        destination: 'NRT',
        startDate: '2025-10-01',
        endDate: '2025-10-05',
        totalPax: 20,
        coordinator: '상태테스터'
      };

      const createResponse = await request(app)
        .post('/bookings')
        .send(bookingData)
        .expect(201);

      const bookingId = createResponse.body.id;

      // Then update status
      const statusResponse = await request(app)
        .patch(`/bookings/${bookingId}/status`)
        .send({ status: 'confirmed' })
        .expect(200);

      expect(statusResponse.body.status).toBe('confirmed');
    });
  });
});
EOF < /dev/null
