import {
  List,
  ListItem,
  Card,
  CardContent,
  Box,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  IconButton,
  Button,
  CircularProgress,
  Divider,
  ListItemButton,
  ListItemText,
  Tooltip,
} from '@mui/material';
import {
  Close as CloseIcon,
  DirectionsCar as DirectionsCarIcon,
  NearMe as NearMeIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Favorite as FavoriteIcon,
} from '@mui/icons-material';

import type { NearbyCarpark } from '../types/carpark';

type SortBy = 'distance' | 'price' | 'availability';

type CarparkSidebarProps = {
  sortBy: SortBy;
  onSortChange: (_event: React.MouseEvent<HTMLElement>, value: SortBy) => void;
  nearbyCarparks: NearbyCarpark[];
  focusedCarpark: NearbyCarpark | null;
  focusedCarparkId: string | null;
  onSelectCarpark: (carpark: NearbyCarpark) => void;
  onCloseDetails: () => void;
  anchor: { lat: number; lon: number } | null;
  isLoading: boolean;
  startTime: Date;
  endTime: Date;
  favorites: Set<string>;
  onToggleFavorite: (carparkId: string) => void;
  canFavorite: boolean;
};

const DetailItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <>
    <ListItem disablePadding sx={{ py: 0.5 }}>
      <ListItemText
        primary={label}
        secondary={value}
        primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
        secondaryTypographyProps={{ variant: 'body1', color: 'text.primary', sx: { fontWeight: 'medium' } }}
      />
    </ListItem>
    <Divider component="li" light />
  </>
);

const getAvailabilityColor = (available: number | null, total: number | null) => {
  if (available === null || total === null || total === 0) {
    return 'text.secondary';
  }
  const ratio = available / total;
  if (ratio < 0.1) return 'error.main';
  if (ratio < 0.3) return 'warning.main';
  return 'success.main';
};

const getWalkingMinutes = (distanceKm: number) => Math.round(distanceKm * 12);

export function CarparkSidebar({
  sortBy,
  onSortChange,
  nearbyCarparks,
  focusedCarpark,
  focusedCarparkId,
  onSelectCarpark,
  onCloseDetails,
  anchor,
  isLoading,
  startTime,
  endTime,
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

  const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

  const renderFavoriteButton = (carparkId: string, size: 'small' | 'medium' = 'small') => {
    const isFavorited = favorites.has(carparkId);
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      onToggleFavorite(carparkId);
    };

    return (
      <Tooltip title={canFavorite ? (isFavorited ? 'Remove bookmark' : 'Bookmark') : 'Sign in to bookmark'}>
        <span>
          <IconButton
            size={size}
            onClick={handleClick}
            disabled={!canFavorite}
            color={isFavorited ? 'error' : 'default'}
          >
            {isFavorited ? <FavoriteIcon fontSize={size} /> : <FavoriteBorderIcon fontSize={size} />}
          </IconButton>
        </span>
      </Tooltip>
    );
  };

  const renderDetailView = () => {
    if (!focusedCarpark) {
      return (
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', pt: 10 }}>
          <CircularProgress />
        </Box>
      );
    }

    const walkingMinutes = getWalkingMinutes(focusedCarpark.distanceKm);

    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ px: 2, pt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
              {focusedCarpark.id}
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 'medium' }}>
              <Box
                component="span"
                sx={{ color: getAvailabilityColor(focusedCarpark.availableLots, focusedCarpark.totalLots), fontWeight: 'bold' }}
              >
                {focusedCarpark.availableLots ?? '-'} / {focusedCarpark.totalLots ?? '-'}
              </Box>
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {renderFavoriteButton(focusedCarpark.id, 'medium')}
            <IconButton size="small" onClick={onCloseDetails} aria-label="Close details">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ px: 2, pb: 2, overflowY: 'auto', flexGrow: 1 }}>
          <Box sx={{ mb: 2 }}>
            <Box sx={{ mb: 1.5 }}>
              <Typography variant="caption" color="text.secondary">Estimated Fee</Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'black' }}>
                {focusedCarpark.estimatedFee !== null
                  ? (
                    <>
                      {`$${focusedCarpark.estimatedFee.toFixed(2)}`}
                      <Typography component="span" variant="body2" color="text.secondary">
                        {` / ${durationHours.toFixed(1)} hr`}
                      </Typography>
                    </>
                  )
                  : 'N/A'
                }
              </Typography>
              {focusedCarpark.estimatedFee !== null && (
                <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  Fee is an estimate and may vary.
                </Typography>
              )}
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Distance</Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'black' }}>
                {`${Math.round(focusedCarpark.distanceKm * 1000)} m `}
                <Typography component="span" variant="body2" color="text.secondary">
                  {`(${walkingMinutes} min walk)`}
                </Typography>
              </Typography>
            </Box>
          </Box>

          <Button
            variant="contained"
            color="primary"
            fullWidth
            sx={{ mb: 2, fontWeight: 'bold' }}
            href={buildDirectionsUrl(focusedCarpark.latitude, focusedCarpark.longitude)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Go Here
          </Button>

          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>Parking Information</Typography>
          <Divider sx={{ mb: 1 }} />
          <List dense>
            <DetailItem label="Address" value={focusedCarpark.address ?? 'N/A'} />
            <DetailItem label="Agency" value={focusedCarpark.agency ?? 'N/A'} />
            <DetailItem label="Parking System" value={focusedCarpark.parkingSystemType ?? 'N/A'} />
            <DetailItem label="Short-term Parking" value={focusedCarpark.shortTermParkingPeriod ?? 'N/A'} />
            <DetailItem label="Free Parking" value={focusedCarpark.freeParkingPeriod ?? 'N/A'} />
            <DetailItem label="Night Parking" value={focusedCarpark.nightParkingFlag ? 'Yes' : 'No'} />
            <DetailItem label="Basement Parking" value={focusedCarpark.basementFlag ? 'Yes' : 'No'} />
            <DetailItem label="Decks" value={focusedCarpark.deckCount ?? 'N/A'} />
            <DetailItem label="Gantry Height" value={focusedCarpark.gantryHeight !== undefined ? `${focusedCarpark.gantryHeight}m` : 'N/A'} />
          </List>
        </Box>
      </Box>
    );
  };

  const renderListView = () => {
    if (isLoading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', pt: 10 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (nearbyCarparks.length === 0) {
      return (
        <ListItem>
          <Card sx={{ width: '100%', bgcolor: '#f1f8e9', textAlign: 'center' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" color="text.secondary">
                No carparks found within 1km.
              </Typography>
            </CardContent>
          </Card>
        </ListItem>
      );
    }

    return nearbyCarparks.map((lot) => {
      const walkingMinutes = getWalkingMinutes(lot.distanceKm);
      return (
        <ListItem key={lot.id} disablePadding sx={{ mb: 1 }}>
          <ListItemButton onClick={() => onSelectCarpark(lot)} sx={{ p: 0 }}>
            <Card sx={{ width: '100%', bgcolor: '#f1f8e9' }}>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#2e7d32' }} title={lot.address}>
                      {lot.id}
                    </Typography>
                  </Box>
                  {renderFavoriteButton(lot.id)}
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <NearMeIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
                    <Typography variant="body2">{Math.round(lot.distanceKm * 1000)} m</Typography>
                    <Typography variant="caption" color="text.secondary">({walkingMinutes} min walk)</Typography>
                  </Box>
                  <Typography variant="h6" color="text.primary" sx={{ fontWeight: 'bold' }}>
                    {lot.estimatedFee !== null ? `$${lot.estimatedFee.toFixed(2)} / ${durationHours.toFixed(1)} hr` : 'N/A'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <DirectionsCarIcon sx={{ color: getAvailabilityColor(lot.availableLots, lot.totalLots) }} />
                  <Typography variant="subtitle1" sx={{ color: getAvailabilityColor(lot.availableLots, lot.totalLots), fontWeight: 'bold' }}>
                    {lot.availableLots ?? '-'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">/ {lot.totalLots ?? '-'}</Typography>
                </Box>
              </CardContent>
            </Card>
          </ListItemButton>
        </ListItem>
      );
    });
  };

  return (
    <Box className="parking-list" sx={{ width: 370, height: '100%', bgcolor: '#e8f5e9' }}>
      {!focusedCarparkId && (
        <Box sx={{ p: 2, bgcolor: '#e8f5e9', position: 'sticky', top: 0, zIndex: 1 }}>
          <ToggleButtonGroup value={sortBy} exclusive onChange={onSortChange} size="small" fullWidth>
            <ToggleButton value="distance">Distance</ToggleButton>
            <ToggleButton value="price">Price</ToggleButton>
            <ToggleButton value="availability">Availability</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      )}

      <List disablePadding sx={{ px: focusedCarparkId ? 0 : 2, height: '100%' }}>
        {focusedCarparkId ? renderDetailView() : renderListView()}
      </List>
    </Box>
  );
}
