import { render, screen } from '@testing-library/react';
import PayoutBalanceCard from '@/components/organizer/PayoutBalanceCard';

describe('PayoutBalanceCard', () => {
  const mockBalance = {
    totalRevenue: 100000,
    platformFee: 5000,
    totalPayouts: 20000,
    availableBalance: 75000,
    pendingBalance: 10000,
    currency: 'NGN',
  };

  const mockOnRequestPayout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders balance information correctly', () => {
    render(<PayoutBalanceCard balance={mockBalance} onRequestPayout={mockOnRequestPayout} />);

    expect(screen.getByText('Available Balance')).toBeInTheDocument();
    expect(screen.getByText('Pending Balance')).toBeInTheDocument();
    expect(screen.getByText('Total Revenue')).toBeInTheDocument();
  });

  it('displays formatted currency amounts', () => {
    render(<PayoutBalanceCard balance={mockBalance} onRequestPayout={mockOnRequestPayout} />);

    // Check that currency amounts are displayed (format may vary)
    expect(screen.getByText(/₦/)).toBeInTheDocument();
  });

  it('calls onRequestPayout when button is clicked', () => {
    render(<PayoutBalanceCard balance={mockBalance} onRequestPayout={mockOnRequestPayout} />);

    const button = screen.getByText('Request Payout');
    button.click();

    expect(mockOnRequestPayout).toHaveBeenCalledTimes(1);
  });

  it('disables request payout button when balance is zero', () => {
    const zeroBalance = { ...mockBalance, availableBalance: 0 };
    render(<PayoutBalanceCard balance={zeroBalance} onRequestPayout={mockOnRequestPayout} />);

    const button = screen.getByText('Request Payout');
    expect(button).toBeDisabled();
  });
});
