export type CarparkLocation = {
  id: string;
  latitude: number;
  longitude: number;
};

export type NearbyCarpark = {
  id: string;
  name: string;
  distanceKm: number;
  walkingMinutes: number;
  price: number;
  spaces: number;
  durationMinutes: number;
  latitude: number;
  longitude: number;
  address: string;
  rates: string;
  paymentMethods: string[];
  freeParking: string;
  maxHeightMeters: number;
};
