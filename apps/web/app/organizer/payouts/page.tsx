'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { organizerPayoutApi } from '@/lib/api';
import PageContainer from '@/components/ui/PageContainer';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import PayoutBalanceCard from '@/components/organizer/PayoutBalanceCard';
import PayoutRequestModal from '@/components/organizer/PayoutRequestModal';

export default function PayoutsPage() {
  const router = useRouter();
  const [balance, setBalance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requestModalOpen, setRequestModalOpen] = useState(false);

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await organizerPayoutApi.getBalance();
      if (response.data.success) {
        setBalance(response.data.data);
      } else {
        setError('Failed to fetch balance');
      }
    } catch (err: any) {
      console.error('Error fetching balance:', err);
      setError(err.response?.data?.error || 'Failed to fetch balance');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'NGN') => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <PageContainer>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-primary-900">Payouts</h1>
        <div className="flex gap-3">
          <Link
            href="/organizer/payouts/history"
            className="px-6 py-3.5 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition"
          >
            View History
          </Link>
          <Link
            href="/organizer/payouts/setup"
            className="px-6 py-3.5 border border-primary-300 text-primary-700 rounded-xl font-semibold hover:bg-primary-50 transition"
          >
            Setup Bank Account
          </Link>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton variant="lines" count={4} />
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchBalance}
            className="px-6 py-3.5 bg-primary-900 text-white rounded-xl font-semibold hover:bg-primary-800 transition"
          >
            Retry
          </button>
        </div>
      ) : balance ? (
        <>
          <PayoutBalanceCard balance={balance} onRequestPayout={() => setRequestModalOpen(true)} />
          
          <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-primary-900 mb-4">Payout Information</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Revenue:</span>
                <span className="font-semibold">{formatCurrency(balance.totalRevenue, balance.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">
                  Platform Fee (3.5%)
                  {balance.freeTicketsRemaining > 0 && (
                    <span className="text-green-600 ml-2">• Free for first 100 tickets</span>
                  )}
                </span>
                <span className="font-semibold text-red-600">-{formatCurrency(balance.platformFee || 0, balance.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Paystack Fee (1.5% + ₦100):</span>
                <span className="font-semibold text-red-600">-{formatCurrency(balance.paystackFee || 0, balance.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Fees:</span>
                <span className="font-semibold text-red-600">-{formatCurrency(balance.totalFees || 0, balance.currency)}</span>
              </div>
              {balance.freeTicketsRemaining !== undefined && balance.freeTicketsRemaining > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800">
                    <strong>Free Tickets Remaining:</strong> {balance.freeTicketsRemaining} tickets
                    {' '}(Platform fee waived for first 100 tickets)
                  </p>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Total Payouts:</span>
                <span className="font-semibold">-{formatCurrency(balance.totalPayouts, balance.currency)}</span>
              </div>
              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between">
                  <span className="text-gray-900 font-semibold">Available Balance:</span>
                  <span className="font-bold text-lg text-primary-900">{formatCurrency(balance.availableBalance, balance.currency)}</span>
                </div>
              </div>
            </div>
          </div>

          {balance.pendingBalance > 0 && (
            <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Pending Balance:</strong> {formatCurrency(balance.pendingBalance, balance.currency)} 
                {' '} (Revenue from orders in the last 7 days is held for security)
              </p>
            </div>
          )}

          {/* Fee Structure Info */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">Fee Structure</h3>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Platform Fee: 3.5% (50% lower than competitors)</li>
              <li>• Payment Processing: Paystack (1.5% + ₦100)</li>
              <li>• Total Fee: 5% + ₦100 per transaction</li>
              <li>• Free for first 100 tickets per organizer</li>
              <li>• No hidden fees</li>
            </ul>
          </div>
        </>
      ) : null}

      <PayoutRequestModal
        isOpen={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        balance={balance}
        onSuccess={() => {
          setRequestModalOpen(false);
          fetchBalance();
        }}
      />
    </PageContainer>
  );
}
