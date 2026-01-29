'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    platformFeePercentage: 0,
    paystackFeePercentage: 0,
    paystackFixedFee: 0,
    freeTicketsThreshold: 0,
    minimumPayoutThreshold: 0,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await adminApi.settings.get();
      if (response.data.success) {
        const data = response.data.data;
        setSettings(data);
        setFormData({
          platformFeePercentage: data.platformFeePercentage,
          paystackFeePercentage: data.paystackFeePercentage,
          paystackFixedFee: data.paystackFixedFee,
          freeTicketsThreshold: data.freeTicketsThreshold,
          minimumPayoutThreshold: data.minimumPayoutThreshold,
        });
      } else {
        setError(response.data.error || 'Failed to load settings');
      }
    } catch (err: any) {
      console.error('Error loading settings:', err);
      setError(err.response?.data?.error || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const response = await adminApi.settings.update(formData);
      if (response.data.success) {
        alert('Settings updated successfully (Note: In production, these are stored in environment variables)');
        loadSettings();
      } else {
        setError(response.data.error || 'Failed to update settings');
      }
    } catch (err: any) {
      console.error('Error updating settings:', err);
      setError(err.response?.data?.error || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="h-96 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary-900 mb-2">System Settings</h1>
        <p className="text-gray-600">Configure platform-wide settings</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Platform Fee Percentage (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.platformFeePercentage}
                onChange={(e) => setFormData({ ...formData, platformFeePercentage: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Current: {settings?.platformFeePercentage || 0}%</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Paystack Fee Percentage (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.paystackFeePercentage}
                onChange={(e) => setFormData({ ...formData, paystackFeePercentage: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Current: {settings?.paystackFeePercentage || 0}%</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Paystack Fixed Fee (NGN)
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={formData.paystackFixedFee}
                onChange={(e) => setFormData({ ...formData, paystackFixedFee: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Current: ₦{settings?.paystackFixedFee || 0}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Free Tickets Threshold
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={formData.freeTicketsThreshold}
                onChange={(e) => setFormData({ ...formData, freeTicketsThreshold: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Current: {settings?.freeTicketsThreshold || 0} tickets</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Payout Threshold (NGN)
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={formData.minimumPayoutThreshold}
                onChange={(e) => setFormData({ ...formData, minimumPayoutThreshold: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Current: ₦{settings?.minimumPayoutThreshold || 0}</p>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> In production, these settings are stored in environment variables and would need to be updated in your deployment configuration.
            </p>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-primary-900 text-white rounded-xl font-semibold hover:bg-primary-800 transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
