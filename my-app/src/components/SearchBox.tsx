import { useState, useMemo } from 'react';
import { TextField, InputAdornment, Fab, Paper, List, ListItem, ListItemButton, ListItemIcon, ListItemText, CircularProgress } from '@mui/material';
import { Search as SearchIcon, LocationOn as LocationOnIcon } from '@mui/icons-material';
import debounce from 'lodash.debounce';

interface SearchResult {
  address: string;
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

  // Define search function that queries OneMap API
  const fetchResults = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${encodeURIComponent(query)}&returnGeom=Y&getAddrDetails=Y`
      );
      const data = await response.json();
      const results = (data.results || []).map((d: any) => ({
        address: d.ADDRESS,
        lat: parseFloat(d.LATITUDE),
        lon: parseFloat(d.LONGITUDE),
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
                    setInputValue(result.address);
                  }}
                  sx={{ '&:hover': { bgcolor: '#e8f5e9' } }}
                >
                  <ListItemIcon sx={{ minWidth: '40px' }}>
                    <LocationOnIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary={result.address}
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
