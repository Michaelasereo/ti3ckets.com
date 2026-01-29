import PageContainer from '@/components/ui/PageContainer';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';

export default function OrganizerLoading() {
  return (
    <PageContainer>
      <LoadingSkeleton variant="eventCard" count={6} />
    </PageContainer>
  );
}
