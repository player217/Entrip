import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';

let io: Server;

export const initializeWebSocket = (server: HttpServer): Server => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      credentials: true
    },
    path: '/socket.io/',
  });

  // 인증 미들웨어 - Uses cookies from handshake headers
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
        console.warn('[WS] Connection without token - limited features available');
        socket.data.user = { id: 'anonymous', email: 'anonymous@entrip.com' };
        return next();
      }
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      socket.data.user = decoded;
      next();
    } catch (err) {
      // In development, allow connection with invalid token
      if (process.env.NODE_ENV === 'development') {
        console.warn('[WS] Invalid token - using anonymous user');
        socket.data.user = { id: 'anonymous', email: 'anonymous@entrip.com' };
        return next();
      }
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: any) => {
    const userId = socket.data.user?.id;
    const userEmail = socket.data.user?.email;
    console.log(`[WS] Client connected: ${socket.id}, User: ${userEmail}`);

    // 사용자별 룸 참가 (메시징용)
    if (userId) {
      socket.join(`user:${userId}`);
    }

    // 예약 룸에 참가
    socket.join('bookings');

    // 항공편 감시 룸에 참가
    socket.join('flights');

    // === 메시징 이벤트 핸들러 ===

    // 대화방 참가
    socket.on('conversation:join', (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
      console.log(`[WS] User ${userEmail} joined conversation ${conversationId}`);
    });

    // 대화방 나가기
    socket.on('conversation:leave', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
      console.log(`[WS] User ${userEmail} left conversation ${conversationId}`);
    });

    // 메시지 전송
    socket.on('message:send', async (data: any) => {
      try {
        const { conversationId, content, type, attachments, replyToId } = data;

        // TODO: 메시징 서비스 연동 (Phase 1.2에서 구현)
        console.log(`[WS] Message sent in conversation ${conversationId}`);
        socket.emit('message:sent', { success: true });
      } catch (error: any) {
        socket.emit('message:error', { error: error.message });
      }
    });

    // 메시지 수정
    socket.on('message:edit', async (data: any) => {
      try {
        const { messageId, content } = data;

        // TODO: 메시징 서비스 연동 (Phase 1.2에서 구현)
        console.log(`[WS] Message edited: ${messageId}`);
        socket.emit('message:edited', { success: true });
      } catch (error: any) {
        socket.emit('message:error', { error: error.message });
      }
    });

    // 메시지 삭제
    socket.on('message:delete', async (messageId: string) => {
      try {
        // TODO: 메시징 서비스 연동 (Phase 1.2에서 구현)
        console.log(`[WS] Message deleted: ${messageId}`);
        socket.emit('message:deleted', { messageId });
      } catch (error: any) {
        socket.emit('message:error', { error: error.message });
      }
    });

    // 타이핑 시작
    socket.on('typing:start', async (conversationId: string) => {
      try {
        // TODO: 메시징 서비스 연동 (Phase 1.2에서 구현)
        console.log(`[WS] Typing started in conversation ${conversationId}`);
      } catch (error: any) {
        console.error('[WS] Typing start error:', error);
      }
    });

    // 타이핑 종료
    socket.on('typing:stop', async (conversationId: string) => {
      try {
        // TODO: 메시징 서비스 연동 (Phase 1.2에서 구현)
        console.log(`[WS] Typing stopped in conversation ${conversationId}`);
      } catch (error: any) {
        console.error('[WS] Typing stop error:', error);
      }
    });

    // 항공편 감시 요청
    socket.on('watch:flight', (flightNo: string) => {
      // TODO: 항공편 감시 서비스 연동
      console.log(`[WS] Watching flight: ${flightNo}`);
      socket.emit('watch:flight:ack', { flightNo, watching: true });
    });

    socket.on('unwatch:flight', (flightNo: string) => {
      // TODO: 항공편 감시 서비스 연동
      console.log(`[WS] Unwatching flight: ${flightNo}`);
      socket.emit('watch:flight:ack', { flightNo, watching: false });
    });

    // 연결 해제
    socket.on('disconnect', async () => {
      console.log(`[WS] Client disconnected: ${socket.id}`);
    });
  });

  console.log('[WS] WebSocket server initialized on v2');
  return io;
};

// 예약 업데이트 브로드캐스트
export const broadcastBookingUpdate = (type: 'create' | 'update' | 'delete', bookingId: string, data?: any) => {
  if (!io) return;

  const event = `booking:${type}`;
  console.log(`[WS] Broadcasting ${event} for booking ${bookingId}`);

  io.to('bookings').emit(event, {
    bookingId,
    data,
    timestamp: new Date().toISOString()
  });
};

// 대량 작업 브로드캐스트
export const broadcastBulkOperation = (type: 'delete' | 'create', count: number, ids: string[]) => {
  if (!io) return;

  const event = `booking:bulk-${type}`;
  console.log(`[WS] Broadcasting ${event} for ${count} bookings`);

  io.to('bookings').emit(event, {
    count,
    ids,
    timestamp: new Date().toISOString()
  });
};

// 항공편 지연 방송
export const broadcastFlightDelay = (delayInfo: any) => {
  if (!io) return;

  console.log(`[WS] Broadcasting flight delay: ${delayInfo.flightNo} - ${delayInfo.delay}min`);
  io.to('flights').emit('delay', delayInfo);
};

// === 메시징 브로드캐스트 함수 ===

// 새 메시지 브로드캐스트
export const broadcastMessage = (conversationId: string, message: any) => {
  if (!io) return;

  console.log(`[WS] Broadcasting new message in conversation ${conversationId}`);
  io.to(`conversation:${conversationId}`).emit('message:new', message);
};

// 메시지 수정 브로드캐스트
export const broadcastMessageEdit = (conversationId: string, message: any) => {
  if (!io) return;

  console.log(`[WS] Broadcasting message edit in conversation ${conversationId}`);
  io.to(`conversation:${conversationId}`).emit('message:edited', message);
};

// 메시지 삭제 브로드캐스트
export const broadcastMessageDelete = (conversationId: string, messageId: string) => {
  if (!io) return;

  console.log(`[WS] Broadcasting message delete in conversation ${conversationId}`);
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