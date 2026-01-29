import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WaitlistJoinModal from '@/components/waitlist/WaitlistJoinModal';
import { waitlistApi } from '@/lib/api';

// Mock the API
jest.mock('@/lib/api', () => ({
  waitlistApi: {
    join: jest.fn(),
  },
}));

describe('WaitlistJoinModal', () => {
  const mockProps = {
    isOpen: true,
    onClose: jest.fn(),
    eventId: 'event-1',
    eventTitle: 'Test Event',
    ticketTypeId: 'ticket-type-1',
    ticketTypeName: 'VIP',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (waitlistApi.join as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        message: 'Added to waitlist',
      },
    });
  });

  it('should render modal when open', () => {
    render(<WaitlistJoinModal {...mockProps} />);
    
    expect(screen.getByRole('heading', { name: 'Join Waitlist' })).toBeInTheDocument();
    expect(screen.getByText(/Get notified/i)).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<WaitlistJoinModal {...mockProps} isOpen={false} />);
    
    expect(screen.queryByRole('heading', { name: 'Join Waitlist' })).not.toBeInTheDocument();
  });

  it('should validate required email field', async () => {
    render(<WaitlistJoinModal {...mockProps} />);
    
    const submitButton = screen.getByRole('button', { name: 'Join Waitlist' });
    fireEvent.click(submitButton);
    
    // HTML5 validation should prevent submission
    const emailInput = screen.getByLabelText(/email/i);
    expect(emailInput).toBeRequired();
  });

  it('should submit waitlist form with valid data', async () => {
    render(<WaitlistJoinModal {...mockProps} />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const phoneInput = screen.getByLabelText(/phone/i);
    const quantityInput = screen.getByLabelText(/quantity/i);
    const submitButton = screen.getByRole('button', { name: 'Join Waitlist' });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(phoneInput, { target: { value: '+2348000000000' } });
    fireEvent.change(quantityInput, { target: { value: '2' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(waitlistApi.join).toHaveBeenCalledWith({
        eventId: 'event-1',
        email: 'test@example.com',
        phone: '+2348000000000',
        ticketTypeId: 'ticket-type-1',
        quantity: 2,
      });
    });
  });

  it('should show success message after successful submission', async () => {
    render(<WaitlistJoinModal {...mockProps} />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: 'Join Waitlist' });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText("You're on the waitlist!")).toBeInTheDocument();
      // Verify success message appears (email is cleared on success, so we just check the message exists)
      expect(screen.getByText(/We'll notify you/i)).toBeInTheDocument();
    });
  });

  it('should display error message on API failure', async () => {
    (waitlistApi.join as jest.Mock).mockRejectedValue({
      response: {
        data: {
          error: 'Failed to join waitlist',
        },
      },
    });

    render(<WaitlistJoinModal {...mockProps} />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: 'Join Waitlist' });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to join waitlist/i)).toBeInTheDocument();
    });
  });

  it('should close modal when cancel button is clicked', () => {
    const onClose = jest.fn();
    render(<WaitlistJoinModal {...mockProps} onClose={onClose} />);
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(onClose).toHaveBeenCalled();
  });

  it('should close modal when close button is clicked', () => {
    const onClose = jest.fn();
    render(<WaitlistJoinModal {...mockProps} onClose={onClose} />);
    
    const closeButton = screen.getByLabelText('Close');
    fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalled();
  });
});
