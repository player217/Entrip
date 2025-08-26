export interface Reservation {
  id: string;
  teamName: string;
  code: string;
  date: string;           // YYYY-MM-DD
  type: string;           // IN, GF, AT...
  status: '확정' | '대기' | '취소';
  people: number;
  amount: number;
  profit?: number;
  manager: string;
}

export interface MonthlyStats {
  team: number;
  people: number;
  revenue: number;
  profit: number;
}

export interface CalendarNavigationProps {
  date: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

export interface CalendarGridProps {
  baseDate: Date;
  reservations: Reservation[];
  isLoading: boolean;
  error: unknown;
  onAddClick?: (date: Date) => void;
}

export interface CalendarDayCellProps {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  reservations: Reservation[];
  isLoading: boolean;
  onAddClick?: (date: Date) => void;
}

export interface ReservationBadgeProps {
  reservation: Reservation;
}

export interface SummaryFooterProps {
  reservations: Reservation[];
}