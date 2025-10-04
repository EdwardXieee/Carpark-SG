import { List, ListItem, ListItemButton, Card, CardContent, Box, Typography, ToggleButtonGroup, ToggleButton, IconButton, Button } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

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
};

export function CarparkSidebar({
  sortBy,
  onSortChange,
  nearbyCarparks,
  focusedCarpark,
  onSelectCarpark,
  onCloseDetails,
  anchor,
}: CarparkSidebarProps) {
  const buildDirectionsUrl = (lat: number, lon: number) => {
    const searchParams = new URLSearchParams({ api: '1', destination: `${lat},${lon}` });
    if (anchor) {
      searchParams.set('origin', `${anchor.lat},${anchor.lon}`);
    }
    return `https://www.google.com/maps/dir/?${searchParams.toString()}`;
  };

  return (
    <Box className="parking-list" sx={{ width: 370, height: '100%', bgcolor: '#e8f5e9' }}>
      {!focusedCarpark && (
        <Box className="sort-container">
          <Typography variant="subtitle1">Sort by:</Typography>
          <ToggleButtonGroup value={sortBy} exclusive onChange={onSortChange} size="small">
            <ToggleButton value="distance">Distance</ToggleButton>
            <ToggleButton value="price">Price</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      )}

      <List disablePadding>
        {focusedCarpark ? (
          <ListItem className="parking-item" disablePadding>
            <Card className="parking-card" sx={{ width: '100%', bgcolor: '#f1f8e9' }}>
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
                      {focusedCarpark.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {focusedCarpark.address}
                    </Typography>
                  </Box>
                  <IconButton size="small" onClick={onCloseDetails} aria-label="关闭详情">
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Estimated rate</Typography>
                    <Typography variant="subtitle1">{focusedCarpark.rates}</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" color="text.secondary">Spaces</Typography>
                    <Typography variant="subtitle1">{focusedCarpark.spaces}</Typography>
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
                  <Typography variant="body2">{focusedCarpark.paymentMethods.join(', ')}</Typography>
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
                    Go Here
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
                  方圆 1 公里内暂无停车场
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
                    <Box className="parking-header">
                      <Typography className="parking-id" variant="subtitle1" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
                        {lot.name}
                      </Typography>
                      <Typography className="parking-spaces" variant="body2" color="primary" sx={{ color: '#4caf50' }}>
                        {lot.spaces} spaces
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography className="parking-price" variant="h6">
                        S${lot.price.toFixed(2)}
                      </Typography>
                      <Box className="parking-distance">
                        <Typography variant="body2">{lot.walkingMinutes} min</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                          approx walk
                        </Typography>
                      </Box>
                    </Box>
                    <Typography className="parking-duration" variant="caption" color="text.secondary">
                      ~{Math.round(lot.distanceKm * 1000)} m • Max stay {lot.durationMinutes} min
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
