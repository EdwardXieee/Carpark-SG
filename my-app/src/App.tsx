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

import SearchBox from './SearchBox';
import { CarparkMap } from './components/CarparkMap';
import { CarparkSidebar } from './components/CarparkSidebar';
import { LoginDialog } from './components/LoginDialog';
import './App.css';

import { useCarparkAvailability } from './hooks/useCarparkAvailability';
import { useCarparkLocations } from './hooks/useCarparkLocations';
import { useNearbyCarparks } from './hooks/useNearbyCarparks';
import type { NearbyCarpark } from './types/carpark';
import { formatDateTime } from './utils/datetime';
import { getDistanceInKm } from './utils/geo';
import { generateMockDetails } from './utils/mockCarparkDetails';

type Anchor = { lat: number; lon: number } | null;
type SortBy = 'distance' | 'price';
type AuthState = {
  isAuthenticated: boolean;
  email: string | null;
  appToken: string | null;
  googleToken: string | null;
};

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
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    email: null,
    appToken: null,
    googleToken: null,
  });
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [profileMenuAnchor, setProfileMenuAnchor] = useState<null | HTMLElement>(null);
  const [favoritesMenuAnchor, setFavoritesMenuAnchor] = useState<null | HTMLElement>(null);

  const [selectedLocation, setSelectedLocation] = useState<Anchor>(null);
  const [currentLocation, setCurrentLocation] = useState<Anchor>(null);
  const anchor = currentLocation ?? selectedLocation;

  useEffect(() => {
    setSelectedLocation({ lat: mapCenter[0], lon: mapCenter[1] });
  }, []);

  const carparks = useCarparkLocations();
  const carparkIds = useMemo(() => carparks.map((carpark) => carpark.id), [carparks]);
  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const timeRange = useMemo(() => {
    const start = new Date();
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    return {
      parkingStartTime: formatDateTime(start),
      parkingEndTime: formatDateTime(end),
    };
  }, []);

  const {
    availability,
    loading: availabilityLoading,
    error: availabilityError,
    refetch: refetchAvailability,
  } = useCarparkAvailability(carparkIds, {
    parkingStartTime: timeRange.parkingStartTime,
    parkingEndTime: timeRange.parkingEndTime,
    lotType: '',
    enabled: carparkIds.length > 0,
  });

  const nearbyCarparks = useNearbyCarparks(carparks, anchor, availability);
  const favoriteCarparkDetails = useMemo<NearbyCarpark[]>(() => {
    const baseLat = anchor?.lat ?? mapCenter[0];
    const baseLon = anchor?.lon ?? mapCenter[1];

    return favoriteIds
      .map((id) => {
        const carpark = carparks.find((item) => item.id === id);
        if (!carpark) {
          return null;
        }

        const distanceKm = getDistanceInKm(baseLat, baseLon, carpark.latitude, carpark.longitude);
        const details = generateMockDetails(carpark, distanceKm);
        const occupancy = availability[id];

        if (occupancy) {
          details.availableLots = occupancy.availableLots;
          details.totalLots = occupancy.totalLots;
          details.lotType = occupancy.lotType;
          details.occupancyRatio = occupancy.occupancyRatio;
          details.congestionLevel = occupancy.congestionLevel;
        }

        return details;
      })
      .filter((item): item is NearbyCarpark => item !== null);
  }, [anchor, availability, carparks, favoriteIds, mapCenter]);
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
    const details = generateMockDetails(location, distanceKm);
    const occupancy = availability[location.id];

    if (occupancy) {
      details.availableLots = occupancy.availableLots;
      details.totalLots = occupancy.totalLots;
      details.lotType = occupancy.lotType;
      details.occupancyRatio = occupancy.occupancyRatio;
      details.congestionLevel = occupancy.congestionLevel;
    }

    return details;
  }, [focusedCarparkId, carparks, anchor, centerLat, centerLon, availability]);

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
    setFavoritesMenuAnchor(event.currentTarget);
  };

  const closeFavoritesMenu = () => {
    setFavoritesMenuAnchor(null);
  };

  const handleFavoriteSelect = (carpark: NearbyCarpark) => {
    closeFavoritesMenu();
    closeProfileMenu();
    setFocusedCarparkId(carpark.id);
    panTo(carpark.latitude, carpark.longitude, 17);
  };

  const formatFavoriteAvailability = (carpark?: NearbyCarpark) => {
    if (!carpark) {
      return 'No live data';
    }
    if (carpark.availableLots !== null && carpark.totalLots !== null) {
      const ratio =
        carpark.occupancyRatio !== null ? ` • Vacancy ${(carpark.occupancyRatio * 100).toFixed(0)}%` : '';
      return `${carpark.availableLots}/${carpark.totalLots} lots${ratio}`;
    }
    if (carpark.availableLots !== null) {
      return `${carpark.availableLots} lots`;
    }
    return 'No live data';
  };
  const hasFavorites = favoriteCarparkDetails.length > 0;

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
            <Menu
              anchorEl={favoritesMenuAnchor}
              open={Boolean(favoritesMenuAnchor)}
              onClose={closeFavoritesMenu}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              {!authState.isAuthenticated ? (
                <MenuItem disabled>
                  <ListItemIcon>
                    <FavoriteBorderIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Sign in to manage bookmarks" />
                </MenuItem>
              ) : favoriteCarparkDetails.length === 0 ? (
                <MenuItem disabled>
                  <ListItemIcon>
                    <FavoriteBorderIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="No bookmarked car parks yet" />
                </MenuItem>
              ) : (
                favoriteCarparkDetails.map((item) => (
                  <MenuItem
                    key={item.id}
                    onClick={() => handleFavoriteSelect(item)}
                  >
                    <ListItemIcon>
                      <FavoriteIcon fontSize="small" color="error" />
                    </ListItemIcon>
                    <ListItemText
                      primary={item.id}
                      secondary={formatFavoriteAvailability(item)}
                    />
                  </MenuItem>
                ))
              )}
            </Menu>
          </Toolbar>
        </AppBar>

        <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)' }}>
          <Box sx={{ position: 'relative', flexGrow: 1, height: '100%' }}>
            <Box sx={{ position: 'absolute', top: 20, left: 20, zIndex: 1000 }}>
              <SearchBox onSelectResult={handleSearchSelect} />
            </Box>

            <CarparkMap
              center={mapCenter}
              anchor={anchor}
              carparks={carparks}
              nearbyCarparkIds={nearbyCarparkIds}
              focusedCarparkId={focusedCarparkId}
              availability={availability}
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
            availabilityLoading={availabilityLoading}
            availabilityError={availabilityError}
            onRefreshAvailability={refetchAvailability}
            favorites={favoriteSet}
            onToggleFavorite={handleToggleFavorite}
            canFavorite={authState.isAuthenticated}
          />
        </Box>

        <LoginDialog
          open={loginDialogOpen}
          onClose={() => setLoginDialogOpen(false)}
          onSuccess={handleLoginSuccess}
        />
      </Box>
    </ThemeProvider>
  );
}

export default App;
