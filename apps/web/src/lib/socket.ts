import { io, Socket } from 'socket.io-client';
import { mutate } from 'swr';
import { logger } from '@entrip/shared';

let socket: Socket | null = null;

export const initializeSocket = (): Socket | undefined => {
  // Server-side rendering check
  if (typeof window === 'undefined') {
    return; // Don't initialize socket on server-side
  }
  
  // Check if socket already exists (connected or connecting)
  if (socket) {
    return socket;
  }
  
  const WS_URL = process.env.NEXT_PUBLIC_WS_URL || window.location.origin;
  socket = io(WS_URL, {
    withCredentials: true, path: '/socket.io/', transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    logger.info('[Socket]', 'Connected to server with cookie authentication');
  });
  
  socket.on('disconnect', reason => {
    if (reason === 'io server disconnect') {
      // The server drops active connections on a role change or deactivation.
      void mutate('/api/v2/auth/me');
      socket?.connect();
    }
    logger.info('[Socket]', 'Disconnected from server');
  });
  
  socket.on('connect_error', (error) => {
    logger.error('[Socket]', `Connection error: ${error.message}`);
    logger.error('[Socket]', 'Ensure you are logged in and have valid session cookie');
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