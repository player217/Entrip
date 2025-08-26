/* TODO: 실제 구현 전까지 타입 오류/테스트 방지용 더미 */
import React from 'react';

export interface BookingModalProps {
  isOpen: boolean;
  onClose(): void;
  booking?: unknown;
  onSave?(data: unknown): void;
}

export const BookingModal: React.FC<BookingModalProps> = () => null;

export default BookingModal;