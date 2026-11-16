# Entrip v2 실행 안내

이 변경은 `b` 개발 브랜치를 기준으로 합니다. 기존 파란색·흰색 화면을 유지하며 예약, 작업 탭, 계좌·입출금·결재, 메신저, 직원 관리와 통계를 v2 API/DB에 연결합니다.

## 로컬 실행

Node.js 22 이상, Corepack, PostgreSQL이 필요합니다. 프로젝트 루트에 `.env`를 만들고 접근 가능한 DB 주소를 지정합니다.

```dotenv
DATABASE_URL=postgresql://entrip:YOUR_PASSWORD@127.0.0.1:5432/entrip
```

Windows는 `START_ENTRIP.bat`, macOS/Linux는 `bash START_ENTRIP.sh`를 실행합니다. 패키지 설치 → v2 클라이언트 생성 → 보존형 DB 마이그레이션 → 빈 DB에만 데모 데이터 입력 → API 4002/웹 3000 실행 순서입니다. 웹 주소는 http://localhost:3000 입니다. 최초 화면에서 회사와 역할을 고릅니다.

데모 계정은 Entrip, J1, Startour, Happytravel의 관리자·매니저·직원이며 비밀번호는 `pass1234`입니다. 실제 업무 DB에 데모 계정을 배포하지 마세요. 기존 계정이 있으면 데모 입력을 건너뛰며 데이터를 삭제하지 않습니다. `RESET_DEMO_DATA=true`는 명시적인 개발용 전체 초기화 옵션입니다.

로컬 실행기의 JWT 서명 키는 `.env`에 없으면 실행마다 생성됩니다. 재시작 후 로그인이 풀리지 않게 하려면 `JWT_SECRET`, `JWT_REFRESH_SECRET`에 서로 다른 무작위 32자 이상의 값을 지정합니다. 운영은 [PRODUCTION_V2_RUNTIME.md](PRODUCTION_V2_RUNTIME.md)를 따릅니다.

## 주요 동작

- 월간·주간 캘린더와 목록에서 날짜나 예약을 선택합니다. 왼쪽 기본/고객 정보와 오른쪽 반복 여행 항목을 함께 저장합니다. 저장 후 인쇄와 변경 이력을 사용할 수 있습니다.
- Ctrl/Cmd+메뉴 클릭은 새 작업 탭을 엽니다. 탭별 입력과 편집 대상이 새로고침 후에도 유지됩니다. 회사나 사용자가 바뀌면 이전 작업 상태를 지웁니다.
- 계좌는 직원 계정과 별도입니다. 입출금을 등록하고 다른 관리자 또는 지정 결재자가 승인하면 잔액에 반영됩니다. 순차 결재는 지정된 순서를 따릅니다.
- 메신저에서 같은 회사 직원을 선택해 1:1 대화를 만들고 기존 방에 직원을 초대합니다. 메시지는 DB에 저장되며 실시간으로 전달됩니다.
- 관리자 설정에서 직원 추가·수정·비활성화·재활성화를 수행합니다.
- 항공편·환율은 실제 외부 서비스 설정이 필요합니다. 과거 스냅샷과 조회 실패를 구분해 표시합니다.

## 검증 및 제한

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm run build
corepack pnpm exec jest --config jest.config.js --selectProjects @entrip/shared @entrip/ui @entrip/web --runInBand
```

API 테스트는 **별도의 `_test`로 끝나는 DB**에 `TEST_DATABASE_URL`을 설정하고 `bash scripts/test-db.prepare.sh`로 마이그레이션한 뒤 `corepack pnpm --filter @entrip/api test --runInBand`로 실행합니다. API 테스트는 해당 테스트 DB의 행을 삭제합니다.

실행 중인 앱의 실제 화면 검증 스크립트는 `scripts/verification/verify-*-ui.mjs`입니다. `BASE_URL`을 앱 주소로 지정합니다. 최종 실행 결과와 한계는 검증 문서를 참고하세요.

메일 OAuth/수신/발신, 자동화 실행, OCR·문서 연동은 미구현 상태를 명시합니다. 예약 출력은 브라우저 인쇄입니다. 운영 Docker·TLS 실행과 외부 제공자의 실시간 데이터 가용성은 별도 검증 대상입니다.
