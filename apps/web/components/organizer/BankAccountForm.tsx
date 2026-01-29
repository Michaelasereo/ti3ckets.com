'use client';

import { useState, useEffect } from 'react';
import { organizerPayoutApi, usersApi } from '@/lib/api';

interface BankAccountFormProps {
  onSuccess: () => void;
}

// Nigerian banks list (simplified - in production, fetch from Paystack API)
const NIGERIAN_BANKS = [
  { code: '044', name: 'Access Bank' },
  { code: '050', name: 'Ecobank Nigeria' },
  { code: '070', name: 'Fidelity Bank' },
  { code: '011', name: 'First Bank of Nigeria' },
  { code: '214', name: 'First City Monument Bank' },
  { code: '058', name: 'Guaranty Trust Bank' },
  { code: '030', name: 'Heritage Bank' },
  { code: '301', name: 'Jaiz Bank' },
  { code: '082', name: 'Keystone Bank' },
  { code: '526', name: 'Parallex Bank' },
  { code: '076', name: 'Polaris Bank' },
  { code: '101', name: 'Providus Bank' },
  { code: '221', name: 'Stanbic IBTC Bank' },
  { code: '068', name: 'Standard Chartered Bank' },
  { code: '232', name: 'Sterling Bank' },
  { code: '100', name: 'Suntrust Bank' },
  { code: '032', name: 'Union Bank of Nigeria' },
  { code: '033', name: 'United Bank For Africa' },
  { code: '215', name: 'Unity Bank' },
  { code: '035', name: 'Wema Bank' },
  { code: '057', name: 'Zenith Bank' },
];

export default function BankAccountForm({ onSuccess }: BankAccountFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    account_number: '',
    bank_code: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [existingAccount, setExistingAccount] = useState<any>(null);

  useEffect(() => {
    checkExistingAccount();
  }, []);

  const checkExistingAccount = async () => {
    try {
      const response = await usersApi.getMe();
      if (response.data.success && response.data.data.organizerProfile?.payoutDetails) {
        const details = response.data.data.organizerProfile.payoutDetails as any;
        if (details.recipientCode) {
          setExistingAccount(details);
          setFormData({
            name: details.accountName || '',
            account_number: details.accountNumber || '',
            bank_code: details.bankCode || '',
          });
        }
      }
    } catch (err) {
      console.error('Error checking existing account:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await organizerPayoutApi.setup(formData);
      
      if (response.data.success) {
        onSuccess();
      } else {
        setError(response.data.error || 'Failed to setup bank account');
      }
    } catch (err: any) {
      console.error('Error setting up bank account:', err);
      setError(err.response?.data?.error || 'Failed to setup bank account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {existingAccount && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-blue-800">
            <strong>Current Account:</strong> {existingAccount.accountName} - {existingAccount.accountNumber} 
            ({existingAccount.bankName || 'Bank'})
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Updating will replace your existing bank account.
          </p>
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
          Account Name
        </label>
        <input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Enter account name"
          required
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      <div>
        <label htmlFor="account_number" className="block text-sm font-medium text-gray-700 mb-2">
          Account Number
        </label>
        <input
          type="text"
          id="account_number"
          value={formData.account_number}
          onChange={(e) => handleChange('account_number', e.target.value.replace(/\D/g, ''))}
          placeholder="Enter 10-digit account number"
          maxLength={10}
          minLength={10}
          required
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
        <p className="text-xs text-gray-500 mt-1">Must be exactly 10 digits</p>
      </div>

      <div>
        <label htmlFor="bank_code" className="block text-sm font-medium text-gray-700 mb-2">
          Bank
        </label>
        <select
          id="bank_code"
          value={formData.bank_code}
          onChange={(e) => handleChange('bank_code', e.target.value)}
          required
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="">Select a bank</option>
          {NIGERIAN_BANKS.map((bank) => (
            <option key={bank.code} value={bank.code}>
              {bank.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !formData.name || !formData.account_number || !formData.bank_code}
        className="w-full px-6 py-3.5 bg-primary-900 text-white rounded-lg font-semibold hover:bg-primary-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Setting up...' : existingAccount ? 'Update Bank Account' : 'Setup Bank Account'}
      </button>
    </form>
  );
}
