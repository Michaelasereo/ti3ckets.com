import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PayoutRequestModal from '@/components/organizer/PayoutRequestModal';
import { organizerPayoutApi } from '@/lib/api';

jest.mock('@/lib/api', () => ({
  organizerPayoutApi: {
    request: jest.fn(),
  },
}));

describe('PayoutRequestModal', () => {
  const mockBalance = {
    availableBalance: 50000,
    currency: 'NGN',
  };

  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (organizerPayoutApi.request as jest.Mock).mockResolvedValue({
      data: { success: true },
    });
  });

  it('does not render when closed', () => {
    render(
      <PayoutRequestModal
        isOpen={false}
        onClose={mockOnClose}
        balance={mockBalance}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.queryByText('Request Payout')).not.toBeInTheDocument();
  });

  it('renders when open', () => {
    render(
      <PayoutRequestModal
        isOpen={true}
        onClose={mockOnClose}
        balance={mockBalance}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText('Request Payout')).toBeInTheDocument();
  });

  it('validates minimum amount', async () => {
    const user = userEvent.setup();
    
    render(
      <PayoutRequestModal
        isOpen={true}
        onClose={mockOnClose}
        balance={mockBalance}
        onSuccess={mockOnSuccess}
      />
    );

    const amountInput = screen.getByLabelText(/amount/i);
    const submitButton = screen.getByText(/Request Payout/i);

    await user.type(amountInput, '1000');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/minimum payout amount/i)).toBeInTheDocument();
    });
  });

  it('validates maximum amount', async () => {
    const user = userEvent.setup();
    
    render(
      <PayoutRequestModal
        isOpen={true}
        onClose={mockOnClose}
        balance={mockBalance}
        onSuccess={mockOnSuccess}
      />
    );

    const amountInput = screen.getByLabelText(/amount/i);
    const submitButton = screen.getByText(/Request Payout/i);

    await user.type(amountInput, '100000');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/exceeds available balance/i)).toBeInTheDocument();
    });
  });

  it('submits valid payout request', async () => {
    const user = userEvent.setup();
    
    render(
      <PayoutRequestModal
        isOpen={true}
        onClose={mockOnClose}
        balance={mockBalance}
        onSuccess={mockOnSuccess}
      />
    );

    const amountInput = screen.getByLabelText(/amount/i);
    const submitButton = screen.getByText(/Request Payout/i);

    await user.type(amountInput, '20000');
    await user.click(submitButton);

    await waitFor(() => {
      expect(organizerPayoutApi.request).toHaveBeenCalledWith({ amount: 20000 });
    });
  });
});
