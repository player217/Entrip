# API v1 → v2 Migration Cutover Checklist

## 🎯 Migration Status

- [x] **Phase 1**: 즉시 로그인 복구 - DB 시드 실행
- [x] **Phase 2**: v2 API TypeScript 컴파일 에러 수정
- [x] **Phase 3**: API 계약 동일성 보장
- [x] **Phase 4**: Strangler Fig 패턴 구현
- [x] **Phase 5**: 모니터링 및 관측성 구축
- [x] **Phase 6**: E2E 테스트 및 계약 검증
- [x] **Phase 7**: 컷오버 준비

## 📋 Pre-Cutover Checklist

### Database
- [x] v1과 v2가 동일한 데이터베이스 사용 확인
- [x] 사용자 데이터 시드 완료
- [ ] 백업 스크립트 준비
- [ ] 롤백 계획 수립

### API Compatibility
- [x] 로그인 엔드포인트 응답 형식 통일
- [x] 쿠키 정책 동기화 (HttpOnly, SameSite)
- [x] 에러 응답 형식 통일
- [ ] WebSocket 호환성 검증

### Infrastructure
- [x] Docker 컨테이너 정상 작동 확인
- [x] 헬스체크 엔드포인트 구현
- [x] 메트릭 수집 시스템 구축
- [ ] 로그 집계 설정

### Testing
- [x] API 계약 테스트 작성
- [ ] 부하 테스트 실행
- [ ] 성능 벤치마크
- [ ] 보안 스캔

## 🚀 Cutover Process

### Phase 1: Read-Only Migration (Day 1)
```bash
# Enable Phase 1
./scripts/api-cutover.sh 1

# Affected endpoints
GET /api/bookings
GET /api/calendar
GET /api/users
GET /api/finance
```

**Monitoring Period**: 24 hours
- [ ] Error rate < 0.1%
- [ ] Response time P95 < 200ms
- [ ] No customer complaints

### Phase 2: Authentication Migration (Day 3)
```bash
# Enable Phase 2
./scripts/api-cutover.sh 2

# Affected endpoints
POST /api/auth/verify
POST /api/auth/refresh
POST /api/auth/logout
```

**Monitoring Period**: 48 hours
- [ ] Session continuity maintained
- [ ] Token refresh working
- [ ] No authentication failures

### Phase 3: Full Migration (Day 7)
```bash
# Enable Phase 3
./scripts/api-cutover.sh 3

# All endpoints migrated
```

**Monitoring Period**: 72 hours
- [ ] All metrics stable
- [ ] Performance acceptable
- [ ] No rollback needed

## 🔄 Rollback Plan

### Immediate Rollback
```bash
# Rollback to v1
./scripts/api-cutover.sh rollback

# Verify
curl http://localhost:4001/api/health
```

### Rollback Triggers
- Error rate > 1%
- Response time P95 > 500ms
- Critical bug discovered
- Data integrity issues

## 📊 Success Criteria

### Technical Metrics
- **Availability**: > 99.9%
- **Error Rate**: < 0.1%
- **Response Time**: P95 < 200ms
- **CPU Usage**: < 70%
- **Memory Usage**: < 80%

### Business Metrics
- **User Login Success Rate**: > 99%
- **API Call Success Rate**: > 99.5%
- **No Critical Incidents**: 0
- **Customer Complaints**: < 5

## 🛠️ Tools & Commands

### Health Checks
```bash
# v1 Health
curl http://localhost:4001/api/health

# v2 Health
curl http://localhost:4002/api/health
```

### Metrics
```bash
# v2 Metrics (JSON)
curl http://localhost:4002/api/v2/metrics

# v2 Metrics (Prometheus)
curl http://localhost:4002/api/v2/metrics/prometheus
```

### Test Login
```bash
# Test v1
curl -X POST http://localhost:4001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"companyCode":"J1","username":"admin@j1.com","password":"pass1234"}'

# Test v2
curl -X POST http://localhost:4002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"companyCode":"J1","username":"admin@j1.com","password":"pass1234"}'
```

## 📝 Notes

### Current Issues
1. **Prisma Client Generation**: Windows file lock issues (workaround in place)
2. **TypeScript Compilation**: Already resolved in v2
3. **Port Conflicts**: Managed via Docker compose

### Environment Variables
```env
# apps/web/.env.local
INTERNAL_API_URL=http://localhost:4001  # v1
API_V2_URL=http://localhost:4002        # v2
API_MIGRATION_PHASE=0                   # 0=disabled, 1-3=phases
```

### Contact Information
- **DevOps Team**: For infrastructure issues
- **Backend Team**: For API compatibility
- **Frontend Team**: For client-side issues

## ✅ Sign-off

- [ ] Backend Team Lead
- [ ] Frontend Team Lead
- [ ] DevOps Lead
- [ ] Product Manager
- [ ] CTO

---

**Last Updated**: 2025-09-17
**Next Review**: Before Phase 1 execution