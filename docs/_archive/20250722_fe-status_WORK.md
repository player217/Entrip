<!-- TEMPLATE_VERSION: SINGLE_FILE_FE_STATUS_V1 -->
<!-- LOCAL_COMMIT: c2c0083 -->
⚠️ 오프라인 / git push 금지  
⚠️ 모든 <PLACEHOLDER> 는 **실제 내용**(코드 diff·터미널 출력·이미지)으로 교체  
⚠️ 평문 비밀번호·토큰 금지

# 🔖 Entrip — 프런트엔드 진행 현황 보고서

## 1. 작성 목적
- 현재 **리액트 프런트엔드**(예약 관리·캘린더·로그인 등) 개발 진행도를 한눈에 파악한다.  
- 보고서 한 장에 **소스 구조, 완료 항목, 잔여 TODO, 주요 코드 diff, 실행 로그**를 포함한다.

## 2. 소스 구조
```text
apps/web/
├── .next/              # Next.js 빌드 출력
├── app/                # Next.js App Router
│   ├── (main)/         # 메인 레이아웃 그룹
│   │   ├── accounts/   # 계좌 관리
│   │   ├── approval/   # 결재 관리
│   │   ├── booking/    # 예약 관리 (구버전)
│   │   ├── calendar/   # 캘린더 뷰
│   │   ├── dashboard/  # 대시보드
│   │   ├── reservations/ # 예약 관리 (신버전)
│   │   └── workspace/  # 워크스페이스
│   ├── api/            # API 라우트
│   ├── login/          # 로그인 페이지
│   └── layout.tsx      # 루트 레이아웃
├── public/             # 정적 파일
├── src/                # 소스 코드
│   ├── components/     # 공통 컴포넌트
│   ├── features/       # 기능별 모듈
│   ├── hooks/          # 커스텀 훅
│   ├── lib/            # 유틸리티
│   └── styles/         # 스타일시트
└── test/               # 테스트 파일
```

## 3. 완료된 작업
| 모듈/기능 | 설명 | 주요 파일 |
|-----------|------|-----------|
| 캘린더 월간 뷰 | 월별 예약 표시, 더미 데이터 생성, 요약 통계 | src/features/calendar/MonthlyCalendarView.tsx |
| 예약 관리 페이지 | 캘린더/리스트 뷰 전환, 탭 UI | app/(main)/reservations/page.tsx |
| Chrome 탭 스타일 | 글로벌 탭 네비게이션 시스템 | src/components/layout/GlobalTabBar.tsx |
| 사이드바 네비게이션 | 다크 테마, 워크스페이스 전환, 접기/펴기 | src/components/layout/Sidebar.tsx |
| 환율 티커 | 실시간 환율 표시 위젯 | src/components/layout/ExchangeTicker.tsx |
| 로고 시스템 | Iconify 아이콘 통합 | src/components/layout/Header.tsx |

## 4. 미완료 / TODO
- [ ] 로그인 페이지 JWT 통합 - 현재 하드코딩된 리다이렉트만 존재
- [ ] API 클라이언트 연동 - 백엔드 `/api/v1/bookings` 엔드포인트 연결
- [ ] BookingModal 컴포넌트 복원 - ESLint 이슈로 주석 처리됨
- [ ] 예약 CRUD 실제 구현 - 현재 더미 데이터만 사용
- [ ] 메신저 패널 UI 완성 - MessengerPanel 컴포넌트 미완성
- [ ] 실시간 환율 API 연동 - 현재 하드코딩된 값

## 5. 주요 코드 diff
```diff
# MonthlyCalendarView.tsx - 예약 더미 데이터 생성 개선
@@ -12,8 +12,26 @@ const generateDummyBookings = (month: Date): Record<string, BookingEvent[]> => {
   const year = month.getFullYear();
   const monthNum = month.getMonth();
   
-  // 랜덤하게 15~25개의 예약 생성
-  const bookingCount = Math.floor(Math.random() * 10) + 15;
+  // 여행지 목록
+  const destinations = [
+    '제주도', '부산', '경주', '강릉', '전주', '여수', '통영', '거제도',
+    '일본 오사카', '일본 도쿄', '일본 후쿠오카', '일본 교토',
+    '베트남 다낭', '베트남 호치민', '태국 방콕', '태국 치앙마이',
+    '싱가포르', '홍콩', '대만 타이베이', '필리핀 세부'
+  ];
+  
+  // 팀 유형
+  const teamTypes = [
+    '가족여행', '신혼여행', '효도관광', '친구여행', '단체여행', 
+    '수학여행', '워크샵', '동호회', 'VIP투어', '패키지투어'
+  ];
+  
+  // 매니저 이름
+  const managers = ['김민수', '이지영', '박준혁', '최서연', '정태호'];
+  
+  // 월별 시즌에 따른 예약 수 조정
+  const seasonMultiplier = [0.7, 0.8, 1.0, 1.2, 1.5, 1.3, 1.6, 1.8, 1.4, 1.1, 0.9, 0.8][monthNum];
+  const bookingCount = Math.floor((Math.random() * 15 + 20) * seasonMultiplier);
```

```diff
# Sidebar.tsx - TypeScript 타입 개선 및 배지 제거
@@ -1,8 +1,8 @@
 'use client'
 
-import { useState, useEffect } from 'react'
+import React, { useState, useEffect } from 'react'
 import { usePathname, useRouter } from 'next/navigation'
-import clsx from 'clsx'
+import { clsx } from 'clsx'
 import { Icon } from '@entrip/ui'
 import { useWorkspaceStore } from '@entrip/shared'
 
@@ -49,14 +49,12 @@ const navigation: NavItem[] = [
   { 
     name: '결재', 
     href: '/approval', 
-    icon: 'ph:check-square-bold',
-    badge: 'BETA'
+    icon: 'ph:check-square-bold'
   },
   { 
     name: '계좌관리', 
     href: '/accounts', 
-    icon: 'ph:wallet-bold',
-    badge: 'BETA'
+    icon: 'ph:wallet-bold'
   },
```

## 6. 실행 스크린샷
![frontend-screenshot](assets/fe-screenshot-20250722.png)

## 7. 로컬 실행 로그
```bash
$ pnpm --filter @entrip/web dev

> @entrip/web@0.1.0 dev /mnt/c/Users/PC/Documents/project/Entrip/apps/web
> next dev

   ▲ Next.js 14.1.0
   - Local:        http://localhost:3000
   - Environments: .env.local, .env.development
   - Experiments (use at your own risk):
     · outputFileTracingRoot

 ✓ Ready in 16.2s
 ○ Compiling /reservations ...
 ✓ Compiled /reservations in 3.4s (1843 modules)
 ✓ Compiled in 982ms (741 modules)
 GET /reservations 200 in 3541ms
```

## 8. 문제·이슈
- ESLint 경고로 인한 BookingModal 주석 처리 - unused variable 경고
- API 인증 헤더 누락 - axios interceptor 미설정으로 401 에러
- TypeScript 경로 alias 불일치 - `@/` prefix 일부 파일에서 미작동
- 캘린더 이벤트 드래그 미구현 - 라이브러리 의존성 필요

## 9. 다음 스프린트 제안
| 우선순위 | 작업 | 세부 내용 |
|----------|------|-----------|
| ⭐ | 로그인 페이지 완성 | JWT 저장, 토큰 만료 처리, 가드 라우트 |
| ⭐ | SWR 캐싱 | useSWR /bookings, invalidation |
| ▲ | E2E 테스트 | Playwright로 캘린더 신규 예약 시나리오 |
| ○ | UI 폴리싱 | Tailwind 색상 토큰 통일 |