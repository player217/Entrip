import request from 'supertest';
import { app } from '../../../index';
import { calendarService } from '../calendar.service';
import { authService } from '../../auth/auth.service';

describe('Calendar Routes', () => {
  let accessToken: string;
  let user: { id: string; email: string; role: string };

  beforeAll(async () => {
    // Register and login a test user
    const registerData = {
      email: 'calendar-test@example.com',
      password: 'password123',
      name: 'Calendar Test User',
      role: 'staff',
    };

    try {
      await authService.register(registerData);
    } catch (error) {
      // User might already exist
    }

    const loginResult = await authService.login({
      email: registerData.email,
      password: registerData.password,
    });
    
    accessToken = loginResult.accessToken;
    user = loginResult.user;
  });

  beforeEach(async () => {
    // Clear all events before each test
    await calendarService.clearAll();
  });

  describe('GET /api/v1/calendar', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/v1/calendar')
        .query({ year: 2024, month: 1 });

      expect(response.status).toBe(401);
    });

    it('should return 400 for missing query parameters', async () => {
      const response = await request(app)
        .get('/api/v1/calendar')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid year', async () => {
      const response = await request(app)
        .get('/api/v1/calendar')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ year: 1999, month: 1 });

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid month', async () => {
      const response = await request(app)
        .get('/api/v1/calendar')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ year: 2024, month: 13 });

      expect(response.status).toBe(400);
    });

    it('should return empty array for month with no events', async () => {
      const response = await request(app)
        .get('/api/v1/calendar')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ year: 2024, month: 1 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: [],
        total: 0,
      });
    });

    it('should return events for specific month', async () => {
      // Create some events
      await calendarService.create({
        title: 'January Event',
        start: '2024-01-15T10:00:00Z',
        end: '2024-01-15T11:00:00Z',
        allDay: false,
      }, user);

      await calendarService.create({
        title: 'February Event',
        start: '2024-02-15T10:00:00Z',
        end: '2024-02-15T11:00:00Z',
        allDay: false,
      }, user);

      const response = await request(app)
        .get('/api/v1/calendar')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ year: 2024, month: 1 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toBe('January Event');
      expect(response.body.total).toBe(1);
    });

    it('should filter by team when specified', async () => {
      await calendarService.create({
        title: 'Team A Event',
        start: '2024-01-15T10:00:00Z',
        end: '2024-01-15T11:00:00Z',
        allDay: false,
        teamId: 'team-a',
      }, user);

      await calendarService.create({
        title: 'Team B Event',
        start: '2024-01-20T10:00:00Z',
        end: '2024-01-20T11:00:00Z',
        allDay: false,
        teamId: 'team-b',
      }, user);

      const response = await request(app)
        .get('/api/v1/calendar')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ year: 2024, month: 1, team: 'team-a' });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toBe('Team A Event');
    });
  });

  describe('POST /api/v1/calendar', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/calendar')
        .send({
          title: 'Test Event',
          start: '2024-01-15T10:00:00Z',
          end: '2024-01-15T11:00:00Z',
        });

      expect(response.status).toBe(401);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/calendar')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Test Event',
          // missing start and end
        });

      expect(response.status).toBe(400);
    });

    it('should validate date format', async () => {
      const response = await request(app)
        .post('/api/v1/calendar')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Test Event',
          start: 'invalid-date',
          end: '2024-01-15T11:00:00Z',
        });

      expect(response.status).toBe(400);
    });

    it('should validate end date is after start date', async () => {
      const response = await request(app)
        .post('/api/v1/calendar')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Test Event',
          start: '2024-01-15T11:00:00Z',
          end: '2024-01-15T10:00:00Z',
        });

      expect(response.status).toBe(400);
    });

    it('should create a new event successfully', async () => {
      const eventData = {
        title: 'New Event',
        start: '2024-01-15T10:00:00Z',
        end: '2024-01-15T11:00:00Z',
        allDay: false,
        description: 'Test event description',
        location: 'Conference Room A',
        color: '#FF5733',
      };

      const response = await request(app)
        .post('/api/v1/calendar')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(eventData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        title: eventData.title,
        start: eventData.start,
        end: eventData.end,
        allDay: eventData.allDay,
        description: eventData.description,
        location: eventData.location,
        color: eventData.color,
        status: 'confirmed',
      });
      expect(response.body.data.createdBy).toBeDefined();
      expect(response.body.data.id).toBeDefined();
    });
  });

  describe('GET /api/v1/calendar/:id', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/v1/calendar/some-id');

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent event', async () => {
      const response = await request(app)
        .get('/api/v1/calendar/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
    });

    it('should return event by id', async () => {
      const event = await calendarService.create({
        title: 'Test Event',
        start: '2024-01-15T10:00:00Z',
        end: '2024-01-15T11:00:00Z',
        allDay: false,
      }, user);

      const response = await request(app)
        .get(`/api/v1/calendar/${event.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: event.id,
        title: event.title,
        start: event.start,
        end: event.end,
      });
    });
  });

  describe('PUT /api/v1/calendar/:id', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .put('/api/v1/calendar/some-id')
        .send({
          title: 'Updated Event',
          start: '2024-01-15T10:00:00Z',
          end: '2024-01-15T11:00:00Z',
        });

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent event', async () => {
      const response = await request(app)
        .put('/api/v1/calendar/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Updated Event',
          start: '2024-01-15T10:00:00Z',
          end: '2024-01-15T11:00:00Z',
        });

      expect(response.status).toBe(404);
    });

    it('should update event successfully', async () => {
      const event = await calendarService.create({
        title: 'Original Title',
        start: '2024-01-15T10:00:00Z',
        end: '2024-01-15T11:00:00Z',
        allDay: false,
      }, user);

      const updateData = {
        title: 'Updated Title',
        start: '2024-01-15T14:00:00Z',
        end: '2024-01-15T15:00:00Z',
        allDay: true,
        status: 'pending',
        description: 'Updated description',
      };

      const response = await request(app)
        .put(`/api/v1/calendar/${event.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: event.id,
        title: updateData.title,
        start: updateData.start,
        end: updateData.end,
        allDay: updateData.allDay,
        status: updateData.status,
        description: updateData.description,
      });
      expect(response.body.data.updatedBy).toBeDefined();
      expect(response.body.data.updatedAt).toBeDefined();
    });
  });

  describe('PATCH /api/v1/calendar/:id/status', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .patch('/api/v1/calendar/some-id/status')
        .send({ status: 'cancelled' });

      expect(response.status).toBe(401);
    });

    it('should validate status enum', async () => {
      const event = await calendarService.create({
        title: 'Test Event',
        start: '2024-01-15T10:00:00Z',
        end: '2024-01-15T11:00:00Z',
        allDay: false,
      }, user);

      const response = await request(app)
        .patch(`/api/v1/calendar/${event.id}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'invalid-status' });

      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent event', async () => {
      const response = await request(app)
        .patch('/api/v1/calendar/non-existent-id/status')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'cancelled' });

      expect(response.status).toBe(404);
    });

    it('should update status successfully', async () => {
      const event = await calendarService.create({
        title: 'Event to Update Status',
        start: '2024-01-15T10:00:00Z',
        end: '2024-01-15T11:00:00Z',
        allDay: false,
      }, user);

      const response = await request(app)
        .patch(`/api/v1/calendar/${event.id}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'cancelled' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('cancelled');
      expect(response.body.data.id).toBe(event.id);
    });
  });

  describe('DELETE /api/v1/calendar/:id', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .delete('/api/v1/calendar/some-id');

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent event', async () => {
      const response = await request(app)
        .delete('/api/v1/calendar/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
    });

    it('should delete event successfully', async () => {
      const event = await calendarService.create({
        title: 'Event to Delete',
        start: '2024-01-15T10:00:00Z',
        end: '2024-01-15T11:00:00Z',
        allDay: false,
      }, user);

      const response = await request(app)
        .delete(`/api/v1/calendar/${event.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Event deleted successfully',
      });

      // Verify event is soft deleted
      const getResponse = await request(app)
        .get(`/api/v1/calendar/${event.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(getResponse.status).toBe(404);
    });
  });
});