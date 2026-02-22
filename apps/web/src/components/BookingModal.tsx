'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useBookings, createBooking, updateBooking } from '../hooks/useBookings';
import type { Booking } from '@entrip/shared';
import { logger, BookingType, BookingStatus } from '@entrip/shared';
import { bookingSchema, BookingFormData } from './BookingModalSchema';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking?: Booking | null;
  onSave?: () => void;
}

export default function BookingModal({ isOpen, onClose, booking, onSave }: BookingModalProps) {
  const { mutate } = useBookings();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      customerName: '',
      phoneNumber: '',
      email: '',
      destination: '',
      departureDate: '',
      returnDate: '',
      numberOfPeople: 1,
      status: 'pending',
      notes: '',
    },
  });

  // Reset form when booking changes or modal opens
  useEffect(() => {
    if (isOpen) {
      const defaultValues = {
        customerName: booking?.customerName || '',
        phoneNumber: '', // Not available in current Booking type
        email: '', // Not available in current Booking type
        destination: booking?.destination || '',
        departureDate: booking?.startDate ? new Date(booking.startDate).toISOString().split('T')[0] : '',
        returnDate: booking?.endDate ? new Date(booking.endDate).toISOString().split('T')[0] : '',
        numberOfPeople: booking?.paxCount || 1,
        status: (booking?.status?.toLowerCase() || 'pending') as 'pending' | 'confirmed' | 'cancelled',
        notes: booking?.notes || '',
      };
      reset(defaultValues);
    }
  }, [booking, isOpen, reset]);

  if (!isOpen) return null;

  const onSubmit = async (formData: BookingFormData) => {
    setLoading(true);
    setError('');

    // Optimistic update
    const optimisticBooking = {
      id: booking?.id || `temp-${Date.now()}`,
      ...formData,
      createdAt: booking?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const buildApiPayload = () => {
      const startDate = formData.departureDate ? new Date(formData.departureDate) : (booking?.startDate ? new Date(booking.startDate) : undefined);
      const endDate = formData.returnDate ? new Date(formData.returnDate) : (booking?.endDate ? new Date(booking.endDate) : undefined);
      const diffMs = startDate && endDate ? endDate.getTime() - startDate.getTime() : undefined;
      const diffDays = typeof diffMs === 'number' ? Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24))) : undefined;

      return {
        customerName: formData.customerName,
        teamName: formData.customerName,
        destination: formData.destination,
        origin: booking?.origin,
        coordinator: booking?.coordinator,
        startDate: startDate ? startDate.toISOString() : booking?.startDate,
        endDate: endDate ? endDate.toISOString() : booking?.endDate,
        paxCount: formData.numberOfPeople,
        totalPax: formData.numberOfPeople,
        status: formData.status.toUpperCase() === 'CONFIRMED' ? BookingStatus.CONFIRMED :
               formData.status.toUpperCase() === 'PENDING' ? BookingStatus.PENDING :
               BookingStatus.CANCELLED,
        notes: formData.notes,
        bookingType: BookingType.PACKAGE,
        nights: diffDays !== undefined ? Math.max(0, diffDays) : booking?.nights,
        days: diffDays !== undefined ? diffDays + 1 : booking?.days,
        totalPrice: booking?.totalPrice ?? 0,
        currency: booking?.currency ?? 'KRW',
      };
    };

    try {
      const apiData = buildApiPayload();
      await mutate();
      // Make the actual API call
      if (booking?.id) {
        await updateBooking(booking.id, apiData, { ifMatch: booking.version });
      } else {
        await createBooking(apiData);
      }

      // Revalidate to get the real data from server

      onSave?.();
      onClose();
    } catch (err) {
      // Rollback on error by revalidating
      await mutate();
      setError('예약 처리 중 오류가 발생했습니다.');
      logger.error('Booking error:', err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {booking ? '예약 수정' : '새 예약'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-1">
                고객명 *
              </label>
              <input
                id="customerName"
                type="text"
                {...register('customerName')}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
              {errors.customerName && (
                <p className="mt-1 text-sm text-red-600">{errors.customerName.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                연락처 *
              </label>
              <input
                id="phoneNumber"
                type="tel"
                {...register('phoneNumber')}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
              {errors.phoneNumber && (
                <p className="mt-1 text-sm text-red-600">{errors.phoneNumber.message}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              이메일
            </label>
            <input
              id="email"
              type="email"
              {...register('email')}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div>
              <label htmlFor="destination" className="block text-sm font-medium text-gray-700 mb-1">
                여행지 *
              </label>
              <input
                id="destination"
                type="text"
                {...register('destination')}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            {errors.destination && (
              <p className="mt-1 text-sm text-red-600">{errors.destination.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="departureDate" className="block text-sm font-medium text-gray-700 mb-1">
                출발일 *
              </label>
              <input
                id="departureDate"
                type="date"
                {...register('departureDate')}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
              {errors.departureDate && (
                <p className="mt-1 text-sm text-red-600">{errors.departureDate.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="returnDate" className="block text-sm font-medium text-gray-700 mb-1">
                귀국일 *
              </label>
              <input
                id="returnDate"
                type="date"
                {...register('returnDate')}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
              {errors.returnDate && (
                <p className="mt-1 text-sm text-red-600">{errors.returnDate.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="numberOfPeople" className="block text-sm font-medium text-gray-700 mb-1">
                인원 *
              </label>
              <input
                id="numberOfPeople"
                type="number"
                min="1"
                {...register('numberOfPeople', { valueAsNumber: true })}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
              {errors.numberOfPeople && (
                <p className="mt-1 text-sm text-red-600">{errors.numberOfPeople.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                상태
              </label>
              <select
                id="status"
                {...register('status')}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="pending">대기중</option>
                <option value="confirmed">확정</option>
                <option value="cancelled">취소</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              메모
            </label>
            <textarea
              id="notes"
              {...register('notes')}
              rows={3}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? '처리중...' : booking ? '수정' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
