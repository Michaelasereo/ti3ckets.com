'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import PageContainer from '@/components/ui/PageContainer';
import Card from '@/components/ui/Card';
import { SkeletonLines } from '@/components/ui/LoadingSkeleton';
import { formatCurrency } from '@getiickets/shared';
import WaitlistJoinModal from '@/components/waitlist/WaitlistJoinModal';
import { downloadICS } from '@/lib/utils/calendar';
import { openGoogleMaps } from '@/lib/utils/maps';

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventSlug = params.slug as string;
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [waitlistModal, setWaitlistModal] = useState<{
    isOpen: boolean;
    ticketTypeId?: string;
    ticketTypeName?: string;
  }>({ isOpen: false });

  useEffect(() => {
    fetchEvent();
  }, [eventSlug]);

  const fetchEvent = async (backgroundRefresh = false) => {
    if (!backgroundRefresh) setLoading(true);
    try {
      const { eventsApi } = await import('@/lib/api');
      try {
        const bySlug = await eventsApi.getBySlug(eventSlug);
        if (bySlug.data.success) {
          setEvent(bySlug.data.data);
          return;
        }
      } catch {
        // ignore and try by id
      }

      const byId = await eventsApi.get(eventSlug);
      if (byId.data.success) {
        setEvent(byId.data.data);
      } else {
        console.error('Failed to fetch event:', byId.data.error);
      }
    } catch (error) {
      console.error('Error fetching event:', error);
    } finally {
      if (!backgroundRefresh) setLoading(false);
    }
  };

  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === 'visible' && eventSlug) {
        fetchEvent(true);
      }
    };
    document.addEventListener('visibilitychange', onFocus);
    return () => document.removeEventListener('visibilitychange', onFocus);
  }, [eventSlug]);

  const handleReserveTickets = () => {
    // Store event info in cart for Step 1
    const cartData = {
      eventId: event.id,
      eventSlug: event.slug,
      tickets: [],
      selectedSeats: undefined,
      reservations: [],
    };
    sessionStorage.setItem('cart', JSON.stringify(cartData));
    router.push('/checkout/step1');
  };

  const handleAddToCalendar = () => {
    if (!event) return;
    
    downloadICS({
      title: event.title,
      description: event.description || '',
      startDate: new Date(event.startDateTime),
      endDate: new Date(event.endDateTime),
      venueName: event.venueName,
      venueAddress: event.venueAddress,
      city: event.city,
    });
  };

  const handleViewOnMap = () => {
    if (!event) return;
    
    openGoogleMaps({
      venueName: event.venueName,
      venueAddress: event.venueAddress,
      city: event.city,
      country: event.country || 'Nigeria',
    });
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="h-8 bg-gray-200 rounded w-32 mb-4 animate-pulse" />
        <div className="h-64 bg-gray-200 rounded-xl mb-6 animate-pulse" />
        <div className="h-10 bg-gray-200 rounded w-3/4 mb-4 animate-pulse" />
        <SkeletonLines lines={5} />
        <div className="h-96 bg-gray-200 rounded-xl mt-6 animate-pulse" />
      </PageContainer>
    );
  }

  if (!event) {
    return (
      <PageContainer>
        <p className="text-gray-600 mb-4">Event not found.</p>
        <Link href="/events" className="text-primary-800 hover:text-primary-600 font-medium">
          ← Back to Events
        </Link>
      </PageContainer>
    );
  }

  const imageUrl = event.bannerUrl || event.imageUrl;
  const organizerName = event.organizer?.organizerProfile?.businessName || event.organizer?.name || 'Organizer';
  const startingPrice = event.ticketTypes && event.ticketTypes.length > 0
    ? Math.min(...event.ticketTypes.map((tt: any) => Number(tt.price)))
    : null;
  const startDate = new Date(event.startDateTime);
  const endDate = new Date(event.endDateTime);

  // Format date and time
  const formattedDate = startDate.toLocaleDateString('en-NG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = `${startDate.toLocaleTimeString('en-NG', {
    hour: '2-digit',
    minute: '2-digit',
  })} - ${endDate.toLocaleTimeString('en-NG', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;

  return (
    <>
      <PageContainer className="pb-32 lg:pb-8">
        {/* Back Button - Mobile */}
        <Link
          href="/events"
          className="lg:hidden inline-block mb-4 text-sm font-medium"
          style={{ color: '#192030' }}
        >
          ← Back to Events
        </Link>

        {/* Back Button - Desktop */}
        <Link
          href="/events"
          className="hidden lg:inline-block text-primary-800 hover:text-primary-600 mb-6 text-[15px]"
        >
          ← Back to Events
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Event Banner/Image */}
            {imageUrl && (
              <div className="w-full h-64 lg:h-96 object-cover rounded-xl overflow-hidden">
                <img
                  src={imageUrl}
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* About / Event Summary Section - Right after image */}
            <Card padding="lg">
              <div className="text-xs font-medium uppercase tracking-widest text-gray-500 mb-1">
                {organizerName} <span className="mx-1">·</span> PRESENTS
              </div>

              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2 flex-wrap">
                    <h2 className="text-2xl font-bold leading-tight" style={{ color: '#192030' }}>
                      {event.title}
                    </h2>
                    {event.category && (
                      <span
                        className="px-3 py-1 rounded-full text-xs font-semibold border"
                        style={{
                          backgroundColor: 'white',
                          color: '#192030',
                          borderColor: '#192030',
                        }}
                      >
                        {event.category}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">About this event</div>
                </div>
              </div>

              {event.description && (
                <>
                  <div
                    className="text-gray-600 whitespace-pre-line leading-relaxed"
                    style={
                      isDescriptionExpanded
                        ? undefined
                        : ({
                            display: '-webkit-box',
                            WebkitLineClamp: 7,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          } as React.CSSProperties)
                    }
                  >
                    {event.description}
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsDescriptionExpanded((v) => !v)}
                    className="mt-3 text-sm font-semibold hover:opacity-80 transition"
                    style={{ color: '#C74576' }}
                  >
                    {isDescriptionExpanded ? 'See less' : 'See more'}
                  </button>
                </>
              )}

              <div className="flex items-center gap-3 mt-5">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-semibold flex-shrink-0 overflow-hidden bg-gray-100"
                  style={
                    event.organizer?.organizerProfile?.avatarUrl
                      ? undefined
                      : {
                          background: 'linear-gradient(90deg, #192030 0%, #C74576 100%)',
                          color: 'white',
                        }
                  }
                  aria-label={`Organizer: ${organizerName}`}
                  title={organizerName}
                >
                  {event.organizer?.organizerProfile?.avatarUrl ? (
                    <img
                      src={event.organizer.organizerProfile.avatarUrl}
                      alt={organizerName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    (organizerName || 'O')
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((p: string) => p[0]?.toUpperCase())
                      .join('')
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate" style={{ color: '#192030' }}>
                    {organizerName}
                  </div>
                  <div className="text-xs text-gray-500">Organizer</div>
                </div>
              </div>
            </Card>

            {/* Date/Time Section - directly after About */}
            <Card padding="lg" className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    style={{ color: '#C74576' }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-semibold mb-1" style={{ color: '#192030' }}>
                    {formattedDate}
                  </div>
                  <div className="text-gray-600 mb-2">{formattedTime}</div>
                  <div className="text-xs text-gray-500 mb-4">
                    Times are displayed in your local timezone.
                  </div>
                  <button
                    onClick={handleAddToCalendar}
                    className="w-full sm:w-auto px-6 py-2.5 border-2 rounded-xl font-semibold transition hover:opacity-80"
                    style={{
                      borderColor: '#C74576',
                      color: '#C74576',
                    }}
                  >
                    + Add to Calendar
                  </button>
                </div>
              </div>
            </Card>

            {/* Location Section */}
            <Card padding="lg" className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    style={{ color: '#C74576' }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-semibold mb-1" style={{ color: '#192030' }}>
                    {event.venueName}
                  </div>
                  <div className="text-gray-600 mb-2">
                    {event.venueAddress}, {event.city}
                    {event.country && `, ${event.country}`}
                  </div>
                  <button
                    onClick={handleViewOnMap}
                    className="w-full sm:w-auto px-6 py-2.5 border-2 rounded-xl font-semibold transition hover:opacity-80"
                    style={{
                      borderColor: '#C74576',
                      color: '#C74576',
                    }}
                  >
                    View on map
                  </button>
                </div>
              </div>
            </Card>

            {/* Ticket Information - Desktop Only */}
            <div className="hidden lg:block">
              <Card padding="lg">
                <h2 className="text-xl font-semibold mb-4" style={{ color: '#192030' }}>
                  Ticket Information
                </h2>
                
                {event.ticketTypes && event.ticketTypes.length > 0 ? (
                  <div className="space-y-4 mb-6">
                    {event.ticketTypes.map((ticketType: any) => {
                      const available = ticketType.totalQuantity - ticketType.soldQuantity - ticketType.reservedQuantity;
                      return (
                        <div key={ticketType.id} className="border border-gray-200 rounded-xl p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h3 className="font-semibold">{ticketType.name}</h3>
                              {ticketType.description && (
                                <p className="text-sm text-gray-600">{ticketType.description}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-lg">
                                {Number(ticketType.price) === 0 ? 'Free' : formatCurrency(Number(ticketType.price), ticketType.currency || 'NGN')}
                              </p>
                              <p className="text-xs text-gray-500">{available} available</p>
                            </div>
                          </div>
                          {available === 0 && (
                            <div className="space-y-2">
                              <p className="text-sm text-red-600 font-medium">Sold Out</p>
                              <button
                                onClick={() =>
                                  setWaitlistModal({
                                    isOpen: true,
                                    ticketTypeId: ticketType.id,
                                    ticketTypeName: ticketType.name,
                                  })
                                }
                                className="w-full px-6 py-3.5 text-white rounded-xl font-semibold hover:opacity-90 transition"
                                style={{
                                  background: 'linear-gradient(90deg, #192030 0%, #C74576 100%)',
                                }}
                              >
                                Join Waitlist
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500 mb-6">No tickets available</p>
                )}

                <button
                  onClick={handleReserveTickets}
                  disabled={!event.ticketTypes || event.ticketTypes.length === 0 || event.ticketTypes.every((tt: any) => (tt.totalQuantity - tt.soldQuantity - tt.reservedQuantity) === 0)}
                  className="w-full px-6 py-3.5 text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  style={{
                    background: 'linear-gradient(90deg, #192030 0%, #C74576 100%)',
                  }}
                >
                  Reserve Tickets
                </button>
              </Card>
            </div>
          </div>

          {/* Desktop Sidebar */}
          <div className="hidden lg:block lg:col-span-1">
            <Card padding="lg" className="sticky top-24">
              <h2 className="text-xl font-semibold mb-4" style={{ color: '#192030' }}>
                Ticket Information
              </h2>
              
              {event.ticketTypes && event.ticketTypes.length > 0 ? (
                <div className="space-y-4 mb-6">
                  {event.ticketTypes.map((ticketType: any) => {
                    const available = ticketType.totalQuantity - ticketType.soldQuantity - ticketType.reservedQuantity;
                    return (
                      <div key={ticketType.id} className="border border-gray-200 rounded-xl p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold">{ticketType.name}</h3>
                            {ticketType.description && (
                              <p className="text-sm text-gray-600">{ticketType.description}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg">
                              {Number(ticketType.price) === 0 ? 'Free' : formatCurrency(Number(ticketType.price), ticketType.currency || 'NGN')}
                            </p>
                            <p className="text-xs text-gray-500">{available} available</p>
                          </div>
                        </div>
                        {available === 0 && (
                          <div className="space-y-2">
                            <p className="text-sm text-red-600 font-medium">Sold Out</p>
                            <button
                              onClick={() =>
                                setWaitlistModal({
                                  isOpen: true,
                                  ticketTypeId: ticketType.id,
                                  ticketTypeName: ticketType.name,
                                })
                              }
                              className="w-full px-6 py-3.5 text-white rounded-xl font-semibold hover:opacity-90 transition"
                              style={{
                                background: 'linear-gradient(90deg, #192030 0%, #C74576 100%)',
                              }}
                            >
                              Join Waitlist
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 mb-6">No tickets available</p>
              )}

              <button
                onClick={handleReserveTickets}
                disabled={!event.ticketTypes || event.ticketTypes.length === 0 || event.ticketTypes.every((tt: any) => (tt.totalQuantity - tt.soldQuantity - tt.reservedQuantity) === 0)}
                className="w-full px-6 py-3.5 text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
                style={{
                  background: 'linear-gradient(90deg, #192030 0%, #C74576 100%)',
                }}
              >
                Reserve Tickets
              </button>
            </Card>
          </div>
        </div>
      </PageContainer>

      {/* Sticky Bottom Bar - Mobile Only */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 px-4 py-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate mb-1" style={{ color: '#192030' }}>
                {event.title}
              </p>
              {startingPrice != null && (
                <div>
                  <p className="text-lg font-bold" style={{ color: '#192030' }}>
                    {startingPrice === 0 ? 'Free' : formatCurrency(startingPrice, 'NGN')}
                  </p>
                  <p className="text-xs text-gray-500">Starting from</p>
                </div>
              )}
            </div>
            <button
              onClick={handleReserveTickets}
              disabled={!event.ticketTypes || event.ticketTypes.length === 0 || event.ticketTypes.every((tt: any) => (tt.totalQuantity - tt.soldQuantity - tt.reservedQuantity) === 0)}
              className="px-6 py-3.5 text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition flex-shrink-0"
              style={{
                background: 'linear-gradient(90deg, #192030 0%, #C74576 100%)',
              }}
            >
              Get Ticket
            </button>
          </div>
        </div>
      </div>

      <WaitlistJoinModal
        isOpen={waitlistModal.isOpen}
        onClose={() => setWaitlistModal({ isOpen: false })}
        eventId={event?.id || ''}
        eventTitle={event?.title || ''}
        ticketTypeId={waitlistModal.ticketTypeId}
        ticketTypeName={waitlistModal.ticketTypeName}
      />
    </>
  );
}
