'use client';

import PageContainer from '@/components/ui/PageContainer';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import { useProfileCheck } from '@/hooks/useProfileCheck';
import RevenueOverview from '@/components/organizer/RevenueOverview';

export default function RevenuePage() {
  const { loading: profileLoading } = useProfileCheck('organizer');

  if (profileLoading) {
    return (
      <PageContainer>
        <LoadingSkeleton variant="lines" count={6} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <h1 className="text-3xl font-bold text-primary-900 mb-8">Revenue Dashboard</h1>
      <RevenueOverview showTitle={false} />
    </PageContainer>
  );
}
