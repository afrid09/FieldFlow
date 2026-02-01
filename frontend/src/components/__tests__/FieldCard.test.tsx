import { render, screen } from '@testing-library/react';
import FieldCard from '../FieldCard';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

const field = {
  fieldId: 'field-1',
  fieldName: 'North Field',
  cropType: 'Corn',
  areaHectares: 15,
  status: 'active',
  location: { latitude: 1, longitude: 2 },
  predictedYield: 120,
  latestPh: 6.8,
  latestNitrogen: 12,
  latestAnalysis: 'Looks good',
};

describe('FieldCard', () => {
  it('renders core field details', () => {
    render(<FieldCard field={field as any} />);
    expect(screen.getByText('North Field')).toBeInTheDocument();
    expect(screen.getByText('Corn')).toBeInTheDocument();
    expect(screen.getByText('15 hectares')).toBeInTheDocument();
  });
});
