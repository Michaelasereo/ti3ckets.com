import Link from 'next/link';
import PageContainer from '@/components/ui/PageContainer';
import Card from '@/components/ui/Card';

export default function TermsPage() {
  return (
    <PageContainer py="lg">
      <Link
        href="/"
        className="inline-block text-primary-800 hover:text-primary-600 mb-6 text-[15px]"
      >
        ← Back to home
      </Link>

      <h1 className="text-3xl font-bold text-primary-900 mb-2">Terms of Service</h1>
      <p className="text-gray-600 mb-8">
        Last updated: {new Date().toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })}
      </p>

      <div className="max-w-3xl space-y-8">
        <Card padding="lg">
          <h2 className="text-xl font-semibold text-primary-900 mb-3">Acceptable use</h2>
          <p className="text-gray-600">
            You agree to use getiickets only for lawful purposes. You may not use the platform to
            sell tickets for illegal events, to harass others, or to violate any applicable laws.
            We reserve the right to suspend or terminate accounts that violate these terms.
          </p>
        </Card>

        <Card padding="lg">
          <h2 className="text-xl font-semibold text-primary-900 mb-3">Account</h2>
          <p className="text-gray-600">
            You are responsible for keeping your account credentials secure and for all activity
            under your account. You must provide accurate information when registering. Organizers
            must comply with additional terms when creating and managing events.
          </p>
        </Card>

        <Card padding="lg">
          <h2 className="text-xl font-semibold text-primary-900 mb-3">Events and tickets</h2>
          <p className="text-gray-600">
            Ticket purchases are subject to the event organizer&apos;s policies and the
            <Link href="/refund-policy" className="text-primary-800 hover:text-primary-600 underline mx-1">Refund Policy</Link>.
            We act as an intermediary between buyers and organizers. The organizer is responsible
            for the event; getiickets is not liable for event cancellation, changes, or
            organizer conduct beyond our platform.
          </p>
        </Card>

        <Card padding="lg">
          <h2 className="text-xl font-semibold text-primary-900 mb-3">Payments</h2>
          <p className="text-gray-600">
            Payments are processed by third-party providers. You agree to pay all applicable fees
            and taxes. All prices are as displayed at the time of purchase. Refunds are governed
            by our Refund Policy.
          </p>
        </Card>

        <Card padding="lg">
          <h2 className="text-xl font-semibold text-primary-900 mb-3">Limitation of liability</h2>
          <p className="text-gray-600">
            getiickets is provided &quot;as is.&quot; We are not liable for indirect, incidental,
            or consequential damages arising from your use of the platform. Our total liability
            is limited to the amount you paid for the relevant tickets or fees in the twelve
            months before the claim.
          </p>
        </Card>

        <Card padding="lg">
          <h2 className="text-xl font-semibold text-primary-900 mb-3">Contact</h2>
          <p className="text-gray-600">
            For questions about these terms, contact us at{' '}
            <a href="mailto:legal@getiickets.com" className="text-primary-800 hover:text-primary-600 underline">
              legal@getiickets.com
            </a>
            . You can also visit our <Link href="/support" className="text-primary-800 hover:text-primary-600 underline">Support</Link> page.
          </p>
        </Card>
      </div>
    </PageContainer>
  );
}
