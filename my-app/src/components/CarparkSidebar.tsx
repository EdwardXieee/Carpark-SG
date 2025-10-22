import { List, ListItem, ListItemText, Card, CardContent, Box, Typography, ToggleButtonGroup, ToggleButton, IconButton, Button, CircularProgress, Divider, ListItemButton } from '@mui/material';
import { Close as CloseIcon, DirectionsCar as DirectionsCarIcon, AttachMoney as AttachMoneyIcon, NearMe as NearMeIcon } from '@mui/icons-material';

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

  const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

  const renderDetailView = () => {
    if (!focusedCarpark) {
      return (
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', pt: 10 }}>
          <CircularProgress />
        </Box>
      );
    }

    const mockDetails = {
      id: 'CLTR',
      type: 'CAR PARK',
      estimatedFee: 1.20,
      availableLots: 581,
      totalLots: 743,
      distanceKm: 0.108,
      agency: 'HDB',
      parkingSystemType: 'ELECTRONIC PARKING',
      shortTermParkingPeriod: 'WHOLE DAY',
      freeParkingPeriod: 'NO',
      nightParkingFlag: 1,
      basementFlag: 0,
      deckCount: 5,
      gantryHeight: 2.1,
    };

    const displayDetails = { ...mockDetails, ...focusedCarpark };
    const walkingMinutes = Math.round(displayDetails.distanceKm * 12);

    return (
      <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexShrink: 0 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
              {displayDetails.id}
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 'medium' }}>
              {displayDetails.type} &middot; <Box component="span" sx={{ color: getAvailabilityColor(displayDetails.availableLots, displayDetails.totalLots), fontWeight: 'bold' }}>{`${displayDetails.availableLots} / ${displayDetails.totalLots}`}</Box>
            </Typography>
          </Box>
          <IconButton size="small" onClick={onCloseDetails} aria-label="Close Details">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Scrollable Content */}
        <Box sx={{ overflowY: 'auto', flexGrow: 1 }}>
          {/* Quick Info */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ mb: 1.5 }}>
              <Typography variant="caption" color="text.secondary">Estimated Fee</Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {`$${displayDetails.estimatedFee.toFixed(2)}`}<Typography component="span" variant="body2" color="text.secondary">{` / ${durationHours.toFixed(1)} hr`}</Typography>
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Distance</Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {`${Math.round(displayDetails.distanceKm * 1000)} m `}<Typography component="span" variant="body2" color="text.secondary">{`(${walkingMinutes} min walk)`}</Typography>
              </Typography>
            </Box>
          </Box>

          {/* Action Button */}
          <Button 
            variant="contained" 
            color="primary" 
            fullWidth 
            sx={{ mb: 2, fontWeight: 'bold' }}
            href={buildDirectionsUrl(displayDetails.latitude, displayDetails.longitude)}
            target="_blank"
            rel="noopener noreferrer"
          >
            GO HERE
          </Button>

          {/* Details List */}
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>Parking Information</Typography>
          <Divider sx={{ mb: 1 }} />
          <List dense>
            <DetailItem label="Agency" value={displayDetails.agency} />
            <DetailItem label="Parking System" value={displayDetails.parkingSystemType} />
            <DetailItem label="Short-term Parking" value={displayDetails.shortTermParkingPeriod} />
            <DetailItem label="Free Parking" value={displayDetails.freeParkingPeriod} />
            <DetailItem label="Night Parking" value={displayDetails.nightParkingFlag ? 'Yes' : 'No'} />
            <DetailItem label="Basement Parking" value={displayDetails.basementFlag ? 'Yes' : 'No'} />
            <DetailItem label="Decks" value={displayDetails.deckCount} />
            <DetailItem label="Gantry Height" value={`${displayDetails.gantryHeight}m`} />
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
                <Typography variant="h6" color="text.primary" sx={{ fontWeight: 'bold' }}>
                  {lot.estimatedFee !== null ? `$${lot.estimatedFee.toFixed(2)} / ${durationHours.toFixed(1)} hr` : 'N/A'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </ListItemButton>
      </ListItem>
    ));
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

      <List disablePadding sx={{ px: 2, height: '100%' }}>
        {focusedCarparkId ? renderDetailView() : renderListView()}
      </List>
    </Box>
  );
}