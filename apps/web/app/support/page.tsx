import Link from 'next/link';
import PageContainer from '@/components/ui/PageContainer';
import Card from '@/components/ui/Card';

export default function SupportPage() {
  return (
    <PageContainer py="lg">
      <Link
        href="/"
        className="inline-block text-primary-800 hover:text-primary-600 mb-6 text-[15px]"
      >
        ← Back to home
      </Link>

      <h1 className="text-3xl font-bold text-primary-900 mb-2">Support</h1>
      <p className="text-gray-600 mb-8">
        Get help with tickets, orders, and events. We’re here to assist you.
      </p>

      <div className="max-w-2xl space-y-6">
        <Card padding="lg">
          <h2 className="text-xl font-semibold text-primary-900 mb-3">Contact us</h2>
          <ul className="space-y-2 text-gray-600">
            <li>
              <strong>Email:</strong>{' '}
              <a
                href="mailto:support@getiickets.com"
                className="text-primary-800 hover:text-primary-600 underline"
              >
                support@getiickets.com
              </a>
            </li>
            <li>
              <strong>Support hours:</strong> Monday – Friday, 9:00 AM – 6:00 PM (WAT)
            </li>
            <li>We aim to respond within 24–48 hours on business days.</li>
          </ul>
        </Card>

        <Card padding="lg">
          <h2 className="text-xl font-semibold text-primary-900 mb-3">Before you contact us</h2>
          <p className="text-gray-600 mb-3">
            Check our <Link href="/faqs" className="text-primary-800 hover:text-primary-600 underline">FAQs</Link> for
            quick answers. For refunds, see our{' '}
            <Link href="/refund-policy" className="text-primary-800 hover:text-primary-600 underline">Refund Policy</Link>.
          </p>
          <p className="text-gray-600">
            When you write, please include your order number or ticket details so we can help you faster.
          </p>
        </Card>
      </div>
    </PageContainer>
  );
}
