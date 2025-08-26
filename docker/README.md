# Entrip Docker 로컬 테스트 환경

이 문서는 Entrip 0.1.0-rc.1을 Docker Compose로 로컬 환경에서 실행하는 방법을 설명합니다.

## 📋 사전 준비

1. **필수 소프트웨어**
   - Docker Desktop (Windows/Mac) 또는 Docker Engine (Linux) ≥ 24.0
   - Docker Compose v2
   - 최소 4GB 메모리, 4GB 디스크 여유 공간

2. **환경 변수 설정**
   ```bash
   cp .env.example .env.local
   # .env.local 파일을 편집하여 필요한 값 설정
   ```

## 🚀 빠른 시작

### 1. 빌드 및 실행

```bash
# 의존성 설치 및 빌드
pnpm install
pnpm run build:tokens
pnpm run build

# Docker 이미지 빌드
docker compose -f docker/docker-compose.local.yml build

# 컨테이너 실행
docker compose -f docker/docker-compose.local.yml up -d

# 상태 확인
docker compose -f docker/docker-compose.local.yml ps
```

### 2. 서비스 접속

- **Web Application**: http://localhost:3000
- **API Server**: http://localhost:4000
- **API Documentation**: http://localhost:4000/api-docs
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin)

### 3. 헬스체크

```bash
# API 헬스체크
curl http://localhost:4000/api/v1/health

# Web 헬스체크
curl http://localhost:3000/api/health
```

## 📊 모니터링

### Grafana 대시보드

1. http://localhost:3001 접속
2. 기본 계정: admin/admin
3. "Entrip Dashboard"가 자동으로 프로비저닝됨

### 메트릭 확인

- API Request Rate
- Response Time (p95)
- CPU Usage
- Memory Usage

## 💾 백업 및 복구

### 데이터베이스 백업

```bash
# 백업 실행
./scripts/backup_db.sh

# 백업 파일은 ./backup 디렉토리에 저장됨
```

### 데이터베이스 복구

```bash
# 최신 백업에서 복구
./scripts/restore_db.sh ./backup/entrip_backup_YYYYMMDD_HHMMSS.sql
```

## 🧪 테스트 시나리오

### 1. 기능 테스트

```bash
# 로그인 테스트
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@entrip.com","password":"admin"}'

# 예약 생성 테스트 (JWT 토큰 필요)
curl -X POST http://localhost:4000/api/v1/bookings \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "테스트 고객",
    "teamName": "테스트팀",
    "destination": "제주도",
    "startDate": "2025-08-01",
    "endDate": "2025-08-03",
    "paxCount": 10,
    "totalPrice": 1000000
  }'
```

### 2. 장애 복구 테스트

```bash
# API 컨테이너 강제 종료
docker kill entrip-api

# 자동 재시작 확인 (15초 이내)
watch docker compose -f docker/docker-compose.local.yml ps
```

### 3. 볼륨 지속성 테스트

```bash
# 컨테이너 중지
docker compose -f docker/docker-compose.local.yml down

# 컨테이너 재시작
docker compose -f docker/docker-compose.local.yml up -d

# 데이터 확인 (기존 데이터가 유지되어야 함)
```

## 🔧 문제 해결

### 일반적인 문제

| 문제 | 원인 | 해결 방법 |
|------|------|-----------|
| `db` unhealthy | 볼륨 권한 문제 | `docker volume prune` 후 재시작 |
| API 502 오류 | CORS 설정 | `.env.local`에서 `FRONT_URL` 확인 |
| 메모리 부족 | Docker 메모리 제한 | Docker Desktop 설정에서 메모리 증가 |

### 로그 확인

```bash
# 모든 서비스 로그
docker compose -f docker/docker-compose.local.yml logs

# 특정 서비스 로그
docker compose -f docker/docker-compose.local.yml logs api
docker compose -f docker/docker-compose.local.yml logs web

# 실시간 로그
docker compose -f docker/docker-compose.local.yml logs -f
```

## 📝 체크리스트

- [ ] Docker 이미지 빌드 성공
- [ ] 모든 컨테이너 healthy 상태
- [ ] API 헬스체크 통과
- [ ] Web UI 정상 로드
- [ ] 로그인 기능 동작
- [ ] 예약 CRUD 기능 동작
- [ ] Grafana 대시보드 데이터 표시
- [ ] 백업 스크립트 정상 동작
- [ ] 장애 복구 자동화 확인

## 🛑 종료

```bash
# 컨테이너 중지
docker compose -f docker/docker-compose.local.yml down

# 볼륨 포함 완전 제거 (주의: 데이터 삭제됨)
docker compose -f docker/docker-compose.local.yml down -v
```

## 📚 추가 자료

- [Docker Compose 문서](https://docs.docker.com/compose/)
- [Prometheus 문서](https://prometheus.io/docs/)
- [Grafana 문서](https://grafana.com/docs/)

---

**작성일**: 2025-01-21  
**버전**: 0.1.0-rc.1