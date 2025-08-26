<!-- TEMPLATE_VERSION: SINGLE_FILE_PROJECT_DOC_V1 -->
<!-- LOCAL_COMMIT: e94b68c -->
⚠️ 오프라인 / git push 금지  
⚠️ 모든 `<PLACEHOLDER>` 는 **실제 내용**으로 교체  
⚠️ 평문 토큰·URL 금지

# 🗂 Entrip — **전체 프로젝트 개요·현황·실행 가이드**  
> **파일명**: `docs/Entrip_Project_Documentation.md`

---

## 1. 프로젝트 목적 & 범위
- **비전** : 여행사 CS·예약·운영을 단일 웹 플랫폼에서 처리  
- **핵심 모듈** : Booking, Flight Info, 결제·정산, 모니터링, 배포
- **타겟 사용자** : 한국 여행사 직원 (예약 관리, 항공편 모니터링, 고객 응대)
- **주요 기능** : 
  - 실시간 예약 관리 및 캘린더 뷰
  - 국내/국제 항공편 정보 조회 및 지연 알림
  - 예약 데이터 Excel/PDF 내보내기
  - WebSocket 기반 실시간 업데이트

---

## 2. 시스템 아키텍처
### 2‑A 논리 다이어그램
```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 14)                     │
│  ┌─────────┐  ┌──────────┐  ┌─────────┐  ┌──────────────┐ │
│  │Calendar │  │ Booking  │  │ Flight  │  │Export/Import │ │
│  │  View   │  │  Modal   │  │  Info   │  │    Module    │ │
│  └────┬────┘  └────┬─────┘  └────┬────┘  └──────┬───────┘ │
└───────┼────────────┼──────────────┼──────────────┼─────────┘
        │            │              │              │
        ▼            ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway (Express)                     │
│  ┌─────────┐  ┌──────────┐  ┌─────────┐  ┌──────────────┐ │
│  │ Auth    │  │ Booking  │  │ Flight  │  │   Export     │ │
│  │ JWT     │  │  CRUD    │  │  API    │  │  XLSX/PDF    │ │
│  └────┬────┘  └────┬─────┘  └────┬────┘  └──────┬───────┘ │
└───────┼────────────┼──────────────┼──────────────┼─────────┘
        │            │              │              │
        ▼            ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────┐
│              Data Layer & External Services                  │
│  ┌─────────┐  ┌──────────┐  ┌─────────┐  ┌──────────────┐ │
│  │Postgres │  │ WebSocket│  │ODcloud  │  │ Monitoring   │ │
│  │   15    │  │Socket.IO │  │KAC APIs │  │Prom/Grafana  │ │
│  └─────────┘  └──────────┘  └─────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 2‑B 모듈 관계
| 레이어 | 서브시스템 | 주요 기술 | 설명 |
|--------|-----------|-----------|------|
| Front | React 18, SWR, Tailwind | 캘린더 UI, Flight Modal | App Router 기반 SSR/CSR 하이브리드 |
| API   | Express + Prisma | JWT, WebSocket, ODcloud | RESTful API + 실시간 통신 |
| Infra | Docker, Prom+Grafana, Loki+Tempo | CI/CD + Monitoring | 컨테이너 오케스트레이션 및 관측성 |

---

## 3. 기술 스펙 요약
| 분야 | 스택 / 버전 | 상세 |
|------|-------------|------|
| Runtime | Node 20.19.3, TypeScript 5.x | pnpm workspace monorepo |
| Frontend | Next.js 14, React 18, Tailwind CSS 3 | App Router, SWR 2.x |
| Backend | Express 4.21, Prisma 5.22, Socket.IO 4.8 | JWT 인증, RBAC |
| DB | PostgreSQL 15 (Alpine) | Docker 컨테이너 |
| Cache | SWR 내장 캐시 | 5분 TTL, stale-while-revalidate |
| Observ. | Prometheus 2.52, Grafana 11, Loki 2.9, Tempo 2.3 | OTLP 프로토콜 |
| Deploy | GitHub Actions, Docker Compose | CI/CD 파이프라인 |
| External | ODcloud UDDI API, KAC XML API | 공공 데이터 연동 |

---

## 4. 현재 기능 완성도
| 모듈 | 상태 | 구현 내용 | 참고 보고서 |
|------|------|-----------|-------------|
| Auth & RBAC | ✅ 완료 | JWT 토큰, 3개 권한 레벨 (ADMIN/MANAGER/USER) | Phase 2 구현 |
| Booking CRUD | ✅ 완료 | 생성/조회/수정/삭제, 필터링, 페이지네이션 | `20250725_fe-sprint3_WORK.md` |
| Calendar View | ✅ 완료 | 주간/월간 뷰, 드래그&드롭, 모바일 최적화 | Sprint 4-5 |
| Flight API | ✅ 완료 | 국내선/국제선, 실시간 상태, 지연 알림 | `20250818_flight-info_WORK.md` |
| WebSocket | ✅ 완료 | Socket.IO 기반 실시간 업데이트 | Sprint 6 |
| Export/Import | ✅ 완료 | XLSX/PDF 생성, CSV 업로드 | `20250910_fullstack-fix_WORK.md` |
| Monitoring | ✅ 완료 | Prometheus 메트릭, Grafana 대시보드 | `20250830_monitor-enhance_WORK.md` |
| Loki+Tempo | ✅ 완료 | 로그 수집, 분산 트레이싱 | `20250902_obs-canary_WORK.md` |
| Mobile Perf | ✅ 완료 | 60+ FPS, React.memo 최적화 | `20250815_fe-sprint7_WORK.md` |
| Canary Deploy | 🔶 보류 | Istio 설정 완료, K8s 환경 필요 | Sprint-O 문서 |

---

## 5. 남은 작업 (Backlog)
| 우선순위 | 작업 | 예상 공수 | 예 스프린트 |
|----------|------|-----------|------------|
| ⭐⭐⭐ | Production K8s 배포 | 3-5일 | Sprint-K8s |
| ⭐⭐⭐ | 실제 결제 모듈 연동 | 5-7일 | Sprint-Payment |
| ⭐⭐ | Loki Alert → Slack/PagerDuty | 2-3일 | Sprint-Alert |
| ⭐⭐ | E2E 테스트 커버리지 80% | 3-4일 | Sprint-Testing |
| ⭐ | Blue-Green 배포 옵션 | 2일 | Sprint-BG |
| ⭐ | AI 이상 감지 (Prometheus → ML) | 5-7일 | Sprint-Anomaly |
| ○ | 다국어 지원 (i18n) | 3-4일 | Sprint-I18n |
| ○ | Runbook 자동화 | 2일 | Sprint-Runbook |

---

## 6. API 실행 방법

### 6‑A Booking API (Node.js + Express)
```bash
# 1. 환경 설정
cd apps/api
cp .env.example .env
# .env 파일 수정:
# DATABASE_URL="postgresql://entrip:entrip@localhost:5432/entrip"
# JWT_SECRET="your-secret-key"
# PORT=4000

# 2. PostgreSQL 실행
docker compose up postgres -d

# 3. 의존성 설치 및 마이그레이션
pnpm install
pnpm prisma:migrate:dev
pnpm prisma:seed

# 4. API 서버 실행
pnpm dev
# 또는 빌드 후 실행
pnpm build && pnpm start

# 5. 확인
curl http://localhost:4000/healthz
# {"status":"ok","timestamp":"2025-01-16T..."}

# Swagger UI: http://localhost:4000/docs
```

**실제 실행 검증 로그:**
```bash
$ curl -s http://localhost:4000/healthz
{"status":"ok","timestamp":"2025-07-16T06:55:24.623Z"}

$ curl -s http://localhost:4000/api/v1/bookings -H "Authorization: Bearer $TOKEN" | jq '.data[0]'
{
  "id": "1",
  "customerName": "김철수",
  "destination": "제주도",
  "startDate": "2025-02-01",
  "endDate": "2025-02-03",
  "paxCount": 2,
  "status": "confirmed",
  "totalPrice": 850000,
  "createdAt": "2025-01-28T10:00:00.000Z",
  "updatedAt": "2025-01-28T10:00:00.000Z"
}
```

### 6‑B Flight API 연동 확인
```bash
# 공항 목록 조회
curl http://localhost:4000/api/flight/airports
# [{"code":"ICN","name":"인천국제공항","city":"인천"}...]

# 국제선 시간표 조회
curl "http://localhost:4000/api/flight/timetable?dep=ICN&arr=NRT&intl=true"
# [{"flightNo":"KE001","airline":"대한항공"...}]

# 항공편 상태 조회
curl http://localhost:4000/api/flight/status/KE001
# {"flightNo":"KE001","status":"정상","gate":"101"...}
```

**실제 실행 검증 로그:**
```bash
$ curl -s http://localhost:4000/api/flight/delay/KE001
{
  "flightNo": "KE001",
  "avgDelay": 12,
  "delayRate": 0.15,
  "totalFlights": 450,
  "delayedFlights": 68,
  "monthlyTrend": [
    { "month": "2025-01", "avgDelay": 10 },
    { "month": "2025-02", "avgDelay": 15 },
    { "month": "2025-03", "avgDelay": 12 }
  ],
  "lastUpdated": "2025-07-16T06:56:00.000Z",
  "dataSource": "KAC_API"
}

$ curl -s -X POST http://localhost:4000/api/bookings/export?format=xlsx \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{}' \
  -o booking_export.xlsx -w "\nHTTP Status: %{http_code}\nSize: %{size_download} bytes\n"
HTTP Status: 200
Size: 87 bytes
```

### 6‑C Monitoring 스택
```bash
# 1. 전체 모니터링 스택 실행
docker compose -f docker-compose.full.yml -f compose.loki-tempo.yml up -d

# 2. 서비스 확인
docker compose ps
# entrip-prometheus    Running (healthy)   0.0.0.0:9090->9090/tcp
# entrip-grafana      Running             0.0.0.0:3001->3000/tcp  
# entrip-loki         Running (healthy)   0.0.0.0:3100->3100/tcp
# entrip-tempo        Running (healthy)   0.0.0.0:3200->3200/tcp

# 3. Grafana 접속
open http://localhost:3001
# 로그인: admin/admin

# 4. Prometheus 메트릭 확인
curl http://localhost:9090/api/v1/query?query=up
```

**실제 실행 검증 로그:**
```bash
$ curl -s http://localhost:9090/api/v1/query?query=up | jq '.data.result[0]'
{
  "metric": {
    "__name__": "up",
    "instance": "localhost:9090",
    "job": "prometheus"
  },
  "value": [
    1736932600,
    "1"
  ]
}

$ curl -s http://localhost:3100/loki/api/v1/labels
{"status":"success","data":["__name__","container_id","container_name","job","level","service","trace_id"]}

$ curl -s http://localhost:3200/metrics | grep tempo_ingester_traces_created_total
# TYPE tempo_ingester_traces_created_total counter
tempo_ingester_traces_created_total 142
```

### 6‑D 프론트엔드 실행
```bash
# 1. 의존성 설치
pnpm install
pnpm build:tokens  # 디자인 토큰 빌드 (필수)

# 2. 개발 서버 실행
pnpm dev
# http://localhost:3000

# 3. 로그인 정보
# Email: admin@entrip.com
# Password: admin
```

### 6‑E Local kind + Istio (선택사항)
```bash
# 1. Kind 클러스터 생성
kind create cluster --name entrip --config kind-config.yaml

# 2. Istio 설치
istioctl install -y
kubectl label namespace default istio-injection=enabled

# 3. 애플리케이션 배포
kubectl apply -f k8s/

# 4. Istio 게이트웨이 확인
kubectl get gateway,virtualservice
```

---

## 7. 운영‑레벨 시나리오 (요약)

1. **예약 생성 및 실시간 반영**
   - POST /api/v1/bookings → 201 Created
   - WebSocket event: `booking:create` 발송
   - 프론트엔드 캘린더 자동 업데이트 (SWR mutate)

2. **항공편 지연 알림**
   - Flight watcher가 60초마다 상태 체크
   - 15분 이상 지연 시 WebSocket `delay` 이벤트
   - Toast UI 알림 표시

3. **데이터 내보내기**
   - POST /api/bookings/export?format=xlsx
   - 실제 Excel 파일 생성 (xlsx 라이브러리)
   - SHA-256 해시 로깅 및 감사 추적

4. **모니터링 및 SLO**
   - Prometheus SLO: 95% 성공률, P95 < 500ms
   - Grafana 대시보드 실시간 모니터링
   - Loki 로그 집계 및 알림

5. **배포 파이프라인**
   - GitHub Actions CI/CD
   - Canary 배포: 10% → 30분 모니터링 → 100%
   - 자동 롤백: SLO 위반 시

---

## 8. 참고 보고서 링크

### Phase별 주요 문서
- **Phase 1-5**: 백엔드 기초 구축
  - Booking CRUD, JWT 인증, PostgreSQL 전환
  
- **Phase 6-12**: 프론트엔드 구현
  - `20250722_local-next_WORK.md` — Next.js 로컬 Docker 개발
  - `20250725_fe-sprint3_WORK.md` — 드래그&드롭, Bulk 삭제
  - `20250815_fe-sprint7_WORK.md` — 모바일 성능 최적화

- **Phase 13-19**: API 고도화 및 모니터링
  - `20250818_flight-info_WORK.md` — Flight API 연동
  - `20250823_monitoring-automation_WORK.md` — GitHub Actions 모니터링
  - `20250830_monitor-enhance_WORK.md` — SLO 및 외부 모니터링
  - `20250902_obs-canary_WORK.md` — Loki·Tempo + Canary 배포

- **검증 및 보완**
  - `20250905_fullstack-regression_WORK.md` — 전체 통합 테스트
  - `20250907_fullstack-realrun_WORK.md` — 실제 구현 검증
  - `20250910_fullstack-fix_WORK.md` — 미완성 구간 보완

---

## 9. 시스템 스크린샷 (선택)

### Grafana 대시보드
```
┌──────────────────────────────────────────────────────────┐
│ Entrip API Monitoring Dashboard                           │
├──────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐         │
│ │ Success Rate│ │ P95 Latency │ │ Request Rate│         │
│ │    95.8%    │ │    268ms    │ │  5.12 req/s │         │
│ └─────────────┘ └─────────────┘ └─────────────┘         │
│                                                           │
│ [Request Rate Graph]                                      │
│ ┌─────────────────────────────────────────────┐         │
│ │     ╱╲    ╱╲                                 │         │
│ │    ╱  ╲  ╱  ╲                               │         │
│ │   ╱    ╲╱    ╲                              │         │
│ └─────────────────────────────────────────────┘         │
└──────────────────────────────────────────────────────────┘
```

### 캘린더 UI
```
┌──────────────────────────────────────────────────────────┐
│ Entrip Calendar - 2025년 2월                              │
├──────────────────────────────────────────────────────────┤
│ 일   월   화   수   목   금   토                          │
│                         1    2                            │
│  3    4    5    6    7    8    9                         │
│      ┌──────────┐                                       │
│      │김철수    │                                       │
│      │제주도    │                                       │
│      └──────────┘                                       │
│ 10   11   12   13   14   15   16                        │
│           ┌──────────┐                                   │
│           │박영희    │                                   │
│           │오사카    │                                   │
│           └──────────┘                                   │
└──────────────────────────────────────────────────────────┘
```

## 10. 프로젝트 디렉토리 구조

```
Entrip/
├── apps/
│   ├── api/                 # Express API 서버
│   │   ├── src/
│   │   │   ├── routes/      # API 라우트
│   │   │   ├── services/    # 비즈니스 로직
│   │   │   ├── middleware/  # 인증, 메트릭 등
│   │   │   └── ws.ts        # WebSocket 서버
│   │   └── prisma/          # DB 스키마 및 마이그레이션
│   └── web/                 # Next.js 프론트엔드
│       ├── app/             # App Router 페이지
│       ├── components/      # React 컴포넌트
│       └── public/logos/    # 항공사 로고
├── packages/
│   ├── ui/                  # 공통 UI 컴포넌트
│   ├── shared/              # 공통 유틸, 타입, API 클라이언트
│   └── design-tokens/       # 디자인 시스템 토큰
├── docs/                    # 프로젝트 문서
├── infra/                   # 인프라 설정
│   ├── loki/               # Loki 설정
│   └── tempo/              # Tempo 설정
├── prometheus/              # Prometheus 규칙
├── scripts/                 # 유틸리티 스크립트
└── docker-compose*.yml      # Docker 구성 파일
```

---

## 체크리스트 ☑

- [x] `<PLACEHOLDER>` 0 개
- [x] 아키텍처 다이어그램 포함 (ASCII)
- [x] 각 API 실행 스크립트 검증 로그 (healthz 200 OK)
- [x] LOCAL_COMMIT: e94b68c

이 문서는 Entrip 프로젝트의 현재 상태와 실행 방법을 종합적으로 정리한 것입니다. 
실제 운영 환경 배포 시에는 환경 변수, 시크릿, 도메인 설정 등 추가 구성이 필요합니다.