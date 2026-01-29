import Link from 'next/link';
import PageContainer from '@/components/ui/PageContainer';
import Card from '@/components/ui/Card';

export default function RefundPolicyPage() {
  return (
    <PageContainer py="lg">
      <Link
        href="/"
        className="inline-block text-primary-800 hover:text-primary-600 mb-6 text-[15px]"
      >
        ← Back to home
      </Link>

      <h1 className="text-3xl font-bold text-primary-900 mb-2">Refund Policy</h1>
      <p className="text-gray-600 mb-8">
        Last updated: {new Date().toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })}
      </p>

      <div className="max-w-3xl space-y-8">
        <Card padding="lg">
          <h2 className="text-xl font-semibold text-primary-900 mb-3">Eligibility</h2>
          <p className="text-gray-600">
            Refunds may be available when an event is cancelled, postponed, or significantly
            changed. Eligibility depends on the event organizer&apos;s policy and the timing of
            your request. Some events or ticket types may be non-refundable as stated at purchase.
          </p>
        </Card>

        <Card padding="lg">
          <h2 className="text-xl font-semibold text-primary-900 mb-3">How to request a refund</h2>
          <p className="text-gray-600">
            To request a refund, contact us through the <Link href="/support" className="text-primary-800 hover:text-primary-600 underline">Support</Link> page
            or email support@getiickets.com with your order number and reason. We will review your
            request and, if eligible, process the refund to the original payment method. The
            organizer may need to approve refunds for certain events.
          </p>
        </Card>

        <Card padding="lg">
          <h2 className="text-xl font-semibold text-primary-900 mb-3">Processing time</h2>
          <p className="text-gray-600">
            Approved refunds are typically processed within 5–10 business days. The time for the
            amount to appear in your account depends on your bank or payment provider and may take
            additional days.
          </p>
        </Card>

        <Card padding="lg">
          <h2 className="text-xl font-semibold text-primary-900 mb-3">Non-refundable</h2>
          <p className="text-gray-600">
            Unless otherwise required by law or the organizer&apos;s policy, the following are
            generally non-refundable: tickets for events that have already occurred, booking or
            processing fees where stated, and tickets for events explicitly sold as
            non-refundable.
          </p>
        </Card>

        <Card padding="lg">
          <h2 className="text-xl font-semibold text-primary-900 mb-3">Contact</h2>
          <p className="text-gray-600">
            For refund-related questions, contact us at{' '}
            <a href="mailto:support@getiickets.com" className="text-primary-800 hover:text-primary-600 underline">
              support@getiickets.com
            </a>
            . Visit our <Link href="/support" className="text-primary-800 hover:text-primary-600 underline">Support</Link> page for more ways to get help.
          </p>
        </Card>
      </div>
    </PageContainer>
  );
}
