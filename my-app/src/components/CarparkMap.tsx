import { useMemo, type MutableRefObject } from 'react';
import { MapContainer, TileLayer, Marker, ZoomControl, useMap, Circle, Popup } from 'react-leaflet';
import { Box, Typography, Fab } from '@mui/material';
import { MyLocation as MyLocationIcon } from '@mui/icons-material';
import L from 'leaflet';

import 'leaflet/dist/leaflet.css';

import type { CarparkLocation, CarparkOccupancy } from '../types/carpark';

type Anchor = { lat: number; lon: number } | null;

type CarparkMapProps = {
  center: [number, number];
  anchor: Anchor;
  carparks: CarparkLocation[];
  nearbyCarparkIds: Set<string>;
  focusedCarparkId: string | null;
  availability: Record<string, CarparkOccupancy>;
  onMarkerSelect: (carpark: CarparkLocation) => void;
  onLocated: (lat: number, lon: number) => void;
  mapRef: MutableRefObject<L.Map | null>;
  searchRadiusKm: number;
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

const CONGESTION_LEVELS = ['low', 'medium', 'high', 'unknown'] as const;
const MARKER_STATES = ['default', 'nearby', 'focused'] as const;

type CongestionLevel = typeof CONGESTION_LEVELS[number];
type MarkerState = typeof MARKER_STATES[number];

const LEVEL_COLORS: Record<CongestionLevel, string> = {
  low: '#b9f6ca', // very light green – many lots available
  medium: '#66bb6a', // medium green – moderate availability
  high: '#1b5e20', // deep green – crowded
  unknown: '#78909c',
};

const STATE_STYLES: Record<
  MarkerState,
  {
    size: number;
    borderColor: string;
    borderWidth: number;
  }
> = {
  default: { size: 28, borderColor: '#ffffff', borderWidth: 2 },
  nearby: { size: 30, borderColor: '#4caf50', borderWidth: 3 },
  focused: { size: 34, borderColor: '#1b5e20', borderWidth: 4 },
};

const createCarparkIcon = (params: {
  fillColor: string;
  borderColor: string;
  borderWidth: number;
  size: number;
}) => {
  const { fillColor, borderColor, borderWidth, size } = params;
  const anchor = size / 2;

  return L.divIcon({
    className: 'carpark-marker',
    html: `<div style="background-color: ${fillColor}; color: #ffffff; border-radius: 50%; width: ${size}px; height: ${size}px; border: ${borderWidth}px solid ${borderColor}; display: flex; justify-content: center; align-items: center; font-weight: 700; box-shadow: 0 0 6px rgba(0, 0, 0, 0.35); font-size: ${Math.round(
      size * 0.5,
    )}px;">P</div>`,
    iconSize: [size, size],
    iconAnchor: [anchor, anchor],
  });
};

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
      console.error('Unable to locate current position:', err.message);
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
      aria-label="Go to current location"
    >
      <MyLocationIcon fontSize="small" />
    </Fab>
  );
}

// Fix default Leaflet marker assets
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
  availability,
  onMarkerSelect,
  onLocated,
  mapRef,
  searchRadiusKm,
}: CarparkMapProps) {
  const locationIcon = useMemo(() => createLocationIcon(), []);
  const defaultOccupancy: CarparkOccupancy = useMemo(
    () => ({
      availableLots: null,
      totalLots: null,
      lotType: null,
      occupancyRatio: null,
      congestionLevel: 'unknown',
    }),
    [],
  );
  const markerIcons = useMemo(() => {
    const iconMap = new Map<string, L.DivIcon>();

    CONGESTION_LEVELS.forEach((level) => {
      MARKER_STATES.forEach((state) => {
        const style = STATE_STYLES[state];
        iconMap.set(
          `${level}-${state}`,
          createCarparkIcon({
            fillColor: LEVEL_COLORS[level],
            borderColor: style.borderColor,
            borderWidth: style.borderWidth,
            size: style.size,
          }),
        );
      });
    });

    return iconMap;
  }, []);

  const legendItems = useMemo(
    () => [
      { label: '≥ 60% lots free', color: LEVEL_COLORS.low },
      { label: '30%–59% lots free', color: LEVEL_COLORS.medium },
      { label: '< 30% lots free', color: LEVEL_COLORS.high },
      { label: 'No live data', color: LEVEL_COLORS.unknown },
    ],
    [],
  );

  return (
    <Box sx={{ position: 'relative', height: '100%', width: '100%' }}>
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
        <>
          <Marker position={[anchor.lat, anchor.lon]} icon={locationIcon} />
          <Circle
            center={[anchor.lat, anchor.lon]}
            radius={searchRadiusKm * 1000}
            pathOptions={{ color: '#4caf50', fillColor: '#4caf50', fillOpacity: 0.08, weight: 1 }}
          />
        </>
      )}

      {carparks.map((carpark) => {
        const isFocused = focusedCarparkId === carpark.id;
        const isNearby = nearbyCarparkIds.has(carpark.id);
        const occupancy = availability[carpark.id] ?? defaultOccupancy;
        const level: CongestionLevel = occupancy?.congestionLevel ?? 'unknown';
        const state: MarkerState = isFocused ? 'focused' : isNearby ? 'nearby' : 'default';
        const iconKey = `${level}-${state}`;
        const fallbackKey = `unknown-${state}`;
        const icon =
          markerIcons.get(iconKey) ??
          markerIcons.get(fallbackKey) ??
          markerIcons.get('unknown-default')!;
        const title =
          occupancy && occupancy.availableLots !== null
            ? occupancy.totalLots !== null
              ? `${occupancy.availableLots}/${occupancy.totalLots} lots available (type ${occupancy.lotType ?? 'N/A'})`
              : `${occupancy.availableLots} lots available`
            : 'Availability unavailable';

        return (
          <Marker
            key={carpark.id}
            position={[carpark.latitude, carpark.longitude]}
            icon={icon}
            riseOnHover
            title={title}
            eventHandlers={{
              click: () => onMarkerSelect(carpark),
            }}
          >
            <Popup>
              <div style={{ minWidth: 180 }}>
                <strong>{carpark.id}</strong>
                <br />
                {occupancy?.availableLots !== null && occupancy?.totalLots !== null ? (
                  <>
                    {occupancy.availableLots}/{occupancy.totalLots} lots available
                    <br />
                    {occupancy.occupancyRatio !== null
                      ? `Vacancy ${(occupancy.occupancyRatio * 100).toFixed(0)}%`
                      : 'Vacancy unknown'}
                  </>
                ) : (
                  'Live availability unavailable'
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
      </MapContainer>

      <Box
        sx={{
          position: 'absolute',
          right: 12,
          bottom: 12,
          bgcolor: 'rgba(255, 255, 255, 0.9)',
          borderRadius: 1.5,
          boxShadow: 3,
          p: 1.5,
          minWidth: 190,
          color: '#37474f',
          pointerEvents: 'auto',
          zIndex: 1200,
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
          Marker colours
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Coloured “P” markers indicate free-lot ratio
        </Typography>
        <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          {legendItems.map((item) => (
            <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  bgcolor: item.color,
                  border: '2px solid #ffffff',
                  boxShadow: '0 0 4px rgba(0,0,0,0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.65rem',
                  color: '#ffffff',
                }}
              >
                P
              </Box>
              <Typography variant="caption">{item.label}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
