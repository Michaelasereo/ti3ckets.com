import Link from 'next/link';
import PageContainer from '@/components/ui/PageContainer';
import Card from '@/components/ui/Card';

const faqs = [
  {
    q: 'How do I buy tickets?',
    a: 'Browse events on our homepage or Events page, select the event you want, choose your ticket type and quantity, and proceed to checkout. You can pay with cards and other methods via Paystack. You’ll receive your tickets by email.',
  },
  {
    q: 'Can I get a refund?',
    a: 'Refunds depend on the event and our Refund Policy. If an event is cancelled or postponed, you may be eligible. Check our Refund Policy page for details and how to request a refund.',
  },
  {
    q: 'I didn’t receive my tickets. What should I do?',
    a: 'Check your spam folder first. If you still don’t see them, go to My Tickets in your account or use the link in your order confirmation email. You can also contact Support with your order number.',
  },
  {
    q: 'How do I transfer a ticket to someone else?',
    a: 'From My Tickets, select the ticket and use the Transfer option. Enter the recipient’s email. They’ll receive the ticket and it will be reassigned to them.',
  },
  {
    q: 'How do I sell tickets as an organizer?',
    a: 'Sign up or log in, then go to Sell Tickets or Dashboard. Create an event, set ticket types and prices, and publish. You can manage orders, check-in, and promo codes from your dashboard.',
  },
  {
    q: 'What payment methods are accepted?',
    a: 'We accept card payments and other methods provided by Paystack, including mobile money where available. All payments are processed securely.',
  },
  {
    q: 'How does the waitlist work?',
    a: 'If an event is sold out, you can join the waitlist. If tickets become available, we may notify you. Event organizers can manage their waitlist from the event dashboard.',
  },
  {
    q: 'Can I use a promo code?',
    a: 'Yes. Enter your promo code at checkout. Promo codes are set by event organizers; terms (e.g. discount amount, expiry) vary by code.',
  },
];

export default function FAQsPage() {
  return (
    <PageContainer py="lg">
      <Link
        href="/"
        className="inline-block text-primary-800 hover:text-primary-600 mb-6 text-[15px]"
      >
        ← Back to home
      </Link>

      <h1 className="text-3xl font-bold text-primary-900 mb-2">Frequently Asked Questions</h1>
      <p className="text-gray-600 mb-8">
        Find answers to common questions about tickets, orders, and events.
      </p>

      <div className="max-w-3xl space-y-4">
        {faqs.map(({ q, a }, i) => (
          <Card key={i} padding="lg" hover={false}>
            <h2 className="text-lg font-semibold text-primary-900 mb-2">{q}</h2>
            <p className="text-gray-600">{a}</p>
          </Card>
        ))}
      </div>

      <p className="mt-8 text-gray-600">
        Still need help?{' '}
        <Link href="/support" className="text-primary-800 hover:text-primary-600 font-medium">
          Contact Support
        </Link>
      </p>
    </PageContainer>
  );
}
