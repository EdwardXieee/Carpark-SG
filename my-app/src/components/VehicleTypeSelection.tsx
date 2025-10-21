import React from 'react';
import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';

interface VehicleTypeSelectionProps {
  vehicleType: string;
  setVehicleType: (vehicleType: string) => void;
}

const VehicleTypeSelection: React.FC<VehicleTypeSelectionProps> = ({ vehicleType, setVehicleType }) => {
  const handleChange = (event: SelectChangeEvent) => {
    setVehicleType(event.target.value as string);
  };

  return (
    <FormControl size="small" sx={{ minWidth: 120, bgcolor: 'white', borderRadius: 1 }}>
      <InputLabel id="vehicle-type-label">Vehicle</InputLabel>
      <Select
        labelId="vehicle-type-label"
        id="vehicle-type-select"
        value={vehicleType}
        label="Vehicle"
        onChange={handleChange}
      >
        <MenuItem value="C">Cars</MenuItem>
        <MenuItem value="H">Heavy Vehicles</MenuItem>
        <MenuItem value="Y">Motorcycles</MenuItem>
        <MenuItem value="S">Motorcycles with side car</MenuItem>
        <MenuItem value="L">Loading/Unloading</MenuItem>
        <MenuItem value="M">Mechanized</MenuItem>
      </Select>
    </FormControl>
  );
};

export default VehicleTypeSelection;
