import {
  List,
  ListItem,
  ListItemButton,
  Card,
  CardContent,
  Box,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  IconButton,
  Button,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  Close as CloseIcon,
  Refresh as RefreshIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Favorite as FavoriteIcon,
} from '@mui/icons-material';

import type { NearbyCarpark } from '../types/carpark';

type SortBy = 'distance' | 'price';

type CarparkSidebarProps = {
  sortBy: SortBy;
  onSortChange: (_event: React.MouseEvent<HTMLElement>, value: SortBy) => void;
  nearbyCarparks: NearbyCarpark[];
  focusedCarpark: NearbyCarpark | null;
  onSelectCarpark: (carpark: NearbyCarpark) => void;
  onCloseDetails: () => void;
  anchor: { lat: number; lon: number } | null;
  availabilityLoading: boolean;
  availabilityError: string | null;
  onRefreshAvailability: () => Promise<void>;
  favorites: Set<string>;
  onToggleFavorite: (carparkId: string) => void;
  canFavorite: boolean;
};

export function CarparkSidebar({
  sortBy,
  onSortChange,
  nearbyCarparks,
  focusedCarpark,
  onSelectCarpark,
  onCloseDetails,
  anchor,
  availabilityLoading,
  availabilityError,
  onRefreshAvailability,
  favorites,
  onToggleFavorite,
  canFavorite,
}: CarparkSidebarProps) {
  const buildDirectionsUrl = (lat: number, lon: number) => {
    const searchParams = new URLSearchParams({ api: '1', destination: `${lat},${lon}` });
    if (anchor) {
      searchParams.set('origin', `${anchor.lat},${anchor.lon}`);
    }
    return `https://www.google.com/maps/dir/?${searchParams.toString()}`;
  };

  const formatAvailability = (carpark: NearbyCarpark) => {
    if (carpark.availableLots !== null && carpark.totalLots !== null) {
      return `${carpark.availableLots}/${carpark.totalLots} lots`;
    }

    if (carpark.availableLots !== null) {
      return `${carpark.availableLots} lots`;
    }

    return 'Not available';
  };

  const congestionLabels: Record<NearbyCarpark['congestionLevel'], string> = {
    low: 'Plenty of space',
    medium: 'Moderate congestion',
    high: 'Highly congested',
    unknown: 'No live data',
  };

  const congestionColors: Record<NearbyCarpark['congestionLevel'], string> = {
    low: '#e57373',
    medium: '#ef5350',
    high: '#b71c1c',
    unknown: '#546e7a',
  };

  const handleRefreshAvailability = () => {
    void onRefreshAvailability();
  };

  const renderFavoriteButton = (carparkId: string, size: 'small' | 'medium' = 'small') => {
    const active = favorites.has(carparkId);
    const icon = active ? <FavoriteIcon color="error" fontSize="inherit" /> : <FavoriteBorderIcon fontSize="inherit" />;

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      onToggleFavorite(carparkId);
    };

    return (
      <Tooltip title={canFavorite ? (active ? 'Remove bookmark' : 'Bookmark') : 'Sign in to bookmark'}>
        <span>
          <IconButton
            size={size}
            onClick={handleClick}
            disabled={!canFavorite}
            color={active ? 'error' : 'default'}
          >
            {icon}
          </IconButton>
        </span>
      </Tooltip>
    );
  };

  return (
    <Box className="parking-list" sx={{ width: 370, height: '100%', bgcolor: '#e8f5e9' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, py: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#37474f' }}>
          Live availability
        </Typography>
        <Button
          variant="outlined"
          size="small"
          onClick={handleRefreshAvailability}
          startIcon={
            availabilityLoading ? <CircularProgress color="inherit" size={16} /> : <RefreshIcon fontSize="small" />
          }
          disabled={availabilityLoading}
        >
          Refresh
        </Button>
      </Box>

      {!focusedCarpark && (
        <Box className="sort-container">
          <Typography variant="subtitle1">Sort by:</Typography>
          <ToggleButtonGroup value={sortBy} exclusive onChange={onSortChange} size="small">
            <ToggleButton value="distance">Distance</ToggleButton>
            <ToggleButton value="price">Price</ToggleButton>
          </ToggleButtonGroup>
      </Box>
    )}

      {availabilityLoading && (
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Updating live availability...
          </Typography>
        </Box>
      )}

      {availabilityError && (
        <Box sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="caption" color="error" sx={{ flexGrow: 1 }}>
            Unable to load live availability: {availabilityError}
          </Typography>
          <Button variant="outlined" size="small" onClick={handleRefreshAvailability}>
            Retry
          </Button>
        </Box>
      )}

      {!canFavorite && (
        <Box sx={{ px: 2, pb: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Sign in to bookmark frequently used car parks.
          </Typography>
        </Box>
      )}

      <List disablePadding>
        {focusedCarpark ? (
          <ListItem className="parking-item" disablePadding>
            <Card className="parking-card" sx={{ width: '100%', bgcolor: '#f1f8e9' }}>
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
                      {focusedCarpark.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {focusedCarpark.address}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {renderFavoriteButton(focusedCarpark.id, 'medium')}
                    <IconButton size="small" onClick={onCloseDetails} aria-label="Close Details">
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Estimated rate</Typography>
                    <Typography variant="subtitle1">{focusedCarpark.rates}</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" color="text.secondary">Live availability</Typography>
                    <Typography variant="subtitle1">
                      {formatAvailability(focusedCarpark)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {focusedCarpark.occupancyRatio !== null
                        ? `Vacancy ${(focusedCarpark.occupancyRatio * 100).toFixed(0)}%`
                        : 'Vacancy unknown'}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Congestion level</Typography>
                    <Typography variant="body1" sx={{ color: congestionColors[focusedCarpark.congestionLevel] }}>
                      {congestionLabels[focusedCarpark.congestionLevel]}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" color="text.secondary">Lot type</Typography>
                    <Typography variant="body1">{focusedCarpark.lotType ?? 'Any'}</Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Walk time</Typography>
                    <Typography variant="body1">{focusedCarpark.walkingMinutes} min</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" color="text.secondary">Distance</Typography>
                    <Typography variant="body1">~{Math.round(focusedCarpark.distanceKm * 1000)} m</Typography>
                  </Box>
                </Box>

                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary">Payment methods</Typography>
                  <Typography variant="body2">{focusedCarpark.paymentMethods.join(', ') || 'Not available'}</Typography>
                </Box>

                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">Free parking</Typography>
                  <Typography variant="body2">{focusedCarpark.freeParking}</Typography>
                </Box>

                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  Max height {focusedCarpark.maxHeightMeters.toFixed(1)} m • Max stay {focusedCarpark.durationMinutes} min
                </Typography>

                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    href={buildDirectionsUrl(focusedCarpark.latitude, focusedCarpark.longitude)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Navigate
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </ListItem>
        ) : nearbyCarparks.length === 0 ? (
          <ListItem className="parking-item">
            <Card className="parking-card" sx={{ width: '100%', bgcolor: '#f1f8e9', textAlign: 'center' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle1" color="text.secondary">
                  No car parks within 1 km
                </Typography>
              </CardContent>
            </Card>
          </ListItem>
        ) : (
          nearbyCarparks.map((lot) => (
            <ListItem key={lot.id} className="parking-item" disablePadding>
              <ListItemButton onClick={() => onSelectCarpark(lot)} sx={{ p: 0 }}>
                <Card className="parking-card" sx={{ width: '100%', mb: 1, bgcolor: '#f1f8e9' }}>
                  <CardContent sx={{ p: 2 }}>
                    <Box className="parking-header" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                      <Box>
                        <Typography className="parking-id" variant="subtitle1" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
                          {lot.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {lot.lotType ? `Lot type ${lot.lotType}` : 'Any lot type'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography
                          className="parking-availability"
                          variant="body2"
                          sx={{ color: congestionColors[lot.congestionLevel], fontWeight: 600 }}
                        >
                          {formatAvailability(lot)}
                        </Typography>
                        {renderFavoriteButton(lot.id)}
                      </Box>
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{ color: congestionColors[lot.congestionLevel], display: 'block', mt: 0.5 }}
                    >
                      Congestion: {congestionLabels[lot.congestionLevel]}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography className="parking-price" variant="h6">
                        {lot.price ? `S$${lot.price.toFixed(2)}` : 'Rate TBD'}
                      </Typography>
                      <Box className="parking-distance">
                        <Typography variant="body2">{lot.walkingMinutes} min</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                          approx. walk
                        </Typography>
                      </Box>
                    </Box>
                    <Typography className="parking-duration" variant="caption" color="text.secondary">
                      ~{Math.round(lot.distanceKm * 1000)} m • Max stay {lot.durationMinutes} min •{' '}
                      {lot.occupancyRatio !== null ? `Vacancy ${(lot.occupancyRatio * 100).toFixed(0)}%` : 'Vacancy unknown'}
                    </Typography>
                  </CardContent>
                </Card>
              </ListItemButton>
            </ListItem>
          ))
        )}
      </List>
    </Box>
  );
}
