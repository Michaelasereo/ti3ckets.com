// Shared configuration

export const config = {
  app: {
    name: 'getiickets',
    version: '1.0.0',
  },
  api: {
    version: 'v1',
    prefix: '/api/v1',
  },
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },
  cache: {
    eventListTTL: 300, // 5 minutes
    eventDetailTTL: 60, // 1 minute
    ticketAvailabilityTTL: 30, // 30 seconds
  },
  reservation: {
    expiryMinutes: 10,
  },
  payment: {
    platformFeePercent: 5,
    processingFeePercent: 1.5,
    processingFeeFixed: 100, // NGN
  },
  refund: {
    fullRefundDays: 7,
    partialRefundDays: 3,
    noRefundHours: 72,
  },
} as const;
