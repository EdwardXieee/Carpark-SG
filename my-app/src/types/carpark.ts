export type Carpark = {
  id: string;
  address: string;
  latitude: number;
  longitude: number;
};

export type CarparkLocation = {
  id: string;
  latitude: number;
  longitude: number;
};

export type NearbyCarpark = {
  id: string;
  address: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  totalLots: number | null;
  availableLots: number | null;
  estimatedFee: number | null;
  lotType?: string;
  agency?: string;
  type?: string;
  parkingSystemType?: string;
  shortTermParkingPeriod?: string;
  freeParkingPeriod?: string;
  nightParkingFlag?: number;
  basementFlag?: number;
  deckCount?: number;
  gantryHeight?: number;
};
