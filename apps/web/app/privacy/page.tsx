import Link from 'next/link';
import PageContainer from '@/components/ui/PageContainer';
import Card from '@/components/ui/Card';

export default function PrivacyPage() {
  return (
    <PageContainer py="lg">
      <Link
        href="/"
        className="inline-block text-primary-800 hover:text-primary-600 mb-6 text-[15px]"
      >
        ← Back to home
      </Link>

      <h1 className="text-3xl font-bold text-primary-900 mb-2">Privacy Policy</h1>
      <p className="text-gray-600 mb-8">
        Last updated: {new Date().toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })}
      </p>

      <div className="max-w-3xl space-y-8">
        <Card padding="lg">
          <h2 className="text-xl font-semibold text-primary-900 mb-3">Data we collect</h2>
          <p className="text-gray-600">
            We collect information you provide when you register, purchase tickets, or contact us.
            This may include your name, email address, phone number, payment information, and event
            preferences. We also collect usage data such as IP address and browser type when you
            use our platform.
          </p>
        </Card>

        <Card padding="lg">
          <h2 className="text-xl font-semibold text-primary-900 mb-3">How we use it</h2>
          <p className="text-gray-600">
            We use your data to process orders, send tickets and event updates, improve our
            services, and communicate with you. We may use anonymized or aggregated data for
            analytics and to improve the user experience. We do not sell your personal information
            to third parties.
          </p>
        </Card>

        <Card padding="lg">
          <h2 className="text-xl font-semibold text-primary-900 mb-3">Cookies</h2>
          <p className="text-gray-600">
            We use cookies and similar technologies to maintain your session, remember your
            preferences, and understand how you use our platform. You can control cookie settings
            through your browser. Some features may not work correctly if you disable cookies.
          </p>
        </Card>

        <Card padding="lg">
          <h2 className="text-xl font-semibold text-primary-900 mb-3">Your rights</h2>
          <p className="text-gray-600">
            You may request access to, correction of, or deletion of your personal data. You can
            also object to certain processing or request that we restrict how we use your data.
            To exercise these rights, contact us using the details below. If you are in a
            jurisdiction with a data protection authority, you have the right to lodge a complaint.
          </p>
        </Card>

        <Card padding="lg">
          <h2 className="text-xl font-semibold text-primary-900 mb-3">Contact</h2>
          <p className="text-gray-600">
            For privacy-related questions or requests, contact us at{' '}
            <a href="mailto:privacy@getiickets.com" className="text-primary-800 hover:text-primary-600 underline">
              privacy@getiickets.com
            </a>
            . You can also visit our <Link href="/support" className="text-primary-800 hover:text-primary-600 underline">Support</Link> page.
          </p>
        </Card>
      </div>
    </PageContainer>
  );
}
