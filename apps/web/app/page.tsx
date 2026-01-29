import Hero from '@/components/home/Hero';
import LandingEventGrid from '@/components/home/LandingEventGrid';
import LandingMidSection from '@/components/home/LandingMidSection';
import { prisma } from '@/lib/db';

const HOME_EVENTS_LIMIT = 8;

async function getHomeEvents() {
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
    return events;
  } catch (err) {
    console.error('[HomePage] getHomeEvents failed:', err);
    return [];
  }
}

export default async function HomePage() {
  const initialEvents = await getHomeEvents();
  return (
    <div className="min-h-screen bg-white">
      <Hero />
      <LandingEventGrid initialEvents={initialEvents} />
      <LandingMidSection />
    </div>
  );
}
