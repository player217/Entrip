# 환율 API 디버깅 가이드

## 1. 터미널에서 로그 확인

서버를 실행한 터미널에서 다음과 같은 로그가 표시됩니다:
```
[Exchange API] Request received
[Exchange API] EXIM_API_KEY exists: true/false
[Exchange API] Fetching data for date: 20250706
[Exchange API] Initial response: ...
```

## 2. 브라우저 콘솔에서 확인

1. 브라우저에서 F12 또는 Ctrl+Shift+I를 눌러 개발자 도구 열기
2. Console 탭 선택
3. 페이지 새로고침 (F5)
4. 다음과 같은 로그 확인:
```
[useExchangeRates] Fetching from: /api/exchange
[useExchangeRates] Response status: 200
[useExchangeRates] Raw data: ...
[useExchangeRates] Processing rows: 22 items
[useExchangeRates] Final result: [...]
```

## 3. 직접 API 테스트

새 터미널을 열고:
```bash
# API 직접 호출
curl http://localhost:3002/api/exchange

# 또는 특정 날짜로
curl http://localhost:3002/api/exchange?date=20250703
```

## 4. 문제 확인 포인트

### 서버 로그에서:
- `EXIM_API_KEY exists: false` → .env.local 문제
- `Initial response: []` → EXIM API 응답 없음 (주말/공휴일)
- Error 메시지 → API 키 또는 네트워크 문제

### 브라우저 콘솔에서:
- `Response status: 500` → 서버 에러
- `Processing rows: 0 items` → 데이터 없음
- `Final result: []` → 필터링 후 결과 없음

## 5. 빠른 해결책

만약 로그에서 `EXIM_API_KEY exists: false`가 나오면:
1. 서버 중지 (Ctrl+C)
2. .env.local 확인
3. `pnpm --filter @entrip/web dev` 다시 실행

## 6. 강제 새로고침

브라우저에서 캐시 무시하고 새로고침:
- Windows/Linux: Ctrl + Shift + R
- Mac: Cmd + Shift + R