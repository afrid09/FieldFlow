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
    render(<NotificationPanel notifications={[]} onClose={onClose} />);
    expect(screen.getByText('No notifications')).toBeInTheDocument();
    fireEvent.click(screen.getByText('No notifications').closest('div')!);
    expect(onClose).toHaveBeenCalled();
  });
});
