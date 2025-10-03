import { useMemo, type MutableRefObject } from 'react';
import { MapContainer, TileLayer, Marker, ZoomControl, useMap } from 'react-leaflet';
import { Fab } from '@mui/material';
import { MyLocation as MyLocationIcon } from '@mui/icons-material';
import L from 'leaflet';

import 'leaflet/dist/leaflet.css';

import type { CarparkLocation } from '../types/carpark';

type Anchor = { lat: number; lon: number } | null;

type CarparkMapProps = {
  center: [number, number];
  anchor: Anchor;
  carparks: CarparkLocation[];
  nearbyCarparkIds: Set<string>;
  focusedCarparkId: string | null;
  onMarkerSelect: (carpark: CarparkLocation) => void;
  onLocated: (lat: number, lon: number) => void;
  mapRef: MutableRefObject<L.Map | null>;
};

const createLocationIcon = () =>
  L.divIcon({
    className: 'location-marker',
    html: `<div style="background-color: #ff4081; color: white; border-radius: 50%; width: 36px; height: 36px; display: flex; justify-content: center; align-items: center; font-weight: bold; box-shadow: 0 0 10px rgba(0,0,0,0.3);">
             <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="#ffffff">
               <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
             </svg>
           </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
  });

const createCarparkIcon = (color: string) =>
  L.divIcon({
    className: 'carpark-marker',
    html: `<div style="background-color: ${color}; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; justify-content: center; align-items: center; font-weight: bold; box-shadow: 0 0 5px rgba(0,0,0,0.3);">
             <svg xmlns="http://www.w3.org/2000/svg" height="16" viewBox="0 0 24 24" width="16" fill="#ffffff">
               <path d="M13 3H6v18h4v-6h3c3.31 0 6-2.69 6-6s-2.69-6-6-6zm.2 8H10V7h3.2c1.1 0 2 .9 2 2s-.9 2-2 2z"/>
             </svg>
           </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

type LocationButtonProps = {
  onLocated?: (lat: number, lon: number) => void;
};

function LocationButton({ onLocated }: LocationButtonProps) {
  const map = useMap();

  const handleLocate = () => {
    map.locate({ setView: true, maxZoom: 16 });
    map.once('locationfound', (e: L.LocationEvent) => {
      onLocated?.(e.latlng.lat, e.latlng.lng);
    });
    map.once('locationerror', (err: L.ErrorEvent) => {
      console.error('定位失败：', err.message);
    });
  };

  return (
    <Fab
      color="primary"
      size="small"
      onClick={handleLocate}
      style={{
        position: 'absolute',
        top: '80px',
        right: '10px',
        zIndex: 1000,
        backgroundColor: '#4caf50',
      }}
      aria-label="定位到当前位置"
    >
      <MyLocationIcon fontSize="small" />
    </Fab>
  );
}

// 修复Leaflet默认图标
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export function CarparkMap({
  center,
  anchor,
  carparks,
  nearbyCarparkIds,
  focusedCarparkId,
  onMarkerSelect,
  onLocated,
  mapRef,
}: CarparkMapProps) {
  const locationIcon = useMemo(() => createLocationIcon(), []);
  const defaultCarparkIcon = useMemo(() => createCarparkIcon('#78909c'), []);
  const nearbyCarparkIcon = useMemo(() => createCarparkIcon('#4caf50'), []);
  const selectedCarparkIcon = useMemo(() => createCarparkIcon('#d32f2f'), []);

  return (
    <MapContainer
      center={center}
      zoom={15}
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
      ref={mapRef}
    >
      <ZoomControl position="topright" />
      <LocationButton onLocated={onLocated} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {anchor && (
        <Marker position={[anchor.lat, anchor.lon]} icon={locationIcon} />
      )}

      {carparks.map((carpark) => {
        const isFocused = focusedCarparkId === carpark.id;
        const isNearby = nearbyCarparkIds.has(carpark.id);
        const icon = isFocused
          ? selectedCarparkIcon
          : isNearby
            ? nearbyCarparkIcon
            : defaultCarparkIcon;

        return (
          <Marker
            key={carpark.id}
            position={[carpark.latitude, carpark.longitude]}
            icon={icon}
            eventHandlers={{
              click: () => onMarkerSelect(carpark),
            }}
          />
        );
      })}
    </MapContainer>
  );
}
