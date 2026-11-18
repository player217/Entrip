import { bookingTypes, detailSections, escapeHtml, statuses, type BookingDraft, type BookingRecord, type DetailKey, type DetailItem } from './booking-model';
import { relatedServiceRows, retainedFacts, serviceFields, serviceStartLabels } from './booking-details';

export type BookingPrintOptions = { dirty?: boolean; deleted?: boolean; record?: BookingRecord };
const formatNumber = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2 });
const formatExchangeRate = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 8 });
const text = (value: string | undefined) => escapeHtml(value?.trim() ? value : '미입력');
const amount = (currency: string, value: number) => `${escapeHtml(currency)} ${formatNumber.format(value)}`;

export const bookingSheetStyles = `
.reservation-sheet {color:#172c43;font:9.5pt/1.28 "Malgun Gothic","Noto Sans CJK KR",Arial,sans-serif;overflow-wrap:anywhere;font-variant-numeric:tabular-nums}
.reservation-sheet * {box-sizing:border-box}
.reservation-sheet .document-heading {border-top:3px solid #245486;border-bottom:1px solid #8aabca;padding:6px 0;margin-bottom:6px}
.reservation-sheet .document-meta {display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:0 8px;margin:0 0 3px;color:#355570;font-size:8.5pt}
.reservation-sheet h1 {font-size:19pt;line-height:1.25;margin:0;color:#173e65;font-weight:700;white-space:pre-wrap}
.reservation-sheet h2 {font-size:11pt;line-height:1.3;margin:7px 0 3px;color:#214a70;font-weight:700;break-after:avoid-page}
.reservation-sheet .facts {display:grid;grid-template-columns:13% 37% 13% 37%;margin:0;align-items:stretch;border-top:1px solid #aebfcd;border-left:1px solid #cbd5df}
.reservation-sheet .facts dt,.reservation-sheet .facts dd {margin:0;padding:3px 5px;border-right:1px solid #cbd5df;border-bottom:1px solid #cbd5df;white-space:pre-wrap}
.reservation-sheet .facts dd:last-child:nth-child(4n+2) {grid-column:span 3}
.reservation-sheet .facts dt {background:#eef3f7;color:#314b60;font-weight:600}
.reservation-sheet .amounts {display:flex;flex-wrap:wrap;gap:6px 20px;border-block:1px solid #abbfce;padding:3px 5px;margin:0}
.reservation-sheet .amounts span {display:inline-block}
.reservation-sheet .service {break-inside:auto}
.reservation-sheet table {width:100%;border-collapse:collapse;table-layout:fixed;margin:0}
.reservation-sheet caption {text-align:left}
.reservation-sheet .service col:first-child {width:25%}
.reservation-sheet .service col:nth-child(2),.reservation-sheet .service col:nth-child(3){width:24%}
.reservation-sheet .service col:last-child {width:27%}
.reservation-sheet .finance th:first-child {width:38%}
.reservation-sheet .finance th:nth-child(2) {width:10%}
.reservation-sheet .finance th:nth-child(3),.reservation-sheet .finance th:nth-child(4){width:18%}
.reservation-sheet .finance th:last-child {width:16%}
.reservation-sheet .service-fact {margin:0;white-space:pre-wrap}
.reservation-sheet .service-fact b {font-size:8pt;color:#3d566b}
.reservation-sheet .service-fact + .service-fact {margin-top:1px}
.reservation-sheet .issue {font-size:8pt;color:#475c71}
.reservation-sheet th,.reservation-sheet td {border:1px solid #c1ced9;padding:3px 5px;text-align:left;vertical-align:top;white-space:pre-wrap;overflow-wrap:anywhere}
.reservation-sheet th {font-weight:600;background:#eff4f8;color:#314b60}
.reservation-sheet .number {text-align:right}
.reservation-sheet .row-description,.reservation-sheet .supplement {margin:2px 0 0;font-size:9pt;line-height:1.4;white-space:pre-wrap}
.reservation-sheet .supplement span {display:inline-block;max-width:100%;margin-right:9px}
.reservation-sheet .empty {color:#506274}
.reservation-sheet .memo {border-block:1px solid #c1ced9;margin:0;padding:3px 5px;white-space:pre-wrap}
.reservation-sheet thead {display:table-header-group;break-after:avoid-page}
.reservation-sheet .section-title {border:0;padding:0;background:white}
.reservation-sheet tbody tr:first-child {break-before:avoid-page}
.reservation-sheet tr {break-inside:avoid-page;page-break-inside:avoid}
@media print {.reservation-sheet {-webkit-print-color-adjust:exact;print-color-adjust:exact}.reservation-sheet .document-heading{break-after:avoid-page}}
`;

type Column = { title: string; keys: string[] };
const formColumns: Record<DetailKey, Column[]> = {
  flightInfo: [{ title: '항공편', keys: ['name','airline','flightNo'] }, { title: '출발', keys: ['from','date','departureTime'] }, { title: '도착', keys: ['to','arrivalDate','arrivalTime'] }, { title: '상세 · 비고', keys: ['description'] }],
  hotelInfo: [{ title: '숙소', keys: ['name','vendor'] }, { title: '투숙 기간', keys: ['date','checkOut','nights'] }, { title: '객실 · 식사', keys: ['roomType','breakfast'] }, { title: '주소 · 비고', keys: ['address','phone','description'] }],
  vehicleInfo: [{ title: '차량 · 업체', keys: ['name','vendor','vehicleType','passengers'] }, { title: '인수', keys: ['date','pickupTime','route'] }, { title: '반납', keys: ['returnDate','returnTime','duration'] }, { title: '기사 · 비고', keys: ['driver','phone','description'] }],
  insuranceInfo: [{ title: '항목', keys: ['name'] }, { title: '이용 기간', keys: ['date','endDate'] }, { title: '업체', keys: ['vendor'] }, { title: '상세 · 비고', keys: ['description'] }],
};

function serviceTable(key: DetailKey, label: string, items: DetailItem[]) {
  const columns = formColumns[key];
  const known = new Set(columns.flatMap(group => group.keys));
  const rows = items.map((item, index) => {
    const facts = new Map(serviceFields[key].map(field => [field.key, { label: field.label, value: item.fields?.[field.key] }]));
    facts.set('date', { label: serviceStartLabels[key], value: item.date });
    facts.set('description', { label: '상세', value: item.description });
    const formatFact = (title: string, value: string) => `<p class="service-fact"><b>${escapeHtml(title)}</b> ${escapeHtml(value)}</p>`;
    const remaining = [...facts.entries()].filter(([key, fact]) => !known.has(key) && fact.value).map(([, fact]) => formatFact(fact.label, fact.value!));
    const oldFacts = retainedFacts(item).map(fact => formatFact(fact.label, fact.value));
    const cells = columns.map((column, position) => {
      const data = column.keys.map(field => {
        if (field === 'name') return `<strong>${index + 1}. ${text(item.name)}</strong>`;
        const fact = facts.get(field);
        return fact?.value ? formatFact(fact.label, fact.value) : '';
      });
      if (position === columns.length - 1) data.push(...remaining, ...oldFacts);
      return `<td>${data.join('') || '—'}</td>`;
    });
    return `<tr>${cells.join('')}</tr>`;
  });
  return `<section class="service"><table><colgroup><col><col><col><col></colgroup><thead><tr><th colspan="4" class="section-title"><h2>${label} 내역 · ${items.length}건</h2></th></tr><tr>${columns.map(col => `<th>${col.title}</th>`).join('')}</tr></thead><tbody>${rows.join('') || '<tr><td colspan="4" class="empty">등록 내역 없음</td></tr>'}</tbody></table></section>`;
}

function costTable(draft: BookingDraft) {
  const totals = new Map<string, number>();
  let unpriced = 0;
  const rows = detailSections.flatMap(({ key, label }) => draft[key].map((item, index) => {
    const total = item.quantity * item.unitPrice;
    if (item.unpriced) unpriced++;
    else totals.set(item.currency, (totals.get(item.currency) ?? 0) + total);
    return `<tr><td>${label} ${index + 1} · ${text(item.name)}</td><td class="number">${formatNumber.format(item.quantity)}</td><td class="number">${item.unpriced ? '미입력' : amount(item.currency, item.unitPrice)}</td><td class="number">${item.unpriced ? '미입력' : amount(item.currency, total)}</td></tr>`;
  }));
  if (!rows.length) return '';
  const subtotals = Array.from(totals).map(([currency, total]) => `<span>소계 <b>${amount(currency, total)}</b></span>`).join('');
  return `<table class="finance"><thead><tr><th colspan="4" class="section-title"><h2>여행 항목별 금액</h2></th></tr><tr><th>항목</th><th class="number">수량</th><th class="number">단가</th><th class="number">합계</th></tr></thead><tbody>${rows.join('')}</tbody></table><p class="amounts">${subtotals}${unpriced ? `<span>금액 미입력 ${unpriced}건</span>` : ''}</p>`;
}

function linkedServiceTable(record?: BookingRecord) {
  const rows = relatedServiceRows(record);
  if (!rows.length) return '';
  return `<table><thead><tr><th colspan="2" class="section-title"><h2>연결된 수배 · ${rows.length}건</h2></th></tr><tr><th style="width:26%">수배 항목</th><th>상세 내역</th></tr></thead><tbody>${rows.map(row => `<tr><td>${escapeHtml(row.label)} · ${text(row.title)}</td><td class="supplement">${row.facts.map(fact => `<span><b>${escapeHtml(fact.label)}</b> ${escapeHtml(fact.value)}</span>`).join('')}</td></tr>`).join('')}</tbody></table>`;
}

function settlementTable(record?: BookingRecord) {
  const entries = record?.settlements;
  if (!entries?.length) return `<h2>정산 내역</h2><p class="memo empty">${entries || !record ? '등록된 정산 내역 없음' : '정산 내역 미조회'}</p>`;
  return `<table><thead><tr><th colspan="6" class="section-title"><h2>정산 내역 · ${entries.length}건</h2></th></tr><tr><th>구분</th><th>금액</th><th>수량</th><th>단가</th><th>환율</th><th>메모</th></tr></thead><tbody>${entries.map(entry =>
    `<tr><td>${escapeHtml(entry.type === 'INCOME' ? '입금' : entry.type === 'EXPENSE' ? '출금' : entry.type)}</td><td class="number">${amount(entry.currency, Number(entry.amount))}</td><td class="number">${entry.quantity == null ? '—' : formatNumber.format(entry.quantity)}</td><td class="number">${entry.unitPrice == null ? '—' : amount(entry.currency, Number(entry.unitPrice))}</td><td class="number">${entry.exchangeRate == null ? '—' : formatExchangeRate.format(Number(entry.exchangeRate))}</td><td>${text(entry.memo ?? undefined)}</td></tr>`).join('')}</tbody></table>`;
}

export function bookingSheetBody(draft: BookingDraft, number?: string, options: BookingPrintOptions = {}) {
  const info: [string, string][] = [
    ['예약 유형', bookingTypes[draft.type] ?? draft.type], ['예약 상태', statuses[draft.status] ?? draft.status],
    ['출발지', draft.origin], ['목적지', draft.destination],
    ['출발일', draft.startDate], ['귀국일', draft.endDate],
    ['인원', `${formatNumber.format(draft.totalPax)}명`], ['담당자', draft.coordinator],
    ['고객명', draft.customerName], ['대표자', draft.representative], ['연락처', draft.contact], ['이메일', draft.email],
  ];
  if (draft.teamType) info.push(['팀 유형', draft.teamType]);
  const services = detailSections.map(({ key, label }) => serviceTable(key, label, draft[key])).join('');
  const source = options.deleted ? '삭제된 예약의 미저장 초안' : !number ? '미저장 초안' : options.dirty ? '저장하지 않은 수정본' : '저장된 예약';
  const created = options.record?.history?.find(entry => entry.action === 'create');
  const createdAt = options.record?.createdAt || created?.changedAt;
  const author = options.record?.user?.name || created?.user?.name;
  const issue = createdAt || author ? `<span class="issue">작성일 ${createdAt ? escapeHtml(new Date(createdAt).toLocaleDateString('ko-KR')) : '미기록'} · 작성자 ${text(author)}</span>` : '';
  return `<article class="reservation-sheet"><header class="document-heading"><p class="document-meta"><span>ENTRIP 예약서 · ${escapeHtml(number || '예약번호 미발급')} · ${source}</span>${issue}</p><h1>${text(draft.teamName)}</h1></header><h2>예약 · 고객 정보</h2><dl class="facts">${info.map(([label, val]) => `<dt>${label}</dt><dd>${text(val)}</dd>`).join('')}</dl>${services}${linkedServiceTable(options.record)}${costTable(draft)}<h2>판매 · 입금 현황</h2><p class="amounts"><span>판매금액 <b>${amount(draft.currency, draft.revenue)}</b></span><span>입금액 <b>${amount(draft.currency, draft.depositAmount)}</b></span><span>잔액 <b>${amount(draft.currency, draft.revenue - draft.depositAmount)}</b></span></p>${settlementTable(options.record)}<h2>메모</h2><p class="memo">${text(draft.notes)}</p></article>`;
}

export function bookingPrintHtml(draft: BookingDraft, number?: string, options?: BookingPrintOptions) {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>예약 내역 · ${escapeHtml(draft.teamName)}</title><style>@page{size:A4;margin:12mm;@bottom-right{content:counter(page) " / " counter(pages);font:8pt Arial,sans-serif;color:#526475}}body{margin:0 auto;padding:24px;max-width:850px;background:white}button{margin:0 0 14px;padding:7px 17px;border:1px solid #aabccc;border-radius:4px;background:white;cursor:pointer}@media print{body{margin:0;padding:0;max-width:none}button{display:none}} ${bookingSheetStyles}</style></head><body><button type="button" onclick="window.print()">인쇄</button>${bookingSheetBody(draft, number, options)}</body></html>`;
}
