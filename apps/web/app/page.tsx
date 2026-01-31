import Hero from '@/components/home/Hero';
import LandingEventGrid from '@/components/home/LandingEventGrid';
import LandingMidSection from '@/components/home/LandingMidSection';
import LaunchWaitlistContent from '@/components/waitlist/LaunchWaitlistContent';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const HOME_EVENTS_LIMIT = 8;

/** When true, homepage shows only the launch waitlist; header/footer nav and buttons are disabled. Set NEXT_PUBLIC_LAUNCH_MODE=false to show full site. */
const LAUNCH_MODE = process.env.NEXT_PUBLIC_LAUNCH_MODE !== 'false';

async function getHomeEvents() {
  console.log('[DEBUG] HomePage getHomeEvents: start');
  try {
    const now = new Date();
    const events = await prisma.event.findMany({
      where: {
        status: { in: ['PUBLISHED', 'LIVE'] },
        startDateTime: { gte: now },
      },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        category: true,
        city: true,
        venueName: true,
        startDateTime: true,
        endDateTime: true,
        imageUrl: true,
        bannerUrl: true,
        status: true,
        ticketTypes: {
          select: {
            id: true,
            name: true,
            price: true,
            currency: true,
            totalQuantity: true,
            soldQuantity: true,
          },
        },
        organizer: { select: { id: true, name: true } },
      },
      orderBy: { startDateTime: 'asc' },
      take: HOME_EVENTS_LIMIT,
    });
    console.log('[DEBUG] HomePage getHomeEvents: ok, count=', events.length);
    return events;
  } catch (err) {
    console.error('[DEBUG] HomePage getHomeEvents failed:', err);
    return [];
  }
}

export default async function HomePage() {
  if (LAUNCH_MODE) {
    return <LaunchWaitlistContent showBackToHome={false} />;
  }

  console.log('[DEBUG] HomePage: render start');
  const initialEvents = await getHomeEvents();
  console.log('[DEBUG] HomePage: render, events=', initialEvents.length);
  return (
    <div className="min-h-screen bg-white">
      <Hero />
      <LandingEventGrid initialEvents={initialEvents} />
      <LandingMidSection />
    </div>
  );
}
