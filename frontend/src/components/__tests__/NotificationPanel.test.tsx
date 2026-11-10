import { render, screen, fireEvent } from '@testing-library/react';
import NotificationPanel from '../NotificationPanel';

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
  useMutation: () => ({ mutate: jest.fn() }),
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <div>{children}</div>,
}));

describe('NotificationPanel', () => {
  it('renders empty state and closes on backdrop click', () => {
    const onClose = jest.fn();
    const { container } = render(<NotificationPanel notifications={[]} onClose={onClose} />);
    expect(screen.getByText('No notifications')).toBeInTheDocument();

    // Clicks inside the panel must not close it
    fireEvent.click(screen.getByText('No notifications'));
    expect(onClose).not.toHaveBeenCalled();

    // Clicking the backdrop closes it
    fireEvent.click(container.querySelector('.fixed.inset-0')!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
