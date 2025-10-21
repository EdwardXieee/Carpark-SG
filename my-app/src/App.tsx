import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, AppBar, Toolbar, Typography, ThemeProvider, createTheme } from '@mui/material';
import type { Map as LeafletMap } from 'leaflet';

import SearchBox from './SearchBox';
import { CarparkMap } from './components/CarparkMap';
import { CarparkSidebar } from './components/CarparkSidebar';
import './App.css';

import { useCarparkLocations } from './hooks/useCarparkLocations';
import { useNearbyCarparks } from './hooks/useNearbyCarparks';
import type { NearbyCarpark } from './types/carpark';
import { TimeSelection } from './components/TimeSelection';
import { getDistanceInKm } from './utils/geo';
import VehicleTypeSelection from './components/VehicleTypeSelection';

type Anchor = { lat: number; lon: number } | null;
type SortBy = 'distance' | 'price';

const theme = createTheme({
  palette: {
    primary: {
      main: '#4caf50',
      light: '#80e27e',
      dark: '#087f23',
    },
    background: {
      default: '#e8f5e9',
    },
  },
});

const formatDate = (date: Date) => {
  const pad = (num: number) => num.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

function App() {
  const [sortBy, setSortBy] = useState<SortBy>('distance');
  const [mapCenter, setMapCenter] = useState<[number, number]>([1.2949927, 103.7733938]);
  const mapRef = useRef<LeafletMap | null>(null);

  const [selectedLocation, setSelectedLocation] = useState<Anchor>(null);
  const [currentLocation, setCurrentLocation] = useState<Anchor>(null);
  const anchor = currentLocation ?? selectedLocation;

  const [startTime, setStartTime] = useState(() => new Date());
  const [endTime, setEndTime] = useState(() => new Date(new Date().getTime() + 60 * 60 * 1000));
  const [vehicleType, setVehicleType] = useState('C');

  useEffect(() => {
    setSelectedLocation({ lat: mapCenter[0], lon: mapCenter[1] });
  }, []);

  const carparks = useCarparkLocations();
  const { nearbyCarparks, loading: nearbyLoading } = useNearbyCarparks(carparks, anchor, startTime, endTime, vehicleType);

  const [focusedCarparkId, setFocusedCarparkId] = useState<string | null>(null);
  const [focusedCarpark, setFocusedCarpark] = useState<NearbyCarpark | null>(null);

  useEffect(() => {
    if (!focusedCarparkId) {
      setFocusedCarpark(null);
      return;
    }

    const carparkLocation = carparks.find((c) => c.id === focusedCarparkId);
    if (!carparkLocation) {
      setFocusedCarpark(null);
      return;
    }

    const fetchDetails = async () => {
      setFocusedCarpark(null); // Show loading state
      try {
        const requestBody = {
          parkingStartTime: formatDate(startTime),
          parkingEndTime: formatDate(endTime),
          carParkIds: [focusedCarparkId],
          lotType: vehicleType,
        };

        const [lotsResponse, ratesResponse, infoResponse] = await Promise.all([
          fetch('/api/car-park/query/lots', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
          }),
          fetch('/api/car-park/query/parking-rate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
          }),
          fetch('/api/car-park/query/info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
          }),
        ]);

        const lotsData = await lotsResponse.json();
        const ratesData = await ratesResponse.json();
        const infoData = await infoResponse.json();

        const lotsInfo = lotsData.data?.find((d: any) => d.id === focusedCarparkId);
        const ratesInfo = ratesData.data?.find((d: any) => d.id === focusedCarparkId);
        const info = infoData.data?.[0];

        const distanceKm = anchor
          ? getDistanceInKm(anchor.lat, anchor.lon, carparkLocation.latitude, carparkLocation.longitude)
          : 0;

        const detailedCarpark: NearbyCarpark = {
          ...carparkLocation,
          distanceKm,
          totalLots: lotsInfo?.lots[0]?.total ?? null,
          availableLots: lotsInfo?.lots[0]?.available ?? null,
          estimatedFee: ratesInfo?.rates[0]?.estimatedFee ?? null,
          ...info,
        };

        setFocusedCarpark(detailedCarpark);
      } catch (error) {
        console.error('Failed to fetch carpark details:', error);
        const fallbackCarpark: NearbyCarpark = {
          ...carparkLocation,
          distanceKm: anchor ? getDistanceInKm(anchor.lat, anchor.lon, carparkLocation.latitude, carparkLocation.longitude) : 0,
          totalLots: null,
          availableLots: null,
          estimatedFee: null,
        };
        setFocusedCarpark(fallbackCarpark);
      }
    };

    fetchDetails();
  }, [focusedCarparkId, carparks, anchor, startTime, endTime, vehicleType]);

  const sortedNearbyCarparks = useMemo(() => {
    const sorted = [...nearbyCarparks];
    if (sortBy === 'price') {
      return sorted.sort((a, b) => (a.estimatedFee ?? Infinity) - (b.estimatedFee ?? Infinity));
    }
    return sorted.sort((a, b) => a.distanceKm - b.distanceKm);
  }, [nearbyCarparks, sortBy]);

  const nearbyCarparkIds = useMemo(
    () => new Set(nearbyCarparks.map((carpark) => carpark.id)),
    [nearbyCarparks],
  );

  const handleSortChange = (
    _event: React.MouseEvent<HTMLElement>,
    value: SortBy,
  ) => {
    if (value) {
      setSortBy(value);
    }
  };

  const panTo = (lat: number, lon: number, zoom = 17) => {
    const target: [number, number] = [lat, lon];
    setMapCenter(target);
    mapRef.current?.setView(target, zoom);
  };

  const handleSearch = async (query: string) => {
    if (query.trim() === '') {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            handleLocate(position.coords.latitude, position.coords.longitude);
          },
          (error) => {
            console.error('Geolocation error:', error);
          }
        );
      } else {
        console.error('Geolocation is not supported by this browser.');
      }
    } else {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=sg`
        );
        const data = await response.json();
        if (data && data.length > 0) {
          const result = data[0];
          handleSearchSelect({ lat: parseFloat(result.lat), lon: parseFloat(result.lon) });
        }
      } catch (error) {
        console.error('Geocoding error:', error);
      }
    }
  };

  const handleListItemSelect = (carpark: NearbyCarpark) => {
    setFocusedCarparkId(carpark.id);
    panTo(carpark.latitude, carpark.longitude, 17);
  };

  const handleMarkerSelect = (carparkId: string, lat: number, lon: number) => {
    setFocusedCarparkId(carparkId);
    panTo(lat, lon, 17);
  };

  const handleCloseDetails = () => {
    setFocusedCarparkId(null);
    if (anchor) {
      panTo(anchor.lat, anchor.lon, 16);
    }
  };

  const handleLocate = (lat: number, lon: number) => {
    setCurrentLocation({ lat, lon });
    setSelectedLocation(null);
    setFocusedCarparkId(null);
    panTo(lat, lon, 16);
  };

  const handleSearchSelect = (result: { lat: number; lon: number }) => {
    setCurrentLocation(null);
    setSelectedLocation({ lat: result.lat, lon: result.lon });
    setFocusedCarparkId(null);
    panTo(result.lat, result.lon, 15);
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
        <AppBar position="static" color="primary" elevation={0}>
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1, color: 'white', fontWeight: 'bold' }}>
              SG Car Park Finder+
            </Typography>
          </Toolbar>
        </AppBar>

        <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)' }}>
          <Box sx={{ position: 'relative', flexGrow: 1, height: '100%' }}>
            <Box sx={{ 
                position: 'absolute', top: 20, left: 20, zIndex: 1000, 
                p: 2, bgcolor: 'rgba(255, 255, 255, 0.9)', borderRadius: 2, boxShadow: 3, 
                display: 'flex', flexDirection: 'column', gap: 2,
                width: 500
              }}>
              <SearchBox 
                onSelectResult={handleSearchSelect} 
                middleContent={<VehicleTypeSelection vehicleType={vehicleType} setVehicleType={setVehicleType} />}
                onSearchClick={handleSearch}
              />
              <TimeSelection
                startTime={startTime}
                endTime={endTime}
                onStartTimeChange={setStartTime}
                onEndTimeChange={setEndTime}
              />
            </Box>

            <CarparkMap
              center={mapCenter}
              anchor={anchor}
              carparks={carparks}
              nearbyCarparkIds={nearbyCarparkIds}
              focusedCarparkId={focusedCarparkId}
              onMarkerSelect={(carpark) => handleMarkerSelect(carpark.id, carpark.latitude, carpark.longitude)}
              onLocated={handleLocate}
              mapRef={mapRef}
            />
          </Box>

          <CarparkSidebar
            sortBy={sortBy}
            onSortChange={handleSortChange}
            nearbyCarparks={sortedNearbyCarparks}
            focusedCarpark={focusedCarpark}
            onSelectCarpark={handleListItemSelect}
            onCloseDetails={handleCloseDetails}
            anchor={anchor}
            isLoading={nearbyLoading}
            focusedCarparkId={focusedCarparkId}
          />
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;