import axios from 'axios';
import { APIPerformance } from '@/lib/perf';

// All API routes served by Next.js on same origin (port 3000)
const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

const GET_CACHE_TTL_MS = 10000;
const GET_CACHE_MAX_ENTRIES = 50;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

const responseCache = new Map<string, CacheEntry>();

function getCacheKey(config: { method?: string; url?: string; params?: unknown }): string {
  const method = (config.method || 'get').toLowerCase();
  const url = config.url || '';
  const params = config.params != null ? JSON.stringify(config.params) : '';
  return `${method}:${url}:${params}`;
}

function getCachedResponse(config: { method?: string; url?: string; params?: unknown }): unknown | null {
  if ((config.method || 'get').toLowerCase() !== 'get') return null;
  const key = getCacheKey(config);
  const entry = responseCache.get(key);
  if (!entry || Date.now() - entry.timestamp > GET_CACHE_TTL_MS) return null;
  return entry.data;
}

function setCachedResponse(config: { method?: string; url?: string; params?: unknown }, data: unknown): void {
  if ((config.method || 'get').toLowerCase() !== 'get') return;
  if (responseCache.size >= GET_CACHE_MAX_ENTRIES) {
    const firstKey = responseCache.keys().next().value;
    if (firstKey) responseCache.delete(firstKey);
  }
  const key = getCacheKey(config);
  responseCache.set(key, { data, timestamp: Date.now() });
}

const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Important: send cookies with requests
  timeout: 25000, // 25 second timeout (events/list can be slow on cold DB)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: cache check (GET), perf start, FormData/Auth
apiClient.interceptors.request.use(
  (config) => {
    (config as axios.AxiosRequestConfig & { metadata?: { startTime: number } }).metadata = {
      startTime: Date.now(),
    };

    // GET cache: short-circuit with cached data (handled in response error interceptor)
    if (typeof window !== 'undefined') {
      const cached = getCachedResponse(config);
      if (cached != null) {
        return Promise.reject({
          cached: true,
          data: cached,
          config,
        }) as never;
      }
    }

    // Let the browser set Content-Type (with boundary) for FormData so file uploads work
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    // Only add Authorization header if cookie is not present (for backward compatibility)
    if (typeof window !== 'undefined' && !document.cookie.includes('session=')) {
      const token = localStorage.getItem('auth_token') ?? sessionStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: cache GET responses, perf track, handle cache hits, retry, same-origin fallback
apiClient.interceptors.response.use(
  (response) => {
    if (typeof window !== 'undefined') {
      setCachedResponse(response.config, response.data);
    }
    const meta = (response.config as axios.AxiosRequestConfig & { metadata?: { startTime: number } }).metadata;
    if (meta?.startTime != null) {
      const url = String(response.config.url ?? response.config.baseURL ?? '');
      APIPerformance.getInstance().track(url, meta.startTime);
    }
    return response;
  },
  async (error) => {
    const config = error?.config as (axios.AxiosRequestConfig & {
      __sameOriginRetry?: boolean;
      __retryCount?: number;
      metadata?: { startTime: number };
    }) | undefined;

    // Cache hit: return synthetic success response
    if (error?.cached === true && error?.data !== undefined) {
      return Promise.resolve({
        data: error.data,
        status: 200,
        statusText: 'OK (cached)',
        headers: {},
        config: error.config,
      });
    }

    // Perf track for real errors
    if (config?.metadata?.startTime != null) {
      const url = config.url ?? config.baseURL ?? '';
      APIPerformance.getInstance().track(url, config.metadata.startTime);
    }

    // Retry: network error, 5xx, or timeout (ECONNABORTED), up to MAX_RETRIES
    const retryCount = (config?.__retryCount ?? 0);
    const shouldRetry =
      config != null &&
      retryCount < MAX_RETRIES &&
      (!error.response || error.response.status >= 500 || error.code === 'ECONNABORTED' || error.code === 'NETWORK_ERROR');

    if (shouldRetry) {
      (config as { __retryCount?: number }).__retryCount = retryCount + 1;
      const delay = RETRY_DELAY_MS * Math.pow(2, retryCount);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return apiClient(config);
    }

    return Promise.reject(error);
  }
);

// API functions
export const eventsApi = {
  list: (params?: { category?: string; city?: string; date?: string; page?: number; limit?: number }) =>
    apiClient.get('/api/v1/events', { params }),
  get: (id: string) => apiClient.get(`/api/v1/events/${id}`),
  getBySlug: (slug: string) => apiClient.get(`/api/v1/events/slug/${slug}`),
  search: (query: string) => apiClient.get('/api/v1/events/search', { params: { q: query } }),
};

export const ticketsApi = {
  checkAvailability: (eventId: string, ticketTypeId: string, quantity: number) =>
    apiClient.get('/api/v1/tickets/availability', {
      params: { eventId, ticketTypeId, quantity },
    }),
  reserve: (data: { eventId: string; ticketTypeId: string; quantity: number; seatIds?: string[] }) =>
    apiClient.post('/api/v1/tickets/reserve', data),
  release: (reservationId: string) =>
    apiClient.post('/api/v1/tickets/release', { reservationId }),
  transfer: (ticketId: string, data: { recipientEmail: string; recipientName?: string }) =>
    apiClient.post(`/api/v1/tickets/${ticketId}/transfer`, data),
};

export const ordersApi = {
  create: (data: {
    eventId: string;
    ticketTypeId: string;
    quantity: number;
    customerEmail: string;
    customerName?: string;
    customerPhone?: string;
    promoCode?: string;
    reservationId?: string;
    attendeeInfo?: Array<{
      ticketTypeId: string;
      quantity: number;
      attendees: Array<{
        firstName: string;
        lastName: string;
        email: string;
        phone?: string;
      }>;
    }>;
  }) => apiClient.post('/api/v1/orders', data),
  get: (id: string) => apiClient.get(`/api/v1/orders/${id}`),
  getByReference: (reference: string) => apiClient.get(`/api/v1/orders/by-reference/${reference}`),
};

export const paymentsApi = {
  initialize: (data: {
    orderId: string;
    email: string;
    amount: number;
    metadata?: Record<string, any>;
  }) => apiClient.post('/api/v1/payments/initialize', data),
  verify: (reference: string) =>
    apiClient.post('/api/v1/payments/verify', { reference }),
};

export const authApi = {
  register: (data: { email: string; password: string; name?: string; phone?: string }) =>
    apiClient.post('/api/v1/auth/register', data),
  login: (data: { email: string; password: string }) =>
    apiClient.post('/api/v1/auth/login', data),
  logout: () => apiClient.post('/api/v1/auth/logout'),
  getSession: () => apiClient.get('/api/v1/auth/session'),
  switchRole: (role: 'buyer' | 'organizer') =>
    apiClient.post('/api/v1/auth/switch-role', { role }),
  requestOrganizer: () => apiClient.post('/api/v1/auth/request-organizer'),
  verifyEmail: (data: { email: string; code: string }) =>
    apiClient.post('/api/v1/auth/verify-email', data),
  resendVerification: (data: { email: string }) =>
    apiClient.post('/api/v1/auth/resend-verification', data),
  refresh: (refreshToken: string) =>
    apiClient.post('/api/v1/auth/refresh', { refreshToken }),
};

export const promoCodeApi = {
  validate: (code: string, eventId: string, amount: number) =>
    apiClient.post('/api/v1/promo-codes/validate', { code, eventId, amount }),
};

export const waitlistApi = {
  join: (data: { eventId: string; email: string; phone?: string; ticketTypeId?: string; quantity?: number }) =>
    apiClient.post('/api/v1/waitlist', data),
};

export const organizerApi = {
  getEvents: () => apiClient.get('/api/v1/organizer/events'),
  getEvent: (id: string) => apiClient.get(`/api/v1/organizer/events/${id}`),
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return apiClient.post<{ success: boolean; data: { avatarUrl: string } }>(
      '/api/v1/organizer/profile/upload-avatar',
      formData
    );
  },
  createEvent: (data: {
    title: string;
    description?: string;
    category: string;
    imageUrl?: string;
    bannerUrl?: string;
    venueName: string;
    venueAddress: string;
    city: string;
    country?: string;
    startDateTime: string;
    endDateTime: string;
    saleStart: string;
    saleEnd: string;
    isSeated?: boolean;
    isVirtual?: boolean;
    ticketTypes: Array<{
      name: string;
      description?: string;
      price: number;
      currency?: string;
      totalQuantity: number;
      maxPerOrder?: number;
      minPerOrder?: number;
    }>;
  }) => apiClient.post('/api/v1/organizer/events', data),
  updateEvent: (id: string, data: {
    title?: string;
    description?: string;
    category?: string;
    imageUrl?: string | null;
    bannerUrl?: string | null;
    venueName?: string;
    venueAddress?: string;
    city?: string;
    country?: string;
    startDateTime?: string;
    endDateTime?: string;
    saleStart?: string;
    saleEnd?: string;
    isSeated?: boolean;
    isVirtual?: boolean;
    ticketTypes?: Array<{
      id?: string;
      name: string;
      description?: string;
      price: number;
      currency?: string;
      totalQuantity: number;
      maxPerOrder?: number;
      minPerOrder?: number;
    }>;
  }) => apiClient.put(`/api/v1/organizer/events/${id}`, data),
  updateEventStatus: (id: string, status: string) =>
    apiClient.patch(`/api/v1/organizer/events/${id}/status`, { status }),
  getEventAnalytics: (id: string) => apiClient.get(`/api/v1/organizer/events/${id}/analytics`),
  getEventWaitlist: (id: string) => apiClient.get(`/api/v1/organizer/events/${id}/waitlist`),
  getEventSeats: (id: string) => apiClient.get(`/api/v1/organizer/events/${id}/seats`),
  createSeats: (id: string, seats: Array<{ section: string; row?: string; number: string; tier?: string }>) =>
    apiClient.post(`/api/v1/organizer/events/${id}/seats`, { seats }),
  updateSeat: (eventId: string, seatId: string, status: 'AVAILABLE' | 'BLOCKED') =>
    apiClient.put(`/api/v1/organizer/events/${eventId}/seats/${seatId}`, { status }),
  deleteSeat: (eventId: string, seatId: string) =>
    apiClient.delete(`/api/v1/organizer/events/${eventId}/seats/${seatId}`),
  getEventOrders: (id: string, params?: { status?: string; page?: number; limit?: number; ticketTypeId?: string }) =>
    apiClient.get(`/api/v1/organizer/events/${id}/orders`, { params }),
  getOrdersSummaryByTicketType: () =>
    apiClient.get('/api/v1/organizer/orders/summary-by-ticket-type'),
  checkInTicket: (eventId: string, data: { ticketNumber?: string; qrCodeData?: string }) =>
    apiClient.post(`/api/v1/organizer/events/${eventId}/check-in`, data),
  uploadEventImage: (eventId: string, file: File, type: 'image' | 'banner') => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('type', type);
    if (eventId) {
      formData.append('eventId', eventId);
    }
    return apiClient.post('/api/v1/organizer/events/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

export const organizerPromoCodeApi = {
  list: () => apiClient.get('/api/v1/organizer/promo-codes'),
  get: (id: string) => apiClient.get(`/api/v1/organizer/promo-codes/${id}`),
  create: (data: {
    code: string;
    description?: string;
    discountType: 'PERCENTAGE' | 'FIXED';
    discountValue: number;
    maxUses?: number;
    maxUsesPerUser?: number;
    validFrom: string;
    validUntil: string;
    eventId?: string;
    minOrderAmount?: number;
    isActive?: boolean;
  }) => apiClient.post('/api/v1/organizer/promo-codes', data),
  update: (id: string, data: {
    code?: string;
    description?: string;
    discountType?: 'PERCENTAGE' | 'FIXED';
    discountValue?: number;
    maxUses?: number;
    maxUsesPerUser?: number;
    validFrom?: string;
    validUntil?: string;
    eventId?: string;
    minOrderAmount?: number;
    isActive?: boolean;
  }) => apiClient.put(`/api/v1/organizer/promo-codes/${id}`, data),
  delete: (id: string) => apiClient.delete(`/api/v1/organizer/promo-codes/${id}`),
};

export const organizerPayoutApi = {
  getBalance: () => apiClient.get('/api/v1/organizer/payouts/balance'),
  list: (params?: { page?: number; limit?: number; status?: string }) =>
    apiClient.get('/api/v1/organizer/payouts', { params }),
  get: (id: string) => apiClient.get(`/api/v1/organizer/payouts/${id}`),
  setup: (data: {
    name: string;
    account_number: string;
    bank_code: string;
  }) => apiClient.post('/api/v1/organizer/payouts/setup', data),
  request: (data: {
    amount: number;
    recipientCode?: string;
  }) => apiClient.post('/api/v1/organizer/payouts/request', data),
};

export const organizerRevenueApi = {
  get: () => apiClient.get('/api/v1/organizer/revenue'),
};

export const usersApi = {
  getTickets: () => apiClient.get('/api/v1/users/tickets'),
  getOrders: () => apiClient.get('/api/v1/users/orders'),
  getMe: () => apiClient.get('/api/v1/users/me'),
  updateProfile: (data: {
    buyerProfile?: {
      firstName?: string;
      lastName?: string;
      dateOfBirth?: string | null;
      address?: string;
      city?: string;
      country?: string;
      preferredPaymentMethod?: string | null;
    };
    organizerProfile?: {
      businessName?: string;
      businessType?: string;
      businessAddress?: string;
      businessCity?: string;
      businessCountry?: string;
      taxId?: string;
    };
  }) => apiClient.put('/api/v1/users/me/profile', data),
};

export const adminApi = {
  dashboard: {
    getStats: () => apiClient.get('/api/v1/admin/dashboard'),
    getAnalytics: (params?: { startDate?: string; endDate?: string }) =>
      apiClient.get('/api/v1/admin/analytics', { params }),
  },
  users: {
    list: (params?: { page?: number; limit?: number; role?: string; search?: string }) =>
      apiClient.get('/api/v1/admin/users', { params }),
    get: (id: string) => apiClient.get(`/api/v1/admin/users/${id}`),
    updateStatus: (id: string, data: { suspended: boolean }) =>
      apiClient.patch(`/api/v1/admin/users/${id}/status`, data),
    grantRole: (id: string, data: { role: string }) =>
      apiClient.post(`/api/v1/admin/users/${id}/roles`, data),
    revokeRole: (id: string, role: string) =>
      apiClient.delete(`/api/v1/admin/users/${id}/roles/${role}`),
  },
  organizers: {
    list: (params?: { page?: number; limit?: number; verificationStatus?: string }) =>
      apiClient.get('/api/v1/admin/organizers', { params }),
    get: (id: string) => apiClient.get(`/api/v1/admin/organizers/${id}`),
    updateVerification: (id: string, data: { verificationStatus: string }) =>
      apiClient.patch(`/api/v1/admin/organizers/${id}/verification`, data),
  },
  events: {
    list: (params?: { page?: number; limit?: number; status?: string; organizerId?: string; search?: string }) =>
      apiClient.get('/api/v1/admin/events', { params }),
    get: (id: string) => apiClient.get(`/api/v1/admin/events/${id}`),
    updateStatus: (id: string, data: { status: string }) =>
      apiClient.patch(`/api/v1/admin/events/${id}/status`, data),
  },
  orders: {
    list: (params?: { page?: number; limit?: number; status?: string; eventId?: string; startDate?: string; endDate?: string }) =>
      apiClient.get('/api/v1/admin/orders', { params }),
    get: (id: string) => apiClient.get(`/api/v1/admin/orders/${id}`),
  },
  settings: {
    get: () => apiClient.get('/api/v1/admin/settings'),
    update: (data: {
      platformFeePercentage?: number;
      paystackFeePercentage?: number;
      paystackFixedFee?: number;
      freeTicketsThreshold?: number;
      minimumPayoutThreshold?: number;
    }) => apiClient.patch('/api/v1/admin/settings', data),
  },
  launchWaitlist: {
    list: (params?: { page?: number; limit?: number }) =>
      apiClient.get('/api/v1/admin/launch-waitlist', { params }),
    exportCsv: () =>
      apiClient.get('/api/v1/admin/launch-waitlist/export', { responseType: 'blob' }),
  },
};

export default apiClient;
