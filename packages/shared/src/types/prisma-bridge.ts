/**
 * Prisma-Shared Type Bridge
 * 
 * This module provides type mappings between Prisma generated types
 * and shared types to ensure type safety across the application.
 */

import { User, UserRole } from './user';
import { Booking, BookingStatus } from './booking';

// Prisma User type approximation
export interface PrismaUser {
  id: string;
  username: string;
  email: string;
  name?: string | null;
  role: string;
  companyCode: string;
  department?: string | null;
  isActive?: boolean | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  lastLoginAt?: Date | string | null;
}

// Prisma Booking type approximation
export interface PrismaBooking {
  id: string;
  bookingNumber: string;
  customerName: string;
  teamName: string;
  destination: string;
  startDate: Date | string | null;
  endDate: Date | string | null;
  status: string;
  totalPrice: number;
  paxCount: number;
  companyCode: string;
  purpose?: string | null;
  managerName?: string | null;
  managerContact?: string | null;
  notes?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  version?: number | null;
}

/**
 * Map Prisma User to Shared User type
 */
export function mapPrismaUserToShared(prismaUser: PrismaUser): User {
  return {
    id: prismaUser.id,
    username: prismaUser.username,
    email: prismaUser.email,
    name: prismaUser.name || '이름 없음',
    role: mapPrismaRoleToShared(prismaUser.role),
    companyCode: prismaUser.companyCode,
    department: prismaUser.department || undefined,
    isActive: prismaUser.isActive ?? true,
    createdAt: prismaUser.createdAt instanceof Date 
      ? prismaUser.createdAt.toISOString() 
      : prismaUser.createdAt,
    updatedAt: prismaUser.updatedAt instanceof Date
      ? prismaUser.updatedAt.toISOString()
      : prismaUser.updatedAt,
    lastLoginAt: prismaUser.lastLoginAt instanceof Date
      ? prismaUser.lastLoginAt.toISOString()
      : (prismaUser.lastLoginAt || undefined)
  };
}

/**
 * Map Prisma UserRole enum to Shared UserRole
 */
export function mapPrismaRoleToShared(prismaRole: string): UserRole {
  const roleMap: Record<string, UserRole> = {
    'SUPER_ADMIN': UserRole.SUPER_ADMIN,
    'ADMIN': UserRole.ADMIN,
    'MANAGER': UserRole.MANAGER,
    'USER': UserRole.USER
  };
  
  return roleMap[prismaRole] ?? UserRole.USER;
}

/**
 * Map Shared UserRole to Prisma enum string
 */
export function mapSharedRoleToPrisma(sharedRole: UserRole): string {
  return sharedRole; // UserRole values match Prisma enum strings
}

/**
 * Map Prisma Booking to Shared Booking type
 */
export function mapPrismaBookingToShared(prismaBooking: PrismaBooking): Booking {
  return {
    id: prismaBooking.id,
    bookingNumber: prismaBooking.bookingNumber,
    customerName: prismaBooking.customerName,
    teamName: prismaBooking.teamName,
    destination: prismaBooking.destination,
    startDate: (() => {
      if (prismaBooking.startDate instanceof Date) {
        return prismaBooking.startDate.toISOString().split('T')[0];
      }
      if (typeof prismaBooking.startDate === 'string') {
        return prismaBooking.startDate;
      }
      return '';
    })() as string,
    endDate: (() => {
      if (prismaBooking.endDate instanceof Date) {
        return prismaBooking.endDate.toISOString().split('T')[0];
      }
      if (typeof prismaBooking.endDate === 'string') {
        return prismaBooking.endDate;
      }
      return '';
    })() as string,
    status: mapPrismaStatusToShared(prismaBooking.status),
    totalPrice: prismaBooking.totalPrice,
    paxCount: prismaBooking.paxCount,
    companyCode: prismaBooking.companyCode,
    purpose: prismaBooking.purpose || undefined,
    managerName: prismaBooking.managerName || undefined,
    managerContact: prismaBooking.managerContact || undefined,
    notes: prismaBooking.notes || undefined,
    createdAt: prismaBooking.createdAt instanceof Date
      ? prismaBooking.createdAt.toISOString()
      : prismaBooking.createdAt,
    updatedAt: prismaBooking.updatedAt instanceof Date
      ? prismaBooking.updatedAt.toISOString()
      : prismaBooking.updatedAt,
    version: prismaBooking.version ?? 1
  };
}

/**
 * Map Prisma BookingStatus enum to Shared BookingStatus
 */
export function mapPrismaStatusToShared(prismaStatus: string): BookingStatus {
  const statusMap: Record<string, BookingStatus> = {
    'PENDING': BookingStatus.PENDING,
    'CONFIRMED': BookingStatus.CONFIRMED,
    'IN_PROGRESS': BookingStatus.IN_PROGRESS,
    'COMPLETED': BookingStatus.COMPLETED,
    'CANCELLED': BookingStatus.CANCELLED
  };
  
  return statusMap[prismaStatus] ?? BookingStatus.PENDING;
}

/**
 * Map Shared BookingStatus to Prisma enum string
 */
export function mapSharedStatusToPrisma(sharedStatus: BookingStatus): string {
  return sharedStatus; // BookingStatus values match Prisma enum strings
}

/**
 * Type guard to check if a value is a valid Prisma enum value
 */
export function isPrismaEnumValue(value: unknown, enumValues: string[]): boolean {
  return typeof value === 'string' && enumValues.includes(value);
}

/**
 * Safe enum conversion with fallback
 */
export function safeEnumConvert<T>(
  value: unknown,
  enumMap: Record<string, T>,
  defaultValue: T
): T {
  if (typeof value !== 'string') return defaultValue;
  return enumMap[value] ?? defaultValue;
}