import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioc, Socket as ClientSocket } from 'socket.io-client';
import { UserFactory } from '../../test/factories/user.factory';
import { initializeWebSocket } from '../websocket.service';
import { jwtService } from '../../lib/jwt.service';
import { prisma } from '../../test/setup';
import { UserRole } from '@prisma/client';

describe('WebSocket Service', () => {
  let httpServer: any;
  let ioServer: SocketIOServer;
  let clientSocket: ClientSocket;
  const serverPort = 3001;

  beforeAll(() => {
    UserFactory.initialize(prisma);
  });

  beforeEach(async () => {
    // Create HTTP server
    httpServer = createServer();

    // Initialize WebSocket server
    ioServer = initializeWebSocket(httpServer);

    // Start HTTP server
    await new Promise<void>((resolve) => {
      httpServer.listen(serverPort, () => {
        resolve();
      });
    });
  });

  afterEach(async () => {
    // Disconnect client if connected
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }

    // Close server
    await new Promise<void>((resolve) => {
      ioServer.close(() => {
        httpServer.close(() => {
          resolve();
        });
      });
    });
  });

  describe('Authentication', () => {
    it('should accept connection with valid JWT token', async () => {
      // Create test user
      const user = await UserFactory.create({
        companyCode: 'TEST_COMPANY',
        role: UserRole.USER
      });

      // Generate valid token
      const tokens = jwtService.generateTokens(user);

      // Connect with valid token
      clientSocket = ioc(`http://localhost:${serverPort}`, {
        auth: {
          token: tokens.accessToken
        },
        transports: ['websocket']
      });

      // Wait for connection
      await new Promise<void>((resolve) => {
        clientSocket.on('connect', () => {
          resolve();
        });
      });

      expect(clientSocket.connected).toBe(true);

      // Should receive connected event
      await new Promise<void>((resolve) => {
        clientSocket.on('connected', (data: any) => {
          expect(data.userId).toBe(user.id);
          expect(data.companyCode).toBe('TEST_COMPANY');
          resolve();
        });
      });
    });

    it('should reject connection with invalid token in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      clientSocket = ioc(`http://localhost:${serverPort}`, {
        auth: {
          token: 'invalid.token.here'
        },
        transports: ['websocket']
      });

      // Wait for connection error
      await new Promise<void>((resolve) => {
        clientSocket.on('connect_error', (error: any) => {
          expect(error.message).toContain('Authentication error');
          resolve();
        });
      });

      expect(clientSocket.connected).toBe(false);

      process.env.NODE_ENV = originalEnv;
    });

    it('should allow anonymous connection in development without token', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      clientSocket = ioc(`http://localhost:${serverPort}`, {
        transports: ['websocket']
      });

      // Wait for connection
      await new Promise<void>((resolve) => {
        clientSocket.on('connect', () => {
          resolve();
        });
      });

      expect(clientSocket.connected).toBe(true);

      // Should receive connected event with anonymous user
      await new Promise<void>((resolve) => {
        clientSocket.on('connected', (data: any) => {
          expect(data.userId).toBe('anonymous');
          resolve();
        });
      });

      process.env.NODE_ENV = originalEnv;
    });

    it('should support token from cookie header', async () => {
      const user = await UserFactory.create({
        companyCode: 'TEST_COMPANY',
        role: UserRole.MANAGER
      });

      const tokens = jwtService.generateTokens(user);

      // Connect with cookie header
      clientSocket = ioc(`http://localhost:${serverPort}`, {
        extraHeaders: {
          cookie: `auth-token=${tokens.accessToken}; other-cookie=value`
        },
        transports: ['websocket']
      });

      // Wait for connection
      await new Promise<void>((resolve) => {
        clientSocket.on('connect', () => {
          resolve();
        });
      });

      expect(clientSocket.connected).toBe(true);
    });
  });

  describe('Room Management', () => {
    let adminSocket: ClientSocket;
    let userSocket: ClientSocket;

    beforeEach(async () => {
      // Create users in same company
      const admin = await UserFactory.create({
        companyCode: 'TEST_COMPANY',
        role: UserRole.ADMIN
      });
      const user = await UserFactory.create({
        companyCode: 'TEST_COMPANY',
        role: UserRole.USER
      });

      const adminTokens = jwtService.generateTokens(admin);
      const userTokens = jwtService.generateTokens(user);

      // Connect both users
      adminSocket = ioc(`http://localhost:${serverPort}`, {
        auth: { token: adminTokens.accessToken },
        transports: ['websocket']
      });

      userSocket = ioc(`http://localhost:${serverPort}`, {
        auth: { token: userTokens.accessToken },
        transports: ['websocket']
      });

      // Wait for both connections
      await Promise.all([
        new Promise<void>((resolve) => {
          adminSocket.on('connect', () => resolve());
        }),
        new Promise<void>((resolve) => {
          userSocket.on('connect', () => resolve());
        })
      ]);
    });

    afterEach(() => {
      if (adminSocket) adminSocket.disconnect();
      if (userSocket) userSocket.disconnect();
    });

    it('should join company-specific rooms', async () => {
      // Emit watch:bookings to confirm room membership
      adminSocket.emit('watch:bookings');

      await new Promise<void>((resolve) => {
        adminSocket.on('watch:bookings:ack', (data: any) => {
          expect(data.watching).toBe(true);
          resolve();
        });
      });
    });

    it('should isolate broadcasts to company rooms', async () => {
      // Create user in different company
      const otherUser = await UserFactory.create({
        companyCode: 'OTHER_COMPANY',
        role: UserRole.USER
      });
      const otherTokens = jwtService.generateTokens(otherUser);

      const otherSocket = ioc(`http://localhost:${serverPort}`, {
        auth: { token: otherTokens.accessToken },
        transports: ['websocket']
      });

      await new Promise<void>((resolve) => {
        otherSocket.on('connect', () => resolve());
      });

      // Set up listeners
      let testCompanyReceived = false;
      let otherCompanyReceived = false;

      userSocket.on('booking:create', () => {
        testCompanyReceived = true;
      });

      otherSocket.on('booking:create', () => {
        otherCompanyReceived = true;
      });

      // Broadcast to TEST_COMPANY only
      const { broadcastBookingUpdate } = require('../websocket.service');
      broadcastBookingUpdate('TEST_COMPANY', 'create', 'booking-123', { test: true });

      // Wait a bit to ensure message would be received
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(testCompanyReceived).toBe(true);
      expect(otherCompanyReceived).toBe(false);

      otherSocket.disconnect();
    });
  });

  describe('Presence Management', () => {
    it('should broadcast presence updates to company', async () => {
      const user = await UserFactory.create({
        companyCode: 'TEST_COMPANY',
        role: UserRole.USER
      });
      const tokens = jwtService.generateTokens(user);

      clientSocket = ioc(`http://localhost:${serverPort}`, {
        auth: { token: tokens.accessToken },
        transports: ['websocket']
      });

      await new Promise<void>((resolve) => {
        clientSocket.on('connect', () => resolve());
      });

      // Listen for presence update
      const presencePromise = new Promise<void>((resolve) => {
        clientSocket.on('presence:update', (data: any) => {
          expect(data.userId).toBe(user.id);
          expect(data.status).toBe('away');
          resolve();
        });
      });

      // Emit presence update
      clientSocket.emit('presence:update', 'away');

      await presencePromise;
    });

    it('should broadcast offline status on disconnect', async () => {
      const user1 = await UserFactory.create({
        companyCode: 'TEST_COMPANY',
        role: UserRole.USER,
        email: 'user1@test.com'
      });
      const user2 = await UserFactory.create({
        companyCode: 'TEST_COMPANY',
        role: UserRole.USER,
        email: 'user2@test.com'
      });

      const tokens1 = jwtService.generateTokens(user1);
      const tokens2 = jwtService.generateTokens(user2);

      const socket1 = ioc(`http://localhost:${serverPort}`, {
        auth: { token: tokens1.accessToken },
        transports: ['websocket']
      });

      const socket2 = ioc(`http://localhost:${serverPort}`, {
        auth: { token: tokens2.accessToken },
        transports: ['websocket']
      });

      // Wait for connections
      await Promise.all([
        new Promise<void>((resolve) => {
          socket1.on('connect', () => resolve());
        }),
        new Promise<void>((resolve) => {
          socket2.on('connect', () => resolve());
        })
      ]);

      // Set up listener for offline status
      const offlinePromise = new Promise<void>((resolve) => {
        socket2.on('presence:update', (data: any) => {
          if (data.userId === user1.id && data.status === 'offline') {
            resolve();
          }
        });
      });

      // Disconnect user1
      socket1.disconnect();

      await offlinePromise;

      socket2.disconnect();
    });
  });

  describe('Broadcast Functions', () => {
    it('should broadcast booking updates to company room', async () => {
      const user = await UserFactory.create({
        companyCode: 'TEST_COMPANY',
        role: UserRole.USER
      });
      const tokens = jwtService.generateTokens(user);

      clientSocket = ioc(`http://localhost:${serverPort}`, {
        auth: { token: tokens.accessToken },
        transports: ['websocket']
      });

      await new Promise<void>((resolve) => {
        clientSocket.on('connect', () => resolve());
      });

      // Listen for booking update
      const bookingPromise = new Promise<void>((resolve) => {
        clientSocket.on('booking:update', (data: any) => {
          expect(data.bookingId).toBe('booking-456');
          expect(data.data.status).toBe('confirmed');
          resolve();
        });
      });

      // Broadcast booking update
      const { broadcastBookingUpdate } = require('../websocket.service');
      broadcastBookingUpdate('TEST_COMPANY', 'update', 'booking-456', { status: 'confirmed' });

      await bookingPromise;
    });

    it('should broadcast user updates to company room', async () => {
      const user = await UserFactory.create({
        companyCode: 'TEST_COMPANY',
        role: UserRole.MANAGER
      });
      const tokens = jwtService.generateTokens(user);

      clientSocket = ioc(`http://localhost:${serverPort}`, {
        auth: { token: tokens.accessToken },
        transports: ['websocket']
      });

      await new Promise<void>((resolve) => {
        clientSocket.on('connect', () => resolve());
      });

      // Listen for user update
      const userPromise = new Promise<void>((resolve) => {
        clientSocket.on('user:create', (data: any) => {
          expect(data.userId).toBe('user-789');
          expect(data.data.email).toBe('newuser@test.com');
          resolve();
        });
      });

      // Broadcast user creation
      const { broadcastUserUpdate } = require('../websocket.service');
      broadcastUserUpdate('TEST_COMPANY', 'create', 'user-789', { email: 'newuser@test.com' });

      await userPromise;
    });

    it('should broadcast system messages to all users', async () => {
      const user = await UserFactory.create({
        companyCode: 'ANY_COMPANY',
        role: UserRole.USER
      });
      const tokens = jwtService.generateTokens(user);

      clientSocket = ioc(`http://localhost:${serverPort}`, {
        auth: { token: tokens.accessToken },
        transports: ['websocket']
      });

      await new Promise<void>((resolve) => {
        clientSocket.on('connect', () => resolve());
      });

      // Listen for system message
      const systemPromise = new Promise<void>((resolve) => {
        clientSocket.on('system:message', (data: any) => {
          expect(data.message).toBe('System maintenance scheduled');
          expect(data.level).toBe('warning');
          resolve();
        });
      });

      // Broadcast system message
      const { broadcastSystemMessage } = require('../websocket.service');
      broadcastSystemMessage('System maintenance scheduled', 'warning');

      await systemPromise;
    });
  });
});