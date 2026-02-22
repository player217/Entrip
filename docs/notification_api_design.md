# Notification API 설계 문서

**작성일**: 2025-10-01
**프로젝트**: Entrip Travel Management System v2
**API 버전**: v2
**상태**: ✅ **설계 승인 대기**

## 📋 Executive Summary

Notification 시스템의 RESTful API를 설계합니다. Multi-tenant 환경에서 안전하고 효율적인 알림 관리를 제공하며, 향후 WebSocket 실시간 통합을 고려한 확장 가능한 구조입니다.

## 🎯 설계 목표

1. **Multi-tenancy 보안**: companyCode 기반 완전 격리
2. **성능 최적화**: 인덱스 활용, 페이징, 캐싱
3. **확장성**: WebSocket 통합 준비
4. **일관성**: 기존 API 패턴 준수 (auth, bookings)
5. **타입 안전성**: Zod DTO validation

## 📚 API 엔드포인트 목록

### 1. Notification 관리

| Method | Endpoint | 설명 | 인증 | 캐싱 |
|--------|----------|------|------|------|
| GET | `/api/v2/notifications` | 알림 목록 조회 (페이징, 필터) | ✅ | 60초 |
| GET | `/api/v2/notifications/unread-count` | 읽지 않은 알림 수 | ✅ | 30초 |
| GET | `/api/v2/notifications/:id` | 알림 상세 조회 | ✅ | 120초 |
| PATCH | `/api/v2/notifications/:id/read` | 단건 읽음 처리 | ✅ | 캐시 무효화 |
| PATCH | `/api/v2/notifications/read-all` | 전체/조건부 읽음 처리 | ✅ | 캐시 무효화 |
| DELETE | `/api/v2/notifications/:id` | 알림 삭제 (soft) | ✅ | 캐시 무효화 |

### 2. Notification Preferences 관리

| Method | Endpoint | 설명 | 인증 | 캐싱 |
|--------|----------|------|------|------|
| GET | `/api/v2/notifications/preferences` | 설정 조회 | ✅ | 300초 |
| PUT | `/api/v2/notifications/preferences` | 설정 업데이트 | ✅ | 캐시 무효화 |

## 🔐 인증 및 권한

### 미들웨어 체인
```typescript
router.use(authMiddleware);           // JWT 토큰 검증
router.use(extractCompanyCode);       // companyCode 추출
router.use(validateCompanyAccess);    // Multi-tenancy 검증
```

### Rate Limiting
- **기본**: 100 req/min per user
- **읽음 처리**: 200 req/min (높은 빈도 허용)
- **생성/삭제**: 50 req/min (제한적)

## 📝 상세 API 스펙

### 1. GET /api/v2/notifications

**설명**: 사용자의 알림 목록을 조회합니다.

**Query Parameters**:
```typescript
{
  page?: number;          // 페이지 번호 (default: 1)
  limit?: number;         // 페이지당 개수 (default: 20, max: 100)
  type?: NotificationType; // 알림 타입 필터
  priority?: NotificationPriority; // 우선순위 필터
  isRead?: boolean;       // 읽음 상태 필터
  orderBy?: 'createdAt' | 'priority' | 'expiresAt'; // 정렬 기준
  order?: 'asc' | 'desc'; // 정렬 방향 (default: desc)
}
```

**Response 200**:
```json
{
  "success": true,
  "data": [
    {
      "id": "cm...",
      "type": "BOOKING_CREATED",
      "priority": "NORMAL",
      "title": "새 예약 생성",
      "message": "김철수님의 예약이 생성되었습니다",
      "data": { "bookingId": "..." },
      "isRead": false,
      "linkUrl": "/bookings/...",
      "channel": "IN_APP",
      "expiresAt": "2025-10-08T00:00:00.000Z",
      "createdAt": "2025-10-01T10:00:00.000Z",
      "readAt": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

**Business Logic**:
- userId로 필터링 (req.userId)
- companyCode로 격리 (req.companyCode)
- deletedAt이 null인 항목만 (soft delete)
- 만료된 알림 제외 (`expiresAt > now()` OR `expiresAt IS NULL`)
- 인덱스 활용: `[userId, isRead]`, `[companyCode]`, `[createdAt]`

**Error Responses**:
- 401: 인증 실패
- 403: companyCode 불일치
- 400: 잘못된 쿼리 파라미터

---

### 2. GET /api/v2/notifications/unread-count

**설명**: 읽지 않은 알림 개수를 반환합니다.

**Query Parameters**: 없음

**Response 200**:
```json
{
  "success": true,
  "data": {
    "unreadCount": 12,
    "byPriority": {
      "URGENT": 2,
      "HIGH": 3,
      "NORMAL": 7,
      "LOW": 0
    },
    "byType": {
      "BOOKING_CREATED": 4,
      "MESSAGE_RECEIVED": 5,
      "APPROVAL_REQUESTED": 3
    }
  }
}
```

**Business Logic**:
- `isRead = false` AND `deletedAt IS NULL`
- 만료되지 않은 알림만
- 우선순위/타입별 집계 제공
- 인덱스 활용: `[userId, isRead]`

**Performance**:
- 캐싱: 30초 TTL
- 복합 쿼리 최적화 필요

---

### 3. GET /api/v2/notifications/:id

**설명**: 특정 알림의 상세 정보를 조회합니다.

**Path Parameters**:
- `id`: Notification ID (cuid)

**Response 200**:
```json
{
  "success": true,
  "data": {
    "id": "cm...",
    "type": "APPROVAL_REQUESTED",
    "priority": "URGENT",
    "title": "승인 요청",
    "message": "새로운 예약 승인이 요청되었습니다",
    "data": {
      "bookingId": "...",
      "requesterId": "...",
      "amount": 5000000
    },
    "isRead": false,
    "readAt": null,
    "channel": "IN_APP",
    "linkUrl": "/approvals/...",
    "expiresAt": "2025-10-03T00:00:00.000Z",
    "createdAt": "2025-10-01T14:30:00.000Z",
    "updatedAt": "2025-10-01T14:30:00.000Z"
  }
}
```

**Business Logic**:
- ID로 조회
- userId 일치 검증
- companyCode 일치 검증
- deletedAt이 null인지 확인

**Error Responses**:
- 404: 알림 없음 또는 다른 사용자 소유
- 403: companyCode 불일치

---

### 4. PATCH /api/v2/notifications/:id/read

**설명**: 특정 알림을 읽음으로 표시합니다.

**Path Parameters**:
- `id`: Notification ID

**Request Body**: 없음 (또는 empty JSON `{}`)

**Response 200**:
```json
{
  "success": true,
  "data": {
    "id": "cm...",
    "isRead": true,
    "readAt": "2025-10-01T15:00:00.000Z"
  }
}
```

**Business Logic**:
- `isRead = true`, `readAt = now()` 업데이트
- userId, companyCode 검증
- 이미 읽음 처리된 경우 중복 업데이트 허용 (멱등성)
- 캐시 무효화: `notifications-${userId}`

**Error Responses**:
- 404: 알림 없음
- 403: 권한 없음

---

### 5. PATCH /api/v2/notifications/read-all

**설명**: 조건에 맞는 모든 알림을 읽음 처리합니다.

**Request Body**:
```typescript
{
  type?: NotificationType;     // 특정 타입만
  priority?: NotificationPriority; // 특정 우선순위만
  beforeDate?: string;         // ISO 8601 날짜 이전 알림만
}
```

**Response 200**:
```json
{
  "success": true,
  "data": {
    "updatedCount": 15
  }
}
```

**Business Logic**:
- userId, companyCode 필터
- `isRead = false` AND `deletedAt IS NULL`
- 조건 있으면 추가 필터 적용
- Bulk update with Prisma
- 캐시 무효화: 전체

**Error Responses**:
- 400: 잘못된 날짜 형식

---

### 6. DELETE /api/v2/notifications/:id

**설명**: 알림을 삭제합니다 (soft delete).

**Path Parameters**:
- `id`: Notification ID

**Response 200**:
```json
{
  "success": true,
  "data": {
    "id": "cm...",
    "deletedAt": "2025-10-01T16:00:00.000Z"
  }
}
```

**Business Logic**:
- `deletedAt = now()` 업데이트 (soft delete)
- Physical delete는 관리자 전용 또는 스케줄러에서만
- userId, companyCode 검증
- 캐시 무효화

**Error Responses**:
- 404: 알림 없음
- 403: 권한 없음

---

### 7. GET /api/v2/notifications/preferences

**설명**: 사용자의 알림 설정을 조회합니다.

**Response 200**:
```json
{
  "success": true,
  "data": {
    "id": "cm...",
    "userId": "cm...",
    "pushEnabled": true,
    "emailEnabled": true,
    "smsEnabled": false,
    "inAppEnabled": true,
    "bookingNotifications": true,
    "messageNotifications": true,
    "approvalNotifications": true,
    "paymentNotifications": true,
    "systemNotifications": true,
    "createdAt": "2025-09-15T00:00:00.000Z",
    "updatedAt": "2025-10-01T10:00:00.000Z"
  }
}
```

**Business Logic**:
- userId로 조회
- 없으면 기본값으로 생성 후 반환
- companyCode 검증

**Error Responses**:
- 401: 인증 실패

---

### 8. PUT /api/v2/notifications/preferences

**설명**: 알림 설정을 업데이트합니다.

**Request Body**:
```typescript
{
  pushEnabled?: boolean;
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  inAppEnabled?: boolean;
  bookingNotifications?: boolean;
  messageNotifications?: boolean;
  approvalNotifications?: boolean;
  paymentNotifications?: boolean;
  systemNotifications?: boolean;
}
```

**Validation**:
- 모든 필드 optional
- Boolean 타입 검증

**Response 200**:
```json
{
  "success": true,
  "data": {
    "id": "cm...",
    "userId": "cm...",
    "pushEnabled": true,
    "emailEnabled": false,
    // ... 업데이트된 전체 설정
    "updatedAt": "2025-10-01T16:30:00.000Z"
  }
}
```

**Business Logic**:
- userId로 조회 → upsert
- 변경된 필드만 업데이트
- 캐시 무효화

---

## 📦 DTO 정의 (Zod)

### NotificationListQueryDto
```typescript
import { z } from 'zod';
import { NotificationType, NotificationPriority } from '@prisma/client';

export const NotificationListQueryDto = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  type: z.nativeEnum(NotificationType).optional(),
  priority: z.nativeEnum(NotificationPriority).optional(),
  isRead: z.coerce.boolean().optional(),
  orderBy: z.enum(['createdAt', 'priority', 'expiresAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type NotificationListQuery = z.infer<typeof NotificationListQueryDto>;
```

### NotificationReadAllDto
```typescript
export const NotificationReadAllDto = z.object({
  type: z.nativeEnum(NotificationType).optional(),
  priority: z.nativeEnum(NotificationPriority).optional(),
  beforeDate: z.string().datetime().optional(),
});

export type NotificationReadAllInput = z.infer<typeof NotificationReadAllDto>;
```

### NotificationPreferenceUpdateDto
```typescript
export const NotificationPreferenceUpdateDto = z.object({
  pushEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
  bookingNotifications: z.boolean().optional(),
  messageNotifications: z.boolean().optional(),
  approvalNotifications: z.boolean().optional(),
  paymentNotifications: z.boolean().optional(),
  systemNotifications: z.boolean().optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update'
});

export type NotificationPreferenceUpdateInput = z.infer<typeof NotificationPreferenceUpdateDto>;
```

---

## 🔄 서비스 레이어 설계

### NotificationsService

```typescript
class NotificationsService {
  // 알림 목록 조회 (페이징, 필터)
  async findAll(
    userId: string,
    companyCode: string,
    filters: NotificationFilters,
    options: PaginationOptions
  ): Promise<PaginatedResult<Notification>>;

  // 읽지 않은 알림 수
  async getUnreadCount(userId: string, companyCode: string): Promise<UnreadCountResult>;

  // 단건 조회
  async findById(id: string, userId: string, companyCode: string): Promise<Notification>;

  // 읽음 처리 (단건)
  async markAsRead(id: string, userId: string, companyCode: string): Promise<Notification>;

  // 읽음 처리 (조건부 bulk)
  async markAllAsRead(
    userId: string,
    companyCode: string,
    conditions?: ReadAllConditions
  ): Promise<{ count: number }>;

  // 삭제 (soft delete)
  async softDelete(id: string, userId: string, companyCode: string): Promise<Notification>;

  // 설정 조회 (없으면 기본값 생성)
  async getPreferences(userId: string, companyCode: string): Promise<NotificationPreference>;

  // 설정 업데이트 (upsert)
  async updatePreferences(
    userId: string,
    companyCode: string,
    data: NotificationPreferenceUpdateInput
  ): Promise<NotificationPreference>;
}
```

### Prisma 쿼리 최적화

```typescript
// 알림 목록 조회 예시
const notifications = await prisma.notification.findMany({
  where: {
    userId,
    companyCode,
    deletedAt: null,
    OR: [
      { expiresAt: null },
      { expiresAt: { gt: new Date() } }
    ],
    // 필터 조건 추가
    ...(filters.type && { type: filters.type }),
    ...(filters.priority && { priority: filters.priority }),
    ...(filters.isRead !== undefined && { isRead: filters.isRead }),
  },
  orderBy: {
    [options.orderBy]: options.order
  },
  skip: (options.page - 1) * options.limit,
  take: options.limit,
});

// 인덱스 활용:
// - [userId, isRead]: isRead 필터 시
// - [companyCode]: multi-tenancy
// - [createdAt]: 정렬 최적화
```

---

## 🎨 응답 형식 표준화

### 성공 응답
```typescript
{
  success: true,
  data: T | T[],
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }
}
```

### 에러 응답
```typescript
{
  success: false,
  error: 'ERROR_CODE',
  message: 'Human-readable error message',
  details?: any // Validation errors 등
}
```

### HTTP 상태 코드
- 200: 성공
- 201: 생성 성공 (현재 API에서는 미사용, 시스템 내부 생성만)
- 400: Bad Request (검증 실패)
- 401: Unauthorized (인증 실패)
- 403: Forbidden (권한 없음, companyCode 불일치)
- 404: Not Found (리소스 없음)
- 429: Too Many Requests (rate limit)
- 500: Internal Server Error

---

## 🧪 테스트 전략

### 1. 단위 테스트
**파일**: `packages/api/src/routes/notifications/__tests__/notifications.service.test.ts`

**테스트 케이스**:
- findAll: 페이징, 필터, 정렬
- getUnreadCount: 집계 정확도
- markAsRead: 멱등성
- markAllAsRead: bulk update
- softDelete: soft delete 검증

### 2. 통합 테스트
**파일**: `packages/api/src/routes/notifications/__tests__/notifications.route.test.ts`

**테스트 시나리오**:
- GET /notifications: 200, 페이징, 필터
- GET /notifications/:id: 200, 404, 403
- PATCH /notifications/:id/read: 200, 404, 멱등성
- PATCH /notifications/read-all: 200, bulk 검증
- DELETE /notifications/:id: 200, 404
- GET /preferences: 200, 기본값 생성
- PUT /preferences: 200, upsert

### 3. E2E 테스트
**파일**: `scripts/test-notifications.sh`

```bash
#!/bin/bash
# Notification API E2E Test

# 1. 로그인
TOKEN=$(curl -X POST http://localhost:4005/api/v2/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@j1.com","password":"pass1234"}' \
  | jq -r '.data.token')

# 2. 알림 목록 조회
curl -X GET "http://localhost:4005/api/v2/notifications?limit=10" \
  -H "Authorization: Bearer $TOKEN"

# 3. 읽지 않은 알림 수
curl -X GET "http://localhost:4005/api/v2/notifications/unread-count" \
  -H "Authorization: Bearer $TOKEN"

# 4. 읽음 처리
NOTIFICATION_ID=$(curl -X GET "http://localhost:4005/api/v2/notifications?limit=1" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.data[0].id')

curl -X PATCH "http://localhost:4005/api/v2/notifications/$NOTIFICATION_ID/read" \
  -H "Authorization: Bearer $TOKEN"

# 5. 전체 읽음 처리
curl -X PATCH "http://localhost:4005/api/v2/notifications/read-all" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"MESSAGE_RECEIVED"}'

# 6. 설정 조회
curl -X GET "http://localhost:4005/api/v2/notifications/preferences" \
  -H "Authorization: Bearer $TOKEN"

# 7. 설정 업데이트
curl -X PUT "http://localhost:4005/api/v2/notifications/preferences" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"emailEnabled":false,"smsEnabled":true}'
```

---

## 🚀 WebSocket 통합 계획 (Phase 2+)

### 이벤트 정의
```typescript
// 서버 → 클라이언트
'notification:new': (notification: Notification) => void;
'notification:read': (notificationId: string) => void;
'notification:deleted': (notificationId: string) => void;

// 클라이언트 → 서버
'notification:subscribe': (userId: string) => void;
'notification:unsubscribe': () => void;
```

### 구현 순서
1. API 완료 및 검증
2. WebSocket 이벤트 핸들러 작성
3. 클라이언트 연동
4. 실시간 동기화 테스트

---

## 📊 성능 최적화

### 캐싱 전략
```typescript
// Redis 캐싱 키 구조
'notifications-list-${userId}-${page}-${filters}'  // 60s TTL
'notifications-unread-${userId}'                   // 30s TTL
'notifications-item-${id}'                         // 120s TTL
'notifications-preferences-${userId}'              // 300s TTL
```

### 인덱스 활용
- `@@index([userId, isRead])`: 읽지 않은 알림 조회
- `@@index([companyCode])`: Multi-tenancy 격리
- `@@index([createdAt])`: 시간순 정렬
- `@@index([expiresAt])`: 만료 알림 필터링

### Bulk Operations
- `markAllAsRead`: Prisma updateMany 사용
- 배치 크기 제한: 1000개

---

## 📝 구현 체크리스트

### Phase 1: 기본 구현
- [ ] NotificationListQueryDto, NotificationReadAllDto, NotificationPreferenceUpdateDto 작성
- [ ] notifications.service.ts 작성 (8개 메서드)
- [ ] notifications.controller.ts 작성 (8개 핸들러)
- [ ] notifications.route.ts 작성 (미들웨어 체인)
- [ ] index.ts에 라우트 등록

### Phase 2: 테스트
- [ ] 단위 테스트 작성 (service)
- [ ] 통합 테스트 작성 (routes)
- [ ] E2E 스크립트 작성 (test-notifications.sh)
- [ ] 테스트 커버리지 80% 이상

### Phase 3: 최적화
- [ ] 캐싱 적용 (Redis/In-Memory)
- [ ] 인덱스 성능 검증
- [ ] Bulk operation 성능 테스트

### Phase 4: 문서화
- [ ] Swagger 문서 업데이트
- [ ] API 사용 가이드 작성
- [ ] 검증 보고서 작성

---

## 🎯 다음 단계

1. **이 설계 문서 승인** → 구현 시작
2. **Messaging API 설계** (병행)
3. **WebSocket 통합 계획 갱신**
4. **프론트엔드 연동 준비**

---

**문서 버전**: 1.0.0
**작성자**: Claude Code
**최종 검토**: 2025-10-01
**상태**: ✅ **승인 대기**
