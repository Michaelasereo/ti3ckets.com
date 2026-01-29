'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import EventGrid from '@/components/events/EventGrid';
import CityFilter from '@/components/filters/CityFilter';
import CategoryFilter from '@/components/filters/CategoryFilter';
import PageContainer from '@/components/ui/PageContainer';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';

export default function EventsPage() {
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const category = searchParams.get('category') || undefined;
  const city = searchParams.get('city') || undefined;
  const searchQuery = searchParams.get('q') || undefined;

  const fetchEvents = useCallback(async (backgroundRefresh = false) => {
    if (!backgroundRefresh) setLoading(true);
    try {
      const { eventsApi } = await import('@/lib/api');
      let response;

      if (searchQuery) {
        response = await eventsApi.search(searchQuery);
        setEvents(response.data.data || []);
      } else {
        response = await eventsApi.list({ category, city });
        if (response.data.success) {
          setEvents(response.data.data || []);
          setPagination((prev) => response.data.pagination || prev);
        } else {
          setEvents([]);
        }
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      if (!backgroundRefresh) setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [category, city, searchQuery]);

  // Initial fetch on mount and when filters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchEvents();
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [fetchEvents]);

  // Refetch when window regains focus so new/published events show without full refresh
  useEffect(() => {
    const onFocus = () => fetchEvents(true);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchEvents]);

  // Poll every 30s so list updates in real time when organizers publish (no manual refresh)
  useEffect(() => {
    const intervalMs = 30 * 1000;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      intervalId = setInterval(() => fetchEvents(true), intervalMs);
    };
    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    startPolling();

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        stopPolling();
      } else {
        fetchEvents(true);
        startPolling();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [fetchEvents]);

  return (
    <PageContainer>
      <h1 className="text-3xl font-bold text-primary-900 mb-8">Browse Events</h1>

      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <CategoryFilter />
        <CityFilter />
      </div>

      {loading ? (
        <LoadingSkeleton variant="cardGrid" count={8} />
      ) : events.length === 0 ? (
        <EmptyState
          description="No events found. Try adjusting your filters."
          actionLabel="Browse all events"
          actionHref="/events"
        />
      ) : (
        <>
          <EventGrid events={events} />
          {pagination.totalPages > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => {
                    fetchEvents();
                  }}
                  className={`px-4 py-2.5 rounded-xl font-medium transition ${
                    page === pagination.page
                      ? 'bg-primary-900 text-white'
                      : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </PageContainer>
  );
}
