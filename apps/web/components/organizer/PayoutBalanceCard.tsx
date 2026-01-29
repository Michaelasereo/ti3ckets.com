'use client';

interface PayoutBalanceCardProps {
  balance: {
    totalRevenue: number;
    platformFee?: number;
    paystackFee?: number;
    totalFees?: number;
    totalPayouts: number;
    availableBalance: number;
    pendingBalance: number;
    ticketsSold?: number;
    freeTicketsRemaining?: number;
    currency: string;
  };
  onRequestPayout: () => void;
}

export default function PayoutBalanceCard({ balance, onRequestPayout }: PayoutBalanceCardProps) {
  const formatCurrency = (amount: number, currency: string = 'NGN') => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      {/* Available Balance */}
      <div className="bg-gradient-to-br from-primary-50 to-primary-100 border-2 border-primary-200 rounded-xl p-6">
        <h3 className="text-sm font-medium text-primary-700 mb-2">Available Balance</h3>
        <p className="text-3xl font-bold text-primary-900 mb-4">
          {formatCurrency(balance.availableBalance, balance.currency)}
        </p>
        <button
          onClick={onRequestPayout}
          disabled={balance.availableBalance <= 0}
          className="w-full px-4 py-2.5 bg-primary-900 text-white rounded-lg font-semibold hover:bg-primary-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Request Payout
        </button>
      </div>

      {/* Pending Balance */}
      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6">
        <h3 className="text-sm font-medium text-yellow-700 mb-2">Pending Balance</h3>
        <p className="text-3xl font-bold text-yellow-900 mb-4">
          {formatCurrency(balance.pendingBalance, balance.currency)}
        </p>
        <p className="text-xs text-yellow-700">
          Available after 7-day hold period
        </p>
      </div>

      {/* Total Revenue */}
      <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
        <h3 className="text-sm font-medium text-green-700 mb-2">Total Revenue</h3>
        <p className="text-3xl font-bold text-green-900 mb-4">
          {formatCurrency(balance.totalRevenue, balance.currency)}
        </p>
        <p className="text-xs text-green-700">
          All-time earnings
        </p>
      </div>
    </div>
  );
}
