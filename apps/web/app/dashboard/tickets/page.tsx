'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TicketCard from '@/components/tickets/TicketCard';
import PageContainer from '@/components/ui/PageContainer';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import { useProfileCheck } from '@/hooks/useProfileCheck';

export default function MyTicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { loading: profileLoading } = useProfileCheck('buyer');

  useEffect(() => {
    if (!profileLoading) {
      fetchTickets();
    }
  }, [profileLoading]);

  const fetchTickets = async () => {
    try {
      const { usersApi } = await import('@/lib/api');
      const response = await usersApi.getTickets();
      if (response.data.success) {
        setTickets(response.data.data || []);
      } else {
        console.error('Failed to fetch tickets:', response.data.error);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  if (profileLoading || loading) {
    return (
      <PageContainer>
        <LoadingSkeleton variant="eventCard" count={6} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <h1 className="text-3xl font-bold text-primary-900 mb-8">My Tickets</h1>

      {tickets.length === 0 ? (
        <EmptyState
          description="You don't have any tickets yet."
          actionLabel="Browse Events"
          actionHref="/events"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
