'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { useCreateBooking } from '../api';
import { Modal, Button, Input, TextArea } from '@entrip/ui';
import { X } from 'lucide-react';
import { logger, BookingStatus } from '@entrip/shared';

const bookingSchema = z.object({
  teamName: z.string().min(1, '팀명을 입력해주세요'),
  customerName: z.string().min(1, '고객명을 입력해주세요'),
  customerPhone: z.string().min(10, '올바른 전화번호를 입력해주세요'),
  customerEmail: z.string().email('올바른 이메일을 입력해주세요').optional().or(z.literal('')),
  travelDate: z.string().min(1, '여행 시작일을 선택해주세요'),
  returnDate: z.string().min(1, '여행 종료일을 선택해주세요'),
  destination: z.string().min(1, '목적지를 입력해주세요'),
  adultCount: z.coerce.number().min(1, '성인 인원은 최소 1명 이상이어야 합니다'),
  childCount: z.coerce.number().min(0),
  totalAmount: z.coerce.number().min(0, '총 금액은 0원 이상이어야 합니다'),
  depositAmount: z.coerce.number().min(0, '계약금은 0원 이상이어야 합니다'),
  notes: z.string().optional(),
}).refine((data) => new Date(data.returnDate) >= new Date(data.travelDate), {
  message: '여행 종료일은 시작일 이후여야 합니다',
  path: ['returnDate'],
});

type BookingFormData = z.infer<typeof bookingSchema>;

interface BookingCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialDate?: Date | null;
}

export function BookingCreateModal({ isOpen, onClose, onSuccess, initialDate }: BookingCreateModalProps) {
  const createBooking = useCreateBooking();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      adultCount: 1,
      childCount: 0,
      totalAmount: 0,
      depositAmount: 0,
      travelDate: initialDate ? format(initialDate, 'yyyy-MM-dd') : '',
      returnDate: initialDate ? format(initialDate, 'yyyy-MM-dd') : '',
    },
  });

  const onSubmit = async (data: BookingFormData) => {
    try {
      // Transform form data to match NewTeamPayload
      const departureDate = new Date(data.travelDate);
      const returnDate = new Date(data.returnDate);
      const nights = Math.ceil((returnDate.getTime() - departureDate.getTime()) / (1000 * 60 * 60 * 24));
      const days = nights + 1;
      
      const payload = {
        // Required fields from form
        teamName: data.teamName,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail || '',
        destination: data.destination,
        departureDate: data.travelDate,
        returnDate: data.returnDate,
        adultCount: data.adultCount,
        childCount: data.childCount,
        totalPrice: data.totalAmount,
        deposit: data.depositAmount,
        memo: data.notes,
        
        // Default values for required fields
        teamCode: `TEAM${Date.now()}`, // Generate unique team code
        nights,
        days,
        productType: '패키지',
        airline: 'TBD',
        hotel: 'TBD',
        roomType: '트윈',
        mealType: '조식',
        infantCount: 0,
        totalCount: data.adultCount + data.childCount,
        adultPrice: Math.floor(data.totalAmount / data.adultCount),
        childPrice: 0,
        balance: data.totalAmount - data.depositAmount,
        customerCompany: '',
        managerId: 'admin',
        managerName: '관리자',
        status: BookingStatus.PENDING,
      };
      
      await createBooking.mutateAsync(payload);
      toast.success('예약이 성공적으로 등록되었습니다.');
      reset();
      onSuccess?.();
      onClose();
    } catch (error) {
      logger.error('Failed to create booking:', error instanceof Error ? error.message : String(error));
      toast.error('예약 등록에 실패했습니다. 다시 시도해주세요.');
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold">새 예약 등록</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="overflow-y-auto max-h-[calc(90vh-8rem)]">
          <div className="px-6 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  팀명 <span className="text-red-500">*</span>
                </label>
                <Input
                  {...register('teamName')}
                  placeholder="팀명을 입력하세요"
                  error={errors.teamName?.message}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  고객명 <span className="text-red-500">*</span>
                </label>
                <Input
                  {...register('customerName')}
                  placeholder="고객명을 입력하세요"
                  error={errors.customerName?.message}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  전화번호 <span className="text-red-500">*</span>
                </label>
                <Input
                  {...register('customerPhone')}
                  placeholder="010-0000-0000"
                  error={errors.customerPhone?.message}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이메일
                </label>
                <Input
                  {...register('customerEmail')}
                  type="email"
                  placeholder="example@email.com"
                  error={errors.customerEmail?.message}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                목적지 <span className="text-red-500">*</span>
              </label>
              <Input
                {...register('destination')}
                placeholder="목적지를 입력하세요"
                error={errors.destination?.message}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  여행 시작일 <span className="text-red-500">*</span>
                </label>
                <Input
                  {...register('travelDate')}
                  type="date"
                  min={format(new Date(), 'yyyy-MM-dd')}
                  error={errors.travelDate?.message}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  여행 종료일 <span className="text-red-500">*</span>
                </label>
                <Input
                  {...register('returnDate')}
                  type="date"
                  min={format(new Date(), 'yyyy-MM-dd')}
                  error={errors.returnDate?.message}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  성인 인원 <span className="text-red-500">*</span>
                </label>
                <Input
                  {...register('adultCount')}
                  type="number"
                  min="1"
                  error={errors.adultCount?.message}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  아동 인원
                </label>
                <Input
                  {...register('childCount')}
                  type="number"
                  min="0"
                  error={errors.childCount?.message}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  총 금액 <span className="text-red-500">*</span>
                </label>
                <Input
                  {...register('totalAmount')}
                  type="number"
                  min="0"
                  placeholder="0"
                  error={errors.totalAmount?.message}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  계약금 <span className="text-red-500">*</span>
                </label>
                <Input
                  {...register('depositAmount')}
                  type="number"
                  min="0"
                  placeholder="0"
                  error={errors.depositAmount?.message}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                메모
              </label>
              <TextArea
                {...register('notes')}
                rows={3}
                placeholder="추가 정보를 입력하세요"
                error={errors.notes?.message}
              />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || createBooking.isPending}
            >
              {isSubmitting || createBooking.isPending ? '등록 중...' : '예약 등록'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}