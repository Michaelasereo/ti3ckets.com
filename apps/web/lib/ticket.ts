import type { PrismaClient } from '@prisma/client';
import { generateTicketNumber } from '@getiickets/shared';

/** Minimal ticket generation: creates Ticket records with qrCode string only (no S3/PDF). */
export async function generateTicketsForOrder(prisma: PrismaClient, orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { event: true },
  });

  if (!order) throw new Error('Order not found');

  const reservation = await prisma.inventoryReservation.findFirst({
    where: { orderId: order.id },
  });

  if (!reservation?.ticketTypeId) throw new Error('Reservation not found for order');

  const ticketType = await prisma.ticketType.findUnique({
    where: { id: reservation.ticketTypeId },
  });

  if (!ticketType) throw new Error('Ticket type not found');

  const quantity = reservation.quantity;
  const orderMetadata = order.metadata as {
    attendeeInfo?: Array<{
      ticketTypeId: string;
      quantity: number;
      attendees: Array<{
        firstName: string;
        lastName: string;
        email: string;
        phone?: string;
      }>;
    }>;
  } | null;
  const attendeeInfo = orderMetadata?.attendeeInfo?.find(
    (info) => info.ticketTypeId === ticketType.id
  );

  for (let i = 0; i < quantity; i++) {
    const ticketNumber = generateTicketNumber();
    const attendee = attendeeInfo?.attendees[i];
    const attendeeName = attendee
      ? `${attendee.firstName} ${attendee.lastName}`.trim()
      : order.customerName || order.customerEmail;
    const attendeeEmail = attendee?.email || order.customerEmail;
    const attendeePhone = attendee?.phone || order.customerPhone;

    const qrCodeData = JSON.stringify({
      ticketNumber,
      orderId: order.id,
      eventId: order.eventId,
      orderNumber: order.orderNumber,
    });

    await prisma.ticket.create({
      data: {
        orderId: order.id,
        eventId: order.eventId,
        ticketTypeId: ticketType.id,
        ticketNumber,
        qrCode: qrCodeData,
        attendeeName,
        attendeeEmail,
        attendeePhone,
        status: 'VALID',
      },
    });
  }

  await prisma.ticketType.update({
    where: { id: ticketType.id },
    data: {
      soldQuantity: { increment: quantity },
      reservedQuantity: { decrement: quantity },
    },
  });
}
