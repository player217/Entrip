import { io, Socket } from 'socket.io-client';
import Cookies from 'js-cookie';
import { logger } from '@entrip/shared';

let socket: Socket | null = null;

export const initializeSocket = (): Socket | undefined => {
  // For WebSocket, we need to explicitly pass the token since cookies aren't automatically sent
  // We'll get it from a special endpoint that returns a token for WebSocket use
  // This keeps the actual auth token in HttpOnly cookie secure
  
  // Check if user is authenticated by looking for auth state
  const authState = typeof window !== 'undefined' 
    ? localStorage.getItem('auth-state') 
    : null;
  
  if (!authState) {
    logger.warn('[Socket]', 'User not authenticated, WebSocket features disabled');
    return;
  }
  
  // Parse auth state to check if authenticated
  try {
    const state = JSON.parse(authState);
    if (!state?.state?.isAuthenticated) {
      logger.warn('[Socket]', 'User not authenticated, WebSocket features disabled');
      return;
    }
  } catch (e) {
    logger.warn('[Socket]', 'Invalid auth state, WebSocket features disabled');
    return;
  }
  
  if (socket?.connected) {
    logger.info('[Socket]', 'Already connected');
    return socket;
  }
  
  // 서버/클라이언트 환경 구분
  const isServer = typeof window === 'undefined';
  const WS_URL = isServer 
    ? (process.env.INTERNAL_WS_URL || 'ws://api:4000')
    : (process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001');
  
  // Connect without token - server will use session cookie for auth
  socket = io(WS_URL, {
    withCredentials: true, // Send cookies with WebSocket handshake
    path: '/socket.io/',
    transports: ['websocket', 'polling'],
  });
  
  socket.on('connect', () => {
    logger.info('[Socket]', 'Connected to server');
  });
  
  socket.on('disconnect', () => {
    logger.info('[Socket]', 'Disconnected from server');
  });
  
  socket.on('connect_error', (error) => {
    logger.error('[Socket]', `Connection error: ${error.message}`);
  });
  
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = (): Socket | null => socket;

// 예약 이벤트 리스너 등록
interface BookingEventData {
  id: string;
  [key: string]: unknown;
}

interface BulkEventData {
  ids: string[];
  count: number;
}

export const subscribeToBookingEvents = (callbacks: {
  onCreate?: (data: BookingEventData) => void;
  onUpdate?: (data: BookingEventData) => void;
  onDelete?: (data: BookingEventData) => void;
  onBulkCreate?: (data: BulkEventData) => void;
  onBulkDelete?: (data: BulkEventData) => void;
}) => {
  if (!socket) {
    logger.error('[Socket]', 'Socket not initialized');
    return;
  }
  
  if (callbacks.onCreate) {
    socket.on('booking:create', (data) => {
      logger.info('[Socket]', `Received booking:create ${JSON.stringify(data)}`);
      callbacks.onCreate!(data);
    });
  }
  
  if (callbacks.onUpdate) {
    socket.on('booking:update', (data) => {
      logger.info('[Socket]', `Received booking:update ${JSON.stringify(data)}`);
      callbacks.onUpdate!(data);
    });
  }
  
  if (callbacks.onDelete) {
    socket.on('booking:delete', (data) => {
      logger.info('[Socket]', `Received booking:delete ${JSON.stringify(data)}`);
      callbacks.onDelete!(data);
    });
  }
  
  if (callbacks.onBulkCreate) {
    socket.on('booking:bulk-create', (data) => {
      logger.info('[Socket]', `Received booking:bulk-create ${JSON.stringify(data)}`);
      callbacks.onBulkCreate!(data);
    });
  }
  
  if (callbacks.onBulkDelete) {
    socket.on('booking:bulk-delete', (data) => {
      logger.info('[Socket]', `Received booking:bulk-delete ${JSON.stringify(data)}`);
      callbacks.onBulkDelete!(data);
    });
  }
};

// 이벤트 리스너 해제
export const unsubscribeFromBookingEvents = () => {
  if (!socket) return;
  
  socket.off('booking:create');
  socket.off('booking:update');
  socket.off('booking:delete');
  socket.off('booking:bulk-create');
  socket.off('booking:bulk-delete');
};

// 항공편 지연 이벤트 리스너 등록
interface FlightDelayData {
  flightNo: string;
  delay: number;
  newTime?: string;
  reason?: string;
}

export const subscribeToFlightDelays = (onDelay: (data: FlightDelayData) => void) => {
  if (!socket) {
    logger.error('[Socket]', 'Socket not initialized');
    return;
  }
  
  socket.on('delay', (data) => {
    logger.info('[Socket]', `Received flight delay: ${JSON.stringify(data)}`);
    onDelay(data);
  });
};

// 항공편 감시 시작/중지
export const watchFlight = (flightNo: string) => {
  if (!socket) {
    logger.error('[Socket]', 'Socket not initialized');
    return;
  }
  
  socket.emit('watch:flight', flightNo);
  logger.info('[Socket]', `Watching flight ${flightNo}`);
};

export const unwatchFlight = (flightNo: string) => {
  if (!socket) {
    logger.error('[Socket]', 'Socket not initialized');
    return;
  }
  
  socket.emit('unwatch:flight', flightNo);
  logger.info('[Socket]', `Unwatching flight ${flightNo}`);
};

// 항공편 지연 리스너 해제
export const unsubscribeFromFlightDelays = () => {
  if (!socket) return;
  socket.off('delay');
};