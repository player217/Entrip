# Entrip feature screenshots visual review

Reviewed by directly opening the seven PNG files below with image viewer, not only reading source. Viewport 1440×1000. Additional dialogs/mobile states pending root capture.

## Confirmed visual findings

| Priority | Finding | Image evidence | Implication |
|---|---|---|---|
| P2 | Calendar statuses are visually ambiguous: waiting, in-progress and completed entries all use the same pale amber block and no status label. | `03-month-calendar.webp`, `04-week-calendar.webp`: Team2/3/4 amber; `05-month-list.webp` proves their labels differ as 대기/진행/완료. | Calendar user cannot distinguish three operational states without opening or changing view. Add small status label or distinct accessible color/shape. |
| P2 | Monthly calendar does not present a whole month at once: increasing cell height from six-seven bookings pushes remaining weeks below viewport; last visible week is cut by fixed footer. | `03-month-calendar.webp`: 1–14 consume two mostly blank110px rows; populated 15–21 row ~306px; 22–28 partly visible;29–30 not visible. | It is usable through internal scroll, but weaker as month overview. Consider capped item count + more indicator or fixed-height rows; do not call data lost without scrolling test. |
| P2 | Cancelled approval still shows its sole approval step as 대기. | `09-approval.webp`: second card badge 취소, step "1. Entrip Manager · 대기". | Terminated request looks partly active. Mark future steps 취소됨/진행하지 않음 or subdued terminal state. |
| P3 | Previous/next pagination controls appear similar to active text even with 1/1 pages. | `09-approval.webp` and `10-accounts.webp` show 이전 1/1 다음 dark text. Source disables buttons but doesn't style disabled state. | User cannot visually know these controls are unavailable. |
| P3 | Copy differs between navigation/tab and body: 월별/주별 vs 월간/주간; 리스트 vs 목록. | `03`–`06` each side/tab uses 월별/주별, body 월간/주간 목록. | Minor naming inconsistency across same screen. |
| P3 | Typography is very small for secondary operational content. | `03`–`06` booking block secondary lines and footer, `09` step dates, `10` ledger descriptions, `11` empty-state helper. | Readable at captured100% but low visual prominence; small transaction/context text may be tiring for long use. No claim of clipping. |
| P2 integration state | Every captured screen carries header `환율 정보를 불러올 수 없습니다`. | All seven screenshots. | Actual upstream/unconfigured failure is visible and not replaced by invented rates; header exchange functionality is unavailable in this running environment. Root should classify unavailable dependency, not generic rendering error. |

## Passed visual observations in reviewed screenshots

- Shared blue sidebar/header, white content and active-item selection render consistently; icons are present and not missing-glyph squares. No desktop horizontal clipping/overlap in these seven initial states.
- Four booking views show consistent header/toolbar/footer. Dates, counts, amount summaries and read-only list fields align; lists display all seven columns at desktop width.
- Weekly calendar aligns seven day columns and today badge. Large lower whitespace results from a short week grid within full-height workspace, not missing rendering.
- Approval cards clearly separate title, requester timestamp, body and ordered step chips. Approved financial request shows 200 KRW and two approval comments/dates without overlap.
- Accounts card shows bank/account details and11,300KRW balance clearly. Ledger rows distinguish 출금200KRW and 입금1,500KRW with 승인 labels. Single account uses one-third card width by design; empty remainder is not a missing card.
- Messenger two-pane shell is legible; conversation title/preview and selected-tab styling fit. Right panel explicitly says select/start conversation when none is selected, instead of falsely showing a chat.

## Not established by these initial screenshots

No claim yet for save/delete behavior, dropdown open state, empty-search feedback, error handling, message editor/history, mobile forms, long content, or native confirmation dialogs. Root is capturing these separately. Source-only candidates and complete action selectors are in `/tmp/entrip-feature-checklist.md`.

## Source-only candidates for targeted reproduction

1. Messenger input does not emit typing events although header renders typing indication.
2. Previous-message paging increments thread length and triggers unconditional scroll-to-bottom.
3. Search with zero matches has no empty-result explanation.
4. Existing booking mobile footer is a single non-wrapping flex row with delete/status/close/save controls.
5. Bank edit permits typing in immutable opening balance/currency fields then leaves business-rule rejection to API.

These five are not screenshot-confirmed yet and must not be merged with the confirmed table as actual observed browser failures.

## Responsive pass: 14 additional screenshots directly inspected

Files: `responsive-{800,390}-{month-calendar,week-calendar,month-list,week-list,approval,accounts,messenger}.webp`.

| Priority | Confirmed responsive observation | Evidence / distinction |
|---|---|---|
| P1/P2 | Booking toolbar search field extends off the right edge at390px on all four booking views. Search cannot be read in full; header itself has no horizontal-scroll affordance. | All four390px booking screenshots. Monthly input begins around x274 and weekly input around x311, runs beyond390; status filter wraps alone to next line. This is separate from intentional table scrolling. |
| P2 | Calendar content becomes practically indistinguishable on mobile: most labels are `ENT...` and secondary destination/pax hidden. At800px names still truncated to`ENTRI...` with destination fragments. |390 and800 month/week calendar. Seven cramped day columns use narrow cards with identical prefixes. Screen fits but information isn't usable at glance; consider horizontal day-grid scroll with minimum day width, or mobile agenda. |
| P3 | Desktop sidebar remains210px at800px, leaving only~548px content and tightening booking lists/calendar and messenger. |800px screenshots. No outright app overflow, but tablet landscape might benefit from collapsed default sidebar. |
| Acceptable overflow | Booking lists390px and ledger390/800px show only left portion of wide tables inside content scroll area. |390 lists show team/date/destination/pax/partial coordinator; amount/status offscreen. Accounts390 shows date/account/category,800 shows partial amount. This is intended internal horizontal table scrolling from source, so do not report missing columns. Root can drag/scroll right to verify reachability and add discoverable scroll affordance as usability refinement. |
| Pass | Approval cards/buttons/filters/stepchips fit390 and800px; no overlaps. |Both approval screenshots. Cancellation ambiguity and disabled-page-button appearance persist. |
| Pass | Accounts card/main action buttons/filter fit390 and800px. |Both accounts screenshots. New forms not captured here. |
| Pass | Messenger list switches to single-pane at390px; search/conversation row fits. |390 messenger.800 keeps split panes and empty helper wraps to two lines without clipping. Actual open conversation/composer pending separate captures. |

The toolbar search clipping is the strongest confirmed layout defect in these14 responsive captures. Calendar labels are a density/usability failure even though document-level overflow checks can pass.

## Forms and booking actions:22 further screenshots directly inspected

Files37–54 including both38 filters and all four41 service images. Total visually opened in this review:43 screenshots.

Confirmed:

- **P2 print layout:** `43-booking-print-all-services.webp` shows 항공/차량/기타 tables with `수량` broken into separate vertical syllables, dates split `2026-11-`/`17`, and currency/amount split. The detailed-text column takes most width, with automatic independent table column widths. All content exists, but printed-document polish is weak. Set explicit column widths and nowrap date/count/amount headers and values; let descriptions wrap. Header and totals otherwise legible and four service sections all visible.
- **P2 user-facing history vocabulary:** `42-booking-history.webp` and `44-booking-mobile-dirty.webp` expose `teamName, totalPax, hotelInfo, insuranceInfo` etc. At390px the creation entry is a large block of raw internal keys above the actual form. Translate keys to field labels and summarize broad creation events. This is now visual-confirmed, not merely source inference.
- **P3 empty-search copy:** `37-booking-search-empty.webp` says 해당 기간에 예약이 없습니다 even though this is a no-match search in a populated month. The empty state exists and count correctly shows0, but should say 검색 조건에 맞는 예약이 없습니다 to distinguish filter results from empty period.
- **No mobile booking footer defect:** `44-booking-mobile-dirty.webp`, `45-booking-mobile-detail.webp`, `46-booking-dirty-close-cancel.webp` show delete/status/close/save fully fitting390px. Previous source-only footer concern is disproved for current captured labels and viewport. Keep out of issue list.
- All four service sections render consistent fields and totals; vehicle/other bottom sections reached through editor's internal scroll. Fixed editor header/footer remain available while long content scrolls. Mobile single column keeps service inputs within frame; input long text scrolls inside normal single-line fields rather than overflowing app.
- New account form47/48, transaction form49/50 and two-step finance approval52/53 maintain label/control alignment and correct mobile stacking. Account/mobile save is below current viewport because the form is long; do not call clipped without scroll test. Transaction/mobile save partly near bottom but reachable by scrolling. Approval mobile form fully includes request submit/cancel.
- `54-approval-pending-mobile.webp`: success notice,15KRW, first-step blue emphasis, two steps, request-cancel link all fit; existing approved/cancelled cards continue below. This confirms good mobile wrapping for acted and pending requests, aside from cancelled-step terminology already noted.
- `40-booking-required.webp` shows browser-native required-field validation anchored at 팀명, not silent save. Text is English because browser locale is English (`Please fill out this field.`); this is an environment/locale observation, not necessarily app-localization failure. Root's functional evidence should determine blocked submission.
- Progress filter38 and empty period39 visually update counts and selected state. Approval no-result51 has centered explanation and zero-count; normal.

No save/delete success is claimed solely from still images; root's recorded UI actions/API responses establish those results.

## Approval rejection / read-only account / messenger:15 further screenshots

Opened55,56,57,58,60,62–71 directly. Total opened58 images.

- **P2 already-confirmed status ambiguity extends to rejection:** `57-approval-rejected-mobile.webp` shows first approver 반려 with comment/date and overall 반려, but the never-reached second step is still 대기. The request is terminated; waiting terminology misleadingly suggests later action remains due. Otherwise long rejection comment and amount fit mobile well.
- `55/56` manager action form shows comment/승인/반려 clearly on desktop/mobile. Mobile comment is a single-line field with internal text scroll, not a broken layout; tiny width makes reviewing lengthy comments inconvenient but action buttons remain accessible.
- `58` mobile ledger card retains11,300KRW after rejected15KRW transaction. Rejection status is in offscreen right table columns and cannot be asserted from this screenshot alone; root API/scroll check needed.
- `60` USER account page shows only refresh, no create/edit controls, with explicit empty accounts/ledger messages. This visually matches read-only permission intent.
- **P3 no-search-results copy confirmed:** `63-messenger-empty-search.webp` shows a blank staff list under the nonmatching search input, with no '검색 결과 없음' message. The right pane still says select/start a conversation. Search works by removing matches but has weak feedback.
- `62/64` organization list shows name,department/email and1:1 action cleanly desktop/mobile. `65` multiline draft shows two separate lines, bottom composer and send button fully visible.
- `66` very long Korean string and unbroken URL wrap within the mobile blue bubble; no horizontal overflow. Empty composer and disabled send fit.
- `67` edited text and 수정됨 marker visible; `68` deleted message replaced by explicit 삭제된 메시지입니다 with edit/delete controls removed. Minor cosmetic observation: 수정됨 marker remains on deleted edited message, but not a critical issue.
- `69` invite list excludes current room members; `70` group header changes to two other participant names and 참여자3명, all fits. `71` list-return shows deleted-message preview and both rooms, mobile list preserved.

Messenger long text, edit, delete, invite and mobile navigation screenshots are visually sound. Remaining source-only concerns are typing event emission and history-load scroll jump; these need root's interaction-specific evidence if included as confirmed failures.

Also opened59-settings-user-readonly and61-user-menu-nonadmin (total60 images): J1 directory lists only J1 Admin/Manager/User, explicitly explains read-only permissions and hides row action controls. Non-admin user menu fits its right-aligned dropdown and exposes profile/help/logout without admin menu. The profile destination's semantics are covered by root/navigation review, not inferred from this static menu image.

## Messenger history scroll defect confirmed

Opened `72-messenger-history-before.webp` and `73-messenger-history-after.webp`, plus `history-scroll.json` (total62 images directly reviewed).

- **P2 functional UX defect:** clicking 이전 메시지 while at the oldest loaded messages jumps the conversation viewport to the newest messages instead of preserving position or showing newly loaded older messages.
- Before screenshot: 이전 메시지 at top, visible synthetic messages06–11. After screenshot: newest synthetic messages50–55 at bottom; the older messages and history button are out of view. Header/composer remain fixed correctly.
- Recorded scroll measurements: before `scrollTop=0`, `clientHeight=547`, `scrollHeight=4212`; after `scrollTop=6740`, `clientHeight=547`, `scrollHeight=7300`. This is a near-bottom jump, not just added content shifting a little.
- Reproduction setup is explicitly **test fixture data**:55 local synthetic messages inserted into the disposable PostgreSQL database after rapid API message insertion correctly hit HTTP429. The UI click and scroll behavior are real, but fixture insertion itself is not evidence of normal UI sending55 messages or production data.
- Source corroborates `useEffect(...scrollIntoView({block:'nearest',behavior:'smooth'}),[thread.length,activeConversationId])` in MessengerWorkspace.tsx:19; prepending history increases thread.length, invoking bottom scroll. Fix should distinguish appending new messages from prepending history and restore scroll offset around loaded content.

This replaces earlier source-only history-scroll suspicion with a screenshot-and-measurement-confirmed defect. Typing-event emission remains source-only unless root separately reproduces it with two clients.
