import PageContainer from '@/components/ui/PageContainer';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';

export default function DashboardLoading() {
  return (
    <PageContainer>
      <LoadingSkeleton variant="eventCard" count={6} />
    </PageContainer>
  );
}
