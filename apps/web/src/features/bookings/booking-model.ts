import { detailFacts, readDetails } from './booking-details';
export type Currency = 'KRW' | 'USD' | 'EUR' | 'JPY' | 'CNY';
export type DetailKey = 'hotelInfo' | 'flightInfo' | 'vehicleInfo' | 'insuranceInfo';
export type DetailItem = { id: string; name: string; description: string; date: string; quantity: number; unitPrice: number; currency: Currency; fields?: Record<string,string>; unpriced?: boolean; legacyExtra?: string };
export type BookingHistoryEntry = { id: string; action: string; changedAt: string; changedFields: string[]; previousValues?: Record<string, unknown> | null; newValues?: Record<string, unknown> | null; user?: { name: string } };
export type BookingRecord = {
  id: string; bookingNumber: string; version: number; teamName: string; teamType?: string; type: string; origin: string; destination: string;
  startDate: string; endDate: string; totalPax: number; coordinator: string; customerName?: string;
  representative?: string; contact?: string; email?: string; revenue?: number | string; totalPrice?: number | string;
  depositAmount?: number | string; currency: Currency; status: string; notes?: string;
  createdAt?: string; user?: { name: string } | null; flights?: Record<string, unknown>[]; hotels?: Record<string, unknown>[]; vehicles?: Record<string, unknown>[];
  settlements?: { id: string; type: string; currency: string; amount: number|string; exchangeRate?: number|string|null; quantity?: number|null; unitPrice?: number|string|null; memo?: string|null }[];
  hotelInfo?: unknown; flightInfo?: unknown; vehicleInfo?: unknown; insuranceInfo?: unknown; history?: BookingHistoryEntry[];
};
export type BookingDraft = {
  teamName: string; teamType?: string; type: string; origin: string; destination: string; startDate: string; endDate: string;
  totalPax: number; coordinator: string; customerName: string; representative: string; contact: string; email: string;
  revenue: number; depositAmount: number; currency: Currency; status: string; notes: string;
  hotelInfo: DetailItem[]; flightInfo: DetailItem[]; vehicleInfo: DetailItem[]; insuranceInfo: DetailItem[];
};
export type EditorSession = { record?: BookingRecord; draft: BookingDraft; baseline: string; remoteChange?: 'updated' | 'deleted' };
export const detailSections: { key: DetailKey; label: string }[] = [
  { key: 'flightInfo', label: '항공' }, { key: 'hotelInfo', label: '호텔' }, { key: 'vehicleInfo', label: '차량' }, { key: 'insuranceInfo', label: '기타' },
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
  teamName: '팀명', teamType: '팀 유형', type: '예약 유형', origin: '출발지', destination: '목적지', startDate: '출발일', endDate: '귀국일',
  totalPax: '인원', coordinator: '담당자', customerName: '고객명', representative: '대표자', contact: '연락처', email: '이메일',
  revenue: '판매금액', totalPrice: '판매금액', depositAmount: '입금액', currency: '통화', status: '예약 상태', notes: '메모',
  hotelInfo: '호텔', flightInfo: '항공', vehicleInfo: '차량', insuranceInfo: '기타', deletedAt: '삭제 상태',
};
export function bookingHistoryFields(fields: string[]) {
  return [...new Set(fields.map(field => historyFieldLabels[field] ?? '기타 예약 정보'))];
}
function historyDetailValue(value: unknown, field: DetailKey): string {
  if (!Array.isArray(value)) return value ? historyDetailValue(readDetails(field, value, 'KRW'), field) : '등록 내역 없음';
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
    const hasAmount = !row.unpriced && row.quantity !== null && row.quantity !== undefined && row.quantity !== '' &&
      row.unitPrice !== null && row.unitPrice !== undefined && row.unitPrice !== '' &&
      Number.isFinite(Number(row.quantity)) && Number.isFinite(Number(row.unitPrice));
    return [
      `${index + 1}. ${text(row.name)}`,
      `일자: ${row.date ? String(row.date).slice(0, 10) : '미입력'} · 수량: ${number(row.quantity)}`,
      `단가: ${row.unpriced ? '미입력' : `${currency} ${number(row.unitPrice)}`} · 합계: ${hasAmount ? `${currency} ${number(Number(row.quantity) * Number(row.unitPrice))}` : '미입력'}`,
      `상세: ${text(row.description)}`,
      ...detailFacts(field, item as DetailItem).map(fact => `${fact.label}: ${fact.value}`),
    ].join('\n');
  }).join('\n\n');
}
export function bookingHistoryChanges(entry: BookingHistoryEntry) {
  if (entry.action === 'create') return [];
  const fields = entry.changedFields.filter(field => field !== 'revenue' || !entry.changedFields.includes('totalPrice'));
  const display = (field: string, value: unknown) => {
    if (detailSections.some(section => section.key === field)) return historyDetailValue(value, field as DetailKey);
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
export function makeDraft(record: BookingRecord | undefined, day: string, coordinator: string): BookingDraft {
  return {
    teamName: record?.teamName ?? '', teamType: record?.teamType ?? '', type: record?.type ?? 'FIT', origin: record?.origin ?? '', destination: record?.destination ?? '',
    startDate: record ? dateKey(record.startDate) : day, endDate: record ? dateKey(record.endDate) : day,
    totalPax: record?.totalPax ?? 1, coordinator: record?.coordinator ?? coordinator, customerName: record?.customerName ?? '',
    representative: record?.representative ?? '', contact: record?.contact ?? '', email: record?.email ?? '',
    revenue: Number(record?.totalPrice ?? record?.revenue ?? 0), depositAmount: Number(record?.depositAmount ?? 0),
    currency: record?.currency ?? 'KRW', status: record?.status ?? 'PENDING', notes: record?.notes ?? '',
    hotelInfo: readDetails('hotelInfo', record?.hotelInfo, record?.currency ?? 'KRW'), flightInfo: readDetails('flightInfo', record?.flightInfo, record?.currency ?? 'KRW'), vehicleInfo: readDetails('vehicleInfo', record?.vehicleInfo, record?.currency ?? 'KRW'), insuranceInfo: readDetails('insuranceInfo', record?.insuranceInfo, record?.currency ?? 'KRW'),
  };
}
export function bookingPayload(session: EditorSession): Record<string, unknown> {
  if (!session.record) return { ...session.draft, totalPrice: session.draft.revenue };
  const baseline = JSON.parse(session.baseline) as BookingDraft;
  const payload: Record<string, unknown> = {};
  // Stored nulls and old JSON are meaningful. Only write fields edited in this session.
  for (const key of Object.keys(session.draft) as (keyof BookingDraft)[]) {
    if (JSON.stringify(baseline[key]) !== JSON.stringify(session.draft[key])) payload[key] = session.draft[key];
  }
  if ('revenue' in payload) payload.totalPrice = session.draft.revenue;
  return payload;
}
export function escapeHtml(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
}
export { bookingPrintHtml } from './booking-print';
export class BookingRequestError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}
export async function bookingRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/v2/bookings${path}`, { ...init, credentials: 'include', cache: 'no-store', headers: { 'Content-Type': 'application/json', ...init.headers } });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new BookingRequestError(response.status, response.status === 412 ? '다른 사용자가 이 예약을 변경했습니다. 작성 중인 내용은 유지됩니다. 최신 내용을 다시 불러와 확인하세요.' : result.message ?? `예약 요청에 실패했습니다 (${response.status}).`);
  return result as T;
}
