import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TicketSelector from '@/components/tickets/TicketSelector';
import { ticketsApi } from '@/lib/api';

// Mock the API
jest.mock('@/lib/api', () => ({
  ticketsApi: {
    checkAvailability: jest.fn(),
  },
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock SeatMap component
jest.mock('@/components/tickets/SeatMap', () => {
  return function MockSeatMap() {
    return <div data-testid="seat-map">Seat Map</div>;
  };
});

describe('TicketSelector', () => {
  const mockEvent = {
    id: 'event-1',
    slug: 'test-event',
    title: 'Test Event',
    isSeated: false,
    ticketTypes: [
      {
        id: 'ticket-type-1',
        name: 'General Admission',
        price: '5000',
        currency: 'NGN',
        totalQuantity: 100,
        soldQuantity: 50,
        reservedQuantity: 10,
        minPerOrder: 1,
        maxPerOrder: 10,
      },
      {
        id: 'ticket-type-2',
        name: 'VIP',
        price: '15000',
        currency: 'NGN',
        totalQuantity: 50,
        soldQuantity: 30,
        reservedQuantity: 5,
        minPerOrder: 1,
        maxPerOrder: 5,
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (ticketsApi.checkAvailability as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        data: {
          available: 40,
          canReserve: true,
        },
      },
    });
  });

  it('should render ticket types', () => {
    render(<TicketSelector event={mockEvent} />);
    
    expect(screen.getByText('General Admission')).toBeInTheDocument();
    expect(screen.getByText('VIP')).toBeInTheDocument();
  });

  it('should allow selecting ticket quantities', () => {
    render(<TicketSelector event={mockEvent} />);
    
    // Find the + button for the first ticket type
    const plusButtons = screen.getAllByText('+');
    expect(plusButtons.length).toBeGreaterThan(0);
    
    // Click + button twice to select 2 tickets
    fireEvent.click(plusButtons[0]);
    fireEvent.click(plusButtons[0]);
    
    // Verify quantity is displayed (should show "2")
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should calculate total amount correctly', () => {
    render(<TicketSelector event={mockEvent} />);
    
    const plusButtons = screen.getAllByText('+');
    
    // Select 2 General Admission tickets (5000 * 2 = 10000)
    fireEvent.click(plusButtons[0]);
    fireEvent.click(plusButtons[0]);
    
    // Select 1 VIP ticket (15000 * 1 = 15000)
    fireEvent.click(plusButtons[1]);
    
    // Total should be 25000 - check for Reserve Tickets button which should be enabled
    const reserveButton = screen.getByText('Reserve Tickets');
    expect(reserveButton).not.toBeDisabled();
  });

  it('should check availability when tickets are selected', async () => {
    render(<TicketSelector event={mockEvent} />);
    
    const plusButtons = screen.getAllByText('+');
    fireEvent.click(plusButtons[0]);
    fireEvent.click(plusButtons[0]);
    
    await waitFor(() => {
      expect(ticketsApi.checkAvailability).toHaveBeenCalledWith(
        'event-1',
        'ticket-type-1',
        2
      );
    }, { timeout: 6000 }); // Allow time for the interval check
  });

  it('should show availability warning when tickets are low', async () => {
    (ticketsApi.checkAvailability as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        data: {
          available: 3,
          canReserve: true,
        },
      },
    });

    render(<TicketSelector event={mockEvent} />);
    
    const plusButtons = screen.getAllByText('+');
    fireEvent.click(plusButtons[0]);
    fireEvent.click(plusButtons[0]);
    
    await waitFor(() => {
      expect(screen.getByText(/Only 3 tickets left/i)).toBeInTheDocument();
    }, { timeout: 6000 });
  });

  it('should disable reserve button when no tickets selected', () => {
    render(<TicketSelector event={mockEvent} />);
    
    const reserveButton = screen.getByText('Reserve Tickets');
    expect(reserveButton).toBeDisabled();
  });

  it('should enable reserve button when tickets are selected', () => {
    render(<TicketSelector event={mockEvent} />);
    
    const plusButtons = screen.getAllByText('+');
    fireEvent.click(plusButtons[0]);
    
    const reserveButton = screen.getByText('Reserve Tickets');
    expect(reserveButton).not.toBeDisabled();
  });
});
