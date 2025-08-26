<!-- TEMPLATE_VERSION: SINGLE_FILE_V1 -->
<!-- LOCAL_COMMIT: pending -->
# [SINGLE_FILE_V1] 20250722_stage6_docker-migration_WORK

## 1. 기존 지시

Stage 6: Docker 마이그레이션 작업
- 목표: WSL 환경에서 Docker 기반 개발/운영 환경 구성
- 패키지 빌드 순서: design-tokens → shared → api → web
- 멀티스테이지 Dockerfile (dev/prod)
- docker-compose.dev.yml 구성
- Windows 호스트에서 WSL Docker 제어용 배치 파일

## 2. 계획

### 2.1 작업 순서
1. 각 패키지별 Dockerfile 작성
   - Base stage 공통화
   - Dev stage: 볼륨 마운트, watch 모드
   - Prod stage: 최적화된 프로덕션 빌드

2. docker-compose.dev.yml 구성
   - PostgreSQL 컨테이너
   - API dev 컨테이너
   - Web dev 컨테이너
   - 네트워크 설정

3. 환경변수 정비
   - .env.example 업데이트
   - Docker 환경용 설정 추가

4. Windows 배치 파일 생성
   - WSL 통한 Docker 제어
   - 개발 환경 시작/종료

### 2.2 빌드 의존성 체인
```
design-tokens (독립)
    ↓
shared (design-tokens 의존)
    ↓
api, web (shared 의존)
```

## 3. 작업 내용

### 3.1 API Dockerfile 생성
