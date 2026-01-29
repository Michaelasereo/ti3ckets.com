import { PrismaClient } from '@prisma/client';
import { generateTicketNumber } from '@getiickets/shared';
import QRCode from 'qrcode';
import { S3Service } from './s3';
import { PDFService } from './pdf';

const s3Service = new S3Service();
const pdfService = new PDFService();

export class TicketService {
  async generateTicketsForOrder(prisma: PrismaClient, orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        event: true,
        tickets: true,
      },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // Get reservation to find ticket type and quantity
    const reservation = await prisma.inventoryReservation.findFirst({
      where: { orderId: order.id },
    });

    if (!reservation || !reservation.ticketTypeId) {
      throw new Error('Reservation not found for order');
    }

    // Get ticket type details
    const ticketType = await prisma.ticketType.findUnique({
      where: { id: reservation.ticketTypeId },
    });

    if (!ticketType) {
      throw new Error('Ticket type not found');
    }

    const quantity = reservation.quantity;

    // Get attendee info from order metadata if available
    const orderMetadata = order.metadata as any;
    const attendeeInfo = orderMetadata?.attendeeInfo as Array<{
      ticketTypeId: string;
      quantity: number;
      attendees: Array<{
        firstName: string;
        lastName: string;
        email: string;
        phone?: string;
      }>;
    }> | undefined;

    // Find attendee info for this ticket type
    const ticketTypeAttendeeInfo = attendeeInfo?.find(
      (info) => info.ticketTypeId === ticketType.id
    );

    const tickets = [];

    // Generate tickets based on quantity
    for (let i = 0; i < quantity; i++) {
      const ticketNumber = generateTicketNumber();
      
      // Get attendee info for this specific ticket (if available)
      const attendee = ticketTypeAttendeeInfo?.attendees[i];
      const attendeeName = attendee
        ? `${attendee.firstName} ${attendee.lastName}`.trim()
        : order.customerName || order.customerEmail;
      const attendeeEmail = attendee?.email || order.customerEmail;
      const attendeePhone = attendee?.phone || order.customerPhone;
      
      // Generate QR code
      const qrCodeData = JSON.stringify({
        ticketNumber,
        orderId: order.id,
        eventId: order.eventId,
        orderNumber: order.orderNumber,
      });

      const qrCodeBuffer = await QRCode.toBuffer(qrCodeData, {
        errorCorrectionLevel: 'H',
        type: 'png',
        width: 300,
      });

      // Upload QR code to S3
      const qrCodeKey = `tickets/${order.id}/${ticketNumber}-qr.png`;
      const qrCodeUrl = await s3Service.uploadFile(qrCodeKey, qrCodeBuffer, 'image/png');

      // Generate PDF ticket (pass QR code buffer directly to avoid re-downloading)
      const pdfBuffer = await pdfService.generateTicketPDF({
        ticketNumber,
        orderNumber: order.orderNumber,
        event: order.event,
        ticketType,
        customerName: attendeeName,
        qrCodeUrl,
        qrCodeBuffer, // Pass buffer directly for better performance
      });

      // Upload PDF to S3
      const pdfKey = `tickets/${order.id}/${ticketNumber}.pdf`;
      const pdfUrl = await s3Service.uploadFile(pdfKey, pdfBuffer, 'application/pdf');

      // Create ticket in database
      const ticket = await prisma.ticket.create({
        data: {
          orderId: order.id,
          eventId: order.eventId,
          ticketTypeId: ticketType.id,
          ticketNumber,
          qrCode: qrCodeData,
          qrCodeUrl,
          pdfUrl,
          attendeeName,
          attendeeEmail,
          attendeePhone,
          status: 'VALID',
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
        reservedQuantity: {
          decrement: quantity,
        },
      },
    });

    // Clear inventory cache
    // await redis.del(`ticket:${ticketType.id}:available`);

    return tickets.length === 1 ? tickets[0] : tickets;
  }
}
