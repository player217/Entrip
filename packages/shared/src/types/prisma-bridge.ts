// prisma-bridge.ts
// Lightweight adapters to normalize differences between v1 and v2 domains
// Keep types backward compatible for web consumers.

// Avoid importing Prisma types directly to prevent version/cross-package coupling
// Define the minimal shape we rely on for mapping.
export interface V2BookingLike {
  id: string;
  bookingNumber: string;
  teamName: string;
  type?: string | null;
  origin?: string | null;
  destination?: string | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  status?: string | null;
  companyCode?: string | null;
  customerName?: string | null;
  totalPax?: number | null;
  paxCount?: number | null;
  revenue?: number | null;
  totalPrice?: number | null;
  depositAmount?: number | null;
  currency?: string | null;
  notes?: string | null;
  memo?: string | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
  version?: number | null;
  managerName?: string | null;
  manager?: string | null;
  managerContact?: string | null;
  contact?: string | null;
}

// Minimal DTO used by web and shared services
export interface BookingDTO {
  id: string;
  bookingNumber: string;
  teamName: string;
  customerName?: string;
  type?: string;
  origin?: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  companyCode?: string;
  totalPax?: number;
  totalPrice?: number;
  depositAmount?: number;
  currency?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  version?: number;
  managerName?: string;
  managerContact?: string;
}

const toIsoString = (value?: Date | string | null): string | undefined => {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  return value.toISOString?.();
};

const toNumber = (value?: number | null): number | undefined => {
  if (value === null || value === undefined) return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
};

const toOptionalString = (value?: string | null): string | undefined => {
  if (value === null || value === undefined || value === '') return undefined;
  return String(value);
};

// Map v2 Prisma Booking to DTO expected by shared/web layers
export const mapV2BookingToDTO = (b: V2BookingLike): BookingDTO => ({
  id: b.id,
  bookingNumber: b.bookingNumber,
  teamName: b.teamName,
  customerName: toOptionalString(b.customerName ?? b.teamName),
  type: toOptionalString(b.type),
  origin: toOptionalString(b.origin),
  destination: toOptionalString(b.destination),
  startDate: toIsoString(b.startDate),
  endDate: toIsoString(b.endDate),
  status: toOptionalString(b.status),
  companyCode: toOptionalString(b.companyCode),
  totalPax: toNumber(b.totalPax ?? b.paxCount),
  totalPrice: toNumber(b.totalPrice ?? b.revenue),
  depositAmount: toNumber(b.depositAmount),
  currency: toOptionalString(b.currency),
  notes: toOptionalString(b.notes ?? b.memo),
  createdAt: toIsoString(b.createdAt),
  updatedAt: toIsoString(b.updatedAt),
  version: b.version ?? undefined,
  managerName: toOptionalString(b.managerName ?? b.manager),
  managerContact: toOptionalString(b.managerContact ?? b.contact),
});

// Placeholder for future mappers (Finance, Settlement, Messaging)
export type FinanceDTO = Record<string, unknown>;
export const mapV2FinanceToDTO = (_: any): FinanceDTO => ({ /* TODO */ });
