# Entrip 시각 점검 후 수정 · 2026-11-17

[최초 20건 점검표](ENTRIP_VISUAL_AUDIT_20261117.md)의 V01–V20을 수정했다. 이 보고서는 해당 결함의 수정·재검증 결과이며, 메일·자동화·OCR까지 포함한 제품 전체 완료 선언은 아니다.

2026-11-18, 검증한 수정 소스와 테스트를 [PR #5](https://github.com/player217/Entrip/pull/5)에 반영했다.

## 검증 결과

- 공식 `pnpm build` 통과. 웹, API, UI JavaScript·타입 선언·스타일 산출물 확인.
- 클라이언트 42개 suite / 377개 테스트, 별도 PostgreSQL DB의 API 17개 suite / 86개 테스트: **총 59개 suite / 463개 통과, 실패·건너뜀 0개**.
- 실제 API + Next 운영 빌드에서 **예약·작업 탭·메신저·직원·금융/순차 결재 5개 브라우저 흐름 통과**, 페이지 오류 0개.
- 20건을 묶은 **시각 결함 동작 검증 13개 그룹 모두 통과**, 페이지 오류 0개.
- **12개 메뉴 × 1440/800/390px = 36개 초기 화면 상태, 43장**을 직접 열어 판독. 추가 기능 캡처 28장과 회귀 캡처 16장을 합해 **수정 후 87장**을 검토했다.
- 초기 메뉴 캡처의 geometry 후보 19개는 직원 표 내부 가로 스크롤 영역이었다. 별도 390px 우측 끝 캡처와 직원 편집 동작에서 이름 고정 및 작업 접근을 확인했다.

[최종 검증 요약](verification/2026-11-17/visual-fixes/verification-summary.json) · [13개 그룹 결과](verification/2026-11-17/visual-fixes/visual-fixes-report.json) · [5개 실제 동작 결과](verification/2026-11-17/visual-fixes/regression/) · [메뉴별 판독](verification/2026-11-17/visual-fixes/2026-11-17T00-21-37-648Z-235/visual-review.md)

## 20건 처리 결과

| ID | 수정한 동작 | 실제 확인 근거 |
|---|---|---|
| V01 | 예약 4개 화면의 검색·상태 필터를 작은 화면 폭에 맞게 배치 | 390px에서 4개 검색창 모두 x=22, 오른쪽=277px; [월간 목록](verification/2026-11-17/visual-fixes/01-mobile-month-list.webp) |
| V02 | 이전 메시지를 추가할 때 읽던 메시지의 위치 보존, 하단 가까이 있을 때만 새 메시지 자동 추적 | 높이 4,201→7,281px, scrollTop 0→3,080px로 추가 높이와 정확히 일치; [전](verification/2026-11-17/visual-fixes/23-message-history-before.webp) / [후](verification/2026-11-17/visual-fixes/24-message-history-after.webp) |
| V03 | 대시보드 더보기·접기 실제 연결, 전체 건수와 미리보기 건수 분리 | 동일 원본 집합을 펼치며 미래 출발일의 오늘 생성 예약도 보존; [펼친 화면](verification/2026-11-17/visual-fixes/07-dashboard-expanded.webp) |
| V04 | 프로필처럼 보이던 항목을 실제 목적지인 직원 정보로 정리 | 중복 관리 메뉴 제거, [사용자 메뉴](verification/2026-11-17/visual-fixes/08-user-menu.webp) |
| V05 | 작은 캘린더는 날짜 선택 + 전체 팀명 목록으로 표시 | [월간](verification/2026-11-17/visual-fixes/01-mobile-month-calendar.webp), [주간](verification/2026-11-17/visual-fixes/01-mobile-week-calendar.webp) |
| V06 | 대기·확정·진행·완료·취소에 각각 색과 한국어 상태 표시 | [주간 캘린더](verification/2026-11-17/visual-fixes/09-canonical-route.webp) |
| V07 | 반려·취소 후 실행되지 않은 결재 단계는 미진행/종료로 표시 | [반려](verification/2026-11-17/visual-fixes/12-rejected-approval.webp), [취소](verification/2026-11-17/visual-fixes/13-cancelled-approval.webp) |
| V08 | 이력 필드 한국어화, 상세 항목의 실제 전후 값 표시 | 호텔 이름·일자·수량·통화·단가·합계·설명 확인, 단가 12,000→14,000의 동일 항목 수 변경도 읽기 가능; [모바일](verification/2026-11-17/visual-fixes/regression/booking-history-mobile.webp), [데스크톱](verification/2026-11-17/visual-fixes/regression/booking-history-desktop.webp) |
| V09 | 인쇄 표의 날짜·수량·금액 폭 고정, 머리글 반복 및 행 분리 방지 | [실제 인쇄 창](verification/2026-11-17/visual-fixes/06-booking-print.webp), 긴 상세 16행의 [A4 2페이지 PDF](verification/2026-11-17/visual-fixes/print/stress-print.pdf) 별도 확인 |
| V10 | 구형 /dashboard·/reservations를 인증된 정식 화면으로 이동 | /→대시보드, /calendar-monthly→예약 캘린더 프레임 확인 |
| V11 | 탭 전환·추가·순서 변경·화면 크기 변경 시 활성 탭 전체 노출 | 10번째 탭 제목과 닫기 모두 390px 안; [모바일](verification/2026-11-17/visual-fixes/10-tabs-mobile.webp) |
| V12 | 조회 오류를 예약 없음/0건과 구분, 재시도로 정상 복구 | [오류](verification/2026-11-17/visual-fixes/03-booking-error.webp), [복구](verification/2026-11-17/visual-fixes/04-booking-recovered.webp) |
| V13 | 예약 팀명·직원 이름·거래 항목·항공사 등 식별 열 고정, 가로 스크롤 안내 | [직원](verification/2026-11-17/visual-fixes/16-settings-mobile-right.webp), [거래](verification/2026-11-17/visual-fixes/15-ledger-mobile-right.webp), [항공](verification/2026-11-17/visual-fixes/20-flights-mobile-right.webp) |
| V14 | 건수 축 정수화, 한국어 정확값 툴팁, 담당자 전체 가로 막대와 스크롤 | 담당자 25명 전체 유지, 애니메이션 종료 후 [통계 캡처](verification/2026-11-17/visual-fixes/17-stats-desktop.webp) |
| V15 | 실제 거래 이력이 있는 계좌의 통화·기초잔액 읽기 전용 | 서버의 전체 거래 이력(삭제 이력 포함) 기준, 오래된 초안도 잠금값을 덮지 않음; [계좌 편집](verification/2026-11-17/visual-fixes/14-locked-account.webp) |
| V16 | 메신저 검색 결과 없음·초대 대상 없음 안내 | [직원 검색](verification/2026-11-17/visual-fixes/22-messenger-empty.webp), 검색·초대 대상 테스트 |
| V17 | 로그인 오류의 한국어 안내 | [잘못된 암호](verification/2026-11-17/visual-fixes/25-login-error.webp), 401/403/429/서버 오류 테스트 |
| V18 | 국제공항 이름 사용, 중복 코드 제거, 비활성 선택기 구분 | [NRT 나리타 국제공항 및 시간표](verification/2026-11-17/visual-fixes/21-flights-desktop.webp) |
| V19 | /calendar-week 탭 이름·내용 정상 연결, 운영 /icon-test 직접 404 | 운영 서버 실제 HTTP 404 확인. 초기 스트리밍 200 문제를 middleware 단계에서 해결 |
| V20 | 검색 불일치 안내, 비활성 페이지 버튼 구분, 모바일 금액/단위 유지 | [검색 없음](verification/2026-11-17/visual-fixes/02-empty-search.webp), [모바일 통계](verification/2026-11-17/visual-fixes/19-stats-mobile.webp) |

## 통합 과정에서 함께 해결한 문제

- `.gitignore`의 `workspace/`가 실제 작업 탭 소스까지 제외하던 문제를 `/workspace/`로 한정했다. `WorkspaceTabs.tsx`와 `WorkspaceTabContext.tsx`를 저장소에 포함한다.
- 메신저 재접속 시 최신 메시지 한 개가 캐시에 겹치는 것만으로 중간 누락 구간을 정상으로 판단하던 문제를 해결했다. REST로 확인된 연속 구간을 따로 추적한다. m0–m4 이후 오프라인·실시간 m129·최신 m80–m129 조합에서 m5–m79를 복구하는 polling/재선택/동시 요청 테스트가 통과했다.
- 입력 중 상태를 실제 두 사용자 세션에서 확인했다. 상대에게 표시되고 입력창에서 벗어나면 해제되며 타이머도 정리된다. [실시간 입력 중 화면](verification/2026-11-17/visual-fixes/regression/messaging-typing.webp)
- 첫 검증에서 직원 고정 열을 일반 셀로 조회하던 검증 스크립트는 실제 행 머리글을 조회하도록 바로잡았다. 화면의 이름 고정 자체는 정상임을 별도 캡처로 확인했다.

## 재현 및 자료 범위

`scripts/verification/verify-visual-fixes-ui.mjs`와 기존 `verify-{booking,workspace,messaging,settings,finance}-ui.mjs`를 실제 PostgreSQL/API/Next 운영 서버에 실행했다. 이력·계좌·메시지 데이터는 격리된 데모 회사의 테스트 자료다. API 테스트는 별도 테스트 DB에서 수행해 브라우저 자료를 지우지 않았다.

메뉴 43장은 주요 시각 수정 반영 후 수집했다. 이후 추가한 상세 이력·메신저 누락 복구·운영 진단 경로 차단은 최종 빌드의 5개 회귀 흐름 및 13개 그룹에서 재확인했다. 원본 PNG는 픽셀 동일성을 확인한 lossless WebP로 보관하며 [이미지 명세](verification/2026-11-17/visual-fixes/image-manifest.json)에 원본/보관 파일 해시·크기·픽셀 일치 결과를 기록한다.

## 남은 범위

- 메일 OAuth·받은편지함·송수신·첨부, Flow 자동화 실행, OCR·문서 연동은 미구현/미연결 상태다.
- 항공 시간표 UI 검증에는 **2025-07-29 저장 스냅샷**을 사용하고 화면에 과거 자료임을 표시했다. 실시간 항공·환율 공급원의 정상 연결이나 최신성을 검증한 결과가 아니다.
- 전역 `lint:ci`의 기존 공유 패키지 53개 오류·239개 경고, 전체 커버리지 85% 조건, Docker/Compose/TLS 운영 배포 검증은 기존 미완료 범위다. 이번 성공한 빌드·테스트 결과와 구분한다.
- PR은 검토 가능한 초안 상태이며 운영 배포·병합은 수행하지 않았다.

공개 자료에는 원시 관측 본문·계정/거래별 JSON·ARIA 덤프·환경 로그를 포함하지 않는다. 메뉴별 판독, 화면 캡처, 테스트 결과 요약과 이미지 무손실 명세만 게시한다.


최초 점검 캡처 124장과 수정 후 캡처 87장을 공개했다.
