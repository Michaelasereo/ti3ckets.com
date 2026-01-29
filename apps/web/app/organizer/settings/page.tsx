'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { usersApi } from '@/lib/api';
import PageContainer from '@/components/ui/PageContainer';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import { useProfileCheck } from '@/hooks/useProfileCheck';
import Link from 'next/link';
import AnalyticsOverview from '@/components/organizer/AnalyticsOverview';
import RevenueOverview from '@/components/organizer/RevenueOverview';
import OrdersOverview from '@/components/organizer/OrdersOverview';

type OrganizerSettingsTab = 'profile' | 'payouts' | 'analytics' | 'revenue' | 'orders';

function getInitialTab(searchParams: URLSearchParams | null): OrganizerSettingsTab {
  const tab = searchParams?.get('tab');
  if (tab === 'payouts' || tab === 'analytics' || tab === 'revenue' || tab === 'orders') {
    return tab;
  }
  return 'profile';
}

function SettingsTabs({
  activeTab,
  onChange,
}: {
  activeTab: OrganizerSettingsTab;
  onChange: (tab: OrganizerSettingsTab) => void;
}) {
  const tabs: { id: OrganizerSettingsTab; label: string; description: string }[] = [
    { id: 'profile', label: 'Profile', description: 'Account & business information' },
    { id: 'payouts', label: 'Payouts', description: 'Bank account & payout settings' },
    { id: 'analytics', label: 'Analytics', description: 'Performance & sales insights' },
    { id: 'revenue', label: 'Revenue', description: 'Revenue overview & breakdown' },
    { id: 'orders', label: 'Orders', description: 'Orders by ticket type' },
  ];

  return (
    <div className="mb-6 border-b border-gray-200">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`px-4 py-2 rounded-t-lg text-sm font-medium border-b-2 transition ${
                isActive
                  ? 'border-primary-600 text-primary-900 bg-primary-50'
                  : 'border-transparent text-gray-600 hover:text-primary-800 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ProfileTab({
  user,
  organizerProfile,
  onAvatarUpdated,
}: {
  user: any;
  organizerProfile: any;
  onAvatarUpdated?: () => void | Promise<void>;
}) {
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setAvatarError('Please use JPEG, PNG, or WebP.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('Image must be under 2MB.');
      return;
    }
    setAvatarError('');
    setAvatarLoading(true);
    try {
      const { organizerApi } = await import('@/lib/api');
      const res = await organizerApi.uploadAvatar(file);
      if (res.data.success && res.data.data?.avatarUrl) {
        await onAvatarUpdated?.();
      }
    } catch (err: any) {
      setAvatarError(err.response?.data?.error || 'Upload failed.');
    } finally {
      setAvatarLoading(false);
      e.target.value = '';
    }
  };

  const displayName = user?.name || user?.email || '';
  const initials = (displayName || 'O')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p: string) => p[0]?.toUpperCase())
    .join('');

  return (
    <div className="space-y-6">
      {/* Profile avatar */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-primary-900 mb-4">Profile photo</h2>
        <div className="flex items-center gap-4">
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center font-semibold text-xl flex-shrink-0 overflow-hidden ${organizerProfile?.avatarUrl ? '' : 'text-white'}`}
            style={{
              background: organizerProfile?.avatarUrl
                ? undefined
                : 'linear-gradient(90deg, #192030 0%, #C74576 100%)',
            }}
          >
            {organizerProfile?.avatarUrl ? (
              <img
                src={organizerProfile.avatarUrl}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
          <div>
            <input
              type="file"
              id="avatar-upload"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
              disabled={avatarLoading}
            />
            <label
              htmlFor="avatar-upload"
              className="inline-block px-4 py-2 text-sm font-medium text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100 transition cursor-pointer disabled:opacity-50"
            >
              {avatarLoading ? 'Uploading...' : 'Change avatar'}
            </label>
            {avatarError && (
              <p className="mt-2 text-sm text-red-600">{avatarError}</p>
            )}
          </div>
        </div>
      </div>

      {/* Account Information */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-primary-900 mb-4">Account Information</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <p className="text-gray-900">{user.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <p className="text-gray-900">{user.name || 'Not set'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <p className="text-gray-900">{user.phone || 'Not set'}</p>
          </div>
        </div>
      </div>

      {/* Business Information */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-primary-900 mb-4">Business Information</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
            <p className="text-gray-900">{organizerProfile.businessName || 'Not set'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Type</label>
            <p className="text-gray-900">{organizerProfile.businessType || 'Not set'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Address</label>
            <p className="text-gray-900">{organizerProfile.businessAddress || 'Not set'}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <p className="text-gray-900">{organizerProfile.businessCity || 'Not set'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <p className="text-gray-900">{organizerProfile.businessCountry || 'Not set'}</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tax ID</label>
            <p className="text-gray-900">{organizerProfile.taxId || 'Not set'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Verification Status</label>
            <span
              className={`inline-block px-3 py-1 rounded text-sm font-semibold ${
                organizerProfile.verificationStatus === 'VERIFIED'
                  ? 'bg-green-100 text-green-800'
                  : organizerProfile.verificationStatus === 'PENDING'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {organizerProfile.verificationStatus || 'PENDING'}
            </span>
          </div>
        </div>
        <div className="mt-6">
          <Link
            href="/onboarding/organizer"
            className="px-4 py-2 text-sm font-medium text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100 transition inline-block"
          >
            Edit Business Profile
          </Link>
        </div>
      </div>
    </div>
  );
}

function PayoutsTab({ organizerProfile }: { organizerProfile: any }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-primary-900">Payout Settings</h2>
          <p className="text-sm text-gray-500">
            Configure how you get paid for your ticket sales.
          </p>
        </div>
        <Link
          href="/organizer/payouts"
          className="text-sm font-medium text-primary-700 hover:text-primary-900"
        >
          View full payouts dashboard
        </Link>
      </div>
      {organizerProfile.payoutDetails ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bank Account</label>
            <p className="text-gray-900">
              {organizerProfile.payoutDetails.accountName || 'Not set'}
            </p>
            <p className="text-sm text-gray-500">
              {organizerProfile.payoutDetails.accountNumber || ''} -{' '}
              {organizerProfile.payoutDetails.bankName || ''}
            </p>
          </div>
          <Link
            href="/organizer/payouts/setup"
            className="px-4 py-2 text-sm font-medium text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100 transition inline-block"
          >
            Update Bank Account
          </Link>
        </div>
      ) : (
        <div>
          <p className="text-gray-600 mb-4">No bank account configured yet.</p>
          <Link
            href="/organizer/payouts/setup"
            className="px-4 py-2 text-sm font-medium text-white bg-primary-900 rounded-lg hover:bg-primary-800 transition inline-block"
          >
            Setup Bank Account
          </Link>
        </div>
      )}
    </div>
  );
}

function AnalyticsTab() {
  return (
    <div>
      <AnalyticsOverview showTitle={false} />
      <p className="mt-4 text-sm text-gray-500">
        <Link href="/organizer/analytics" className="text-primary-600 hover:underline">
          Open full analytics page
        </Link>
      </p>
    </div>
  );
}

function RevenueTab() {
  return (
    <div>
      <RevenueOverview showTitle={false} />
      <p className="mt-4 text-sm text-gray-500">
        <Link href="/organizer/revenue" className="text-primary-600 hover:underline">
          Open full revenue page
        </Link>
      </p>
    </div>
  );
}

function OrdersTab() {
  return <OrdersOverview />;
}

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { loading: profileLoading } = useProfileCheck('organizer');
  const searchParams = useSearchParams();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<OrganizerSettingsTab>(() =>
    getInitialTab(searchParams as unknown as URLSearchParams | null),
  );

  useEffect(() => {
    if (!profileLoading) {
      fetchUser();
    }
  }, [profileLoading]);

  useEffect(() => {
    // Keep state in sync if user manually changes query param
    const tabFromUrl = getInitialTab(searchParams as unknown as URLSearchParams | null);
    setActiveTab(tabFromUrl);
  }, [searchParams]);

  const handleTabChange = (tab: OrganizerSettingsTab) => {
    setActiveTab(tab);
    const current = new URLSearchParams(searchParams?.toString());
    current.set('tab', tab);
    router.replace(`/organizer/settings?${current.toString()}`);
  };

  const fetchUser = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await usersApi.getMe();
      if (response.data.success) {
        setUser(response.data.data);
      } else {
        setError('Failed to fetch account details');
      }
    } catch (err: any) {
      console.error('Error fetching user:', err);
      setError(err.response?.data?.error || 'Failed to fetch account details');
    } finally {
      setLoading(false);
    }
  };

  if (loading || profileLoading) {
    return (
      <PageContainer>
        <LoadingSkeleton variant="lines" count={6} />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-600">{error}</p>
        </div>
      </PageContainer>
    );
  }

  if (!user) {
    return (
      <PageContainer>
        <p>No user data available</p>
      </PageContainer>
    );
  }

  const organizerProfile = user.organizerProfile || {};

  let tabContent: JSX.Element;
  switch (activeTab) {
    case 'payouts':
      tabContent = <PayoutsTab organizerProfile={organizerProfile} />;
      break;
    case 'analytics':
      tabContent = <AnalyticsTab />;
      break;
    case 'revenue':
      tabContent = <RevenueTab />;
      break;
    case 'orders':
      tabContent = <OrdersTab />;
      break;
    case 'profile':
    default:
      tabContent = (
        <ProfileTab
          user={user}
          organizerProfile={organizerProfile}
          onAvatarUpdated={fetchUser}
        />
      );
      break;
  }

  return (
    <PageContainer>
      <h1 className="text-3xl font-bold text-primary-900 mb-4">Settings</h1>
      <p className="text-sm text-gray-500 mb-4">
        Manage your account, business profile, payouts, analytics and revenue from one place.
      </p>

      <SettingsTabs activeTab={activeTab} onChange={handleTabChange} />

      {tabContent}
    </PageContainer>
  );
}
