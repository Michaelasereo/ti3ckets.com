'use client';

import { useState } from 'react';
import { organizerPayoutApi } from '@/lib/api';

interface PayoutRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  balance: {
    availableBalance: number;
    currency: string;
  } | null;
  onSuccess: () => void;
}

export default function PayoutRequestModal({ isOpen, onClose, balance, onSuccess }: PayoutRequestModalProps) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const minimumThreshold = 10000; // ₦10,000 minimum

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!balance) return;

    setError('');
    setLoading(true);

    try {
      const amountNum = parseFloat(amount);
      
      if (isNaN(amountNum) || amountNum <= 0) {
        setError('Please enter a valid amount');
        setLoading(false);
        return;
      }

      if (amountNum > balance.availableBalance) {
        setError(`Amount cannot exceed available balance of ${formatCurrency(balance.availableBalance)}`);
        setLoading(false);
        return;
      }

      if (amountNum < minimumThreshold) {
        setError(`Minimum payout amount is ${formatCurrency(minimumThreshold)}`);
        setLoading(false);
        return;
      }

      const response = await organizerPayoutApi.request({ amount: amountNum });
      
      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess();
          handleClose();
        }, 2000);
      } else {
        setError(response.data.error || 'Failed to request payout');
      }
    } catch (err: any) {
      console.error('Error requesting payout:', err);
      setError(err.response?.data?.error || 'Failed to request payout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAmount('');
    setError('');
    setSuccess(false);
    onClose();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-primary-900">Request Payout</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {success ? (
          <div className="text-center py-8">
            <div className="text-green-500 text-5xl mb-4">✓</div>
            <p className="text-lg font-semibold text-gray-900 mb-2">Payout Request Submitted</p>
            <p className="text-sm text-gray-600">
              Your payout request has been submitted. Status will be updated once processing begins.
            </p>
          </div>
        ) : (
          <>
            {balance && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Available Balance:</span>
                  <span className="font-semibold">{formatCurrency(balance.availableBalance)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Minimum Payout:</span>
                  <span className="font-semibold">{formatCurrency(minimumThreshold)}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (NGN)
                </label>
                <input
                  type="number"
                  id="amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  min={minimumThreshold}
                  max={balance?.availableBalance || 0}
                  step="0.01"
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !amount}
                  className="flex-1 px-4 py-2.5 bg-primary-900 text-white rounded-lg font-semibold hover:bg-primary-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Processing...' : 'Request Payout'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
