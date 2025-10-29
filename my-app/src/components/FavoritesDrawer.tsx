import {
  Drawer,
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  Divider,
  Tooltip,
} from '@mui/material';
import { Close as CloseIcon, Delete as DeleteIcon, Navigation as NavigationIcon } from '@mui/icons-material';

import type { NearbyCarpark } from '../types/carpark';

type FavoritesDrawerProps = {
  open: boolean;
  onClose: () => void;
  favorites: NearbyCarpark[];
  onNavigate: (carpark: NearbyCarpark) => void;
  onRemove: (carparkId: string) => void;
  anchor: { lat: number; lon: number } | null;
};

const formatAvailability = (carpark: NearbyCarpark) => {
  const occupancyRatio = carpark.occupancyRatio ?? null;
  if (carpark.availableLots !== null && carpark.totalLots !== null) {
    const ratio =
      occupancyRatio !== null ? ` • Vacancy ${(occupancyRatio * 100).toFixed(0)}%` : '';
    return `${carpark.availableLots}/${carpark.totalLots} lots${ratio}`;
  }

  if (carpark.availableLots !== null) {
    return `${carpark.availableLots} lots`;
  }

  return 'No live data';
};

export function FavoritesDrawer({
  open,
  onClose,
  favorites,
  onNavigate,
  onRemove,
  anchor,
}: FavoritesDrawerProps) {
  const buildDirectionsUrl = (latitude: number, longitude: number) => {
    const searchParams = new URLSearchParams({ api: '1', destination: `${latitude},${longitude}` });
    if (anchor) {
      searchParams.set('origin', `${anchor.lat},${anchor.lon}`);
    }
    return `https://www.google.com/maps/dir/?${searchParams.toString()}`;
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 320, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Bookmarked car parks</Typography>
            <Typography variant="caption" color="text.secondary">
              Quick access to your saved locations
            </Typography>
          </Box>
          <IconButton size="small" onClick={onClose} aria-label="Close favourites drawer">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <Divider />

        {favorites.length === 0 ? (
          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', px: 2, textAlign: 'center' }}>
            <Typography variant="subtitle1" color="text.secondary">
              No bookmarks yet
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Tap the heart icon in the list to save a car park
            </Typography>
          </Box>
        ) : (
          <List dense disablePadding sx={{ flexGrow: 1, overflowY: 'auto' }}>
            {favorites.map((carpark) => (
              <ListItem
                key={carpark.id}
                disablePadding
                secondaryAction={(
                  <Tooltip title="Remove bookmark">
                    <IconButton edge="end" size="small" onClick={() => onRemove(carpark.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              >
                <ListItemButton onClick={() => onNavigate(carpark)} sx={{ alignItems: 'flex-start', gap: 1 }}>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
                      {carpark.id}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {carpark.address}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatAvailability(carpark)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {`${Math.round(carpark.distanceKm * 1000)} m (${Math.round(carpark.distanceKm * 12)} min walk)`}
                    </Typography>
                  </Box>
                  <Tooltip title="Open directions in Google Maps">
                    <IconButton
                      size="small"
                      component="a"
                      href={buildDirectionsUrl(carpark.latitude, carpark.longitude)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <NavigationIcon fontSize="small" sx={{ color: '#2e7d32' }} />
                    </IconButton>
                  </Tooltip>
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    </Drawer>
  );
}
