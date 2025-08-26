# TypeScript 빌드 오류 수동 수정 가이드

## 빠른 수정 명령어 (PowerShell)

프로젝트 루트에서 실행:

```powershell
# 1. approval.service.ts 수정
$file = "packages\api\src\services\approval.service.ts"
(Get-Content $file) -replace 'updateData\.steps = \{', '(updateData as any).steps = {' | Set-Content $file

# 2. booking.route.ts 수정
$file = "packages\api\src\routes\booking.route.ts"
(Get-Content $file) -replace 'req\.params\.id\)', 'req.params.id!)' `
                   -replace 'req\.params\.bookingId\)', 'req.params.bookingId!)' | Set-Content $file

# 3. flight.route.ts 수정  
$file = "packages\api\src\routes\flight.route.ts"
$content = Get-Content $file
$content = $content -replace '(flightNo)(\.includes)', 'flightNo!$2'
$content = $content -replace '(flightNo)(\.match)', 'flightNo!$2'
$content = $content -replace '(existing\.flightNo === flightNo)', 'existing.flightNo === flightNo!'
$content = $content -replace '(outboundFlights\.includes\(flightNo)', 'outboundFlights.includes(flightNo!'
$content = $content -replace '(returnFlights\.includes\(flightNo)', 'returnFlights.includes(flightNo!'
$content = $content -replace '(returnFlights\.push\(flightNo)', 'returnFlights.push(flightNo!'
$content = $content -replace '(outboundFlights\.push\(flightNo)', 'outboundFlights.push(flightNo!'
$content | Set-Content $file

# 4. 빌드 테스트
pnpm --filter @entrip/api run build
```

## 수동 수정 위치

### 1. packages/api/src/services/approval.service.ts
- 라인 173: `updateData.steps = {` → `(updateData as any).steps = {`

### 2. packages/api/src/routes/booking.route.ts
- 라인 42: `req.params.id)` → `req.params.id!)`
- 라인 53: `req.params.id)` → `req.params.id!)`
- 라인 56: `req.params.id)` → `req.params.id!)`
- 라인 71: `req.params.id)` → `req.params.id!)`
- 라인 130: `req.params.bookingId)` → `req.params.bookingId!)`

### 3. packages/api/src/routes/flight.route.ts
모든 `flightNo` 사용 위치에 `!` 추가:
- `flightNo.includes` → `flightNo!.includes`
- `flightNo.match` → `flightNo!.match`
- 등등...