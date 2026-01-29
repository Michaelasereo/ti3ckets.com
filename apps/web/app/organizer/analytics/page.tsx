'use client';

import PageContainer from '@/components/ui/PageContainer';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import { useProfileCheck } from '@/hooks/useProfileCheck';
import AnalyticsOverview from '@/components/organizer/AnalyticsOverview';

export default function AnalyticsPage() {
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
      <h1 className="text-3xl font-bold text-primary-900 mb-8">Analytics Overview</h1>
      <AnalyticsOverview showTitle={false} />
    </PageContainer>
  );
}
