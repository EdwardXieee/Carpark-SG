import { useState, useMemo } from 'react';
import { TextField, InputAdornment, Fab, Paper, List, ListItem, ListItemButton, ListItemIcon, ListItemText, CircularProgress } from '@mui/material';
import { Search as SearchIcon, LocationOn as LocationOnIcon } from '@mui/icons-material';
import debounce from 'lodash.debounce';

interface SearchResult {
  display_name: string;
  lat: number;
  lon: number;
}

interface SearchBoxProps {
  onSelectResult: (result: SearchResult) => void;
  onSearchClick: (query: string) => void;
  middleContent?: React.ReactNode;
}

export default function SearchBox({ onSelectResult, onSearchClick, middleContent }: SearchBoxProps) {
  const [inputValue, setInputValue] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Define search function that queries Nominatim
  const fetchResults = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=sg`
      );
      const data = await response.json();
      const results = (data || []).map((d: any) => ({
        display_name: d.display_name,
        lat: parseFloat(d.lat),
        lon: parseFloat(d.lon),
      }));
      setSearchResults(results);
    } finally {
      setIsSearching(false);
    }
  };

  // Create debounced search function so we do not query on every keystroke
  const debouncedSearch = useMemo(
    () => debounce((val: string) => fetchResults(val), 500),
    []
  );

  // Trigger debounced search whenever the input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    debouncedSearch(val);
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <TextField
            fullWidth
            variant="outlined"
            placeholder="Search address, postcode..."
            value={inputValue}
            onChange={handleChange}
            size="small"
            sx={{
                flexGrow: 1,
                bgcolor: '#ffffff',
                borderRadius: '4px',
                '& .MuiOutlinedInput-notchedOutline': {
                borderColor: '#4caf50',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: '#2e7d32',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: '#2e7d32',
                },
            }}
            InputProps={{
                startAdornment: (
                <InputAdornment position="start">
                    <SearchIcon />
                </InputAdornment>
                ),
            }}
        />

        {middleContent}

        <Fab
          color="primary"
          size="small"
          disabled={isSearching}
          onClick={() => onSearchClick(inputValue)}
          sx={{
            ml: 1,
            bgcolor: '#4caf50',
            width: 65,
            height: 40,
            minHeight: 40,
            borderRadius: '50%',
          }}
        >
          {isSearching ? (
            <CircularProgress size={20} sx={{ color: 'white' }} />
          ) : (
            <SearchIcon />
          )}
        </Fab>
      </div>

      {/* Search result dropdown */}
      {searchResults.length > 0 && (
        <Paper
          elevation={3}
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 2000,
            mt: 0.5,
            maxHeight: '200px',
            overflow: 'auto',
            bgcolor: '#f1f8e9',
            borderRadius: '4px',
          }}
        >
          <List dense>
            {searchResults.map((result, index) => (
              <ListItem key={index} disablePadding>
                <ListItemButton
                  onClick={() => {
                    onSelectResult(result);
                    setSearchResults([]);
                    setInputValue(result.display_name.split(',')[0]);
                  }}
                  sx={{ '&:hover': { bgcolor: '#e8f5e9' } }}
                >
                  <ListItemIcon sx={{ minWidth: '40px' }}>
                    <LocationOnIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary={result.display_name.split(',')[0]}
                    secondary={result.display_name.split(',').slice(1, 3).join(',')}
                    primaryTypographyProps={{
                      color: '#2e7d32',
                      fontWeight: 'medium',
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </div>
  );
}
