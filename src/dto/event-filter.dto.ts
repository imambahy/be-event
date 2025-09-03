export interface EventFiltersDto {
    search?: string;
    category?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: 'date' | 'price' | 'title' | 'rating';
    order?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }
  
  export interface PaginatedResponseDto<T> {
    data: T[];
    total: number;
    totalPages: number;
    currentPage: number;
    limit: number;
  }
  
  export interface ApiResponseDto<T> {
    success: boolean;
    message: string;
    data?: T;
    error?: string;
  }