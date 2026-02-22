/**
 * useBookings hook for the web app
 *
 * Features:
 * - Feature-flagged routing between v1 (`/api/bookings`) and v2 (`/api/v2/bookings`)
 * - Normalises differing response shapes so UI always receives `Booking` entities
 * - Adds If-Match handling for v2 write operations
 */

import { useEffect, useMemo } from 'react';
import useSWR from 'swr';
import type { Booking } from '@entrip/shared';
import { BookingStatus, BookingType } from '@entrip/shared';
import apiClient from '../lib/api-client';
import { initializeSocket } from '../lib/socket';

const ENV_MODE = (process.env.NEXT_PUBLIC_BOOKING_API_MODE
  || process.env.NEXT_PUBLIC_BOOKING_API_TARGET
  || '').toLowerCase();

const isV2Enabled = () => ENV_MODE.includes('v2') || ENV_MODE.includes('phase3');
const BOOKINGS_BASE_PATH = isV2Enabled() ? '/api/v2/bookings' : '/api/bookings';

const fetcher = async (url: string) => {
  const response = await apiClient.get(url);
  return response.data;
};

const toIsoString = (value?: string | Date | null): string | undefined => {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T00:00:00.000Z`;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
};

const toDateOnly = (value?: string | Date | null): string | undefined => {
  const iso = toIsoString(value);
  return iso ? iso.slice(0, 10) : undefined;
};

const toNumber = (value: unknown, fallback?: number): number | undefined => {
  if (value === null || value === undefined) return fallback;
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const normalizeStatus = (value: any): BookingStatus => {
  const candidate = typeof value === 'string' ? value.toUpperCase() : String(value || '');
  return (Object.values(BookingStatus) as string[]).includes(candidate)
    ? (candidate as BookingStatus)
    : BookingStatus.PENDING;
};

const mapType = (value: any): BookingType | undefined => {
  if (!value) return undefined;
  const candidate = typeof value === 'string' ? value.toUpperCase() : String(value);
  if ((Object.values(BookingType) as string[]).includes(candidate)) {
    return candidate as BookingType;
  }
  const fallback: Record<string, BookingType> = {
    INCENTIVE: BookingType.GROUP,
    GOLF: BookingType.FIT,
    HONEYMOON: BookingType.PACKAGE,
    AIRTEL: BookingType.FIT,
    WORKSHOP: BookingType.BUSINESS,
    REWARD: BookingType.BUSINESS,
    TEAMBUILDING: BookingType.GROUP,
  };
  return fallback[candidate] ?? undefined;
};

const coerceBooking = (raw: any): Booking => {
  const start = toIsoString(raw?.startDate ?? raw?.departureDate) ?? new Date().toISOString();
  const end = toIsoString(raw?.endDate ?? raw?.returnDate) ?? start;
  const totalPrice = toNumber(raw?.totalPrice ?? raw?.revenue ?? raw?.price, 0) ?? 0;

  return {
    id: raw?.id ?? '',
    bookingNumber: raw?.bookingNumber ?? raw?.code ?? '',
    customerName: raw?.customerName ?? raw?.client ?? raw?.teamName ?? '미정',
    teamName: raw?.teamName ?? raw?.customerName ?? '미정',
    bookingType: mapType(raw?.bookingType ?? raw?.type),
    origin: raw?.origin ?? raw?.customerCompany ?? undefined,
    destination: raw?.destination ?? '미정',
    coordinator: raw?.coordinator ?? raw?.manager ?? raw?.managerName ?? undefined,
    startDate: start,
    endDate: end,
    paxCount: toNumber(raw?.paxCount ?? raw?.totalPax ?? raw?.numberOfPeople ?? raw?.totalCount, 0) ?? 0,
    totalPax: toNumber(raw?.totalPax ?? raw?.paxCount ?? raw?.numberOfPeople, undefined),
    nights: toNumber(raw?.nights, undefined),
    days: toNumber(raw?.days, undefined),
    status: normalizeStatus(raw?.status),
    totalPrice,
    depositAmount: toNumber(raw?.depositAmount ?? raw?.deposit, undefined),
    currency: raw?.currency ?? 'KRW',
    notes: raw?.notes ?? raw?.memo ?? undefined,
    createdAt: toIsoString(raw?.createdAt) ?? new Date().toISOString(),
    updatedAt: toIsoString(raw?.updatedAt) ?? toIsoString(raw?.createdAt) ?? new Date().toISOString(),
    createdBy: raw?.createdBy ?? undefined,
    updatedBy: raw?.updatedBy ?? undefined,
    companyCode: raw?.companyCode ?? '',
    purpose: raw?.purpose ?? undefined,
    managerName: raw?.managerName ?? raw?.manager ?? undefined,
    managerContact: raw?.managerContact ?? raw?.contact ?? undefined,
    costPrice: toNumber(raw?.costPrice, undefined),
    numberOfPeople: toNumber(raw?.numberOfPeople, undefined),
    departureDate: toDateOnly(raw?.startDate ?? raw?.departureDate),
    returnDate: toDateOnly(raw?.endDate ?? raw?.returnDate),
    date: raw?.date ?? undefined,
    version: toNumber(raw?.version, undefined),
    etag: raw?.etag ?? raw?.ETag ?? undefined,
    client: raw?.client ?? raw?.customerName ?? raw?.teamName ?? '미정',
    price: totalPrice,
    user: raw?.user,
  };
};

const normaliseListResponse = (payload: any) => {
  const dataBlock = payload?.data ?? payload?.bookings ?? payload;
  const bookingsSource = Array.isArray(dataBlock?.bookings) ? dataBlock.bookings : Array.isArray(dataBlock) ? dataBlock : [];
  const bookings = bookingsSource.map(coerceBooking);

  const pagination = payload?.pagination ?? payload?.meta ?? dataBlock?.pagination;
  const page = pagination?.page ?? payload?.page ?? 1;
  const limit = pagination?.limit ?? payload?.limit ?? payload?.pageSize ?? bookings.length ?? 0;
  const total = pagination?.total ?? payload?.total ?? bookings.length;
  const totalPages = pagination?.totalPages ?? payload?.totalPages ?? (limit > 0 ? Math.ceil(total / limit) : undefined);

  return {
    bookings,
    pagination: {
      page,
      limit,
      total,
      totalPages: totalPages ?? 0,
    },
    raw: payload,
  };
};

const normaliseDetailResponse = (payload: any) => {
  const dataBlock = payload?.data ?? payload?.booking ?? payload;
  return {
    booking: coerceBooking(dataBlock),
    events: Array.isArray(payload?.events) ? payload.events : [],
    etag: payload?.etag ?? payload?.ETag,
    raw: payload,
  };
};

const buildV2CreatePayload = (payload: Partial<Booking>) => {
  const extended = payload as Partial<Booking> & { totalCount?: number; memo?: string };
  const start = toDateOnly(payload.startDate ?? payload.departureDate) ?? new Date().toISOString().slice(0, 10);
  const end = toDateOnly(payload.endDate ?? payload.returnDate) ?? start;

  return {
    teamName: payload.teamName ?? payload.customerName ?? 'Untitled Team',
    type: (payload.bookingType ?? BookingType.PACKAGE).toString().toLowerCase(),
    origin: payload.origin ?? payload.coordinator ?? 'Seoul',
    destination: payload.destination ?? '미정',
    startDate: start,
    endDate: end,
    totalPax: toNumber(payload.totalPax ?? payload.paxCount ?? payload.numberOfPeople ?? extended.totalCount, 1) ?? 1,
    coordinator: payload.coordinator ?? payload.managerName ?? 'system',
    revenue: toNumber(payload.totalPrice ?? payload.price, 0) ?? 0,
    notes: payload.notes ?? extended.memo ?? undefined,
  };
};

const buildV2UpdatePayload = (payload: Partial<Booking>) => {
  const extended = payload as Partial<Booking> & { memo?: string };
  const body: Record<string, unknown> = {};
  if (payload.teamName !== undefined) body.teamName = payload.teamName;
  if (payload.bookingType !== undefined) body.type = payload.bookingType.toString().toLowerCase();
  if (payload.origin !== undefined) body.origin = payload.origin;
  if (payload.destination !== undefined) body.destination = payload.destination;
  if (payload.startDate || payload.departureDate) body.startDate = toDateOnly(payload.startDate ?? payload.departureDate);
  if (payload.endDate || payload.returnDate) body.endDate = toDateOnly(payload.endDate ?? payload.returnDate);
  if (payload.totalPax !== undefined || payload.paxCount !== undefined || payload.numberOfPeople !== undefined) {
    body.totalPax = toNumber(payload.totalPax ?? payload.paxCount ?? payload.numberOfPeople, 1) ?? 1;
  }
  if (payload.coordinator !== undefined || payload.managerName !== undefined) {
    body.coordinator = payload.coordinator ?? payload.managerName;
  }
  if (payload.totalPrice !== undefined || payload.price !== undefined) {
    body.revenue = toNumber(payload.totalPrice ?? payload.price, 0) ?? 0;
  }
  if (payload.notes !== undefined || extended.memo !== undefined) {
    body.notes = payload.notes ?? extended.memo;
  }
  if (payload.status !== undefined) {
    body.status = payload.status.toLowerCase();
  }
  return body;
};

const resolveIfMatch = (booking?: Partial<Booking>, explicit?: string | number) => {
  if (explicit !== undefined && explicit !== null) return String(explicit);
  if (booking?.etag) return booking.etag;
  if (booking?.version !== undefined) return String(booking.version);
  return undefined;
};

export function useBookings(month?: string) {
  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (month) params.append('month', month);
    params.append('take', '1000');
    const qs = params.toString();
    return `${BOOKINGS_BASE_PATH}${qs ? `?${qs}` : ''}`;
  }, [month]);

  const { data, error, isLoading, mutate } = useSWR(query, async (url) => normaliseListResponse(await fetcher(url)), {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 60_000,
  });

  useEffect(() => {
    const socket = initializeSocket();
    if (!socket) return;

    const handleBookingUpdate = () => {
      mutate();
    };

    socket.on('booking:create', handleBookingUpdate);
    socket.on('booking:update', handleBookingUpdate);
    socket.on('booking:delete', handleBookingUpdate);
    socket.on('booking:bulk-create', handleBookingUpdate);
    socket.on('booking:bulk-delete', handleBookingUpdate);

    return () => {
      socket.off('booking:create', handleBookingUpdate);
      socket.off('booking:update', handleBookingUpdate);
      socket.off('booking:delete', handleBookingUpdate);
      socket.off('booking:bulk-create', handleBookingUpdate);
      socket.off('booking:bulk-delete', handleBookingUpdate);
    };
  }, [mutate]);

  return {
    bookings: data?.bookings ?? [],
    pagination: data?.pagination ?? { page: 1, limit: 1000, total: 0, totalPages: 0 },
    isLoading,
    isError: Boolean(error),
    mutate,
    rawData: data?.raw,
    requestUrl: query,
    errorDetails: error instanceof Error ? error.message : error,
  };
}

export function useBooking(id: string | null) {
  const url = id ? `${BOOKINGS_BASE_PATH}/${id}` : null;
  const { data, error, isLoading, mutate } = useSWR(url, async (endpoint) => normaliseDetailResponse(await fetcher(endpoint)));

  return {
    booking: data?.booking,
    events: data?.events ?? [],
    etag: data?.etag,
    isLoading,
    isError: error,
    mutate,
    rawData: data?.raw,
  };
}

export async function createBooking(payload: Partial<Booking>) {
  const url = BOOKINGS_BASE_PATH;
  const body = isV2Enabled() ? buildV2CreatePayload(payload) : payload;
  const response = await apiClient.post(url, body);
  const data = response.data?.data ?? response.data;
  return coerceBooking(data);
}

export async function updateBooking(id: string, payload: Partial<Booking>, options?: { ifMatch?: string | number }) {
  const url = `${BOOKINGS_BASE_PATH}/${id}`;
  const body = isV2Enabled() ? buildV2UpdatePayload(payload) : payload;
  const headers: Record<string, string> = {};

  if (isV2Enabled()) {
    const match = resolveIfMatch(payload, options?.ifMatch);
    if (!match) {
      console.warn('[useBookings] Missing If-Match version for booking update; optimistic lock may fail.');
    } else {
      headers['If-Match'] = match;
    }
  }

  const response = await apiClient.put(url, body, { headers });
  const data = response.data?.data ?? response.data;
  return coerceBooking(data);
}

export async function deleteBooking(id: string, options?: { ifMatch?: string | number; booking?: Partial<Booking> }) {
  const url = `${BOOKINGS_BASE_PATH}/${id}`;
  const headers: Record<string, string> = {};

  if (isV2Enabled()) {
    const match = resolveIfMatch(options?.booking, options?.ifMatch);
    if (!match) {
      console.warn('[useBookings] Missing If-Match version for booking delete; optimistic lock may fail.');
    } else {
      headers['If-Match'] = match;
    }
  }

  const response = await apiClient.delete(url, { headers });
  return response.data;
}

export const bookingApiMode = ENV_MODE || 'v1';
export const bookingApiBasePath = BOOKINGS_BASE_PATH;
