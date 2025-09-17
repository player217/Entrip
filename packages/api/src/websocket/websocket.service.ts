import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import { jwtService } from '../lib/jwt.service';
import { AuthTokenPayload } from '../routes/auth/auth.service';
import { logger } from '../lib/logger';

let io: Server;

export const initializeWebSocket = (server: HttpServer): Server => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      credentials: true
    },
    path: '/socket.io/',
  });

  // Authentication middleware
  io.use((socket: any, next: any) => {
    // Try to get token from cookie in handshake headers
    const cookieHeader = socket.handshake.headers.cookie;
    let token = null;

    if (cookieHeader) {
      // Parse cookies to find auth-token
      const cookies = cookieHeader.split(';').map((c: string) => c.trim());
      const authCookie = cookies.find((c: string) => c.startsWith('auth-token='));
      if (authCookie) {
        token = authCookie.split('=')[1];
      }
    }

    // Fallback to auth.token for backward compatibility
    if (!token) {
      token = socket.handshake.auth.token;
    }

    if (!token) {
      // In development, allow connection without token but with limited features
      if (process.env.NODE_ENV === 'development') {
        logger.warn('[WS] Connection without token - limited features available');
        socket.data.user = {
          id: 'anonymous',
          email: 'anonymous@entrip.com',
          companyCode: 'ENTRIP_MAIN'
        };
        return next();
      }
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = jwtService.verifyAccessToken<AuthTokenPayload>(token);
      socket.data.user = decoded;
      next();
    } catch (err) {
      // In development, allow connection with invalid token
      if (process.env.NODE_ENV === 'development') {
        logger.warn('[WS] Invalid token - using anonymous user');
        socket.data.user = {
          id: 'anonymous',
          email: 'anonymous@entrip.com',
          companyCode: 'ENTRIP_MAIN'
        };
        return next();
      }
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: any) => {
    const userId = socket.data.user?.id;
    const userEmail = socket.data.user?.email;
    const companyCode = socket.data.user?.companyCode;

    logger.ws('Client connected', socket.id, { userId, userEmail, companyCode });

    // Join user-specific room
    if (userId && userId !== 'anonymous') {
      socket.join(`user:${userId}`);
    }

    // Join company-specific room for multi-tenancy
    if (companyCode) {
      socket.join(`company:${companyCode}`);
      socket.join(`company:${companyCode}:bookings`);
      socket.join(`company:${companyCode}:users`);
    }

    // === Booking Events ===

    // Watch booking updates for the company
    socket.on('watch:bookings', () => {
      logger.ws('User watching bookings', socket.id, { userEmail, companyCode });
      socket.emit('watch:bookings:ack', { watching: true });
    });

    // === User Events ===

    // Watch user updates for the company
    socket.on('watch:users', () => {
      logger.ws('User watching users', socket.id, { userEmail, companyCode });
      socket.emit('watch:users:ack', { watching: true });
    });

    // === Presence Events ===

    // Update online status
    socket.on('presence:update', (status: 'online' | 'away' | 'busy') => {
      if (userId && userId !== 'anonymous') {
        broadcastPresenceUpdate(companyCode, userId, status);
      }
    });

    // === Connection Events ===

    socket.on('disconnect', () => {
      logger.ws('Client disconnected', socket.id, { userId, userEmail });

      // Broadcast offline status
      if (userId && userId !== 'anonymous') {
        broadcastPresenceUpdate(companyCode, userId, 'offline');
      }
    });

    // Send initial connection success
    socket.emit('connected', {
      userId,
      companyCode,
      timestamp: new Date().toISOString()
    });
  });

  logger.info('[WS] WebSocket server initialized');

  return io;
};

// === Broadcast Functions ===

// Booking broadcasts - company-scoped
export const broadcastBookingUpdate = (
  companyCode: string,
  type: 'create' | 'update' | 'delete',
  bookingId: string,
  data?: any
) => {
  if (!io) return;

  const event = `booking:${type}`;
  const room = `company:${companyCode}:bookings`;

  logger.ws('Broadcasting booking event', 'broadcast', { event, bookingId, companyCode });

  io.to(room).emit(event, {
    bookingId,
    data,
    timestamp: new Date().toISOString()
  });
};

// Bulk booking operations - company-scoped
export const broadcastBulkBookingOperation = (
  companyCode: string,
  type: 'delete' | 'create',
  count: number,
  ids: string[]
) => {
  if (!io) return;

  const event = `booking:bulk-${type}`;
  const room = `company:${companyCode}:bookings`;

  logger.ws('Broadcasting bulk operation', 'broadcast', { event, count, companyCode });

  io.to(room).emit(event, {
    count,
    ids,
    timestamp: new Date().toISOString()
  });
};

// User broadcasts - company-scoped
export const broadcastUserUpdate = (
  companyCode: string,
  type: 'create' | 'update' | 'delete',
  userId: string,
  data?: any
) => {
  if (!io) return;

  const event = `user:${type}`;
  const room = `company:${companyCode}:users`;

  logger.ws('Broadcasting user event', 'broadcast', { event, userId, companyCode });

  io.to(room).emit(event, {
    userId,
    data,
    timestamp: new Date().toISOString()
  });
};

// Presence broadcasts - company-scoped
export const broadcastPresenceUpdate = (
  companyCode: string,
  userId: string,
  status: 'online' | 'offline' | 'away' | 'busy'
) => {
  if (!io) return;

  const room = `company:${companyCode}`;

  logger.ws('Broadcasting presence update', 'broadcast', { userId, status, companyCode });

  io.to(room).emit('presence:update', {
    userId,
    status,
    timestamp: new Date().toISOString()
  });
};

// System-wide broadcasts (admin only)
export const broadcastSystemMessage = (
  message: string,
  level: 'info' | 'warning' | 'error' = 'info'
) => {
  if (!io) return;

  logger.ws('Broadcasting system message', 'broadcast', { message });

  io.emit('system:message', {
    message,
    level,
    timestamp: new Date().toISOString()
  });
};

// Send direct message to specific user
export const sendToUser = (userId: string, event: string, data: any) => {
  if (!io) return;

  const room = `user:${userId}`;

  logger.ws('Sending event to user', 'direct', { event, userId });

  io.to(room).emit(event, {
    ...data,
    timestamp: new Date().toISOString()
  });
};

export { io };