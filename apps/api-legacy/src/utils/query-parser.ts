export interface BookingFilters {
  type?: string;
  status?: string;
  startDate?: { gte?: Date; lte?: Date };
  client?: string;      // 고객명 필터 추가
  keyword?: string;     // 통합 검색 추가
  skip?: number;
  take?: number;
}

export const parseBookingQuery = (query: any): BookingFilters => {
  const filters: BookingFilters = {};
  
  if (query.type) filters.type = query.type;
  if (query.status) filters.status = query.status;
  
  if (query.startDateFrom || query.startDateTo) {
    filters.startDate = {};
    if (query.startDateFrom) filters.startDate.gte = new Date(query.startDateFrom);
    if (query.startDateTo) filters.startDate.lte = new Date(query.startDateTo);
  }
  
  // 고객명 필터 추가
  if (query.client) filters.client = query.client;
  
  // 통합 검색 추가
  if (query.keyword) filters.keyword = query.keyword;
  
  // Support both skip/take and page/limit for pagination
  if (query.page && query.limit) {
    const page = parseInt(query.page);
    const limit = parseInt(query.limit);
    filters.skip = (page - 1) * limit;
    filters.take = limit;
  } else {
    filters.skip = query.skip ? parseInt(query.skip) : 0;
    filters.take = query.take ? parseInt(query.take) : 10;
  }
  
  return filters;
};