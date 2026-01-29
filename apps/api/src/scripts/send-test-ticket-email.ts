/**
 * Sends a test ticket confirmation email to asereope@gmail.com using a real
 * paid order. If the order has no tickets, they are generated first (QR + PDF).
 * Run from apps/api: npx tsx src/scripts/send-test-ticket-email.ts
 */
import dotenv from 'dotenv';
import path from 'path';

// Load .env from multiple locations (cwd when run from apps/api, then script-relative, then root)
dotenv.config({ path: path.join(process.cwd(), '.env') });
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
const apiDir = path.join(__dirname, '..');
dotenv.config({ path: path.join(apiDir, '.env') });
dotenv.config({ path: path.join(apiDir, '.env.local') });
dotenv.config({ path: path.join(__dirname, '../../../.env') });

if (!process.env.BREVO_API_KEY) {
  console.error('BREVO_API_KEY is not set. Set it in apps/api/.env (or .env.local) or root .env and run again.');
  process.exit(1);
}

import { PrismaClient } from '@prisma/client';
import { BrevoService } from '../services/brevo';
import { TicketService } from '../services/ticket';

const TEST_EMAIL = 'asereope@gmail.com';

async function main() {
  const prisma = new PrismaClient();
  const brevoService = new BrevoService();
  const ticketService = new TicketService();

  // Prefer a paid order that already has tickets with PDFs
  let order = await prisma.order.findFirst({
    where: {
      status: 'PAID',
      tickets: {
        some: { pdfUrl: { not: null } },
      },
    },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          slug: true,
          startDateTime: true,
          endDateTime: true,
          venueName: true,
          venueAddress: true,
          city: true,
          imageUrl: true,
          bannerUrl: true,
        },
      },
      tickets: {
        include: {
          ticketType: {
            select: {
              id: true,
              name: true,
              description: true,
              price: true,
              currency: true,
            },
          },
        },
      },
    },
  });

  // Otherwise find any PAID order that has a reservation (so we can generate tickets)
  if (!order) {
    const reservation = await prisma.inventoryReservation.findFirst({
      where: { orderId: { not: null }, ticketTypeId: { not: null } },
    });
    if (!reservation?.orderId) {
      console.log('No paid order found. Sending test email with sample ticket details (no PDF attachments).');
      const mockOrder = {
        orderNumber: 'ORD-TEST-' + Date.now(),
        totalAmount: 5000,
        currency: 'NGN',
        customerName: 'Test Customer',
        customerEmail: TEST_EMAIL,
        tickets: [
          { ticketNumber: 'TKT-TEST-001', pdfUrl: null, ticketType: { name: 'General Admission' } },
          { ticketNumber: 'TKT-TEST-002', pdfUrl: null, ticketType: { name: 'General Admission' } },
        ],
      };
      const mockEvent = {
        title: 'Sample Event – Test',
        startDateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        venueName: 'Test Venue',
        venueAddress: '123 Test Street',
        city: 'Lagos',
      };
      await brevoService.sendTicketConfirmation(TEST_EMAIL, mockOrder as any, mockEvent as any);
      console.log(`Done. Check ${TEST_EMAIL} (and spam) for the test email.`);
      await prisma.$disconnect();
      return;
    }

    const paidOrder = await prisma.order.findUnique({
      where: { id: reservation.orderId, status: 'PAID' },
      include: { event: true, tickets: true },
    });
    if (!paidOrder) {
      console.error('Reservation points to an order that is not PAID. Use a completed paid order.');
      process.exit(1);
    }

    if (paidOrder.tickets.length === 0) {
      console.log(`Order ${paidOrder.orderNumber} has no tickets. Generating tickets (QR + PDF)...`);
      await ticketService.generateTicketsForOrder(prisma, paidOrder.id);
    }

    const reloaded = await prisma.order.findUnique({
      where: { id: paidOrder.id },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
            startDateTime: true,
            endDateTime: true,
            venueName: true,
            venueAddress: true,
            city: true,
            imageUrl: true,
            bannerUrl: true,
          },
        },
        tickets: {
          include: {
            ticketType: {
              select: {
                id: true,
                name: true,
                description: true,
                price: true,
                currency: true,
              },
            },
          },
        },
      },
    });
    if (!reloaded) {
      console.error('Order not found after generating tickets.');
      process.exit(1);
    }
    order = reloaded;
  }

  if (!order) {
    process.exit(1);
  }

  console.log(
    `Using order ${order.orderNumber} (${order.tickets.length} ticket(s)) for event: ${order.event.title}`
  );
  console.log(`Sending ticket confirmation email to ${TEST_EMAIL}...`);

  await brevoService.sendTicketConfirmation(TEST_EMAIL, order, order.event);

  console.log(`Done. Check ${TEST_EMAIL} (and spam) for the email with ticket details and PDF attachments.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
