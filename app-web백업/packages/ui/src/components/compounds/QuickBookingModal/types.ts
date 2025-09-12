// Import and re-export from validation
import type { QuickBookingFormData as FormData } from './fields/validation';
export type QuickBookingFormData = FormData;

export interface QuickBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: QuickBookingFormData) => Promise<void>;
  selectedDate?: Date;
}