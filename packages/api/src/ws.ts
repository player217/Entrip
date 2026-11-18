import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import { authService, AuthTokenPayload } from './routes/auth/auth.service';
import { logger } from './lib/logger';
import { appConfig } from './config';
import prisma from './lib/prisma';
import { messageService } from './services/message.service';

let io: Server;

export const initializeWebSocket = (server: HttpServer): Server => {
  io = new Server(server, {
    cors: { origin: appConfig.browser.origins, credentials: true },
    // WebSocket upgrades do not use browser CORS checks. Same-origin polling
    // GETs may have no Origin, but browser WebSocket handshakes supply one.
    allowRequest: (req, callback) => {
      const origin = req.headers.origin;
      const websocket = req.headers.upgrade?.toLowerCase() === 'websocket';
      const allowed = origin ? appConfig.browser.permitsOrigin(origin) : !appConfig.browser.lanHttp || !websocket;
      callback(null, allowed);
    },
    path: '/socket.io/',
  });
  io.use(async (socket, next) => {
    try {
      const cookie = socket.handshake.headers.cookie?.split(';').map(c => c.trim()).find(c => c.startsWith('auth-token='));
      const token = cookie ? decodeURIComponent(cookie.slice('auth-token='.length)) : socket.handshake.auth?.token;
      if (!token || typeof token !== 'string') return next(new Error('Authentication required'));
      socket.data.user = await authService.verifyAccessToken(token);
      next();
    } catch { next(new Error('Authentication required')); }
  });

  io.on('connection', socket => {
    const actor = socket.data.user as AuthTokenPayload;
    const { id: userId, email: userEmail, companyCode } = actor;
    socket.join(`user:${userId}`);
    for (const suffix of ['', ':bookings', ':users', ':flights']) socket.join(`company:${companyCode}${suffix}`);
    // Revalidate sessions on every inbound packet so disabled accounts lose access immediately.
    socket.use(async (_packet, next) => {
      const active = await prisma.user.findFirst({ where: { id: userId, companyCode, isActive: true } }).catch(() => null);
      if (!active) { socket.disconnect(true); return next(new Error('Authentication required')); }
      next();
    });
    socket.on('conversation:join', async (conversationId: string) => {
      try { await messageService.requireMember(actor, conversationId); socket.join(`conversation:${conversationId}`); }
      catch { socket.emit('message:error', { error: '대화방에 접근할 수 없습니다.' }); }
    });
    socket.on('conversation:leave', (id: string) => { socket.leave(`conversation:${id}`); });
    socket.on('message:send', async (data: { conversationId: string; content: string }, ack?: (result: unknown) => void) => {
      try {
        if (typeof data?.content !== 'string' || typeof data?.conversationId !== 'string') throw new Error('메시지를 확인하세요.');
        const message = await messageService.send(actor, data.conversationId, data.content);
        await publishConversationEvent(message.conversationId, 'message:new', { conversationId: message.conversationId, message });
        ack?.({ success: true, message });
      } catch (error) { const result = { error: error instanceof Error ? error.message : '전송 실패' }; socket.emit('message:error', result); ack?.(result); }
    });
    for (const event of ['typing:start', 'typing:stop'] as const) {
      socket.on(event, async (conversationId: string) => {
        try {
          await messageService.requireMember(actor, conversationId, true);
          socket.to(`conversation:${conversationId}`).emit('typing:status', { conversationId, userId, isTyping: event === 'typing:start' });
        } catch { /* Ignore unauthorized typing events. */ }
      });
    }
    // 항공편 감시 요청
    socket.on('watch:flight', (flightNo: string) => {
      // TODO: 항공편 감시 서비스 연동
      logger.ws('Watching flight', socket.id, { flightNo, userId });
      socket.emit('watch:flight:ack', { flightNo, watching: true });
    });

    socket.on('unwatch:flight', (flightNo: string) => {
      // TODO: 항공편 감시 서비스 연동
      logger.ws('Unwatching flight', socket.id, { flightNo, userId });
      socket.emit('watch:flight:ack', { flightNo, watching: false });
    });

    // 연결 해제
    socket.on('disconnect', async () => {
      logger.ws('Client disconnected', socket.id, { userId, userEmail });
    });
  });

  logger.info('[WS] WebSocket server initialized on v2');
  return io;
};

// 예약 업데이트 브로드캐스트
export const broadcastBookingUpdate = (type: 'create' | 'update' | 'delete', bookingId: string, data?: any) => {
  if (!io) return;

  const event = `booking:${type}`;
  logger.ws('Broadcasting booking event', 'broadcast', { event, bookingId });

  io.to('bookings').emit(event, {
    bookingId,
    data,
    timestamp: new Date().toISOString()
  });
};

// Company-scoped broadcast for booking events
export const broadcastBookingUpdateForCompany = (
  companyCode: string,
  type: 'create' | 'update' | 'delete',
  bookingId: string,
  data?: any
) => {
  if (!io) return;
  const event = `booking:${type}`;
  logger.ws('Broadcasting booking event (company)', 'broadcast', { event, bookingId, companyCode });
  io.to(`company:${companyCode}:bookings`).emit(event, {
    bookingId,
    data,
    companyCode,
    timestamp: new Date().toISOString(),
  });
};

// 대량 작업 브로드캐스트
export const broadcastBulkOperation = (type: 'delete' | 'create', count: number, ids: string[]) => {
  if (!io) return;

  const event = `booking:bulk-${type}`;
  logger.ws('Broadcasting bulk operation', 'broadcast', { event, count });

  io.to('bookings').emit(event, {
    count,
    ids,
    timestamp: new Date().toISOString()
  });
};

// 항공편 지연 방송
export const broadcastFlightDelay = (delayInfo: any) => {
  if (!io) return;

  logger.ws('Broadcasting flight delay', 'broadcast', { flightNo: delayInfo.flightNo, delay: delayInfo.delay });
  io.to('flights').emit('delay', delayInfo);
};

// === 메시징 브로드캐스트 함수 ===

// 새 메시지 브로드캐스트
export const broadcastMessage = (conversationId: string, message: any) => {
  if (!io) return;

  logger.ws('Broadcasting new message', 'broadcast', { conversationId });
  io.to(`conversation:${conversationId}`).emit('message:new', message);
};

// 메시지 수정 브로드캐스트
export const broadcastMessageEdit = (conversationId: string, message: any) => {
  if (!io) return;

  logger.ws('Broadcasting message edit', 'broadcast', { conversationId });
  io.to(`conversation:${conversationId}`).emit('message:edited', message);
};

// 메시지 삭제 브로드캐스트
export const broadcastMessageDelete = (conversationId: string, messageId: string) => {
  if (!io) return;

  logger.ws('Broadcasting message delete', 'broadcast', { conversationId, messageId });
  io.to(`conversation:${conversationId}`).emit('message:deleted', { messageId });
};

// 타이핑 상태 브로드캐스트
export const broadcastTypingStatus = (conversationId: string, userId: string, isTyping: boolean) => {
  if (!io) return;

  io.to(`conversation:${conversationId}`).emit('typing:status', { userId, isTyping });
};

// 온라인 상태 브로드캐스트
export const broadcastPresenceUpdate = (userId: string, status: string) => {
  if (!io) return;

  // 해당 사용자와 대화 중인 모든 사용자에게 브로드캐스트
  io.emit('presence:update', { userId, status });
};

export { io };

/** Deliver once per user, including participants who have not opened the room yet. */
export async function publishConversationEvent(conversationId: string, event: string, data: unknown) {
  if (!io) return;
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId }, select: { companyCode: true } });
  if (!conversation) return;
  const participants = await prisma.conversationParticipant.findMany({ where: {
    conversationId, isActive: true, user: { isActive: true, companyCode: conversation.companyCode },
  }, select: { userId: true } });
  const rooms = participants.map(p => `user:${p.userId}`);
  if (rooms.length) io.to(rooms).emit(event, data);
}
