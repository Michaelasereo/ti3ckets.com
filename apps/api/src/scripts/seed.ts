import dotenv from 'dotenv';
import path from 'path';

// Load .env file explicitly from apps/api directory
dotenv.config({ path: path.join(__dirname, '../.env') });

import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { generateOrderNumber, generateTicketNumber } from '@getiickets/shared';

// Use DATABASE_URL for seed scripts
const prisma = new PrismaClient();

// Helper function to create a booking (order + tickets)
async function createBooking(
  prisma: PrismaClient,
  event: any,
  ticketType: any,
  quantity: number,
  customerData: { email: string; name: string; phone: string },
  userId?: string, // Optional: if booking is for a registered user
  daysAgo: number = 0
) {
  const now = new Date();
  const orderDate = new Date(now);
  orderDate.setDate(orderDate.getDate() - daysAgo);
  orderDate.setHours(12 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60), 0, 0);

  // Calculate pricing
  const subtotal = Number(ticketType.price) * quantity;
  const totalAmount = subtotal; // For seed data, skip fees for simplicity

  // Create order with PAID status
  const order = await prisma.order.create({
    data: {
      eventId: event.id,
      userId: userId || null, // Link to user if provided
      customerEmail: customerData.email,
      customerName: customerData.name,
      customerPhone: customerData.phone,
      orderNumber: generateOrderNumber(),
      totalAmount,
      currency: ticketType.currency,
      status: 'PAID',
      paymentStatus: 'success',
      paidAt: orderDate,
      createdAt: orderDate,
      updatedAt: orderDate,
    },
  });

  // Create tickets (one per quantity unit)
  const tickets = [];
  for (let i = 0; i < quantity; i++) {
    const ticketNumber = generateTicketNumber();
    const ticket = await prisma.ticket.create({
      data: {
        orderId: order.id,
        eventId: event.id,
        ticketTypeId: ticketType.id,
        ticketNumber,
        qrCode: JSON.stringify({ ticketNumber, orderId: order.id, eventId: event.id }),
        attendeeName: customerData.name,
        attendeeEmail: customerData.email,
        attendeePhone: customerData.phone,
        status: 'VALID',
        createdAt: orderDate,
        updatedAt: orderDate,
      },
    });
    tickets.push(ticket);
  }

  // Update ticket type sold quantity
  await prisma.ticketType.update({
    where: { id: ticketType.id },
    data: {
      soldQuantity: {
        increment: quantity,
      },
    },
  });

  return { order, tickets };
}

async function main() {
  // Seed script intentionally disabled to avoid creating test data.
  // This repo is configured to run without synthetic users/events/orders.
  // If you need to initialize reference data, create a dedicated minimal seed.
  console.log('Seed disabled: no test data will be created.');
  return;

  const hashedPassword = await bcrypt.hash('password123', 10);
  const demoOrganizerEmail = 'organizer.demo+4821@example.com';
  const demoOrganizerPasswordHash = await bcrypt.hash('DemoOrg#4821', 10);
  const demoOrganizerId = 'demo-organizer-user';

  // ============================================
  // DEMO ORGANIZER: Fixed ID for DEMO_MODE bypass
  // ============================================
  console.log('👤 Creating demo organizer user (for DEMO_MODE)...');

  const existingDemoByEmail: any = await prisma.user.findUnique({
    where: { email: demoOrganizerEmail },
    select: { id: true },
  });

  // If user exists but has a different ID, recreate so the ID stays stable.
  if (existingDemoByEmail) {
    const existingId = existingDemoByEmail.id;
    if (existingId !== demoOrganizerId) {
      console.warn(
        `⚠️ Demo organizer email already exists with a different id (${existingId}). Recreating with id=${demoOrganizerId}...`
      );
      await prisma.user.delete({ where: { email: demoOrganizerEmail } });
    }
  }

  const demoOrganizer = await prisma.user.upsert({
    where: { email: demoOrganizerEmail },
    update: {
      name: 'Demo Organizer',
      passwordHash: demoOrganizerPasswordHash,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
    create: {
      id: demoOrganizerId,
      email: demoOrganizerEmail,
      passwordHash: demoOrganizerPasswordHash,
      name: 'Demo Organizer',
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  // Grant BUYER + ORGANIZER roles
  await prisma.userRole.upsert({
    where: { userId_role: { userId: demoOrganizer.id, role: Role.BUYER } },
    update: {},
    create: { userId: demoOrganizer.id, role: Role.BUYER },
  });
  await prisma.userRole.upsert({
    where: { userId_role: { userId: demoOrganizer.id, role: Role.ORGANIZER } },
    update: {},
    create: { userId: demoOrganizer.id, role: Role.ORGANIZER },
  });

  // Ensure OrganizerProfile exists and is VERIFIED (dev convenience)
  await prisma.organizerProfile.upsert({
    where: { userId: demoOrganizer.id },
    update: {
      businessName: 'Demo Organizer Co.',
      businessCity: 'Lagos',
      businessCountry: 'Nigeria',
      verificationStatus: 'VERIFIED',
      verifiedAt: new Date(),
      onboardingCompleted: true,
    },
    create: {
      userId: demoOrganizer.id,
      businessName: 'Demo Organizer Co.',
      businessType: 'ENTERTAINMENT',
      businessAddress: '123 Demo Street',
      businessCity: 'Lagos',
      businessCountry: 'Nigeria',
      taxId: 'DEMO-TAX-4821',
      verificationStatus: 'VERIFIED',
      verifiedAt: new Date(),
      onboardingCompleted: true,
    },
  });

  console.log('✅ Demo organizer ready');
  console.log(`   - id: ${demoOrganizer.id}`);
  console.log(`   - email: ${demoOrganizerEmail}`);
  console.log('   - password: DemoOrg#4821\n');

  // ============================================
  // USER 1: Dual-role user (BUYER + ORGANIZER)
  // ============================================
  // This is the primary test user - demonstrates unified auth
  console.log('👤 Creating dual-role user (primary test account)...');
  
  const dualRoleUser = await prisma.user.upsert({
    where: { email: 'user@getiickets.com' },
    update: {},
    create: {
      email: 'user@getiickets.com',
      passwordHash: hashedPassword,
      name: 'John Organizer',
      phone: '+2348012345678',
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  // Grant BUYER role (default for all users)
  await prisma.userRole.upsert({
    where: {
      userId_role: {
        userId: dualRoleUser.id,
        role: Role.BUYER,
      },
    },
    update: {},
    create: {
      userId: dualRoleUser.id,
      role: Role.BUYER,
    },
  });

  // Grant ORGANIZER role (user requested it)
  await prisma.userRole.upsert({
    where: {
      userId_role: {
        userId: dualRoleUser.id,
        role: Role.ORGANIZER,
      },
    },
    update: {},
    create: {
      userId: dualRoleUser.id,
      role: Role.ORGANIZER,
    },
  });

  // Create complete BuyerProfile
  await prisma.buyerProfile.upsert({
    where: { userId: dualRoleUser.id },
    update: {},
    create: {
      userId: dualRoleUser.id,
      firstName: 'John',
      lastName: 'Organizer',
      dateOfBirth: new Date('1990-01-15'),
      address: '123 Main Street',
      city: 'Lagos',
      country: 'Nigeria',
      preferredPaymentMethod: 'card',
    },
  });

  // Create complete OrganizerProfile
  await prisma.organizerProfile.upsert({
    where: { userId: dualRoleUser.id },
    update: {},
    create: {
      userId: dualRoleUser.id,
      businessName: 'John\'s Event Management',
      businessType: 'ENTERTAINMENT',
      businessAddress: '456 Business Avenue',
      businessCity: 'Lagos',
      businessCountry: 'Nigeria',
      taxId: 'TAX-123456',
      verificationStatus: 'VERIFIED',
      verifiedAt: new Date(),
      onboardingCompleted: true,
    },
  });

  console.log('✅ Created dual-role user:', dualRoleUser.email);
  console.log('   - Has BUYER role');
  console.log('   - Has ORGANIZER role');
  console.log('   - Complete buyer profile');
  console.log('   - Complete organizer profile\n');

  // ============================================
  // USER 2: Buyer-only user
  // ============================================
  console.log('👤 Creating buyer-only user...');
  
  const buyerUser = await prisma.user.upsert({
    where: { email: 'buyer@getiickets.com' },
    update: {},
    create: {
      email: 'buyer@getiickets.com',
      passwordHash: hashedPassword,
      name: 'Jane Buyer',
      phone: '+2348098765433',
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  // Grant BUYER role only
  await prisma.userRole.upsert({
    where: {
      userId_role: {
        userId: buyerUser.id,
        role: Role.BUYER,
      },
    },
    update: {},
    create: {
      userId: buyerUser.id,
      role: Role.BUYER,
    },
  });

  // Create complete BuyerProfile
  await prisma.buyerProfile.upsert({
    where: { userId: buyerUser.id },
    update: {},
    create: {
      userId: buyerUser.id,
      firstName: 'Jane',
      lastName: 'Buyer',
      dateOfBirth: new Date('1995-05-20'),
      address: '789 Buyer Street',
      city: 'Abuja',
      country: 'Nigeria',
      preferredPaymentMethod: 'bank_transfer',
    },
  });

  console.log('✅ Created buyer-only user:', buyerUser.email);
  console.log('   - Has BUYER role only');
  console.log('   - Complete buyer profile\n');

  // ============================================
  // USER 3: Organizer-only user
  // ============================================
  console.log('👤 Creating organizer-only user...');
  
  const organizerUser = await prisma.user.upsert({
    where: { email: 'organizer@getiickets.com' },
    update: {},
    create: {
      email: 'organizer@getiickets.com',
      passwordHash: hashedPassword,
      name: 'Event Organizer Co.',
      phone: '+2348011111111',
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  // Grant ORGANIZER role only (no BUYER role - for testing edge case)
  await prisma.userRole.upsert({
    where: {
      userId_role: {
        userId: organizerUser.id,
        role: Role.ORGANIZER,
      },
    },
    update: {},
    create: {
      userId: organizerUser.id,
      role: Role.ORGANIZER,
    },
  });

  // Create complete OrganizerProfile
  await prisma.organizerProfile.upsert({
    where: { userId: organizerUser.id },
    update: {},
    create: {
      userId: organizerUser.id,
      businessName: 'Event Organizer Co.',
      businessType: 'ENTERTAINMENT',
      businessAddress: '100 Organizer Boulevard',
      businessCity: 'Lagos',
      businessCountry: 'Nigeria',
      taxId: 'TAX-789012',
      verificationStatus: 'VERIFIED',
      verifiedAt: new Date(),
      onboardingCompleted: true,
    },
  });

  console.log('✅ Created organizer-only user:', organizerUser.email);
  console.log('   - Has ORGANIZER role only');
  console.log('   - Complete organizer profile\n');

  // ============================================
  // EVENTS: Create events by organizer users
  // ============================================
  console.log('📅 Creating events...\n');

  const now = new Date();
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const twoWeeks = new Date(now);
  twoWeeks.setDate(twoWeeks.getDate() + 14);

  // Demo organizer event (used for demo-mode payout testing)
  const demoEventStart = new Date(twoWeeks);
  demoEventStart.setHours(19, 0, 0, 0);
  const demoEventEnd = new Date(twoWeeks);
  demoEventEnd.setHours(23, 0, 0, 0);
  const demoEventSaleEnd = new Date(twoWeeks);
  demoEventSaleEnd.setHours(18, 0, 0, 0);

  const demoEvent = await prisma.event.upsert({
    where: { slug: 'demo-payout-night-2026' },
    update: {},
    create: {
      title: 'Demo Payout Night 2026',
      slug: 'demo-payout-night-2026',
      description: 'Seeded event used to simulate organizer payouts in dev/demo mode.',
      category: 'concert',
      organizerId: demoOrganizer.id,
      venueName: 'Demo Arena',
      venueAddress: 'Demo Street, Lagos',
      city: 'Lagos',
      country: 'Nigeria',
      isVirtual: false,
      startDateTime: demoEventStart,
      endDateTime: demoEventEnd,
      timezone: 'Africa/Lagos',
      saleStart: new Date(now),
      saleEnd: demoEventSaleEnd,
      isSeated: false,
      status: 'PUBLISHED',
      imageUrl: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800',
      bannerUrl: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200',
      ticketTypes: {
        create: [
          {
            name: 'General Admission',
            description: 'General entry (seeded).',
            price: 20000,
            currency: 'NGN',
            totalQuantity: 200,
            soldQuantity: 0,
            reservedQuantity: 0,
            maxPerOrder: 4,
            minPerOrder: 1,
          },
        ],
      },
    },
    include: { ticketTypes: true },
  });

  console.log('✅ Created demo payout event:', demoEvent.title);
  console.log('   - Organizer: demo organizer (organizer.demo+4821@example.com)');
  console.log('   - Ticket Types: 1\n');

  // Event 1: Created by dual-role user (as organizer)
  const event1Start = new Date(nextWeek);
  event1Start.setHours(18, 0, 0, 0);
  const event1End = new Date(nextWeek);
  event1End.setHours(23, 30, 0, 0);
  const event1SaleEnd = new Date(nextWeek);
  event1SaleEnd.setHours(17, 0, 0, 0);

  const event1 = await prisma.event.upsert({
    where: { slug: 'afrobeat-fusion-festival-2026' },
    update: {},
    create: {
      title: 'Afrobeat Fusion Festival 2026',
      slug: 'afrobeat-fusion-festival-2026',
      description: `Experience the ultimate celebration of African music at the Afrobeat Fusion Festival 2026! This spectacular event brings together the biggest names in Afrobeat, Afropop, and contemporary African music for an unforgettable night of rhythm, dance, and cultural celebration.

Headlining this year's festival are international superstars including Burna Boy, Wizkid, Davido, and Tiwa Savage, along with rising stars like Rema, Ayra Starr, and Asake. The festival features multiple stages showcasing diverse sounds from across the continent, from the classic Fela Kuti-inspired beats to modern fusion sounds.

What to Expect:
• Live performances from 20+ artists across 3 stages
• Premium sound system and state-of-the-art lighting
• Food vendors offering authentic African cuisine
• VIP areas with exclusive access to artist meet & greets
• Merchandise stalls with official festival gear
• Safe and secure venue with professional security

This is more than just a concert - it's a cultural experience that celebrates the rich musical heritage of Africa while embracing the future of the genre. Don't miss out on what promises to be the biggest Afrobeat event of the year!

Gates open at 5:00 PM. Early arrival recommended for best parking and seating options.`,
      category: 'concert',
      organizerId: dualRoleUser.id, // Created by dual-role user
      venueName: 'Eko Convention Centre',
      venueAddress: 'Victoria Island, Lagos',
      city: 'Lagos',
      country: 'Nigeria',
      isVirtual: false,
      startDateTime: event1Start,
      endDateTime: event1End,
      timezone: 'Africa/Lagos',
      saleStart: new Date(now),
      saleEnd: event1SaleEnd,
      isSeated: false,
      status: 'PUBLISHED',
      imageUrl: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800',
      bannerUrl: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200',
      ticketTypes: {
        create: [
          {
            name: 'Early Bird General',
            description: 'Limited early bird pricing - get your tickets before prices increase! Perfect for music lovers who want to experience the festival at the best price.',
            price: 3000,
            currency: 'NGN',
            totalQuantity: 200,
            soldQuantity: 0,
            reservedQuantity: 0,
            maxPerOrder: 4,
            minPerOrder: 1,
          },
          {
            name: 'General Admission',
            description: 'Standard festival access with entry to all general areas and stages. Includes access to food vendors and merchandise areas.',
            price: 5000,
            currency: 'NGN',
            totalQuantity: 500,
            soldQuantity: 0,
            reservedQuantity: 0,
            maxPerOrder: 4,
            minPerOrder: 1,
          },
          {
            name: 'VIP',
            description: 'VIP experience includes priority entry, access to exclusive VIP viewing areas near the stage, complimentary drinks, VIP restrooms, and a dedicated VIP parking area.',
            price: 15000,
            currency: 'NGN',
            totalQuantity: 100,
            soldQuantity: 0,
            reservedQuantity: 0,
            maxPerOrder: 4,
            minPerOrder: 1,
          },
          {
            name: 'VVIP',
            description: 'The ultimate festival experience! Includes all VIP benefits plus front-row stage access, artist meet & greet opportunities, premium catering, VIP lounge access, and exclusive merchandise package.',
            price: 25000,
            currency: 'NGN',
            totalQuantity: 50,
            soldQuantity: 0,
            reservedQuantity: 0,
            maxPerOrder: 2,
            minPerOrder: 1,
          },
        ],
      },
    },
    include: {
      ticketTypes: true,
    },
  });

  console.log('✅ Created event 1:', event1.title);
  console.log('   - Organizer: dual-role user (user@getiickets.com)');
  console.log('   - Ticket Types: 4\n');

  // Event 2: Created by organizer-only user
  const event2Start = new Date(twoWeeks);
  event2Start.setHours(9, 0, 0, 0);
  const event2End = new Date(twoWeeks);
  event2End.setHours(18, 0, 0, 0);
  const event2SaleEnd = new Date(twoWeeks);
  event2SaleEnd.setHours(8, 0, 0, 0);

  const event2 = await prisma.event.upsert({
    where: { slug: 'tech-innovation-summit-2026' },
    update: {},
    create: {
      title: 'Tech Innovation Summit 2026',
      slug: 'tech-innovation-summit-2026',
      description: `Join Africa's premier technology conference - the Tech Innovation Summit 2026! This two-day event brings together industry leaders, entrepreneurs, developers, and innovators to explore the latest trends, share knowledge, and build the future of technology in Africa.

Conference Highlights:
• Keynote presentations from tech industry giants including Google, Microsoft, and local unicorns
• 50+ breakout sessions covering AI, blockchain, fintech, cybersecurity, and more
• Hands-on workshops and coding bootcamps
• Startup pitch competition with ₦5M prize pool
• Networking sessions with investors and industry leaders
• Tech expo showcasing latest innovations and products
• Career fair connecting talent with top tech companies

Featured Speakers:
Our speaker lineup includes CEOs from leading African tech companies, international tech executives, successful entrepreneurs, and thought leaders shaping the future of technology. Learn from their experiences, insights, and predictions for the next decade of tech innovation.

Who Should Attend:
• Software developers and engineers
• Product managers and designers
• Entrepreneurs and startup founders
• Tech investors and VCs
• Students and recent graduates
• Business leaders exploring digital transformation
• Anyone passionate about technology and innovation

What's Included:
• Access to all conference sessions and keynotes
• Conference materials and digital resources
• Networking breakfast, lunch, and refreshments
• Access to tech expo and career fair
• Digital certificate of attendance

Don't miss this opportunity to connect with the African tech ecosystem, learn from the best, and be part of shaping the continent's technological future!`,
      category: 'conference',
      organizerId: organizerUser.id, // Created by organizer-only user
      venueName: 'International Conference Centre',
      venueAddress: 'Central Business District, Abuja',
      city: 'Abuja',
      country: 'Nigeria',
      isVirtual: false,
      startDateTime: event2Start,
      endDateTime: event2End,
      timezone: 'Africa/Lagos',
      saleStart: new Date(now),
      saleEnd: event2SaleEnd,
      isSeated: false,
      status: 'PUBLISHED',
      imageUrl: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800',
      bannerUrl: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=1200',
      ticketTypes: {
        create: [
          {
            name: 'Student',
            description: 'Discounted ticket for students with valid student ID. Includes access to all sessions, networking events, and conference materials. Student ID required at check-in.',
            price: 5000,
            currency: 'NGN',
            totalQuantity: 100,
            soldQuantity: 0,
            reservedQuantity: 0,
            maxPerOrder: 2,
            minPerOrder: 1,
          },
          {
            name: 'Early Bird',
            description: 'Early bird pricing available for a limited time! Save significantly on regular ticket prices. Includes full conference access, meals, and all networking events.',
            price: 10000,
            currency: 'NGN',
            totalQuantity: 200,
            soldQuantity: 0,
            reservedQuantity: 0,
            maxPerOrder: 2,
            minPerOrder: 1,
          },
          {
            name: 'Regular',
            description: 'Standard conference ticket with access to all sessions, keynotes, workshops, tech expo, career fair, and networking events. Includes breakfast, lunch, and refreshments.',
            price: 15000,
            currency: 'NGN',
            totalQuantity: 300,
            soldQuantity: 0,
            reservedQuantity: 0,
            maxPerOrder: 4,
            minPerOrder: 1,
          },
          {
            name: 'Premium',
            description: 'Premium experience includes all regular benefits plus VIP seating at keynotes, exclusive premium networking dinner, priority access to workshops, premium swag bag, and post-conference digital resources library.',
            price: 25000,
            currency: 'NGN',
            totalQuantity: 50,
            soldQuantity: 0,
            reservedQuantity: 0,
            maxPerOrder: 4,
            minPerOrder: 1,
          },
        ],
      },
    },
    include: {
      ticketTypes: true,
    },
  });

  console.log('✅ Created event 2:', event2.title);
  console.log('   - Organizer: organizer-only user (organizer@getiickets.com)');
  console.log('   - Ticket Types: 4\n');

  // ============================================
  // BOOKINGS: Create bookings by buyer users
  // ============================================
  console.log('🎫 Creating bookings...\n');

  // Bookings for Event 1 (Afrobeat Festival)
  console.log('📦 Event 1 bookings (Afrobeat Fusion Festival):');
  const event1Bookings = [
    // Dual-role user purchases tickets (as buyer)
    { ticketType: event1.ticketTypes[0], quantity: 2, customer: { email: dualRoleUser.email!, name: dualRoleUser.name!, phone: dualRoleUser.phone! }, userId: dualRoleUser.id, daysAgo: 5 },
    { ticketType: event1.ticketTypes[1], quantity: 1, customer: { email: dualRoleUser.email!, name: dualRoleUser.name!, phone: dualRoleUser.phone! }, userId: dualRoleUser.id, daysAgo: 3 },
    
    // Buyer-only user purchases tickets
    { ticketType: event1.ticketTypes[1], quantity: 3, customer: { email: buyerUser.email!, name: buyerUser.name!, phone: buyerUser.phone! }, userId: buyerUser.id, daysAgo: 4 },
    { ticketType: event1.ticketTypes[2], quantity: 2, customer: { email: buyerUser.email!, name: buyerUser.name!, phone: buyerUser.phone! }, userId: buyerUser.id, daysAgo: 2 },
    
    // Guest bookings (no user account)
    { ticketType: event1.ticketTypes[2], quantity: 1, customer: { email: 'sarah.johnson@example.com', name: 'Sarah Johnson', phone: '+2348044444444' }, daysAgo: 7 },
    { ticketType: event1.ticketTypes[3], quantity: 1, customer: { email: 'david.williams@example.com', name: 'David Williams', phone: '+2348055555555' }, daysAgo: 6 },
    { ticketType: event1.ticketTypes[1], quantity: 4, customer: { email: 'robert.miller@example.com', name: 'Robert Miller', phone: '+2348077777777' }, daysAgo: 1 },
  ];

  for (const booking of event1Bookings) {
    await createBooking(
      prisma,
      event1,
      booking.ticketType,
      booking.quantity,
      booking.customer,
      booking.userId,
      booking.daysAgo
    );
    const userLabel = booking.userId ? `(user: ${booking.customer.email})` : '(guest)';
    console.log(`  ✅ ${booking.quantity}x ${booking.ticketType.name} for ${booking.customer.name} ${userLabel}`);
  }

  // Bookings for Demo Event (used for payout testing) - ensure some are older than hold period (> 7 days)
  console.log('\n📦 Demo payout event bookings (Demo Payout Night 2026):');
  const demoBookings = [
    // 2 tickets at ₦20,000 each -> ₦40,000 gross, dated 12 days ago => contributes to available balance
    { ticketType: demoEvent.ticketTypes[0], quantity: 2, customer: { email: buyerUser.email!, name: buyerUser.name!, phone: buyerUser.phone! }, userId: buyerUser.id, daysAgo: 12 },
    // 1 guest ticket 9 days ago
    { ticketType: demoEvent.ticketTypes[0], quantity: 1, customer: { email: 'payout.tester@example.com', name: 'Payout Tester', phone: '+2348011112222' }, daysAgo: 9 },
  ];

  for (const booking of demoBookings) {
    await createBooking(
      prisma,
      demoEvent,
      booking.ticketType,
      booking.quantity,
      booking.customer,
      booking.userId,
      booking.daysAgo
    );
    const userLabel = booking.userId ? `(user: ${booking.customer.email})` : '(guest)';
    console.log(`  ✅ ${booking.quantity}x ${booking.ticketType.name} for ${booking.customer.name} ${userLabel}`);
  }

  // Bookings for Event 2 (Tech Summit)
  console.log('\n📦 Event 2 bookings (Tech Innovation Summit):');
  const event2Bookings = [
    // Dual-role user purchases tickets (as buyer)
    { ticketType: event2.ticketTypes[1], quantity: 2, customer: { email: dualRoleUser.email!, name: dualRoleUser.name!, phone: dualRoleUser.phone! }, userId: dualRoleUser.id, daysAgo: 6 },
    { ticketType: event2.ticketTypes[2], quantity: 1, customer: { email: dualRoleUser.email!, name: dualRoleUser.name!, phone: dualRoleUser.phone! }, userId: dualRoleUser.id, daysAgo: 3 },
    
    // Buyer-only user purchases tickets
    { ticketType: event2.ticketTypes[0], quantity: 1, customer: { email: buyerUser.email!, name: buyerUser.name!, phone: buyerUser.phone! }, userId: buyerUser.id, daysAgo: 4 },
    { ticketType: event2.ticketTypes[2], quantity: 3, customer: { email: buyerUser.email!, name: buyerUser.name!, phone: buyerUser.phone! }, userId: buyerUser.id, daysAgo: 5 },
    { ticketType: event2.ticketTypes[3], quantity: 1, customer: { email: buyerUser.email!, name: buyerUser.name!, phone: buyerUser.phone! }, userId: buyerUser.id, daysAgo: 2 },
    
    // Guest bookings
    { ticketType: event2.ticketTypes[1], quantity: 1, customer: { email: 'james.thomas@example.com', name: 'James Thomas', phone: '+2348100000000' }, daysAgo: 3 },
    { ticketType: event2.ticketTypes[2], quantity: 2, customer: { email: 'maria.garcia@example.com', name: 'Maria Garcia', phone: '+2348111111111' }, daysAgo: 5 },
  ];

  for (const booking of event2Bookings) {
    await createBooking(
      prisma,
      event2,
      booking.ticketType,
      booking.quantity,
      booking.customer,
      booking.userId,
      booking.daysAgo
    );
    const userLabel = booking.userId ? `(user: ${booking.customer.email})` : '(guest)';
    console.log(`  ✅ ${booking.quantity}x ${booking.ticketType.name} for ${booking.customer.name} ${userLabel}`);
  }

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n🎉 Seed completed successfully!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📋 TEST ACCOUNTS (Password: password123)\n');
  
  console.log('1️⃣  DUAL-ROLE USER (Primary Test Account)');
  console.log('   Email: user@getiickets.com');
  console.log('   Roles: BUYER + ORGANIZER');
  console.log('   Use Case: Test unified auth, role switching, dual-role journey');
  console.log('   - Has purchased tickets (as buyer)');
  console.log('   - Has created events (as organizer)\n');

  console.log('2️⃣  BUYER-ONLY USER');
  console.log('   Email: buyer@getiickets.com');
  console.log('   Roles: BUYER');
  console.log('   Use Case: Test buyer journey, ticket purchasing');
  console.log('   - Has purchased tickets\n');

  console.log('3️⃣  ORGANIZER-ONLY USER');
  console.log('   Email: organizer@getiickets.com');
  console.log('   Roles: ORGANIZER');
  console.log('   Use Case: Test organizer-only journey');
  console.log('   - Has created events\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📅 EVENTS CREATED\n');
  console.log(`1. ${event1.title}`);
  console.log(`   - Slug: ${event1.slug}`);
  console.log(`   - Organizer: ${dualRoleUser.email} (dual-role user)`);
  console.log(`   - Ticket Types: ${event1.ticketTypes.length}`);
  console.log(`   - Bookings: ${event1Bookings.length} orders\n`);

  console.log(`2. ${event2.title}`);
  console.log(`   - Slug: ${event2.slug}`);
  console.log(`   - Organizer: ${organizerUser.email} (organizer-only user)`);
  console.log(`   - Ticket Types: ${event2.ticketTypes.length}`);
  console.log(`   - Bookings: ${event2Bookings.length} orders\n`);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n🎫 BOOKING SUMMARY\n');
  console.log(`Event 1: ${event1Bookings.length} orders`);
  console.log(`Event 2: ${event2Bookings.length} orders`);
  console.log(`Total: ${event1Bookings.length + event2Bookings.length} orders with tickets\n`);

  console.log('💡 TESTING SCENARIOS:');
  console.log('   • Login as dual-role user → Should see role selection');
  console.log('   • Switch roles via header dropdown → Should redirect appropriately');
  console.log('   • Buyer-only user → Direct redirect to buyer dashboard');
  console.log('   • Organizer-only user → Direct redirect to organizer dashboard');
  console.log('   • Incomplete profiles → Should redirect to onboarding\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
