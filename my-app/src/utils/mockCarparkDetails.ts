import type { CarparkLocation, NearbyCarpark } from '../types/carpark';

export const generateMockDetails = (
  carpark: CarparkLocation,
  distanceKm: number,
): NearbyCarpark => {
  const walkingMinutes = Math.max(1, Math.round((distanceKm / 4.5) * 60));

  return {
    id: carpark.id,
    name: carpark.id,
    distanceKm,
    walkingMinutes,
    price: 0,
    availableLots: null,
    totalLots: null,
    lotType: null,
    occupancyRatio: null,
    congestionLevel: 'unknown',
    durationMinutes: 0,
    latitude: carpark.latitude,
    longitude: carpark.longitude,
    address: 'To be updated',
    rates: 'To be updated',
    paymentMethods: [],
    freeParking: 'To be updated',
    maxHeightMeters: 0,
  };
};
