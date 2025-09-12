import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import { apiClient, API_ENDPOINTS } from '../lib/apiClient';
import type { 
  Booking, 
  BookingListResponse, 
  BookingFilters,
  CreateBookingDto,
  UpdateBookingDto 
} from '../types/booking';

// SWR fetcher function
const fetcher = (url: string) => apiClient.get(url).then(res => res.data);

// SWR mutation functions
const createBooking = async (url: string, { arg }: { arg: CreateBookingDto }) => {
  const response = await apiClient.post<Booking>(url, arg);
  return response.data;
};

const updateBooking = async (url: string, { arg }: { arg: UpdateBookingDto }) => {
  const response = await apiClient.patch<Booking>(url, arg);
  return response.data;
};

const deleteBooking = async (url: string) => {
  await apiClient.delete(url);
};

// 예약 목록 조회 hook
export function useBookings(filters?: BookingFilters) {
  const params = new URLSearchParams();
  
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
  }

  const queryString = params.toString();
  const url = queryString 
    ? `${API_ENDPOINTS.booking.list}?${queryString}`
    : API_ENDPOINTS.booking.list;

  return useSWR<BookingListResponse>(
    url,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // 1분간 중복 요청 방지
    }
  );
}

// 예약 상세 조회 hook
export function useBooking(id: string | null) {
  return useSWR<Booking>(
    id ? API_ENDPOINTS.booking.detail(id) : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );
}

// 예약 생성 hook
export function useCreateBooking() {
  return useSWRMutation(
    API_ENDPOINTS.booking.create,
    createBooking,
    {
      onSuccess: () => {
        // 생성 성공 시 목록 캐시 무효화
        import('swr').then(({ mutate }) => {
          mutate(key => typeof key === 'string' && key.startsWith(API_ENDPOINTS.booking.list));
        });
      }
    }
  );
}

// 예약 수정 hook
export function useUpdateBooking(id: string) {
  return useSWRMutation(
    API_ENDPOINTS.booking.update(id),
    updateBooking,
    {
      onSuccess: () => {
        // 수정 성공 시 관련 캐시 무효화
        import('swr').then(({ mutate }) => {
          mutate(API_ENDPOINTS.booking.detail(id));
          mutate(key => typeof key === 'string' && key.startsWith(API_ENDPOINTS.booking.list));
        });
      }
    }
  );
}

// 예약 삭제 hook
export function useDeleteBooking(id: string) {
  return useSWRMutation(
    API_ENDPOINTS.booking.delete(id),
    deleteBooking,
    {
      onSuccess: () => {
        // 삭제 성공 시 관련 캐시 무효화
        import('swr').then(({ mutate }) => {
          mutate(API_ENDPOINTS.booking.detail(id), undefined, { revalidate: false });
          mutate(key => typeof key === 'string' && key.startsWith(API_ENDPOINTS.booking.list));
        });
      }
    }
  );
}

// 예약 상태 변경 hook
export function useUpdateBookingStatus(id: string) {
  return useSWRMutation(
    API_ENDPOINTS.booking.updateStatus(id),
    async (url: string, { arg }: { arg: { status: string } }) => {
      const response = await apiClient.patch<Booking>(url, arg);
      return response.data;
    },
    {
      onSuccess: () => {
        // 상태 변경 성공 시 관련 캐시 무효화
        import('swr').then(({ mutate }) => {
          mutate(API_ENDPOINTS.booking.detail(id));
          mutate(key => typeof key === 'string' && key.startsWith(API_ENDPOINTS.booking.list));
        });
      }
    }
  );
}