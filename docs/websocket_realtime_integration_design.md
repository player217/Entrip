# WebSocket Real-time Integration Design
**날짜**: 2025-09-28
**프로젝트**: Entrip Travel Management System v2 WebSocket

## 🎯 개요

V2 API의 실시간 기능을 위한 WebSocket 시스템 설계입니다. 예약 변경, 메시징, 항공편 상태 등 실시간 업데이트를 지원합니다.

## 🔌 WebSocket 이벤트 시스템

### 핵심 이벤트 타입

#### 1. 예약 관련 이벤트
```typescript
// 예약 생성
{
  "type": "booking:created",
  "data": {
    "id": "booking_id",
    "booking": BookingData,
    "companyCode": "j1",
    "timestamp": "2025-09-28T..."
  }
}

// 예약 업데이트
{
  "type": "booking:updated",
  "data": {
    "id": "booking_id",
    "changes": Partial<BookingData>,
    "companyCode": "j1",
    "timestamp": "2025-09-28T..."
  }
}

// 예약 삭제
{
  "type": "booking:deleted",
  "data": {
    "id": "booking_id",
    "companyCode": "j1",
    "timestamp": "2025-09-28T..."
  }
}

// 대량 예약 처리
{
  "type": "booking:bulk-created",
  "data": {
    "count": 10,
    "companyCode": "j1",
    "summary": "10 bookings imported"
  }
}
```

#### 2. 메시징 이벤트
```typescript
// 새 메시지
{
  "type": "message:new",
  "data": {
    "id": "message_id",
    "conversationId": "conv_id",
    "senderId": "user_id",
    "content": "메시지 내용",
    "type": "TEXT",
    "timestamp": "2025-09-28T..."
  }
}

// 메시지 읽음
{
  "type": "message:read",
  "data": {
    "messageId": "message_id",
    "userId": "user_id",
    "readAt": "2025-09-28T..."
  }
}

// 타이핑 중
{
  "type": "typing:start",
  "data": {
    "conversationId": "conv_id",
    "userId": "user_id",
    "userName": "사용자명"
  }
}

{
  "type": "typing:stop",
  "data": {
    "conversationId": "conv_id",
    "userId": "user_id"
  }
}
```

#### 3. 사용자 상태 이벤트
```typescript
// 온라인 상태 변경
{
  "type": "presence:update",
  "data": {
    "userId": "user_id",
    "status": "ONLINE" | "AWAY" | "BUSY" | "OFFLINE",
    "lastSeenAt": "2025-09-28T..."
  }
}

// 사용자 접속
{
  "type": "user:connected",
  "data": {
    "userId": "user_id",
    "companyCode": "j1"
  }
}

// 사용자 접속 해제
{
  "type": "user:disconnected",
  "data": {
    "userId": "user_id",
    "companyCode": "j1"
  }
}
```

#### 4. 항공편 상태 이벤트
```typescript
// 항공편 지연
{
  "type": "flight:delay",
  "data": {
    "flightNumber": "KE001",
    "bookingIds": ["booking1", "booking2"],
    "delay": 30, // minutes
    "newDepartureTime": "2025-09-28T15:30:00Z",
    "reason": "Weather conditions"
  }
}

// 항공편 취소
{
  "type": "flight:cancelled",
  "data": {
    "flightNumber": "KE001",
    "bookingIds": ["booking1", "booking2"],
    "reason": "Technical issues"
  }
}

// 항공편 상태 업데이트
{
  "type": "flight:status-update",
  "data": {
    "flightNumber": "KE001",
    "status": "BOARDING" | "DEPARTED" | "ARRIVED",
    "gate": "A12",
    "terminal": "T1"
  }
}
```

#### 5. 승인 워크플로우 이벤트
```typescript
// 승인 요청 생성
{
  "type": "approval:requested",
  "data": {
    "id": "approval_id",
    "requesterId": "user_id",
    "approverIds": ["approver1", "approver2"],
    "title": "예약 승인 요청",
    "amount": 1000000,
    "targetType": "BOOKING"
  }
}

// 승인 처리
{
  "type": "approval:approved",
  "data": {
    "id": "approval_id",
    "approverId": "approver_id",
    "comment": "승인 완료"
  }
}

// 승인 거부
{
  "type": "approval:rejected",
  "data": {
    "id": "approval_id",
    "approverId": "approver_id",
    "comment": "예산 초과로 거부"
  }
}
```

## 🏗️ 아키텍처 설계

### 1. WebSocket 서버 구조
```
packages/api/src/websocket/
├── server.ts           # WebSocket 서버 설정
├── handlers/
│   ├── connection.ts   # 연결 관리
│   ├── booking.ts      # 예약 이벤트
│   ├── message.ts      # 메시징 이벤트
│   ├── presence.ts     # 사용자 상태
│   └── flight.ts       # 항공편 이벤트
├── middleware/
│   ├── auth.ts         # WebSocket 인증
│   └── rateLimit.ts    # 요청 제한
├── services/
│   ├── EventBroadcast.ts  # 이벤트 브로드캐스트
│   ├── RoomManager.ts     # 룸 관리
│   └── ConnectionManager.ts # 연결 관리
└── types/
    └── events.ts       # 이벤트 타입 정의
```

### 2. 연결 관리 시스템
```typescript
class ConnectionManager {
  private connections = new Map<string, Socket>();
  private userRooms = new Map<string, Set<string>>();

  // 사용자별 연결 관리
  addConnection(userId: string, socket: Socket) {
    this.connections.set(userId, socket);

    // 회사별 룸 참여
    const companyRoom = `company:${user.companyCode}`;
    socket.join(companyRoom);

    // 사용자별 개인 룸
    socket.join(`user:${userId}`);
  }

  // 특정 사용자에게 메시지 전송
  sendToUser(userId: string, event: string, data: any) {
    const socket = this.connections.get(userId);
    if (socket) {
      socket.emit(event, data);
    }
  }

  // 회사 전체에게 브로드캐스트
  broadcastToCompany(companyCode: string, event: string, data: any) {
    this.io.to(`company:${companyCode}`).emit(event, data);
  }
}
```

### 3. 이벤트 발행 시스템
```typescript
class EventBroadcaster {
  // 예약 변경 시 브로드캐스트
  async broadcastBookingUpdate(booking: Booking, action: 'created' | 'updated' | 'deleted') {
    const event = {
      type: `booking:${action}`,
      data: {
        id: booking.id,
        booking: action === 'deleted' ? undefined : booking,
        companyCode: booking.companyCode,
        timestamp: new Date().toISOString()
      }
    };

    // 같은 회사 사용자들에게 브로드캐스트
    this.connectionManager.broadcastToCompany(
      booking.companyCode,
      'booking-update',
      event
    );
  }

  // 메시지 전송 시 브로드캐스트
  async broadcastMessage(message: Message) {
    const participants = await this.getConversationParticipants(message.conversationId);

    participants.forEach(participant => {
      this.connectionManager.sendToUser(participant.userId, 'new-message', {
        type: 'message:new',
        data: message
      });
    });
  }
}
```

## 🔐 인증 및 보안

### WebSocket 인증
```typescript
// WebSocket 연결 시 JWT 토큰 검증
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    const payload = jwt.verify(token, JWT_SECRET);

    const user = await getUserById(payload.userId);
    if (!user) {
      throw new Error('User not found');
    }

    socket.userId = user.id;
    socket.companyCode = user.companyCode;
    socket.userRole = user.role;

    next();
  } catch (error) {
    next(new Error('Authentication failed'));
  }
});
```

### 권한 검증
```typescript
// 회사별 데이터 접근 제한
function checkCompanyAccess(socket: Socket, targetCompanyCode: string) {
  if (socket.companyCode !== targetCompanyCode) {
    throw new Error('Unauthorized access');
  }
}

// 역할별 권한 검증
function checkRolePermission(socket: Socket, requiredRole: UserRole) {
  const roleHierarchy = ['USER', 'MANAGER', 'ADMIN'];
  const userLevel = roleHierarchy.indexOf(socket.userRole);
  const requiredLevel = roleHierarchy.indexOf(requiredRole);

  if (userLevel < requiredLevel) {
    throw new Error('Insufficient permissions');
  }
}
```

## 📱 클라이언트 연동

### WebSocket 클라이언트 (프론트엔드)
```typescript
// 연결 설정
const socket = io('ws://localhost:4002', {
  auth: {
    token: localStorage.getItem('authToken')
  }
});

// 예약 업데이트 구독
socket.on('booking-update', (event) => {
  switch (event.type) {
    case 'booking:created':
      // SWR 캐시 업데이트
      mutate('/api/bookings');
      showNotification('새 예약이 생성되었습니다.');
      break;

    case 'booking:updated':
      // 특정 예약 데이터 업데이트
      mutate(`/api/bookings/${event.data.id}`);
      break;

    case 'booking:deleted':
      // 목록에서 제거
      mutate('/api/bookings');
      break;
  }
});

// 메시지 수신
socket.on('new-message', (event) => {
  // 메시지 목록 업데이트
  mutate(`/api/conversations/${event.data.conversationId}/messages`);

  // 알림 표시
  showMessageNotification(event.data);
});

// 항공편 지연 알림
socket.on('flight-delay', (event) => {
  showAlert(`항공편 ${event.data.flightNumber}이 ${event.data.delay}분 지연되었습니다.`);

  // 관련 예약들 업데이트
  event.data.bookingIds.forEach(bookingId => {
    mutate(`/api/bookings/${bookingId}`);
  });
});
```

## 🎛️ 모니터링 및 관리

### 연결 상태 모니터링
```typescript
// 활성 연결 수 추적
setInterval(() => {
  const stats = {
    totalConnections: io.sockets.sockets.size,
    connectionsByCompany: getConnectionsByCompany(),
    averageLatency: calculateAverageLatency()
  };

  console.log('WebSocket Stats:', stats);

  // 메트릭 저장
  saveMetrics(stats);
}, 30000);

// 연결 품질 모니터링
socket.on('pong', (latency) => {
  trackLatency(socket.userId, latency);
});
```

### 이벤트 로깅
```typescript
// 모든 WebSocket 이벤트 로깅
io.on('connection', (socket) => {
  socket.onAny((eventName, data) => {
    logger.info('WebSocket Event', {
      userId: socket.userId,
      companyCode: socket.companyCode,
      event: eventName,
      data: sanitizeLogData(data),
      timestamp: new Date().toISOString()
    });
  });
});
```

## 🔄 Outbox 패턴 통합

### 이벤트 발행 보장
```typescript
// 데이터베이스 변경과 함께 Outbox에 이벤트 저장
async function createBookingWithEvent(bookingData: CreateBookingDto) {
  return await prisma.$transaction(async (tx) => {
    // 1. 예약 생성
    const booking = await tx.booking.create({
      data: bookingData
    });

    // 2. Outbox에 이벤트 저장
    await tx.outbox.create({
      data: {
        eventType: 'booking:created',
        payload: booking,
        status: 'PENDING'
      }
    });

    return booking;
  });
}

// Outbox 처리기가 이벤트를 WebSocket으로 브로드캐스트
async function processOutboxEvents() {
  const pendingEvents = await prisma.outbox.findMany({
    where: { status: 'PENDING' },
    take: 100
  });

  for (const event of pendingEvents) {
    try {
      // WebSocket 브로드캐스트
      await eventBroadcaster.broadcast(event.eventType, event.payload);

      // 성공 시 상태 업데이트
      await prisma.outbox.update({
        where: { id: event.id },
        data: { status: 'PUBLISHED' }
      });
    } catch (error) {
      // 실패 시 상태 업데이트
      await prisma.outbox.update({
        where: { id: event.id },
        data: { status: 'FAILED' }
      });
    }
  }
}
```

## 📋 구현 체크리스트

### Phase 1: 기본 WebSocket 서버
- [ ] Socket.io 서버 설정
- [ ] JWT 인증 미들웨어
- [ ] 연결 관리 시스템
- [ ] 기본 이벤트 핸들러

### Phase 2: 예약 실시간 업데이트
- [ ] 예약 CRUD 이벤트
- [ ] 회사별 브로드캐스트
- [ ] 프론트엔드 연동

### Phase 3: 메시징 시스템
- [ ] 메시지 실시간 전송
- [ ] 읽음 상태 동기화
- [ ] 타이핑 인디케이터

### Phase 4: 고급 기능
- [ ] 항공편 상태 알림
- [ ] 승인 워크플로우 알림
- [ ] 사용자 상태 관리

### Phase 5: 모니터링 & 최적화
- [ ] 성능 모니터링
- [ ] 에러 핸들링
- [ ] 스케일링 준비

---
**문서 버전**: 1.0.0
**작성일**: 2025-09-28
**상태**: 📋 **설계 완료**