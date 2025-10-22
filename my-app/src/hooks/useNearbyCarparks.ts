import { useMemo } from 'react';

import type { CarparkLocation, CarparkOccupancy, NearbyCarpark } from '../types/carpark';
import { getDistanceInKm } from '../utils/geo';
import { generateMockDetails } from '../utils/mockCarparkDetails';

type Anchor = { lat: number; lon: number } | null;

export const useNearbyCarparks = (
  carparks: CarparkLocation[],
  anchor: Anchor,
  availabilityById: Record<string, CarparkOccupancy>,
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
      .map(({ carpark, distanceKm }) => {
        const details = generateMockDetails(carpark, distanceKm);
        const occupancy = availabilityById[carpark.id];

        if (occupancy) {
          details.availableLots = occupancy.availableLots;
          details.totalLots = occupancy.totalLots;
          details.lotType = occupancy.lotType;
          details.occupancyRatio = occupancy.occupancyRatio;
          details.congestionLevel = occupancy.congestionLevel;
        }

        return details;
      });
  }, [anchor, availabilityById, carparks, radiusKm]);
};
