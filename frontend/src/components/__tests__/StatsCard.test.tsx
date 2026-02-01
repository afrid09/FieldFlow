import { render, screen } from '@testing-library/react';
import StatsCard from '../StatsCard';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('StatsCard', () => {
  it('renders title and value', () => {
    render(<StatsCard title="Fields" value={12} icon={<span>icon</span>} color="blue" />);
    expect(screen.getByText('Fields')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });
});
