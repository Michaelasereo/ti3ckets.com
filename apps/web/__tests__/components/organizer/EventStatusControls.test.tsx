import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EventStatusControls from '@/components/organizer/EventStatusControls';
import { organizerApi } from '@/lib/api';

jest.mock('@/lib/api', () => ({
  organizerApi: {
    updateEventStatus: jest.fn(),
  },
}));

describe('EventStatusControls', () => {
  const mockOnStatusChange = jest.fn();
  const mockEventId = 'event-123';

  beforeEach(() => {
    jest.clearAllMocks();
    (organizerApi.updateEventStatus as jest.Mock).mockResolvedValue({
      data: { success: true },
    });
  });

  it('renders current status correctly', () => {
    render(
      <EventStatusControls
        eventId={mockEventId}
        currentStatus="DRAFT"
        onStatusChange={mockOnStatusChange}
      />
    );

    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('shows valid status transitions for DRAFT', () => {
    render(
      <EventStatusControls
        eventId={mockEventId}
        currentStatus="DRAFT"
        onStatusChange={mockOnStatusChange}
      />
    );

    expect(screen.getByText(/Mark as Published/i)).toBeInTheDocument();
    expect(screen.getByText(/Mark as Cancelled/i)).toBeInTheDocument();
  });

  it('shows terminal state message for CANCELLED', () => {
    render(
      <EventStatusControls
        eventId={mockEventId}
        currentStatus="CANCELLED"
        onStatusChange={mockOnStatusChange}
      />
    );

    expect(screen.getByText(/terminal state/i)).toBeInTheDocument();
  });

  it('calls API and updates status on transition', async () => {
    const user = userEvent.setup();
    
    render(
      <EventStatusControls
        eventId={mockEventId}
        currentStatus="DRAFT"
        onStatusChange={mockOnStatusChange}
      />
    );

    const publishButton = screen.getByText(/Mark as Published/i);
    
    // Mock window.confirm
    window.confirm = jest.fn(() => true);
    
    await user.click(publishButton);

    await waitFor(() => {
      expect(organizerApi.updateEventStatus).toHaveBeenCalledWith(mockEventId, 'PUBLISHED');
    });
  });
});
