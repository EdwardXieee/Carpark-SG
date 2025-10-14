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
import { getDistanceInKm } from './utils/geo';
import { generateMockDetails } from './utils/mockCarparkDetails';
import { TimeSelection } from './components/TimeSelection';

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

function App() {
  const [sortBy, setSortBy] = useState<SortBy>('distance');
  const [mapCenter, setMapCenter] = useState<[number, number]>([1.2949927, 103.7733938]);
  const mapRef = useRef<LeafletMap | null>(null);

  const [selectedLocation, setSelectedLocation] = useState<Anchor>(null);
  const [currentLocation, setCurrentLocation] = useState<Anchor>(null);
  const anchor = currentLocation ?? selectedLocation;

  const [startTime, setStartTime] = useState(() => new Date());
  const [endTime, setEndTime] = useState(() => new Date(new Date().getTime() + 60 * 60 * 1000));

  useEffect(() => {
    setSelectedLocation({ lat: mapCenter[0], lon: mapCenter[1] });
  }, []);

  const carparks = useCarparkLocations();
  const nearbyCarparks = useNearbyCarparks(carparks, anchor);

  const [focusedCarparkId, setFocusedCarparkId] = useState<string | null>(null);

  useEffect(() => {
    if (!focusedCarparkId) {
      return;
    }

    const exists = carparks.some((carpark) => carpark.id === focusedCarparkId);
    if (!exists) {
      setFocusedCarparkId(null);
      if (anchor) {
        const anchorPosition: [number, number] = [anchor.lat, anchor.lon];
        setMapCenter(anchorPosition);
        mapRef.current?.setView(anchorPosition, 16);
      }
    }
  }, [carparks, focusedCarparkId, anchor]);

  const [centerLat, centerLon] = mapCenter;

  const focusedCarpark = useMemo(() => {
    if (!focusedCarparkId) {
      return null;
    }

    const location = carparks.find((carpark) => carpark.id === focusedCarparkId);
    if (!location) {
      return null;
    }

    const baseLat = anchor?.lat ?? centerLat;
    const baseLon = anchor?.lon ?? centerLon;
    const distanceKm = getDistanceInKm(baseLat, baseLon, location.latitude, location.longitude);
    return generateMockDetails(location, distanceKm);
  }, [focusedCarparkId, carparks, anchor, centerLat, centerLon]);

  const sortedNearbyCarparks = useMemo(() => {
    const sorted = [...nearbyCarparks];
    if (sortBy === 'price') {
      return sorted.sort((a, b) => a.price - b.price);
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
            <Box sx={{ position: 'absolute', top: 20, left: 20, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <SearchBox onSelectResult={handleSearchSelect} />
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
          />
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;

