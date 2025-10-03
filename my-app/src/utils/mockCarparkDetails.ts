import type { CarparkLocation, NearbyCarpark } from '../types/carpark';

const priceOptions = [1.2, 1.5, 1.8, 2.4];
const durationOptions = [60, 90, 120, 180];
const paymentPools = [
  ['CashCard', 'EZ-Link'],
  ['CashCard', 'CEPAS'],
  ['PayNow', 'Visa'],
  ['PayLah!', 'EZ-Link'],
];

export const generateMockDetails = (
  carpark: CarparkLocation,
  distanceKm: number,
): NearbyCarpark => {
  const seed = carpark.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const price = priceOptions[seed % priceOptions.length];
  const durationMinutes = durationOptions[seed % durationOptions.length];
  const spaces = 40 + (seed % 500);
  const walkingMinutes = Math.max(1, Math.round((distanceKm / 4.5) * 60));
  const address = `Block ${100 + (seed % 80)} Clementi Ave ${(seed % 5) + 1}`;
  const rates = `S$${price.toFixed(2)}/hour`;
  const paymentMethods = paymentPools[seed % paymentPools.length];
  const freeParking = seed % 2 === 0 ? 'Sun & PH 7am-10:30pm' : 'No free parking';
  const maxHeightMeters = Number((1.8 + (seed % 4) * 0.1).toFixed(1));

  return {
    id: carpark.id,
    name: carpark.id,
    distanceKm,
    walkingMinutes,
    price,
    spaces,
    durationMinutes,
    latitude: carpark.latitude,
    longitude: carpark.longitude,
    address,
    rates,
    paymentMethods,
    freeParking,
    maxHeightMeters,
  };
};
