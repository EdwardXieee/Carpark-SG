import { useMemo } from 'react';

import type { CarparkLocation, NearbyCarpark } from '../types/carpark';
import { getDistanceInKm } from '../utils/geo';
import { generateMockDetails } from '../utils/mockCarparkDetails';

type Anchor = { lat: number; lon: number } | null;

export const useNearbyCarparks = (
  carparks: CarparkLocation[],
  anchor: Anchor,
  radiusKm = 1,
) => {
  return useMemo<NearbyCarpark[]>(() => {
    if (!anchor) {
      return [];
    }

    const { lat, lon } = anchor;

    return carparks
      .map((carpark) => ({
        carpark,
        distanceKm: getDistanceInKm(lat, lon, carpark.latitude, carpark.longitude),
      }))
      .filter(({ distanceKm }) => Number.isFinite(distanceKm) && distanceKm <= radiusKm)
      .map(({ carpark, distanceKm }) => generateMockDetails(carpark, distanceKm));
  }, [anchor, carparks, radiusKm]);
};
