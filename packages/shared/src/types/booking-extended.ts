/**
 * Extended Booking Types for Web Application
 * 
 * This module provides extended booking types that include
 * additional fields used in the web application UI.
 */

import type { Booking } from './booking';

/**
 * Extended Booking interface with UI-specific fields
 */
export interface BookingExtended extends Booking {
  // UI display fields
  teamSize?: number;
  originalPrice?: number;
  discountAmount?: number;
  
  // Computed fields
  duration?: number; // in days
  daysUntilStart?: number;
  isActive?: boolean;
  isUpcoming?: boolean;
  isPast?: boolean;
  
  // Additional metadata
  tags?: string[];
  color?: string;
  priority?: 'low' | 'medium' | 'high';
  
  // Relations (optional for display)
  managerInfo?: {
    name: string;
    email?: string;
    phone?: string;
  };
  
  // Statistics
  statistics?: {
    viewCount?: number;
    lastViewedAt?: string;
    modificationCount?: number;
  };
}

/**
 * Create an extended booking from a base booking
 */
export function createExtendedBooking(booking: Booking): BookingExtended {
  const startDate = new Date(booking.startDate);
  const endDate = new Date(booking.endDate);
  const today = new Date();
  
  // Calculate duration in days
  const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Calculate days until start
  const daysUntilStart = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  // Determine status
  const isActive = today >= startDate && today <= endDate;
  const isUpcoming = today < startDate;
  const isPast = today > endDate;
  
  return {
    ...booking,
    duration,
    daysUntilStart,
    isActive,
    isUpcoming,
    isPast,
    // Default values for optional fields
    teamSize: booking.paxCount,
    originalPrice: booking.totalPrice,
    discountAmount: 0
  };
}

/**
 * Type guard to check if a booking is extended
 */
export function isExtendedBooking(booking: Booking | BookingExtended): booking is BookingExtended {
  return 'teamSize' in booking || 'duration' in booking || 'isActive' in booking;
}

/**
 * Booking form data type for creating/editing bookings
 */
export interface BookingFormData {
  customerName: string;
  teamName: string;
  destination: string;
  startDate: string;
  endDate: string;
  paxCount: number;
  teamSize?: number;
  totalPrice: number;
  originalPrice?: number;
  purpose?: string;
  managerName?: string;
  managerContact?: string;
  notes?: string;
  tags?: string[];
}

/**
 * Convert form data to booking payload
 */
export function formDataToBooking(formData: BookingFormData, companyCode: string): Partial<Booking> {
  return {
    customerName: formData.customerName,
    teamName: formData.teamName,
    destination: formData.destination,
    startDate: formData.startDate,
    endDate: formData.endDate,
    paxCount: formData.paxCount,
    totalPrice: formData.totalPrice,
    purpose: formData.purpose,
    managerName: formData.managerName,
    managerContact: formData.managerContact,
    notes: formData.notes,
    companyCode
  };
}

/**
 * Booking display options
 */
export interface BookingDisplayOptions {
  showTeamSize?: boolean;
  showOriginalPrice?: boolean;
  showDuration?: boolean;
  showStatus?: boolean;
  showTags?: boolean;
  showManager?: boolean;
  dateFormat?: 'short' | 'long' | 'relative';
  priceFormat?: 'compact' | 'full' | 'currency';
}