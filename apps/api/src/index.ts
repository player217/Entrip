// Initialize OpenTelemetry first (before any other imports)
// import './otel';

import app from './app';
import { createServer } from 'http';
import { initializeWebSocket } from './ws';
// import { addTraceContext } from './otel';

const PORT = process.env.PORT || 4000;

// 서버 시작 (테스트 환경이 아닌 경우에만)
if (process.env.NODE_ENV !== 'test') {
  const server = createServer(app);
  
  // WebSocket 초기화
  const io = initializeWebSocket(server);
  app.set('io', io); // Store io instance in app for routes to use
  
  server.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`API: Server running on http://localhost:${PORT}`);
    console.log(`WebSocket: Available at ws://localhost:${PORT}`);
  });
}