import { render, screen } from '@testing-library/react';
import RecentActivity from '../RecentActivity';

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

const { useQuery } = jest.requireMock('@tanstack/react-query');

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('RecentActivity', () => {
  it('shows empty state when there is no activity', () => {
    useQuery.mockReturnValue({ data: [], isLoading: false });
    render(<RecentActivity />);
    expect(screen.getByText('No recent activity')).toBeInTheDocument();
  });
});
