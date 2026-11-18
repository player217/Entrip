export type Currency = 'KRW' | 'USD' | 'EUR' | 'JPY' | 'CNY';
export type DetailKey = 'hotelInfo' | 'flightInfo' | 'vehicleInfo' | 'insuranceInfo';
export type DetailItem = { id: string; name: string; description: string; date: string; quantity: number; unitPrice: number; currency: Currency };
export type BookingHistoryEntry = { id: string; action: string; changedAt: string; changedFields: string[]; previousValues?: Record<string, unknown> | null; newValues?: Record<string, unknown> | null; user?: { name: string } };
export type BookingRecord = {
  id: string; bookingNumber: string; version: number; teamName: string; type: string; origin: string; destination: string;
  startDate: string; endDate: string; totalPax: number; coordinator: string; customerName?: string;
  representative?: string; contact?: string; email?: string; revenue?: number | string; totalPrice?: number | string;
  depositAmount?: number | string; currency: Currency; status: string; notes?: string;
  hotelInfo?: unknown; flightInfo?: unknown; vehicleInfo?: unknown; insuranceInfo?: unknown; history?: BookingHistoryEntry[];
};
export type BookingDraft = {
  teamName: string; type: string; origin: string; destination: string; startDate: string; endDate: string;
  totalPax: number; coordinator: string; customerName: string; representative: string; contact: string; email: string;
  revenue: number; depositAmount: number; currency: Currency; status: string; notes: string;
  hotelInfo: DetailItem[]; flightInfo: DetailItem[]; vehicleInfo: DetailItem[]; insuranceInfo: DetailItem[];
};
export type EditorSession = { record?: BookingRecord; draft: BookingDraft; baseline: string };
export const detailSections: { key: DetailKey; label: string }[] = [
  { key: 'hotelInfo', label: '호텔' }, { key: 'flightInfo', label: '항공' }, { key: 'vehicleInfo', label: '차량' }, { key: 'insuranceInfo', label: '기타' },
];
export const statuses: Record<string, string> = { PENDING: '대기', CONFIRMED: '확정', IN_PROGRESS: '진행', COMPLETED: '완료', CANCELLED: '취소' };
export const statusStyles: Record<string, string> = {
  PENDING: 'border-amber-400 bg-amber-50 text-amber-900',
  CONFIRMED: 'border-blue-400 bg-blue-50 text-blue-900',
  IN_PROGRESS: 'border-violet-400 bg-violet-50 text-violet-900',
  COMPLETED: 'border-emerald-400 bg-emerald-50 text-emerald-900',
  CANCELLED: 'border-slate-400 bg-slate-100 text-slate-600',
};
const historyFieldLabels: Record<string, string> = {
  teamName: '팀명', type: '예약 유형', origin: '출발지', destination: '목적지', startDate: '출발일', endDate: '귀국일',
  totalPax: '인원', coordinator: '담당자', customerName: '고객명', representative: '대표자', contact: '연락처', email: '이메일',
  revenue: '판매금액', totalPrice: '판매금액', depositAmount: '입금액', currency: '통화', status: '예약 상태', notes: '메모',
  hotelInfo: '호텔', flightInfo: '항공', vehicleInfo: '차량', insuranceInfo: '기타', deletedAt: '삭제 상태',
};
export function bookingHistoryFields(fields: string[]) {
  return [...new Set(fields.map(field => historyFieldLabels[field] ?? '기타 예약 정보'))];
}
function historyDetailValue(value: unknown): string {
  if (!Array.isArray(value)) return value ? '이전 형식의 상세 정보' : '등록 내역 없음';
  if (!value.length) return '등록 내역 없음';
  const text = (value: unknown) => value === null || value === undefined || value === '' ? '미입력' : String(value);
  const number = (value: unknown) => {
    if (value === null || value === undefined || value === '') return '미입력';
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed.toLocaleString('ko-KR', { maximumFractionDigits: 2 }) : text(value);
  };
  return value.map((item: unknown, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return `${index + 1}. ${text(item)}`;
    const row = item as Record<string, unknown>;
    const currency = row.currency ? String(row.currency) : '통화 미입력';
    const hasAmount = row.quantity !== null && row.quantity !== undefined && row.quantity !== '' &&
      row.unitPrice !== null && row.unitPrice !== undefined && row.unitPrice !== '' &&
      Number.isFinite(Number(row.quantity)) && Number.isFinite(Number(row.unitPrice));
    return [
      `${index + 1}. ${text(row.name)}`,
      `일자: ${row.date ? String(row.date).slice(0, 10) : '미입력'} · 수량: ${number(row.quantity)}`,
      `단가: ${currency} ${number(row.unitPrice)} · 합계: ${hasAmount ? `${currency} ${number(Number(row.quantity) * Number(row.unitPrice))}` : '미입력'}`,
      `상세: ${text(row.description)}`,
    ].join('\n');
  }).join('\n\n');
}
export function bookingHistoryChanges(entry: BookingHistoryEntry) {
  if (entry.action === 'create') return [];
  const fields = entry.changedFields.filter(field => field !== 'revenue' || !entry.changedFields.includes('totalPrice'));
  const display = (field: string, value: unknown) => {
    if (detailSections.some(section => section.key === field)) return historyDetailValue(value);
    if (value === null || value === undefined || value === '') return '미입력';
    if (field === 'status') return statuses[String(value)] ?? '상태 변경';
    if (field === 'type') return bookingTypes[String(value)] ?? '유형 변경';
    if (field === 'startDate' || field === 'endDate') return String(value).slice(0, 10);
    if (Array.isArray(value)) return `${value.length}개 항목`;
    if (typeof value === 'object') return '상세 정보';
    if (typeof value === 'number') return value.toLocaleString();
    return String(value);
  };
  return fields.filter(field => historyFieldLabels[field]).map(field => ({
    label: historyFieldLabels[field]!,
    before: display(field, entry.previousValues?.[field]),
    after: display(field, entry.newValues?.[field]),
    hasValues: Boolean(entry.previousValues && entry.newValues),
  }));
}
export const bookingTypes: Record<string, string> = { PACKAGE: '패키지', FIT: '개별여행', GROUP: '단체', BUSINESS: '출장·워크숍', INCENTIVE: '인센티브' };
export const dateKey = (value: string) => value.slice(0, 10);
export const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const items = (value: unknown): DetailItem[] => Array.isArray(value) ? value.filter((item): item is DetailItem => Boolean(item && typeof item.id === 'string' && typeof item.name === 'string' && typeof item.unitPrice === 'number')) : [];
export function makeDraft(record: BookingRecord | undefined, day: string, coordinator: string): BookingDraft {
  return {
    teamName: record?.teamName ?? '', type: record?.type ?? 'FIT', origin: record?.origin ?? '', destination: record?.destination ?? '',
    startDate: record ? dateKey(record.startDate) : day, endDate: record ? dateKey(record.endDate) : day,
    totalPax: record?.totalPax ?? 1, coordinator: record?.coordinator ?? coordinator, customerName: record?.customerName ?? '',
    representative: record?.representative ?? '', contact: record?.contact ?? '', email: record?.email ?? '',
    revenue: Number(record?.totalPrice ?? record?.revenue ?? 0), depositAmount: Number(record?.depositAmount ?? 0),
    currency: record?.currency ?? 'KRW', status: record?.status ?? 'PENDING', notes: record?.notes ?? '',
    hotelInfo: items(record?.hotelInfo), flightInfo: items(record?.flightInfo), vehicleInfo: items(record?.vehicleInfo), insuranceInfo: items(record?.insuranceInfo),
  };
}
export function bookingPayload(session: EditorSession): Record<string, unknown> {
  const payload: Record<string, unknown> = { ...session.draft, totalPrice: session.draft.revenue };
  // Preserve unedited legacy detail JSON. It must not disappear merely because the new editor cannot render its old shape.
  if (session.record) {
    const baseline = JSON.parse(session.baseline) as BookingDraft;
    for (const { key } of detailSections) if (JSON.stringify(baseline[key]) === JSON.stringify(session.draft[key])) delete payload[key];
  }
  return payload;
}
export function escapeHtml(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
}
export function bookingPrintHtml(draft: BookingDraft, number?: string) {
  const e = escapeHtml;
  const details = detailSections.map(({ key, label }) => `<section class="service-section"><h2>${label}</h2><table><colgroup><col class="item-col"><col class="date-col"><col class="description-col"><col class="quantity-col"><col class="money-col"></colgroup><thead><tr><th>항목</th><th class="nowrap">일자</th><th>상세</th><th class="nowrap number">수량</th><th class="nowrap number">금액</th></tr></thead><tbody>${draft[key].map(item => `<tr><td>${e(item.name)}</td><td class="nowrap">${e(item.date || '미입력')}</td><td>${e(item.description)}</td><td class="nowrap number">${item.quantity.toLocaleString()}</td><td class="nowrap number">${e(item.currency)} ${(item.quantity * item.unitPrice).toLocaleString()}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">등록 내역 없음</td></tr>'}</tbody></table></section>`).join('');
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>예약 내역 ${e(draft.teamName)}</title><style>
    @page{size:A4;margin:14mm}
    *{box-sizing:border-box}body{font-family:Arial,"Malgun Gothic",sans-serif;color:#172554;margin:0 auto;padding:28px;max-width:1000px;font-size:13px;line-height:1.55}h1{color:#2563eb;font-size:27px}h2{font-size:16px;margin:22px 0 8px;break-after:avoid-page;page-break-after:avoid}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #cbd5e1;padding:7px;text-align:left;vertical-align:top;overflow-wrap:anywhere}th{background:#eff6ff;font-weight:600}thead{display:table-header-group}tr{break-inside:avoid;page-break-inside:avoid}.item-col{width:24%}.date-col{width:15%}.description-col{width:33%}.quantity-col{width:8%}.money-col{width:20%}.nowrap{white-space:nowrap;overflow-wrap:normal}.number{text-align:right;font-variant-numeric:tabular-nums}.empty{color:#64748b}p{white-space:pre-wrap;overflow-wrap:anywhere}.summary{border-block:1px solid #cbd5e1;padding:10px 0}.service-section{break-inside:auto}button{padding:7px 14px;border:1px solid #cbd5e1;border-radius:5px;background:white}
    @media print{button{display:none}body{padding:0;max-width:none;font-size:10pt}h1{font-size:22pt}h2{font-size:12pt}th,td{padding:5px}.service-section{orphans:2;widows:2}}
    </style></head><body><button onclick="window.print()">인쇄</button><h1>ENTRIP 예약 내역</h1><p>${e(number ?? '미저장')} · ${e(statuses[draft.status] ?? draft.status)}</p><h2>${e(draft.teamName)}</h2><p>${e(draft.origin)} → ${e(draft.destination)} / ${e(draft.startDate)} ~ ${e(draft.endDate)} / ${draft.totalPax}명</p><p>고객: ${e(draft.customerName)} / 대표자: ${e(draft.representative)}<br>연락처: ${e(draft.contact)} / ${e(draft.email)}<br>담당자: ${e(draft.coordinator)}</p><p class="summary">판매금액: ${e(draft.currency)} ${draft.revenue.toLocaleString()} / 입금액: ${draft.depositAmount.toLocaleString()} / 잔액: ${(draft.revenue - draft.depositAmount).toLocaleString()}</p>${details}<h2>메모</h2><p>${e(draft.notes)}</p></body></html>`;
}
export async function bookingRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/v2/bookings${path}`, { ...init, credentials: 'include', cache: 'no-store', headers: { 'Content-Type': 'application/json', ...init.headers } });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(response.status === 412 ? '다른 사용자가 이 예약을 변경했습니다. 작성 중인 내용은 유지됩니다. 최신 내용을 다시 불러와 확인하세요.' : result.message ?? `예약 요청에 실패했습니다 (${response.status}).`);
  return result as T;
}
