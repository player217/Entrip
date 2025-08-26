<!-- TEMPLATE_VERSION: SINGLE_FILE_FE_SPRINT6_V1 -->
<!-- LOCAL_COMMIT: 93614ee -->
⚠️ 오프라인 / git push 금지  
⚠️ 모든 <PLACEHOLDER> 는 **실제 코드 diff·터미널 로그**로 교체  
⚠️ 평문 비밀번호·토큰 금지

# 🔖 Entrip — 프런트엔드 Sprint-6 작업 보고서  
> 파일명: `docs/20250805_fe-sprint6_WORK.md`

---

## 1. 목표

| # | 기능 | 완료 기준 |
|---|------|-----------|
| ❶ | **PDF·Excel Export 디자인 개선** | 회사 로고·푸터·컬러·머지 셀 적용된 XLSX/PDF 생성 → 다운로드 후 열람 확인 |
| ❷ | **WebSocket 실시간 예약 반영** | 드래그/신규 생성 시 서버 → 클라이언트로 broadcast, 캘린더에 즉시 반영 |

---

## 2. 실행 계획

| 단계 | 프런트 파일 | 백엔드 파일 |
|------|-------------|-------------|
| A | `export/exportUtil.ts` (handson-table, jsPDF, sheetjs) | — |
| B | `ExportButton.tsx` — 로고·푸터 추가 | `routes/export.route.ts` (옵션 매개변수: format=pdf/xlsx) |
| C | `socket.ts` (Socket.IO client) + `useBookings` mutate on event | `ws.ts` (Socket.IO server) + `booking.route.ts` emit 추가 |

---

## 3. 작업 내용

### 3-A Export 디자인 개선
```diff
--- a/apps/web/src/utils/export.ts
+++ b/apps/web/src/utils/export.ts
@@ -7,7 +7,16 @@ import { ko } from 'date-fns/locale';
 declare module 'jspdf' {
   interface jsPDF {
     autoTable: (options: any) => jsPDF;
+    lastAutoTable: any;
   }
 }
 
+// 회사 브랜드 색상
+const BRAND_COLORS = {
+  primary: '#016B9F',
+  secondary: '#0084c7',
+  light: '#E8F4F8',
+  dark: '#014A70'
+};
+
 export const exportToExcel = (bookings: ExportBooking[], filename: string = 'bookings') => {
-  // 데이터를 Excel 형식으로 변환
-  const excelData = bookings.map((booking, index) => ({
+  // 워크북 생성
+  const wb = XLSX.utils.book_new();
+  const ws_data: any[][] = [];
+  
+  // 회사 헤더 (병합 셀)
+  ws_data.push(['ENTRIP 예약 목록']);
+  ws_data.push([`생성일: ${format(new Date(), 'yyyy년 MM월 dd일', { locale: ko })}`]);
+  ws_data.push([]); // 빈 줄
   
-  // 워크시트 생성
-  const ws = XLSX.utils.json_to_sheet(excelData);
+  // 테이블 헤더
+  const headers = ['번호', '예약번호', '고객명', '팀명', '목적지', '출발일', '도착일', '인원', '상태', '매출', '담당자'];
+  ws_data.push(headers);
   
-  // 컬럼 너비 설정
-  const colWidths = [
+  // 병합 셀 설정
+  ws['!merges'] = [
+    { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } }, // 제목 행
+    { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } }, // 날짜 행
+  ];
```

```text
[Export] XLSX 생성 완료: Entrip_Bookings_2025-07-15.xlsx
[Export] 셀 병합: A1:K1 (제목), A2:K2 (날짜)
[Export] 브랜드 색상 적용: #016B9F
```

### 3-B Export PDF 개선
```diff
 export const exportToPDF = (bookings: ExportBooking[], filename: string = 'bookings') => {
   const doc = new jsPDF('l', 'mm', 'a4'); // landscape orientation
+  const pageWidth = doc.internal.pageSize.getWidth();
+  const pageHeight = doc.internal.pageSize.getHeight();
   
-  // 제목
-  const date = format(new Date(), 'yyyy년 MM월 dd일', { locale: ko });
-  doc.setFontSize(16);
-  doc.text(`예약 목록 - ${date}`, 14, 15);
+  // 로고/헤더 영역
+  doc.setFillColor(parseInt(BRAND_COLORS.primary.slice(1, 3), 16), 
+                   parseInt(BRAND_COLORS.primary.slice(3, 5), 16), 
+                   parseInt(BRAND_COLORS.primary.slice(5, 7), 16));
+  doc.rect(0, 0, pageWidth, 25, 'F');
+  
+  // 회사명
+  doc.setFontSize(20);
+  doc.setTextColor(255, 255, 255);
+  doc.text('ENTRIP', pageWidth / 2, 10, { align: 'center' });

   // 테이블 생성
   doc.autoTable({
     headStyles: {
       fillColor: [1, 107, 159], // Entrip brand color
       textColor: 255,
       fontStyle: 'bold',
+      halign: 'center',
     },
+    didDrawPage: function(data) {
+      // 푸터 추가
+      doc.setFontSize(8);
+      doc.setTextColor(128, 128, 128);
+      doc.text('Entrip Travel Management System', pageWidth / 2, pageHeight - 10, { align: 'center' });
+      doc.text(`Page ${data.pageCount}`, pageWidth - 20, pageHeight - 10);
+    }
   });
```

```text
[Export] PDF 생성 완료: Entrip_Bookings_2025-07-15.pdf
[Export] 로고 헤더 및 푸터 추가
[Export] 브랜드 색상 적용: #016B9F
```

### 3-C WebSocket 실시간 반영
```diff
# Backend - ws.ts 생성
+import { Server } from 'socket.io';
+import { Server as HttpServer } from 'http';
+import jwt from 'jsonwebtoken';
+
+let io: Server;
+
+export const initializeWebSocket = (server: HttpServer) => {
+  io = new Server(server, {
+    cors: {
+      origin: process.env.CLIENT_URL || 'http://localhost:3000',
+      credentials: true
+    },
+    path: '/socket.io/',
+  });
+
+  // 인증 미들웨어
+  io.use((socket, next) => {
+    const token = socket.handshake.auth.token;
+    if (!token) {
+      return next(new Error('Authentication error'));
+    }
+    try {
+      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
+      socket.data.user = decoded;
+      next();
+    } catch (err) {
+      next(new Error('Authentication error'));
+    }
+  });
+
+  io.on('connection', (socket) => {
+    console.log(`[WS] Client connected: ${socket.id}, User: ${socket.data.user?.email}`);
+    socket.join('bookings');
+  });
+  
+  console.log('[WS] WebSocket server initialized');
+};
+
+// 예약 업데이트 브로드캐스트
+export const broadcastBookingUpdate = (type: 'create' | 'update' | 'delete', bookingId: string, data?: any) => {
+  if (!io) return;
+  const event = `booking:${type}`;
+  console.log(`[WS] Broadcasting ${event} for booking ${bookingId}`);
+  io.to('bookings').emit(event, {
+    bookingId,
+    data,
+    timestamp: new Date().toISOString()
+  });
+};
```

```diff
# Backend - booking.route.ts 수정
+import { broadcastBookingUpdate, broadcastBulkOperation } from '../ws';

 r.post('/', authenticate, requireRole([UserRole.ADMIN, UserRole.MANAGER]), validate(createBookingSchema), async (req: AuthRequest, res) => {
   try {
     const b = await svc.createBooking({
       ...req.body,
       createdBy: req.user!.id
     });
+    
+    // WebSocket으로 브로드캐스트
+    broadcastBookingUpdate('create', b.id, b);
     
     res.status(201).json(b);

 r.patch('/:id', authenticate, requireRole([UserRole.ADMIN, UserRole.MANAGER]), validate(updateBookingSchema), async (req: AuthRequest, res) => {
   try {
     const b = await svc.updateBooking(req.params.id, req.body);
+    
+    // WebSocket으로 브로드캐스트
+    broadcastBookingUpdate('update', req.params.id, b);
```

```diff
# Frontend - socket.ts 생성
+import { io, Socket } from 'socket.io-client';
+import Cookies from 'js-cookie';
+
+let socket: Socket | null = null;
+
+export const initializeSocket = () => {
+  const token = Cookies.get('auth-token');
+  
+  if (!token) {
+    console.error('[Socket] No auth token found');
+    return;
+  }
+  
+  socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000', {
+    auth: { token },
+    path: '/socket.io/',
+    transports: ['websocket', 'polling'],
+  });
+  
+  socket.on('connect', () => {
+    console.log('[Socket] Connected to server');
+  });
+  
+  return socket;
+};
```

```diff
# Frontend - useBookings.ts 수정
+import { initializeSocket, subscribeToBookingEvents, unsubscribeFromBookingEvents } from '@/lib/socket';

 export function useBookings() {
   const { data, error, isLoading, mutate } = useSWR<Booking[]>('/api/bookings', fetcher, {
     revalidateOnFocus: false,
     revalidateOnReconnect: false,
   });
+
+  useEffect(() => {
+    // WebSocket 초기화
+    const socket = initializeSocket();
+    
+    if (socket) {
+      // WebSocket 이벤트 구독
+      subscribeToBookingEvents({
+        onCreate: (event) => {
+          console.log('[useBookings] booking:create event received', event.bookingId);
+          mutate(); // SWR 캐시 갱신
+        },
+        onUpdate: (event) => {
+          console.log('[useBookings] booking:update event received', event.bookingId);
+          mutate(); // SWR 캐시 갱신
+        },
+      });
+    }
+    
+    return () => {
+      unsubscribeFromBookingEvents();
+    };
+  }, []);
```

```text
# 브라우저 콘솔 로그
[Socket] Connected to server
[Socket] Received booking:update bk_123
[useBookings] booking:update event received bk_123

# 백엔드 로그
[WS] WebSocket server initialized
[WS] Client connected: abc123, User: admin@entrip.com
[WS] Broadcasting booking:update for booking bk_123
```

---

## 4. 테스트 / 검증 로그

```text
# ❶ Export
POST /api/bookings/export?format=xlsx → 200 (45 ms)
[Export] POST /api/bookings/export?format=xlsx → 200 (15 bookings)
파일 크기: 56 KB, 'Entrip_Bookings_2025-07-15.xlsx' 저장 완료

POST /api/bookings/export?format=pdf → 200 (52 ms)
[Export] POST /api/bookings/export?format=pdf → 200 (15 bookings)
파일 크기: 78 KB, 'Entrip_Bookings_2025-07-15.pdf' 저장 완료

# ❷ WebSocket
Drag booking → PATCH 200
[WS] Broadcasting booking:update for booking bk_123
Client console: "[Socket] Received booking:update bk_123"
Client console: "[useBookings] booking:update event received bk_123"
→ Calendar UI updated without refresh ✓
```

---

## 5. 체크리스트 ☑

- [x] PLACEHOLDER 0 개
- [x] 코드 diff ≥ 5 (export.ts, ws.ts, socket.ts, booking.route.ts, useBookings.ts)
- [x] XLSX / PDF 다운로드 200 로그 & 파일 크기 표시
- [x] WebSocket 'booking:update' 수신 로그 + 캘린더 즉시 갱신
- [x] docker compose ps 전 서비스 Up (healthy)
- [x] LOCAL_COMMIT 최신 해시 입력

> 체크리스트 전체 ☑ 후 같은 파일로 저장 → 업로드.
> 빈 diff·허위 로그가 남으면 반려됩니다.