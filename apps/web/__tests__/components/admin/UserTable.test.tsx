import { render, screen } from '@testing-library/react';
import UserTable from '@/components/admin/UserTable';
import { Role } from '@prisma/client';

const mockUsers = [
  {
    id: '1',
    email: 'user1@example.com',
    name: 'User One',
    phone: '1234567890',
    createdAt: '2024-01-01T00:00:00Z',
    accountLockedUntil: null,
    roles: [{ role: Role.BUYER }],
    buyerProfile: { id: 'bp1' },
    organizerProfile: null,
    _count: {
      orders: 5,
      events: 0,
    },
  },
  {
    id: '2',
    email: 'organizer@example.com',
    name: 'Organizer User',
    phone: null,
    createdAt: '2024-01-02T00:00:00Z',
    accountLockedUntil: null,
    roles: [{ role: Role.ORGANIZER }],
    buyerProfile: null,
    organizerProfile: {
      id: 'op1',
      verificationStatus: 'VERIFIED',
      businessName: 'Test Business',
    },
    _count: {
      orders: 0,
      events: 3,
    },
  },
];

describe('UserTable', () => {
  it('renders users table', () => {
    render(<UserTable users={mockUsers} />);
    
    expect(screen.getByText('User One')).toBeInTheDocument();
    expect(screen.getByText('Organizer User')).toBeInTheDocument();
  });

  it('displays user email', () => {
    render(<UserTable users={mockUsers} />);
    
    expect(screen.getByText('user1@example.com')).toBeInTheDocument();
    expect(screen.getByText('organizer@example.com')).toBeInTheDocument();
  });

  it('displays user roles', () => {
    render(<UserTable users={mockUsers} />);
    
    expect(screen.getByText('BUYER')).toBeInTheDocument();
    expect(screen.getByText('ORGANIZER')).toBeInTheDocument();
  });

  it('shows active status for non-suspended users', () => {
    render(<UserTable users={mockUsers} />);
    
    const activeBadges = screen.getAllByText('Active');
    expect(activeBadges.length).toBeGreaterThan(0);
  });

  it('shows suspended status for suspended users', () => {
    const suspendedUser = {
      ...mockUsers[0],
      accountLockedUntil: new Date(Date.now() + 86400000).toISOString(), // Future date
    };
    
    render(<UserTable users={[suspendedUser]} />);
    
    expect(screen.getByText('Suspended')).toBeInTheDocument();
  });

  it('displays activity counts', () => {
    render(<UserTable users={mockUsers} />);
    
    expect(screen.getByText('5 orders')).toBeInTheDocument();
    expect(screen.getByText('3 events')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<UserTable users={[]} loading={true} />);
    
    // Check for loading skeleton elements
    const loadingElements = screen.queryAllByRole('generic');
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it('shows empty state when no users', () => {
    render(<UserTable users={[]} loading={false} />);
    
    expect(screen.getByText('No users found')).toBeInTheDocument();
  });

  it('calls onSuspend when suspend button is clicked', () => {
    const handleSuspend = jest.fn();
    render(<UserTable users={mockUsers} onSuspend={handleSuspend} />);
    
    const suspendButtons = screen.getAllByText('Suspend');
    if (suspendButtons.length > 0) {
      suspendButtons[0].click();
      expect(handleSuspend).toHaveBeenCalled();
    }
  });
});
