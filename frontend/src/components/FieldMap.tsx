'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FieldSummary } from '@/types';

// Fix for default marker icon in Next.js
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}

interface FieldMapProps {
  fields: FieldSummary[];
}

export default function FieldMap({ fields }: FieldMapProps) {
  const center: [number, number] = fields.length > 0
    ? [fields[0].location.latitude, fields[0].location.longitude]
    : [37.0902, -95.7129]; // Default center

  return (
    <MapContainer
      center={center}
      zoom={12}
      scrollWheelZoom={false}
      className="h-full w-full rounded-lg"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {fields.map((field) => (
        <Marker
          key={field.fieldId}
          position={[field.location.latitude, field.location.longitude]}
        >
          <Popup>
            <div className="p-2">
              <h3 className="font-semibold">{field.fieldName}</h3>
              <p className="text-sm text-gray-600">{field.cropType}</p>
              <p className="text-sm">{field.areaHectares} hectares</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
