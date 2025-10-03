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
}

export default function SearchBox({ onSelectResult }: SearchBoxProps) {
  const [inputValue, setInputValue] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // 定义搜索函数
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

  // 用 useMemo 创建防抖函数（避免每次输入都触发）
  const debouncedSearch = useMemo(
    () => debounce((val: string) => fetchResults(val), 500),
    []
  );

  // 输入时调用防抖搜索
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    debouncedSearch(val);
  };

  return (
    <div style={{ position: 'relative', width: 400 }}>
      <div style={{ display: 'flex' }}>
        <TextField
            fullWidth
            variant="outlined"
            placeholder="Search address, postcode..."
            value={inputValue}
            onChange={handleChange}
            size="small"
            sx={{
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

        <Fab
          color="primary"
          size="small"
          disabled={isSearching}
          sx={{
            ml: 1,
            bgcolor: '#4caf50',
            width: 45,
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

      {/* 搜索结果下拉 */}
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
