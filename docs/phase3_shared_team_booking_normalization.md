# Phase 3 – Shared Team Booking Normalization

## 개요
Phase 3의 공유 계층 작업으로 `teamBookingService`가 v1/v2 API 간 데이터 스키마 차이를 흡수하도록 확장되었습니다. 이 문서는 정규화 전략, 타입 정비 사항, 그리고 향후 연동 시 주의할 점을 정리합니다.

## 정규화 전략
- **단일 DTO 유지**: 프론트엔드는 `TeamBooking` 타입만 참조하며, v2 응답 구조는 서비스 내부에서 전부 매핑합니다.
- **일관된 열거형**: 상태, 투어 유형, 식사 플랜, 결제 수단, 첨부 파일 카테고리는 허용값 세트를 기준으로 소문자/대소문자 변동을 처리합니다.
- **데이터 보강**:
  - 미제공 숫자 필드는 participants 길이 등을 기반으로 안전한 기본값을 채웁니다.
  - 날짜/시간 필드는 ISO8601 또는 Date 객체 형태를 모두 허용하며, 최종적으로 ISO 문자열을 반환합니다.
  - 기본 담당자 ID가 없으면 정규화된 매니저 배열의 첫 항목을 사용합니다.
- **페이징 대응**: v2 응답이 `{ data, pagination }`, 배열, 혹은 기존 `{ bookings, total }` 구조 중 하나라도 동작하도록 파서가 분기합니다.
- **히스토리 지원**: 상세 조회 시 `history` 배열이 존재하면 action/type을 정규화하여 단일 enum에 매핑합니다.

## 환경 변수 및 토글
| 항목 | 설명 | 기본값 |
| --- | --- | --- |
| `TEAM_BOOKING_API_MODE` | 런타임 모드 강제 (`v1`, `v2`, `auto`) | `auto` |
| `NEXT_PUBLIC_TEAM_BOOKING_API_MODE` | 브라우저 번들 노출용 값 | `auto` |

> `auto` 모드에서는 `/api/v2/team-bookings` 프록시가 준비되었는지 확인 후 v2를 우선 시도하고, 실패 시 v1 경로로 폴백합니다.

## 타입 정비 사항
- `TeamBookingAttachment` 인터페이스를 분리/공개하여 첨부 파일 데이터를 재사용 가능하게 정리했습니다.
- `TeamBookingHistoryEntry` 를 명시적으로 추가하여 상세 응답 history 항목을 문서화했습니다.
- 모든 서비스/테스트는 `TeamBookingDetailResponse`에서 위 타입을 참조하도록 업데이트되었습니다.

## 테스트 전략
- 단위 테스트: `packages/shared/src/services/__tests__/teamBookingService.test.ts`
  - v1/v2 토글 시 엔드포인트 분기, 정규화 결과(목 데이터 기반)를 검증합니다.
- 통합 테스트(향후): v2 API가 실제로 배포되면, 컨테이너 환경에서 `TEAM_BOOKING_API_MODE=v2` 로 설정 후 계약 테스트를 추가합니다.

## 다음 단계
1. **실제 v2 응답 샘플 수집**: 백엔드가 가동되면 JSON 스냅샷을 받아 정규화 결과와 비교합니다.
2. **통합 테스트 작성**: Jest 혹은 Playwright 기반 계약 테스트로 v1/v2 응답이 동일한 DTO를 생성하는지 검증합니다.
3. **문서 동기화**: v2 스키마 확정 시, 타입/문서를 재검토하고 필요한 필드를 추가합니다.

---
*작성일: 2025-10-05 · 담당: Codex Phase3 공유 계층*
