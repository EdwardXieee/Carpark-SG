import { List, ListItem, ListItemButton, Card, CardContent, Box, Typography, ToggleButtonGroup, ToggleButton, IconButton, Button, CircularProgress } from '@mui/material';
import { Close as CloseIcon, DirectionsCar as DirectionsCarIcon, AttachMoney as AttachMoneyIcon, NearMe as NearMeIcon } from '@mui/icons-material';

import type { NearbyCarpark } from '../types/carpark';

type SortBy = 'distance' | 'price';

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
};

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
}: CarparkSidebarProps) {
  const buildDirectionsUrl = (lat: number, lon: number) => {
    const searchParams = new URLSearchParams({ api: '1', destination: `${lat},${lon}` });
    if (anchor) {
      searchParams.set('origin', `${anchor.lat},${anchor.lon}`);
    }
    return `https://www.google.com/maps/dir/?${searchParams.toString()}`;
  };

  const getAvailabilityColor = (available: number | null, total: number | null) => {
    if (available === null || total === null || total === 0) {
      return 'text.secondary';
    }
    const ratio = available / total;
    if (ratio < 0.1) return 'error.main';
    if (ratio < 0.3) return 'warning.main';
    return 'success.main';
  };

  const renderDetailView = () => {
    if (!focusedCarpark) {
      return (
        <ListItem className="parking-item" disablePadding>
          <Card className="parking-card" sx={{ width: '100%', bgcolor: '#f1f8e9', display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Card>
        </ListItem>
      );
    }
    return (
      <ListItem className="parking-item" disablePadding>
        <Card className="parking-card" sx={{ width: '100%', bgcolor: '#f1f8e9' }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ maxWidth: '80%' }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#2e7d32' }} title={focusedCarpark.address}>
                  {focusedCarpark.address}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ID: {focusedCarpark.id}
                </Typography>
              </Box>
              <IconButton size="small" onClick={onCloseDetails} aria-label="关闭详情">
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Estimated Fee</Typography>
                <Typography variant="subtitle1">
                  {focusedCarpark.estimatedFee !== null ? `$${focusedCarpark.estimatedFee.toFixed(2)}` : 'N/A'}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="caption" color="text.secondary">Availability</Typography>
                <Typography variant="subtitle1" sx={{ color: getAvailabilityColor(focusedCarpark.availableLots, focusedCarpark.totalLots), fontWeight: 'bold' }}>
                  {focusedCarpark.availableLots !== null ? `${focusedCarpark.availableLots} / ${focusedCarpark.totalLots}` : 'N/A'}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary">Distance</Typography>
              <Typography variant="body1">~{Math.round(focusedCarpark.distanceKm * 1000)} m</Typography>
            </Box>

            {focusedCarpark.agency && <Typography variant="body2" sx={{ mt: 1 }}>Agency: {focusedCarpark.agency}</Typography>}
            {focusedCarpark.type && <Typography variant="body2">Type: {focusedCarpark.type}</Typography>}
            {focusedCarpark.parkingSystemType && <Typography variant="body2">Parking System: {focusedCarpark.parkingSystemType}</Typography>}
            {focusedCarpark.shortTermParkingPeriod && <Typography variant="body2">Short-term Parking: {focusedCarpark.shortTermParkingPeriod}</Typography>}
            {focusedCarpark.freeParkingPeriod && <Typography variant="body2">Free Parking: {focusedCarpark.freeParkingPeriod}</Typography>}
            {focusedCarpark.nightParkingFlag !== undefined && <Typography variant="body2">Night Parking: {focusedCarpark.nightParkingFlag ? 'Yes' : 'No'}</Typography>}
            {focusedCarpark.basementFlag !== undefined && <Typography variant="body2">Basement Parking: {focusedCarpark.basementFlag ? 'Yes' : 'No'}</Typography>}
            {focusedCarpark.deckCount !== undefined && <Typography variant="body2">Decks: {focusedCarpark.deckCount}</Typography>}
            {focusedCarpark.gantryHeight !== undefined && <Typography variant="body2">Gantry Height: {focusedCarpark.gantryHeight}m</Typography>}

            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                color="primary"
                size="small"
                href={buildDirectionsUrl(focusedCarpark.latitude, focusedCarpark.longitude)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Go Here
              </Button>
            </Box>
          </CardContent>
        </Card>
      </ListItem>
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
    return nearbyCarparks.map((lot) => (
      <ListItem key={lot.id} disablePadding sx={{ mb: 1 }}>
        <ListItemButton onClick={() => onSelectCarpark(lot)} sx={{ p: 0 }}>
          <Card sx={{ width: '100%', bgcolor: '#f1f8e9' }}>
            <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#2e7d32' }} title={lot.address}>
                  {lot.id}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <NearMeIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
                  <Typography variant="body2">{Math.round(lot.distanceKm * 1000)} m</Typography>
                </Box>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {lot.address}
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <DirectionsCarIcon sx={{ color: getAvailabilityColor(lot.availableLots, lot.totalLots) }} />
                  <Typography variant="subtitle1" sx={{ color: getAvailabilityColor(lot.availableLots, lot.totalLots), fontWeight: 'bold' }}>
                    {lot.availableLots ?? '-'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">/ {lot.totalLots ?? '-'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <AttachMoneyIcon sx={{ color: 'text.secondary' }} />
                  <Typography variant="h6" color="text.primary" sx={{ fontWeight: 'bold' }}>
                    {lot.estimatedFee !== null ? lot.estimatedFee.toFixed(2) : 'N/A'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </ListItemButton>
      </ListItem>
    ));
  };

  return (
    <Box className="parking-list" sx={{ width: 370, height: '100%', bgcolor: '#e8f5e9', overflowY: 'auto' }}>
      {!focusedCarparkId && (
        <Box sx={{ p: 2, bgcolor: '#e8f5e9', position: 'sticky', top: 0, zIndex: 1 }}>
          <ToggleButtonGroup value={sortBy} exclusive onChange={onSortChange} size="small" fullWidth>
            <ToggleButton value="distance">Distance</ToggleButton>
            <ToggleButton value="price">Price</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      )}

      <List disablePadding sx={{ px: 2 }}>
        {focusedCarparkId ? renderDetailView() : renderListView()}
      </List>
    </Box>
  );
}
