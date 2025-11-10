import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  ThemeProvider,
  createTheme,
  Button,
  Avatar,
  Tooltip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Logout as LogoutIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
} from '@mui/icons-material';
import type { Map as LeafletMap } from 'leaflet';

import SearchBox from './components/SearchBox';
import { CarparkMap } from './components/CarparkMap';
import { CarparkSidebar } from './components/CarparkSidebar';
import { LoginDialog } from './components/LoginDialog';
import { FavoritesDrawer } from './components/FavoritesDrawer';
import './App.css';

import { useCarparkAvailability } from './hooks/useCarparkAvailability';
import { useCarparkLocations } from './hooks/useCarparkLocations';
import { useNearbyCarparks } from './hooks/useNearbyCarparks';
import type { CarparkOccupancy, NearbyCarpark } from './types/carpark';
import { TimeSelection } from './components/TimeSelection';
import { getDistanceInKm } from './utils/geo';
import VehicleTypeSelection from './components/VehicleTypeSelection';
import { md5 } from './utils/md5';

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

const computeCongestionLevel = (ratio: number | null) => {
  if (ratio === null) {
    return 'unknown';
  }
  if (ratio >= 0.6) return 'low';
  if (ratio >= 0.3) return 'medium';
  return 'high';
};

const computeOccupancyRatio = (available: number | null, total: number | null) => {
  if (available === null || total === null || total === 0) {
    return null;
  }
  return available / total;
};

type Anchor = { lat: number; lon: number } | null;
type SortBy = 'distance' | 'price' | 'availability';
type AuthState = {
  isAuthenticated: boolean;
  email: string | null;
  appToken: string | null;
  googleToken: string | null;
};

function App() {
  const [sortBy, setSortBy] = useState<SortBy>('distance');
  const [mapCenter, setMapCenter] = useState<[number, number]>([1.319042, 103.765362]);
  const mapRef = useRef<LeafletMap | null>(null);
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    email: null,
    appToken: null,
    googleToken: null,
  });
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [profileMenuAnchor, setProfileMenuAnchor] = useState<null | HTMLElement>(null);
  const [favoritesDrawerOpen, setFavoritesDrawerOpen] = useState(false);

  const [selectedLocation, setSelectedLocation] = useState<Anchor>(null);
  const [currentLocation, setCurrentLocation] = useState<Anchor>(null);
  const anchor = currentLocation ?? selectedLocation;

  const [startTime, setStartTime] = useState(() => new Date());
  const [endTime, setEndTime] = useState(() => new Date(new Date().getTime() + 60 * 60 * 1000));
  const [vehicleType, setVehicleType] = useState('C');
  const searchRadiusKm = 1;

  useEffect(() => {
    setSelectedLocation({ lat: mapCenter[0], lon: mapCenter[1] });
  }, []);

  const carparks = useCarparkLocations();
  const carparkIds = useMemo(() => carparks.map((carpark) => carpark.id), [carparks]);

  const { nearbyCarparks, loading: nearbyLoading } = useNearbyCarparks(
    carparks,
    anchor,
    startTime,
    endTime,
    vehicleType,
    searchRadiusKm,
  );

  const {
    availability,
    loading: availabilityLoading,
    error: availabilityError,
    refetch: refetchAvailability,
  } = useCarparkAvailability(carparkIds, {
    parkingStartTime: formatDate(startTime),
    parkingEndTime: formatDate(endTime),
    lotType: vehicleType,
    enabled: carparkIds.length > 0,
  });

  const decoratedNearbyCarparks = useMemo(() =>
    nearbyCarparks.map((carpark) => {
      const occupancyRatio = computeOccupancyRatio(carpark.availableLots ?? null, carpark.totalLots ?? null);
      return {
        ...carpark,
        occupancyRatio,
        congestionLevel: computeCongestionLevel(occupancyRatio),
      } as NearbyCarpark;
    }),
  [nearbyCarparks]);

  const availabilityMap = useMemo(() => {
    const map: Record<string, CarparkOccupancy> = { ...availability };

    decoratedNearbyCarparks.forEach((carpark) => {
      map[carpark.id] = {
        availableLots: carpark.availableLots ?? null,
        totalLots: carpark.totalLots ?? null,
        lotType: carpark.lotType ?? null,
        occupancyRatio: carpark.occupancyRatio ?? computeOccupancyRatio(carpark.availableLots ?? null, carpark.totalLots ?? null),
        congestionLevel: carpark.congestionLevel ?? computeCongestionLevel(computeOccupancyRatio(carpark.availableLots ?? null, carpark.totalLots ?? null)),
      };
    });

    return map;
  }, [availability, decoratedNearbyCarparks]);

  useEffect(() => {
    if (authState.isAuthenticated && authState.email) {
      const stored = localStorage.getItem(`favorites:${authState.email}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setFavoriteIds(parsed);
          }
        } catch (error) {
          console.warn('Failed to parse stored favourites', error);
        }
      } else {
        setFavoriteIds([]);
      }
    } else {
      setFavoriteIds([]);
    }
  }, [authState]);

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

    const controller = new AbortController();
    const SALT = 'CS5224TeamX$$';
    const fetchDetails = async () => {
      setFocusedCarpark(null);
      try {
        const requestBody = {
          parkingStartTime: formatDate(startTime),
          parkingEndTime: formatDate(endTime),
          carParkIds: [focusedCarparkId],
          lotType: vehicleType,
        };

        const requestBody_key = {
          parkingStartTime: formatDate(startTime),
          parkingEndTime: formatDate(endTime),
          carParkIds: [focusedCarparkId],
          lotType: vehicleType,
          key: md5(SALT + JSON.stringify(focusedCarparkId))
        };

        const [lotsResponse, ratesResponse, infoResponse] = await Promise.all([
          fetch('/api/car-park/query/lots', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody_key),
            signal: controller.signal,
          }),
          fetch('/api/car-park/query/parking-rate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
          }),
          fetch('/api/car-park/query/info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
          }),
        ]);

        if (!lotsResponse.ok || !ratesResponse.ok || !infoResponse.ok) {
          throw new Error('Failed to fetch carpark details');
        }

        const lotsData = await lotsResponse.json();
        const ratesData = await ratesResponse.json();
        const infoData = await infoResponse.json();

        const lotsInfo = lotsData.data?.find((d: any) => d.id === focusedCarparkId);
        const ratesInfo = ratesData.data?.find((d: any) => d.id === focusedCarparkId);
        const info = infoData.data?.[0];

        const availableLots = lotsInfo?.lots?.[0]?.available ?? null;
        const totalLots = lotsInfo?.lots?.[0]?.total ?? null;
        const occupancyRatio = computeOccupancyRatio(availableLots, totalLots);
        const distanceKm = anchor
          ? getDistanceInKm(anchor.lat, anchor.lon, carparkLocation.latitude, carparkLocation.longitude)
          : 0;

        const detailedCarpark: NearbyCarpark = {
          id: carparkLocation.id,
          address: info?.address ?? 'Address not available',
          latitude: carparkLocation.latitude,
          longitude: carparkLocation.longitude,
          distanceKm,
          totalLots,
          availableLots,
          estimatedFee: ratesInfo?.rates?.[0]?.estimatedFee ?? null,
          lotType: ratesInfo?.type,
          agency: info?.agency ?? ratesInfo?.agency,
          type: info?.type,
          parkingSystemType: info?.parkingSystemType ?? ratesInfo?.parkingSystemType,
          shortTermParkingPeriod: info?.shortTermParkingPeriod ?? ratesInfo?.shortTermParkingPeriod,
          freeParkingPeriod: info?.freeParkingPeriod ?? ratesInfo?.freeParkingPeriod,
          nightParkingFlag: info?.nightParkingFlag ?? ratesInfo?.nightParkingFlag,
          basementFlag: info?.basementFlag ?? ratesInfo?.basementFlag,
          deckCount: info?.deckCount ?? ratesInfo?.deckCount,
          gantryHeight: info?.gantryHeight ?? ratesInfo?.gantryHeight,
          occupancyRatio,
          congestionLevel: computeCongestionLevel(occupancyRatio),
        };

        setFocusedCarpark(detailedCarpark);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Failed to fetch carpark details:', error);
          const distanceKm = anchor
            ? getDistanceInKm(anchor.lat, anchor.lon, carparkLocation.latitude, carparkLocation.longitude)
            : 0;
          setFocusedCarpark({
            id: carparkLocation.id,
            address: 'Address not available',
            latitude: carparkLocation.latitude,
            longitude: carparkLocation.longitude,
            distanceKm,
            totalLots: null,
            availableLots: null,
            estimatedFee: null,
            occupancyRatio: null,
            congestionLevel: 'unknown',
          });
        }
      }
    };

    fetchDetails();

    return () => controller.abort();
  }, [focusedCarparkId, carparks, anchor, startTime, endTime, vehicleType]);

  const favoriteCarparkDetails = useMemo(() => {
    return favoriteIds
      .map((id) => {
        const location = carparks.find((item) => item.id === id);
        if (!location) {
          return null;
        }

        const occupancy = availabilityMap[id];
        const availableLots = occupancy?.availableLots ?? null;
        const totalLots = occupancy?.totalLots ?? null;
        const occupancyRatio = occupancy?.occupancyRatio ?? computeOccupancyRatio(availableLots, totalLots);
        const distanceKm = anchor
          ? getDistanceInKm(anchor.lat, anchor.lon, location.latitude, location.longitude)
          : getDistanceInKm(mapCenter[0], mapCenter[1], location.latitude, location.longitude);

        return {
          id,
          address: 'Address not available',
          latitude: location.latitude,
          longitude: location.longitude,
          distanceKm,
          totalLots,
          availableLots,
          estimatedFee: null,
          occupancyRatio,
          congestionLevel: computeCongestionLevel(occupancyRatio),
        } as NearbyCarpark;
      })
      .filter((item): item is NearbyCarpark => item !== null);
  }, [favoriteIds, carparks, availabilityMap, anchor, mapCenter]);

  const sortedNearbyCarparks = useMemo(() => {
    const sorted = [...decoratedNearbyCarparks];
    if (sortBy === 'price') {
      return sorted.sort((a, b) => (a.estimatedFee ?? Infinity) - (b.estimatedFee ?? Infinity));
    }
    if (sortBy === 'availability') {
      return sorted.sort((a, b) => (b.availableLots ?? -1) - (a.availableLots ?? -1));
    }
    return sorted.sort((a, b) => a.distanceKm - b.distanceKm);
  }, [decoratedNearbyCarparks, sortBy]);

  const nearbyCarparkIds = useMemo(
    () => new Set(decoratedNearbyCarparks.map((carpark) => carpark.id)),
    [decoratedNearbyCarparks],
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

  const handleLoginSuccess = (params: { email: string; appToken: string; googleToken: string }) => {
    setAuthState({
      isAuthenticated: true,
      email: params.email,
      appToken: params.appToken,
      googleToken: params.googleToken,
    });

    localStorage.setItem('auth:lastEmail', params.email);
  };

  const handleLogout = () => {
    setAuthState({
      isAuthenticated: false,
      email: null,
      appToken: null,
      googleToken: null,
    });
    setFavoriteIds([]);
    setProfileMenuAnchor(null);
    setFavoritesDrawerOpen(false);
  };

  const handleToggleFavorite = (carparkId: string) => {
    if (!authState.isAuthenticated || !authState.email) {
      setLoginDialogOpen(true);
      return;
    }

    setFavoriteIds((prev) => {
      let next: string[];
      if (prev.includes(carparkId)) {
        next = prev.filter((id) => id !== carparkId);
      } else {
        next = [...prev, carparkId];
      }

      localStorage.setItem(`favorites:${authState.email}`, JSON.stringify(next));
      return next;
    });
  };

  const openProfileMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    setProfileMenuAnchor(event.currentTarget);
  };

  const closeProfileMenu = () => {
    setProfileMenuAnchor(null);
  };

  const openFavoritesMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!authState.isAuthenticated) {
      setLoginDialogOpen(true);
      return;
    }
    event.currentTarget.blur();
    setFavoritesDrawerOpen(true);
  };

  const closeFavoritesMenu = () => {
    setFavoritesDrawerOpen(false);
  };

  const favoritesSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);
  const hasFavorites = favoriteCarparkDetails.length > 0;

  const handleFavoriteSelect = (carpark: NearbyCarpark) => {
    setFocusedCarparkId(carpark.id);
    panTo(carpark.latitude, carpark.longitude, 17);
    setFavoritesDrawerOpen(false);
  };

  const handleRemoveFavorite = (carparkId: string) => {
    if (!favoritesSet.has(carparkId)) {
      return;
    }
    handleToggleFavorite(carparkId);
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
        <AppBar position="static" color="primary" elevation={0}>
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1, color: 'white', fontWeight: 'bold' }}>
              SG Car Park Finder+
            </Typography>
            <Tooltip
              title={authState.isAuthenticated
                ? hasFavorites
                  ? 'View bookmarked car parks'
                  : 'No bookmarked car parks yet'
                : 'Sign in to manage bookmarks'}
            >
              <IconButton
                color="inherit"
                onClick={openFavoritesMenu}
                size="small"
                sx={{ ml: 1 }}
              >
                {authState.isAuthenticated && hasFavorites ? (
                  <FavoriteIcon color="error" fontSize="small" />
                ) : (
                  <FavoriteBorderIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
            {authState.isAuthenticated ? (
              <>
                <Tooltip title={authState.email ?? 'Profile'}>
                  <IconButton
                    color="inherit"
                    onClick={openProfileMenu}
                    size="small"
                    sx={{ ml: 1 }}
                  >
                    <Avatar sx={{ bgcolor: '#2e7d32', width: 32, height: 32 }}>
                      {authState.email?.charAt(0).toUpperCase() ?? '?'}
                    </Avatar>
                  </IconButton>
                </Tooltip>
                <Menu
                  anchorEl={profileMenuAnchor}
                  open={Boolean(profileMenuAnchor)}
                  onClose={closeProfileMenu}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                  <MenuItem disabled>
                    <ListItemText primary={authState.email ?? ''} secondary="Signed in" />
                  </MenuItem>
                  <Divider />
                  <MenuItem onClick={handleLogout}>
                    <ListItemIcon>
                      <LogoutIcon fontSize="small" />
                    </ListItemIcon>
                    Sign out
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <Button
                color="inherit"
                variant="outlined"
                onClick={() => setLoginDialogOpen(true)}
              >
                Sign in
              </Button>
            )}
          </Toolbar>
        </AppBar>

        <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)' }}>
          <Box sx={{ position: 'relative', flexGrow: 1, height: '100%' }}>
            <Box sx={{
                position: 'absolute', top: 10, left: 10, zIndex: 1000,
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
              {availabilityError && (
                <Typography variant="caption" color="error">
                  Unable to load live availability: {availabilityError}
                </Typography>
              )}
              <Button
                variant="outlined"
                size="small"
                onClick={() => { void refetchAvailability(); }}
                disabled={availabilityLoading}
              >
                {availabilityLoading ? 'Refreshing…' : 'Refresh availability'}
              </Button>
            </Box>

            <CarparkMap
              center={mapCenter}
              anchor={anchor}
              carparks={carparks}
              nearbyCarparkIds={nearbyCarparkIds}
              focusedCarparkId={focusedCarparkId}
              availability={availabilityMap}
              onMarkerSelect={(carpark) => handleMarkerSelect(carpark.id, carpark.latitude, carpark.longitude)}
              onLocated={handleLocate}
              mapRef={mapRef}
              searchRadiusKm={searchRadiusKm}
            />
          </Box>

          <CarparkSidebar
            sortBy={sortBy}
            onSortChange={handleSortChange}
            nearbyCarparks={sortedNearbyCarparks}
            focusedCarpark={focusedCarpark}
            focusedCarparkId={focusedCarparkId}
            onSelectCarpark={handleListItemSelect}
            onCloseDetails={handleCloseDetails}
            anchor={anchor}
            isLoading={nearbyLoading}
            startTime={startTime}
            endTime={endTime}
            favorites={favoritesSet}
            onToggleFavorite={handleToggleFavorite}
            canFavorite={authState.isAuthenticated}
          />
        </Box>

        <LoginDialog
          open={loginDialogOpen}
          onClose={() => setLoginDialogOpen(false)}
          onSuccess={handleLoginSuccess}
        />
        <FavoritesDrawer
          open={favoritesDrawerOpen}
          onClose={closeFavoritesMenu}
          favorites={favoriteCarparkDetails}
          onNavigate={handleFavoriteSelect}
          onRemove={handleRemoveFavorite}
          anchor={anchor}
        />
      </Box>
    </ThemeProvider>
  );
}

export default App;
