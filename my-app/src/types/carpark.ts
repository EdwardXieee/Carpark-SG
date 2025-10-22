export type CarparkLocation = {
  id: string;
  latitude: number;
  longitude: number;
};

export type CarparkAvailabilityLot = {
  total: number;
  type: string;
  available: number;
};

export type CarparkAvailabilityResponse = {
  success: boolean;
  code: string;
  message: string;
  data: Array<{
    id: string;
    lots: CarparkAvailabilityLot[];
  }>;
};

export type CarparkOccupancy = {
  availableLots: number | null;
  totalLots: number | null;
  lotType: string | null;
  occupancyRatio: number | null;
  congestionLevel: 'low' | 'medium' | 'high' | 'unknown';
};

export type NearbyCarpark = CarparkOccupancy & {
  id: string;
  name: string;
  distanceKm: number;
  walkingMinutes: number;
  price: number;
  durationMinutes: number;
  latitude: number;
  longitude: number;
  address: string;
  rates: string;
  paymentMethods: string[];
  freeParking: string;
  maxHeightMeters: number;
};
