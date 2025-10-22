import { useEffect, useState } from 'react';

import type { CarparkLocation } from '../types/carpark';

export const useCarparkLocations = () => {
  const [carparks, setCarparks] = useState<CarparkLocation[]>([]);

  useEffect(() => {
    const loadCarparks = async () => {
      try {
        const response = await fetch('/carpark_locations.csv');
        const csvText = await response.text();

        const lines = csvText.split('\n');
        const carparkData = lines
          .slice(1)
          .filter((line) => line.trim() !== '')
          .map((line) => {
            const values = line.split(',');
            return {
              id: values[0],
              latitude: parseFloat(values[1]),
              longitude: parseFloat(values[2]),
            } satisfies CarparkLocation;
          });

        setCarparks(carparkData);
        console.log(`Loaded ${carparkData.length} car park records`);
      } catch (error) {
        console.error('Failed to load car park data:', error);
      }
    };

    loadCarparks();
  }, []);

  return carparks;
};
