import { render, screen } from '@testing-library/react';
import FieldMap from '../FieldMap';

jest.mock('leaflet', () => {
  const IconDefault = function () {};
  (IconDefault as any).prototype = {};
  (IconDefault as any).mergeOptions = jest.fn();
  return { Icon: { Default: IconDefault } };
});

jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) => <div>{children}</div>,
  TileLayer: () => null,
  Marker: ({ children }: any) => <div>{children}</div>,
  Popup: ({ children }: any) => <div>{children}</div>,
  FeatureGroup: ({ children }: any) => <div>{children}</div>,
  useMapEvents: () => null,
}));

jest.mock('react-leaflet-draw', () => ({
  EditControl: () => null,
}));

describe('FieldMap', () => {
  it('renders filter mode buttons', () => {
    render(
      <FieldMap
        fields={[
          {
            fieldId: 'field-1',
            fieldName: 'North Field',
            cropType: 'Corn',
            areaHectares: 10,
            status: 'active',
            location: { latitude: 1, longitude: 2 },
          } as any,
        ]}
      />
    );

    expect(screen.getByText('Viewport')).toBeInTheDocument();
    expect(screen.getByText('Nearby')).toBeInTheDocument();
    expect(screen.getByText('Polygon')).toBeInTheDocument();
  });
});
