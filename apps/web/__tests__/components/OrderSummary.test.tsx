import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import OrderSummary from '@/components/checkout/OrderSummary';

describe('OrderSummary', () => {
  const mockCart = {
    tickets: [
      {
        ticketTypeId: 'ticket-type-1',
        quantity: 2,
      },
      {
        ticketTypeId: 'ticket-type-2',
        quantity: 1,
      },
    ],
    reservations: [],
  };

  const mockEvent = {
    id: 'event-1',
    title: 'Test Event',
  };

  const mockTicketTypes = [
    {
      id: 'ticket-type-1',
      name: 'General Admission',
      price: '5000',
      currency: 'NGN',
    },
    {
      id: 'ticket-type-2',
      name: 'VIP',
      price: '10000',
      currency: 'NGN',
    },
  ];

  const mockProps = {
    cart: mockCart,
    event: mockEvent,
    ticketTypes: mockTicketTypes,
    appliedPromo: null,
    promoCode: '',
    promoCodeError: '',
    validatingPromo: false,
    subtotal: 20000,
    discountAmount: 0,
    totalAmount: 20000,
    onPromoCodeChange: jest.fn(),
    onValidatePromoCode: jest.fn(),
    onContinue: jest.fn(),
  };

  it('should render order summary with correct totals', () => {
    render(<OrderSummary {...mockProps} />);
    
    expect(screen.getByText('Subtotal:')).toBeInTheDocument();
    expect(screen.getByText('Total:')).toBeInTheDocument();
  });

  it('should display subtotal correctly', () => {
    render(<OrderSummary {...mockProps} />);
    
    // Subtotal: 20000 - check that it appears in the subtotal row
    const subtotalRow = screen.getByText('Subtotal:').closest('div');
    expect(subtotalRow).toHaveTextContent('20,000');
  });

  it('should display discount amount when promo is applied', () => {
    const propsWithPromo = {
      ...mockProps,
      appliedPromo: {
        discountAmount: 2000,
      },
      discountAmount: 2000,
      totalAmount: 18000,
    };
    
    render(<OrderSummary {...propsWithPromo} />);
    
    // Discount: 2000 - use getAllByText since it appears in multiple places
    const discountElements = screen.getAllByText(/2,000|NGN 2,000/i);
    expect(discountElements.length).toBeGreaterThan(0);
    // Total: 18000
    expect(screen.getByText(/18,000|NGN 18,000/i)).toBeInTheDocument();
  });

  it('should display ticket breakdown', () => {
    render(<OrderSummary {...mockProps} />);
    
    expect(screen.getByText('General Admission')).toBeInTheDocument();
    expect(screen.getByText('VIP')).toBeInTheDocument();
  });

  it('should call onPromoCodeChange when promo code input changes', () => {
    const onPromoCodeChange = jest.fn();
    render(<OrderSummary {...mockProps} onPromoCodeChange={onPromoCodeChange} />);
    
    const promoInput = screen.getByPlaceholderText(/Enter code/i);
    fireEvent.change(promoInput, { target: { value: 'TESTCODE' } });
    
    expect(onPromoCodeChange).toHaveBeenCalledWith('TESTCODE');
  });

  it('should call onValidatePromoCode when apply button is clicked', () => {
    const onValidatePromoCode = jest.fn();
    const propsWithPromo = {
      ...mockProps,
      promoCode: 'TESTCODE',
      onValidatePromoCode,
    };
    
    render(<OrderSummary {...propsWithPromo} />);
    
    const applyButton = screen.getByText('Apply');
    fireEvent.click(applyButton);
    
    expect(onValidatePromoCode).toHaveBeenCalled();
  });

  it('should call onContinue when continue button is clicked', () => {
    const onContinue = jest.fn();
    render(<OrderSummary {...mockProps} onContinue={onContinue} />);
    
    const continueButton = screen.getByText('Continue');
    fireEvent.click(continueButton);
    
    expect(onContinue).toHaveBeenCalled();
  });

  it('should disable continue button when disabled prop is true', () => {
    render(<OrderSummary {...mockProps} disabled={true} />);
    
    const continueButton = screen.getByText('Continue');
    expect(continueButton).toBeDisabled();
  });
});
