'use client';

import { MapContainer, TileLayer, Marker, Popup, useMapEvents, FeatureGroup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import { FieldSummary } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { fieldApi } from '@/lib/api';
import { useMemo, useRef, useState } from 'react';
import { EditControl } from 'react-leaflet-draw';

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

type Bbox = {
  minLat: number;
  minLon: number;
  maxLat: number;
  maxLon: number;
};

type FilterMode = 'bbox' | 'nearby' | 'polygon';

export default function FieldMap({ fields }: FieldMapProps) {
  const center: [number, number] = fields.length > 0
    ? [fields[0].location.latitude, fields[0].location.longitude]
    : [37.0902, -95.7129]; // Default center

  const [bbox, setBbox] = useState<Bbox | null>(null);
  const debounceRef = useRef<number | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>('bbox');
  const [radiusMeters, setRadiusMeters] = useState(5000);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lon: number } | null>(null);
  const [polygon, setPolygon] = useState<any | null>(null);

  const bboxKey = useMemo(() => {
    if (!bbox) return null;
    return `${bbox.minLat},${bbox.minLon},${bbox.maxLat},${bbox.maxLon}`;
  }, [bbox]);

  const { data: bboxFields } = useQuery({
    queryKey: ['fields-bbox', bboxKey],
    queryFn: async () => {
      if (!bbox) return [];
      const response = await fieldApi.getByBbox(bbox);
      return response.data;
    },
    enabled: !!bbox,
  });

  const nearbyKey = useMemo(() => {
    if (!mapCenter) return null;
    return `${mapCenter.lat},${mapCenter.lon},${radiusMeters}`;
  }, [mapCenter, radiusMeters]);

  const { data: nearbyFields } = useQuery({
    queryKey: ['fields-nearby', nearbyKey],
    queryFn: async () => {
      if (!mapCenter) return [];
      const response = await fieldApi.getByNearby({
        lat: mapCenter.lat,
        lon: mapCenter.lon,
        radiusMeters,
      });
      return response.data;
    },
    enabled: filterMode === 'nearby' && !!mapCenter,
  });

  const polygonKey = useMemo(() => {
    if (!polygon) return null;
    return JSON.stringify(polygon);
  }, [polygon]);

  const { data: polygonFields } = useQuery({
    queryKey: ['fields-polygon', polygonKey],
    queryFn: async () => {
      if (!polygon) return [];
      const response = await fieldApi.getByPolygon({ polygon });
      return response.data;
    },
    enabled: filterMode === 'polygon' && !!polygon,
  });

  const mapFields: FieldSummary[] =
    filterMode === 'polygon'
      ? (polygonFields ?? [])
      : filterMode === 'nearby'
        ? (nearbyFields ?? [])
        : (bboxFields ?? fields);

  const updateBbox = (map: L.Map) => {
    const bounds = map.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();

    const round = (value: number) => Math.round(value * 1e6) / 1e6;
    setBbox({
      minLat: round(sw.lat),
      minLon: round(sw.lng),
      maxLat: round(ne.lat),
      maxLon: round(ne.lng),
    });
    const center = map.getCenter();
    setMapCenter({ lat: round(center.lat), lon: round(center.lng) });
  };

  const BboxTracker = () => {
    useMapEvents({
      load: (event) => updateBbox(event.target),
      moveend: (event) => {
        if (debounceRef.current) {
          window.clearTimeout(debounceRef.current);
        }
        debounceRef.current = window.setTimeout(() => updateBbox(event.target), 200);
      },
      zoomend: (event) => {
        if (debounceRef.current) {
          window.clearTimeout(debounceRef.current);
        }
        debounceRef.current = window.setTimeout(() => updateBbox(event.target), 200);
      },
    });
    return null;
  };

  return (
    <MapContainer
      center={center}
      zoom={12}
      scrollWheelZoom={false}
      className="h-full w-full rounded-lg"
    >
      <div className="absolute top-3 left-3 z-[1000] bg-white shadow-sm border rounded-lg p-2 space-y-2">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setFilterMode('bbox')}
            className={`px-2 py-1 text-xs rounded ${
              filterMode === 'bbox' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Viewport
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('nearby')}
            className={`px-2 py-1 text-xs rounded ${
              filterMode === 'nearby' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Nearby
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('polygon')}
            className={`px-2 py-1 text-xs rounded ${
              filterMode === 'polygon' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Polygon
          </button>
        </div>

        {filterMode === 'nearby' && (
          <div className="flex items-center space-x-2">
            <label className="text-xs text-gray-600" htmlFor="radius-meters">
              Radius (m)
            </label>
            <input
              id="radius-meters"
              type="number"
              min={100}
              step={100}
              value={radiusMeters}
              onChange={(event) => setRadiusMeters(Number(event.target.value))}
              className="w-24 border border-gray-300 rounded px-2 py-1 text-xs"
            />
          </div>
        )}
      </div>

      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <BboxTracker />

      <FeatureGroup>
        <EditControl
          position="topright"
          draw={{
            rectangle: false,
            circle: false,
            circlemarker: false,
            marker: false,
            polyline: false,
            polygon: true,
          }}
          edit={{
            remove: true,
            edit: true,
          }}
          onCreated={(event: any) => {
            if (event.layerType !== 'polygon') return;
            const geojson = event.layer.toGeoJSON();
            setPolygon(geojson.geometry);
            setFilterMode('polygon');
          }}
          onEdited={(event: any) => {
            const layers = event.layers.getLayers();
            const layer = layers[0];
            if (!layer) return;
            const geojson = (layer as any).toGeoJSON() as any;
            setPolygon(geojson.geometry);
          }}
          onDeleted={() => {
            setPolygon(null);
            if (filterMode === 'polygon') {
              setFilterMode('bbox');
            }
          }}
        />
      </FeatureGroup>
      
      {mapFields.map((field) => (
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
