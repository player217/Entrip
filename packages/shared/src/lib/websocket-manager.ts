import { io, Socket } from 'socket.io-client';

class WebSocketManager {
  private socket: Socket | null = null;
  private tokenRefreshTimer: NodeJS.Timeout | null = null;
  private token: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  async connect(): Promise<void> {
    try {
      // 토큰 획득
      await this.refreshToken();

      // WebSocket 연결
      this.socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4001', {
        auth: {
          token: this.token
        },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000
      });

      // 연결 성공 핸들러
      this.socket.on('connect', () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
      });

      // 연결 실패 핸들러
      this.socket.on('connect_error', (error: Error) => {
        console.error('WebSocket connection error:', error);
        this.reconnectAttempts++;
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error('Max reconnection attempts reached');
          this.disconnect();
        }
      });

      // 토큰 자동 갱신 (만료 20초 전)
      this.setupTokenRefresh();

      // 재연결시 토큰 갱신
      this.socket.on('reconnect_attempt', async () => {
        await this.refreshToken();
        // socket.io v4에서는 auth를 동적으로 업데이트할 수 없으므로
        // 재연결 시 새 토큰으로 다시 연결
        if (this.socket && this.token) {
          // 기존 연결 종료하고 새 토큰으로 재연결
          this.socket.disconnect();
          this.connect();
        }
      });

    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      throw error;
    }
  }

  private async refreshToken(): Promise<void> {
    try {
      const response = await fetch('/api/auth/socket-token', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to get WebSocket token');
      }

      const data = await response.json();
      this.token = data.token;

      // 다음 갱신 예약 (만료 20초 전)
      this.setupTokenRefresh(data.expiresIn - 20);

    } catch (error) {
      console.error('WebSocket token refresh failed:', error);
      // 재시도 로직
      setTimeout(() => this.refreshToken(), 5000);
    }
  }

  private setupTokenRefresh(seconds: number = 100): void {
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
    }

    this.tokenRefreshTimer = setTimeout(
      () => this.refreshToken(),
      seconds * 1000
    );
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  disconnect(): void {
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.token = null;
    this.reconnectAttempts = 0;
  }

  // 이벤트 리스너 관리 헬퍼
  on(event: string, handler: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.on(event, handler);
    }
  }

  off(event: string, handler?: (...args: any[]) => void): void {
    if (this.socket) {
      if (handler) {
        this.socket.off(event, handler);
      } else {
        this.socket.off(event);
      }
    }
  }

  emit(event: string, ...args: any[]): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, ...args);
    } else {
      console.warn('WebSocket not connected, cannot emit event:', event);
    }
  }
}

// 싱글톤 인스턴스
export const wsManager = new WebSocketManager();