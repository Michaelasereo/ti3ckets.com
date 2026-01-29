// Common types used across the application

export type EventCategory =
  | 'concert'
  | 'sports'
  | 'conference'
  | 'festival'
  | 'theater'
  | 'workshop';

export type EventStatus =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'LIVE'
  | 'SOLD_OUT'
  | 'CANCELLED'
  | 'COMPLETED';

export type OrderStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'PAID'
  | 'FAILED'
  | 'REFUNDED'
  | 'CANCELLED';

export type TicketStatus = 'VALID' | 'USED' | 'CANCELLED' | 'TRANSFERRED';

export type SeatStatus = 'AVAILABLE' | 'RESERVED' | 'SOLD' | 'BLOCKED';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
