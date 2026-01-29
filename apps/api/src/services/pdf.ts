import PDFDocument from 'pdfkit';
import axios from 'axios';

interface TicketData {
  ticketNumber: string;
  orderNumber: string;
  event: any;
  ticketType: any;
  customerName: string;
  qrCodeUrl: string;
  qrCodeBuffer?: Buffer; // Optional: pass buffer directly to avoid re-downloading
}

export class PDFService {
  async generateTicketPDF(data: TicketData): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: [400, 600],
          margin: 50,
        });

        const buffers: Buffer[] = [];
        
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });
        doc.on('error', reject);

        // Header
        doc.fontSize(20).text('getiickets', { align: 'center' });
        doc.moveDown();

        // Ticket Number
        doc.fontSize(16).text(`Ticket #${data.ticketNumber}`, { align: 'center' });
        doc.moveDown();

        // Event Details
        doc.fontSize(14).text(data.event.title, { align: 'center' });
        doc.moveDown(0.5);
        
        doc.fontSize(12).text(`Date: ${new Date(data.event.startDateTime).toLocaleDateString('en-NG')}`, { align: 'center' });
        doc.text(`Time: ${new Date(data.event.startDateTime).toLocaleTimeString('en-NG')}`, { align: 'center' });
        doc.text(`Venue: ${data.event.venueName}`, { align: 'center' });
        doc.text(`${data.event.venueAddress}, ${data.event.city}`, { align: 'center' });
        doc.moveDown();

        // Ticket Type
        doc.fontSize(12).text(`Type: ${data.ticketType.name}`, { align: 'center' });
        doc.text(`Price: ₦${Number(data.ticketType.price).toLocaleString()}`, { align: 'center' });
        doc.moveDown();

        // Customer Name
        doc.fontSize(12).text(`Attendee: ${data.customerName}`, { align: 'center' });
        doc.moveDown();

        // Order Number
        doc.fontSize(10).text(`Order: ${data.orderNumber}`, { align: 'center' });
        doc.moveDown();

        // QR Code - Embed actual image
        try {
          let qrCodeImage: Buffer;
          
          // Use buffer if provided, otherwise download from URL
          if (data.qrCodeBuffer) {
            qrCodeImage = data.qrCodeBuffer;
          } else if (data.qrCodeUrl) {
            const response = await axios.get(data.qrCodeUrl, { responseType: 'arraybuffer' });
            qrCodeImage = Buffer.from(response.data);
          } else {
            throw new Error('No QR code data available');
          }

          // Embed QR code image (centered, 150x150 size)
          const qrSize = 150;
          const pageWidth = doc.page.width;
          const qrX = (pageWidth - qrSize) / 2;
          doc.image(qrCodeImage, qrX, doc.y, { width: qrSize, height: qrSize });
          doc.moveDown(2);
          
          doc.fontSize(10).text('(Present this ticket at the venue)', { align: 'center' });
        } catch (error) {
          // Fallback to text if QR code embedding fails
          console.warn('Failed to embed QR code in PDF:', error);
          doc.fontSize(10).text('QR Code', { align: 'center' });
          doc.text('(Present this ticket at the venue)', { align: 'center' });
        }
        doc.moveDown();

        // Footer
        doc.fontSize(8).text('This is your official ticket. Please keep it safe.', { align: 'center' });
        doc.text('For support, contact: support@getiickets.com', { align: 'center' });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}
