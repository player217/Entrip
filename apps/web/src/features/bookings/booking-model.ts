export type Currency = 'KRW' | 'USD' | 'EUR' | 'JPY' | 'CNY';
export type DetailKey = 'hotelInfo' | 'flightInfo' | 'vehicleInfo' | 'insuranceInfo';
export type DetailItem = { id: string; name: string; description: string; date: string; quantity: number; unitPrice: number; currency: Currency };
export type BookingHistoryEntry = { id: string; action: string; changedAt: string; changedFields: string[]; user?: { name: string } };
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
  const details = detailSections.map(({ key, label }) => `<h2>${label}</h2><table><tr><th>항목</th><th>일자</th><th>상세</th><th>수량</th><th>금액</th></tr>${draft[key].map(item => `<tr><td>${e(item.name)}</td><td>${e(item.date)}</td><td>${e(item.description)}</td><td>${item.quantity}</td><td>${e(item.currency)} ${(item.quantity * item.unitPrice).toLocaleString()}</td></tr>`).join('') || '<tr><td colspan="5">등록 내역 없음</td></tr>'}</table>`).join('');
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>예약 내역 ${e(draft.teamName)}</title><style>body{font-family:Arial,sans-serif;color:#172554;padding:32px}h1{color:#2563eb}h2{font-size:17px;margin-top:24px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #cbd5e1;padding:8px;text-align:left}p{white-space:pre-wrap}@media print{button{display:none}body{padding:0}}</style></head><body><button onclick="window.print()">인쇄</button><h1>ENTRIP 예약 내역</h1><p>${e(number ?? '미저장')} · ${e(statuses[draft.status] ?? draft.status)}</p><h2>${e(draft.teamName)}</h2><p>${e(draft.origin)} → ${e(draft.destination)} / ${e(draft.startDate)} ~ ${e(draft.endDate)} / ${draft.totalPax}명</p><p>고객: ${e(draft.customerName)} / 대표자: ${e(draft.representative)}<br>연락처: ${e(draft.contact)} / ${e(draft.email)}<br>담당자: ${e(draft.coordinator)}</p><p>판매금액: ${e(draft.currency)} ${draft.revenue.toLocaleString()} / 입금액: ${draft.depositAmount.toLocaleString()} / 잔액: ${(draft.revenue - draft.depositAmount).toLocaleString()}</p>${details}<h2>메모</h2><p>${e(draft.notes)}</p></body></html>`;
}
export async function bookingRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/v2/bookings${path}`, { ...init, credentials: 'include', cache: 'no-store', headers: { 'Content-Type': 'application/json', ...init.headers } });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(response.status === 412 ? '다른 사용자가 이 예약을 변경했습니다. 작성 중인 내용은 유지됩니다. 최신 내용을 다시 불러와 확인하세요.' : result.message ?? `예약 요청에 실패했습니다 (${response.status}).`);
  return result as T;
}
