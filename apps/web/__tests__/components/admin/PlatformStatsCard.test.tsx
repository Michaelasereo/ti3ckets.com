import { render, screen } from '@testing-library/react';
import PlatformStatsCard from '@/components/admin/PlatformStatsCard';

describe('PlatformStatsCard', () => {
  it('renders title and value', () => {
    render(<PlatformStatsCard title="Total Users" value="1,234" />);
    
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('1,234')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(
      <PlatformStatsCard
        title="Total Revenue"
        value="₦100,000"
        subtitle="From all paid orders"
      />
    );
    
    expect(screen.getByText('From all paid orders')).toBeInTheDocument();
  });

  it('renders trend information when provided', () => {
    render(
      <PlatformStatsCard
        title="Total Users"
        value="1,234"
        trend={{ value: 10, isPositive: true }}
      />
    );
    
    expect(screen.getByText(/↑ 10%/)).toBeInTheDocument();
    expect(screen.getByText(/vs last month/)).toBeInTheDocument();
  });

  it('renders negative trend correctly', () => {
    render(
      <PlatformStatsCard
        title="Total Users"
        value="1,234"
        trend={{ value: 5, isPositive: false }}
      />
    );
    
    expect(screen.getByText(/↓ 5%/)).toBeInTheDocument();
  });

  it('renders numeric values correctly', () => {
    render(<PlatformStatsCard title="Total Events" value={42} />);
    
    expect(screen.getByText('42')).toBeInTheDocument();
  });
});
