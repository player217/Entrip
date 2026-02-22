# Entrip - ?ы뻾???듯빀 愿由??쒖뒪??
![coverage](./coverage/coverage-badge.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)

## 媛쒖슂
Entrip? ?ы뻾?ъ쓽 ?덉빟 愿由? 寃곗옱, 怨꾩쥖 愿由? ?듦퀎 ???낅Т ?꾨컲??愿由ы븯??醫낇빀 ?붾（?섏엯?덈떎.

## 二쇱슂 湲곕뒫
- ?뱟 **?덉빟 愿由?*: 罹섎┛??由ъ뒪??酉? ?덉빟 ?깅줉/?섏젙
- ?뮥 **?뺤궛 愿由?*: ?낆텧湲??댁뿭, ?섏씡瑜?怨꾩궛
- ?뱤 **?듦퀎 ??쒕낫??*: ?ㅼ떆媛??댁쁺 ?꾪솴, 留ㅼ텧 遺꾩꽍
- ??**寃곗옱 ?쒖뒪??*: ?꾩옄 寃곗옱, ?댁껜 吏묓뻾
- ?뮠 **而ㅻ??덉??댁뀡**: ?ㅼ떆媛?硫붿떊?, 硫붿씪 ?곕룞
- ?뙇 **遺媛 湲곕뒫**: ?섏쑉 ?뺣낫, ??났 ?몄꽑 寃?? 吏???곕룞

## 湲곗닠 ?ㅽ깮
- **Frontend**: React 18, TypeScript, Next.js 14
- **Backend**: Express, TypeScript, Swagger UI
- **UI**: Tailwind CSS, ?먯껜 ?붿옄???쒖뒪??- **?곹깭 愿由?*: Zustand
- **李⑦듃**: Recharts
- **鍮뚮뱶 ?꾧뎄**: Turborepo, pnpm workspaces
- **媛쒕컻 ?꾧뎄**: Storybook, ESLint, Prettier

## ?쒖옉?섍린

### ?꾩닔 ?붽뎄?ы빆
- Node.js 18.0.0 ?댁긽
- pnpm 8.0.0 ?댁긽

### ?ㅼ튂
```bash
# ??μ냼 ?대줎
git clone https://github.com/player217/Entrip.git
cd Entrip

# ?섏〈???ㅼ튂
pnpm install

# ?붿옄???좏겙 鍮뚮뱶
pnpm run build:tokens
```

### ?? Quick Start

#### 紐⑤뱺 ?쒕퉬????踰덉뿉 ?쒖옉
```bash
# npm-run-all???ъ슜??蹂묐젹 ?ㅽ뻾
pnpm dev:all   # 湲곕낯: Web + API v2 (v1 ?쒖쇅)

# ?먮뒗 PowerShell ?ㅽ겕由쏀듃 ?ъ슜 (Windows)
.\scripts\dev.ps1 start
```

#### ?쒕퉬???뺤씤
- ?뙋 **Web App**: http://localhost:3000
- ?뵩 **API v1 (legacy, ?좏깮??**: http://localhost:4001/api/health
- ?넅 **API v2**: http://localhost:4002/api/v2/health

> 李멸퀬: v1? 蹂닿?(legacy) ?곹깭?대ŉ 湲곕낯 湲곕룞?먯꽌 ?쒖쇅?⑸땲?? ?꾩슂 ??Docker Compose??`legacy` ?꾨줈?뚯씪濡??쒖꽦?뷀븯?몄슂. ?먯꽭???댁슜? `docs/LEGACY_V1.md` 李멸퀬.
- ?뱴 **Storybook**: http://localhost:6006 (蹂꾨룄 ?ㅽ뻾: `pnpm storybook`)

#### 媛쒕퀎 ?쒕퉬???ㅽ뻾
```bash
pnpm dev:web        # ???좏뵆由ъ??댁뀡
pnpm dev:api-v1     # API v1 (?덇굅??
pnpm dev:api-v2     # API v2 (?좉퇋)
```

#### ?곹깭 ?뺤씤
```bash
# Node.js ?ㅽ겕由쏀듃
pnpm status

# ?먮뒗 PowerShell
.\scripts\dev.ps1 status
```

#### Prisma 臾몄젣 ?닿껐
```bash
# Windows?먯꽌 ?뚯씪 ?좉툑 臾몄젣 諛쒖깮 ??pnpm fix:prisma

# ?먮뒗 WSL ?ъ슜 (沅뚯옣)
wsl
cd /mnt/c/Users/PC/Documents/project/Entrip
pnpm prisma:generate
```

#### 紐⑤뱺 ?쒕퉬??以묒?
```bash
.\scripts\dev.ps1 stop
```

## API 臾몄꽌

API 臾몄꽌??媛쒕컻 ?섍꼍?먯꽌 Swagger UI瑜??듯빐 ?쒓났?⑸땲??

```bash
# API ?쒕쾭 ?쒖옉
pnpm dev:api-v2

# Swagger UI ?묒냽
http://localhost:4000/docs
```

**李멸퀬**: Swagger UI??媛쒕컻 ?섍꼍(`NODE_ENV !== 'production'`)?먯꽌留??쒖꽦?붾맗?덈떎.

## ?꾨줈?앺듃 援ъ“
```
Entrip/
?쒋?? apps/
??  ?쒋?? web/                   # Next.js 硫붿씤 ?좏뵆由ъ??댁뀡
??  ?붴?? api-legacy/            # Express API v1 (legacy) ?쒕쾭
?쒋?? packages/
??  ?쒋?? design-tokens/        # ?붿옄???좏겙 ?쒖뒪????  ?쒋?? ui/                   # 怨듯넻 UI 而댄룷?뚰듃
??  ?붴?? shared/               # 怨듭쑀 ?좏떥由ы떚, ????쒋?? .github/workflows/        # CI/CD ?ㅼ젙
?쒋?? .storybook/               # Storybook ?ㅼ젙
?붴?? docs/                     # 媛쒕컻 臾몄꽌
```

## 媛쒕컻 ?꾪솴

### ?꾨즺???묒뾽 ??- [x] ?꾨줈?앺듃 援ъ“ ?ㅼ젙 (Turborepo)
- [x] ?붿옄???좏겙 ?쒖뒪??- [x] 湲곕낯 UI 而댄룷?뚰듃 (Button, Input, Card)
- [x] 蹂듯빀 而댄룷?뚰듃 (ChartCard, DataGrid, CalendarMonth)
- [x] Storybook ?ㅼ젙
- [x] TypeScript, ESLint, Prettier ?ㅼ젙
- [x] Express API ?쒕쾭 援ъ텞
- [x] Swagger UI ?듯빀 (媛쒕컻?섍꼍)
- [x] GitHub Actions CI/CD

### 吏꾪뻾 ?덉젙 ?뱥
- [ ] JWT ?몄쬆 ?쒖뒪??- [ ] ??쒕낫???섏씠吏
- [ ] ?덉빟 愿由?湲곕뒫
- [ ] 寃곗옱 ?쒖뒪??- [ ] ?곗씠?곕쿋?댁뒪 ?곕룞
- [ ] ?ㅼ떆媛?湲곕뒫 (WebSocket)

## 湲곗뿬?섍린
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## ?쇱씠?좎뒪
???꾨줈?앺듃??鍮꾧났媛??꾨줈?앺듃?낅땲??

## 臾몄쓽
?꾨줈?앺듃 愿??臾몄쓽?ы빆? Issues瑜??듯빐 ?④꺼二쇱꽭??

