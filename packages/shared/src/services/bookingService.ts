import { apiClient } from '../lib/apiClient';
import type {
  NewTeamPayload,
  Booking,
  BookingListResponse,
  BookingDetailResponse,
  BookingFilters
} from '../types/booking';
import { BookingStatus, BookingType } from '../types/booking';
import { mapV2BookingToDTO, type V2BookingLike } from '../types/prisma-bridge';

/**
 * Phase 3 shared booking service
 * - Supports both v1 and v2 APIs based on feature flag / env configuration
 * - Keeps response typing consistent for web consumers
 */

type Mode = 'v1' | 'v2';
type PartialBookingPayload = Partial<NewTeamPayload> & Record<string, any>;
type UpdateOptions = { version?: number } | undefined;
type LegacyListParams = ({
  page?: number;
  pageSize?: number;
  month?: string;
  status?: string;
} & BookingFilters) | undefined;

const V2_ALLOWED_TYPES = new Set([
  'incentive',
  'golf',
  'honeymoon',
  'airtel',
  'workshop',
  'reward',
  'teambuilding'
]);

const DEFAULT_ORIGIN = process.env.NEXT_PUBLIC_BOOKING_DEFAULT_ORIGIN
  || process.env.BOOKING_DEFAULT_ORIGIN
  || 'Seoul';

const DEFAULT_COORDINATOR = process.env.NEXT_PUBLIC_BOOKING_DEFAULT_COORDINATOR
  || process.env.BOOKING_DEFAULT_COORDINATOR
  || 'system';

const MONTHLY_FETCH_LIMIT = Number(process.env.BOOKING_MONTHLY_FETCH_LIMIT || 500);

let forcedMode: Mode | null = null;

const resolveMode = (): Mode => {
  if (forcedMode) return forcedMode;
  const env = (process.env.NEXT_PUBLIC_BOOKING_API_MODE
    || process.env.BOOKING_API_MODE
    || process.env.NEXT_PUBLIC_BOOKING_API_TARGET
    || '').toLowerCase();
  return env.includes('v2') ? 'v2' : 'v1';
};

export const __setBookingServiceModeForTests = (mode: Mode | null) => {
  forcedMode = mode;
};

const getBasePath = (mode: Mode) => (mode === 'v2' ? '/v2/bookings' : '/bookings');

const toNumber = (value: any, fallback?: number): number | undefined => {
  if (value === null || value === undefined) return fallback;
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return num;
};

const toIsoString = (value?: string | Date | null): string | undefined => {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T00:00:00.000Z`;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
};

const toDateOnly = (value?: string | Date | null, fallback?: string): string => {
  if (!value) return fallback || new Date().toISOString().slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback || new Date().toISOString().slice(0, 10);
  return parsed.toISOString().slice(0, 10);
};

const normalizeStatus = (value: any): BookingStatus => {
  if (!value) return BookingStatus.PENDING;
  const upper = typeof value === 'string' ? value.toUpperCase() : String(value);
  return (Object.values(BookingStatus) as string[]).includes(upper)
    ? (upper as BookingStatus)
    : BookingStatus.PENDING;
};

const V2_TO_BOOKING_TYPE: Record<string, BookingType> = {
  incentive: BookingType.GROUP,
  golf: BookingType.FIT,
  honeymoon: BookingType.PACKAGE,
  airtel: BookingType.FIT,
  workshop: BookingType.BUSINESS,
  reward: BookingType.BUSINESS,
  teambuilding: BookingType.GROUP,
};

const normalizeBookingType = (value: any): BookingType | undefined => {
  if (!value) return undefined;
  const upper = typeof value === 'string' ? value.toUpperCase() : String(value);
  if ((Object.values(BookingType) as string[]).includes(upper)) {
    return upper as BookingType;
  }
  const lower = upper.toLowerCase();
  return V2_TO_BOOKING_TYPE[lower];
};

const normalizeBooking = (raw: any, mode: Mode, meta?: { etag?: string }): Booking => {
  if (mode === 'v1') {
    const booking = raw as Booking;
    return meta?.etag ? { ...booking, etag: meta.etag } : booking;
  }

  const dto = mapV2BookingToDTO(raw as V2BookingLike);
  const status = normalizeStatus(raw?.status ?? dto.status);
  const totalPrice = toNumber(dto.totalPrice ?? raw?.totalPrice ?? raw?.revenue, 0) ?? 0;
  const createdAt = toIsoString(dto.createdAt ?? raw?.createdAt) ?? new Date().toISOString();
  const updatedAt = toIsoString(dto.updatedAt ?? raw?.updatedAt) ?? createdAt;

  const booking: Booking = {
    id: dto.id,
    bookingNumber: dto.bookingNumber,
    teamName: dto.teamName,
    customerName: dto.customerName ?? dto.teamName,
    bookingType: normalizeBookingType(dto.type ?? raw?.type),
    origin: dto.origin ?? raw?.origin ?? undefined,
    destination: dto.destination ?? raw?.destination ?? '',
    coordinator: raw?.coordinator ?? raw?.manager ?? raw?.managerName ?? undefined,
    startDate: dto.startDate ?? new Date().toISOString(),
    endDate: dto.endDate ?? dto.startDate ?? new Date().toISOString(),
    paxCount: dto.totalPax ?? toNumber(raw?.paxCount ?? raw?.totalPax, 0) ?? 0,
    totalPax: dto.totalPax ?? toNumber(raw?.totalPax, undefined),
    nights: raw?.nights ?? undefined,
    days: raw?.days ?? undefined,
    status,
    totalPrice,
    depositAmount: dto.depositAmount ?? toNumber(raw?.depositAmount, undefined),
    currency: dto.currency ?? (typeof raw?.currency === 'string' ? raw.currency : undefined),
    notes: dto.notes ?? raw?.notes ?? raw?.memo ?? undefined,
    createdAt,
    updatedAt,
    createdBy: raw?.createdBy ?? undefined,
    updatedBy: raw?.updatedBy ?? undefined,
    companyCode: dto.companyCode ?? raw?.companyCode ?? '',
    purpose: raw?.purpose ?? undefined,
    managerName: dto.managerName ?? raw?.managerName ?? raw?.manager ?? undefined,
    managerContact: dto.managerContact ?? raw?.managerContact ?? raw?.contact ?? undefined,
    costPrice: toNumber(raw?.costPrice, undefined),
    numberOfPeople: toNumber(raw?.numberOfPeople ?? raw?.totalPax, undefined),
    departureDate: dto.startDate ?? undefined,
    returnDate: dto.endDate ?? undefined,
    date: raw?.date ?? undefined,
    version: dto.version ?? raw?.version ?? undefined,
    client: dto.customerName ?? dto.teamName,
    price: totalPrice,
    etag: meta?.etag,
    user: raw?.user
      ? {
          id: raw.user.id,
          email: raw.user.email,
          name: raw.user.name ?? '',
          role: raw.user.role,
        }
      : undefined,
  };

  return booking;
};

const normalizeListResponse = (raw: any, mode: Mode): BookingListResponse => {
  const bookingsPayload = Array.isArray(raw?.bookings)
    ? raw.bookings
    : Array.isArray(raw?.data)
      ? raw.data
      : Array.isArray(raw)
        ? raw
        : [];

  const pagination = raw?.pagination;
  const page = raw?.page ?? pagination?.page ?? 1;
  const pageSize = raw?.pageSize ?? raw?.limit ?? pagination?.limit ?? bookingsPayload.length ?? 0;
  const total = raw?.total ?? pagination?.total ?? bookingsPayload.length;
  const baseLimit = pagination?.limit ?? pageSize ?? 0;
  const derivedTotalPagesFromLimit = baseLimit > 0 ? Math.ceil(total / baseLimit) : undefined;
  const totalPages = raw?.totalPages ?? pagination?.totalPages ?? derivedTotalPagesFromLimit;

  return {
    bookings: bookingsPayload.map((item: any) => normalizeBooking(item, mode)),
    total,
    page,
    pageSize,
    totalPages,
    meta: pagination
      ? {
          page: pagination.page ?? page,
          limit: baseLimit,
          total: pagination.total ?? total,
          totalPages: pagination.totalPages ?? derivedTotalPagesFromLimit ?? totalPages ?? 0,
        }
      : undefined,
    raw,
  };
};

const normalizeDetailResponse = (raw: any, mode: Mode, meta?: { etag?: string }): BookingDetailResponse => {
  if (mode === 'v1') {
    return {
      booking: normalizeBooking(raw?.booking ?? raw, mode, meta),
      events: raw?.events ?? [],
      etag: meta?.etag,
      raw,
    };
  }

  const payload = raw?.data ?? raw?.booking ?? raw;
  return {
    booking: normalizeBooking(payload, mode, meta),
    events: raw?.events ?? [],
    etag: meta?.etag,
    raw,
  };
};

const mapFiltersToV1Params = (params: LegacyListParams): Record<string, any> | undefined => {
  if (!params) return undefined;
  const {
    page,
    pageSize,
    month,
    status,
    dateFrom,
    dateTo,
    startDate,
    endDate,
    client,
    keyword,
    type,
  } = params;

  const query: Record<string, any> = {};
  if (page) query.page = page;
  if (pageSize) query.pageSize = pageSize;
  if (month) query.month = month;
  if (status) query.status = status;
  if (type) query.type = type;
  if (dateFrom) query.dateFrom = dateFrom;
  if (dateTo) query.dateTo = dateTo;
  if (startDate) query.startDate = startDate;
  if (endDate) query.endDate = endDate;
  if (client) query.client = client;
  if (keyword) query.keyword = keyword;

  return query;
};

const mapLegacyProductTypeToV2 = (value: any): string => {
  if (!value) return 'workshop';
  const lower = String(value).toLowerCase();
  if (V2_ALLOWED_TYPES.has(lower)) return lower;
  const map: Record<string, string> = {
    package: 'incentive',
    fit: 'workshop',
    group: 'teambuilding',
    business: 'reward',
  };
  return map[lower] || 'workshop';
};

const mapFiltersToV2Params = (params: LegacyListParams): Record<string, any> => {
  if (!params) return {};
  const query: Record<string, any> = {};

  if (params.page) query.page = params.page;
  if (params.pageSize || params.limit) query.limit = params.pageSize ?? params.limit;
  if (params.sortBy) query.orderBy = params.sortBy;
  if (params.sortOrder) query.order = params.sortOrder;
  if (params.status) query.status = params.status;
  if (params.type) query.type = params.type;

  const start = params.startDate ?? params.dateFrom;
  const end = params.endDate ?? params.dateTo;
  if (start) query.startDate = toDateOnly(start);
  if (end) query.endDate = toDateOnly(end, query.startDate);

  if (params.client) query.customerName = params.client;
  if (params.keyword) query.q = params.keyword;
  if ((params as any).teamName) query.teamName = (params as any).teamName;

  if (params?.month && !start && !end) {
    const [yearStr, monthStr] = params.month.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);
    if (!Number.isNaN(year) && !Number.isNaN(month)) {
      const rangeStart = new Date(Date.UTC(year, month - 1, 1));
      const rangeEnd = new Date(Date.UTC(year, month, 0));
      query.startDate = rangeStart.toISOString().slice(0, 10);
      query.endDate = rangeEnd.toISOString().slice(0, 10);
    }
  }

  return query;
};

const looksLikeV2Payload = (payload: Record<string, any>): boolean => {
  return typeof payload?.origin === 'string'
    && typeof payload?.coordinator === 'string'
    && (payload?.totalPax !== undefined || payload?.revenue !== undefined);
};

const sanitizeV2Payload = (payload: Record<string, any>) => {
  const result: Record<string, any> = {};
  if (payload.teamName !== undefined) result.teamName = String(payload.teamName);
  if (payload.type !== undefined) result.type = mapLegacyProductTypeToV2(payload.type);
  if (payload.origin !== undefined) result.origin = String(payload.origin);
  if (payload.destination !== undefined) result.destination = String(payload.destination);
  if (payload.startDate !== undefined) result.startDate = toDateOnly(payload.startDate);
  if (payload.endDate !== undefined) result.endDate = toDateOnly(payload.endDate, result.startDate);
  if (payload.totalPax !== undefined) result.totalPax = Math.max(1, Math.round(Number(payload.totalPax)) || 1);
  if (payload.coordinator !== undefined) result.coordinator = String(payload.coordinator);
  if (payload.revenue !== undefined) result.revenue = Number(payload.revenue) || 0;
  if (payload.notes !== undefined) result.notes = payload.notes;
  return result;
};

const mapLegacyCreateToV2 = (payload: PartialBookingPayload): Record<string, any> => {
  if (looksLikeV2Payload(payload)) {
    return sanitizeV2Payload(payload);
  }

  const teamName = String(payload.teamName ?? payload.customerName ?? 'Untitled Team');
  const destination = String(payload.destination ?? '미정');
  const startDate = toDateOnly(payload.departureDate ?? payload.startDate);
  const endDate = toDateOnly(payload.returnDate ?? payload.endDate ?? startDate, startDate);
  const totalPax = toNumber(
    payload.totalCount
      ?? ((payload.adultCount ?? 0) + (payload.childCount ?? 0) + (payload.infantCount ?? 0)),
    1,
  ) ?? 1;

  const legacy: Record<string, any> = {
    teamName,
    type: mapLegacyProductTypeToV2(payload.productType ?? payload.bookingType),
    origin: payload.customerCompany || DEFAULT_ORIGIN,
    destination,
    startDate,
    endDate,
    totalPax,
    coordinator: payload.managerName || DEFAULT_COORDINATOR,
    revenue: toNumber(payload.totalPrice, 0) ?? 0,
    notes: payload.memo ?? undefined,
  };

  return sanitizeV2Payload(legacy);
};

const mapLegacyUpdateToV2 = (payload: PartialBookingPayload): Record<string, any> => {
  if (looksLikeV2Payload(payload)) {
    return sanitizeV2Payload(payload);
  }

  const mapped: Record<string, any> = {};

  if (Object.prototype.hasOwnProperty.call(payload, 'teamName')) {
    mapped.teamName = payload.teamName;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'productType') || Object.prototype.hasOwnProperty.call(payload, 'bookingType')) {
    mapped.type = mapLegacyProductTypeToV2(payload.productType ?? payload.bookingType);
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'customerCompany')) {
    mapped.origin = payload.customerCompany || DEFAULT_ORIGIN;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'destination')) {
    mapped.destination = payload.destination;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'departureDate') || Object.prototype.hasOwnProperty.call(payload, 'startDate')) {
    mapped.startDate = toDateOnly(payload.departureDate ?? payload.startDate);
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'returnDate') || Object.prototype.hasOwnProperty.call(payload, 'endDate')) {
    mapped.endDate = toDateOnly(payload.returnDate ?? payload.endDate, mapped.startDate);
  }
  if (
    Object.prototype.hasOwnProperty.call(payload, 'totalCount')
    || Object.prototype.hasOwnProperty.call(payload, 'adultCount')
    || Object.prototype.hasOwnProperty.call(payload, 'childCount')
    || Object.prototype.hasOwnProperty.call(payload, 'infantCount')
  ) {
    mapped.totalPax = toNumber(
      payload.totalCount
        ?? ((payload.adultCount ?? 0) + (payload.childCount ?? 0) + (payload.infantCount ?? 0)),
      1,
    );
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'managerName')) {
    mapped.coordinator = payload.managerName || DEFAULT_COORDINATOR;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'totalPrice')) {
    mapped.revenue = toNumber(payload.totalPrice, 0) ?? 0;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'memo')) {
    mapped.notes = payload.memo;
  }

  return sanitizeV2Payload(mapped);
};

const fetchV2Detail = async (bookingId: string) => {
  const mode: Mode = 'v2';
  const response = await apiClient.get(getBasePath(mode) + `/${bookingId}`);
  const etag = (response.headers?.['etag'] as string | undefined) ?? (response.headers?.['ETag'] as string | undefined);
  const raw = response.data;
  const payload = raw?.data ?? raw?.booking ?? raw;
  return { raw, payload, etag };
};

const ensureV2Version = async (bookingId: string, version?: number): Promise<{ version: number; etag?: string }> => {
  if (typeof version === 'number' && Number.isFinite(version)) {
    return { version, etag: undefined };
  }
  const detail = await fetchV2Detail(bookingId);
  const resolvedVersion = detail.payload?.version ?? detail.payload?.data?.version;
  if (typeof resolvedVersion !== 'number') {
    throw new Error('Booking version is required for optimistic locking.');
  }
  return { version: resolvedVersion, etag: detail.etag };
};

const legacyImplementation = {
  async createBooking(payload: PartialBookingPayload): Promise<Booking> {
    const response = await apiClient.post(getBasePath('v1'), payload);
    return normalizeBooking(response.data, 'v1');
  },

  async getBookings(params?: LegacyListParams): Promise<BookingListResponse> {
    const response = await apiClient.get(getBasePath('v1'), {
      params: mapFiltersToV1Params(params),
    });
    return normalizeListResponse(response.data, 'v1');
  },

  async getBookingDetail(bookingId: string): Promise<BookingDetailResponse> {
    const response = await apiClient.get(getBasePath('v1') + `/${bookingId}`);
    return normalizeDetailResponse(response.data, 'v1');
  },

  async updateBooking(bookingId: string, payload: PartialBookingPayload, _options?: UpdateOptions): Promise<Booking> {
    const response = await apiClient.put(getBasePath('v1') + `/${bookingId}`, payload);
    return normalizeBooking(response.data, 'v1');
  },

  async deleteBooking(bookingId: string, _options?: UpdateOptions): Promise<void> {
    await apiClient.delete(getBasePath('v1') + `/${bookingId}`);
  },

  async getMonthlyBookings(year: number, month: number): Promise<Booking[]> {
    const response = await apiClient.get(getBasePath('v1') + '/monthly', {
      params: { year, month },
    });
    const bookings = response.data?.bookings ?? [];
    return bookings.map((item: any) => normalizeBooking(item, 'v1'));
  },
};

const modernImplementation = {
  async createBooking(payload: PartialBookingPayload): Promise<Booking> {
    const body = mapLegacyCreateToV2(payload);
    const response = await apiClient.post(getBasePath('v2'), body);
    const raw = response.data?.data ?? response.data;
    return normalizeBooking(raw, 'v2');
  },

  async getBookings(params?: LegacyListParams): Promise<BookingListResponse> {
    const response = await apiClient.get(getBasePath('v2'), {
      params: mapFiltersToV2Params(params),
    });
    return normalizeListResponse(response.data, 'v2');
  },

  async getBookingDetail(bookingId: string): Promise<BookingDetailResponse> {
    const { raw, payload, etag } = await fetchV2Detail(bookingId);
    return normalizeDetailResponse({ ...raw, data: payload }, 'v2', { etag });
  },

  async updateBooking(bookingId: string, payload: PartialBookingPayload, options?: UpdateOptions): Promise<Booking> {
    const { version } = await ensureV2Version(bookingId, options?.version);
    const body = mapLegacyUpdateToV2(payload);
    const response = await apiClient.put(getBasePath('v2') + `/${bookingId}`, body, {
      headers: { 'If-Match': String(version) },
    });
    const raw = response.data?.data ?? response.data;
    return normalizeBooking(raw, 'v2');
  },

  async deleteBooking(bookingId: string, options?: UpdateOptions): Promise<void> {
    const { version } = await ensureV2Version(bookingId, options?.version);
    await apiClient.delete(getBasePath('v2') + `/${bookingId}`, {
      headers: { 'If-Match': String(version) },
    });
  },

  async getMonthlyBookings(year: number, month: number): Promise<Booking[]> {
    const list = await this.getBookings({
      page: 1,
      pageSize: MONTHLY_FETCH_LIMIT,
      sortBy: 'startDate',
      sortOrder: 'asc',
      month: `${year}-${String(month).padStart(2, '0')}`,
    });

    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 0, 23, 59, 59));

    return list.bookings.filter((booking) => {
      const date = new Date(booking.startDate);
      if (Number.isNaN(date.getTime())) return false;
      return date >= start && date <= end;
    });
  },
};

const pickImplementation = () => (resolveMode() === 'v2' ? modernImplementation : legacyImplementation);

export const bookingService = {
  async createBooking(payload: PartialBookingPayload): Promise<Booking> {
    return pickImplementation().createBooking(payload);
  },

  async getBookings(params?: LegacyListParams): Promise<BookingListResponse> {
    return pickImplementation().getBookings(params);
  },

  async getBookingDetail(bookingId: string): Promise<BookingDetailResponse> {
    return pickImplementation().getBookingDetail(bookingId);
  },

  async updateBooking(bookingId: string, payload: PartialBookingPayload, options?: UpdateOptions): Promise<Booking> {
    return pickImplementation().updateBooking(bookingId, payload, options);
  },

  async deleteBooking(bookingId: string, options?: UpdateOptions): Promise<void> {
    return pickImplementation().deleteBooking(bookingId, options);
  },

  async getMonthlyBookings(year: number, month: number): Promise<Booking[]> {
    return pickImplementation().getMonthlyBookings(year, month);
  },

  __setModeForTests: __setBookingServiceModeForTests,
};
