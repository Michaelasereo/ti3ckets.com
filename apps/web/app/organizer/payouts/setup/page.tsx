'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PageContainer from '@/components/ui/PageContainer';
import BankAccountForm from '@/components/organizer/BankAccountForm';

export default function PayoutSetupPage() {
  const router = useRouter();
  const [success, setSuccess] = useState(false);

  const handleSuccess = () => {
    setSuccess(true);
    setTimeout(() => {
      router.push('/organizer/payouts');
    }, 2000);
  };

  return (
    <PageContainer>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link
            href="/organizer/payouts"
            className="text-primary-600 hover:text-primary-800 text-sm font-medium"
          >
            ← Back to Payouts
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-primary-900 mb-2">Setup Bank Account</h1>
        <p className="text-gray-600 mb-8">
          Add your bank account details to receive payouts from your event ticket sales.
        </p>

        {success ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <div className="text-green-500 text-5xl mb-4">✓</div>
            <p className="text-lg font-semibold text-gray-900 mb-2">Bank Account Setup Complete</p>
            <p className="text-sm text-gray-600">
              Your bank account has been successfully configured. Redirecting...
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <BankAccountForm onSuccess={handleSuccess} />
          </div>
        )}

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Your bank account details are securely stored and used only for processing payouts. 
            We use Paystack to handle all transfers securely.
          </p>
        </div>
      </div>
    </PageContainer>
  );
}
