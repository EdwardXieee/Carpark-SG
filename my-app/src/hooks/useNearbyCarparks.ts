import { useEffect, useState } from 'react';
import type { CarparkLocation, NearbyCarpark } from '../types/carpark';
import { getDistanceInKm } from '../utils/geo';

type Anchor = { lat: number; lon: number } | null;

const formatDate = (date: Date) => {
  const pad = (num: number) => num.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

export const useNearbyCarparks = (
  carparks: CarparkLocation[],
  anchor: Anchor,
  startTime: Date,
  endTime: Date,
  lotType: string,
  radiusKm = 1,
) => {
  const [nearbyCarparks, setNearbyCarparks] = useState<NearbyCarpark[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!anchor) {
      setNearbyCarparks([]);
      return;
    }

    const fetchCarparkDetails = async () => {
      setLoading(true);
      try {
        const { lat, lon } = anchor;
        const nearbyCarparkLocations = carparks
          .map((carpark) => ({
            ...carpark,
            distanceKm: getDistanceInKm(lat, lon, carpark.latitude, carpark.longitude),
          }))
          .filter((carpark) => Number.isFinite(carpark.distanceKm) && carpark.distanceKm <= radiusKm);

        if (nearbyCarparkLocations.length === 0) {
          setNearbyCarparks([]);
          return;
        }

        const carParkIds = nearbyCarparkLocations.map((c) => c.id);
        const requestBody = {
          parkingStartTime: formatDate(startTime),
          parkingEndTime: formatDate(endTime),
          carParkIds,
          lotType,
        };

        const [lotsResponse, ratesResponse] = await Promise.all([
          fetch('/api/car-park/query/lots', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
          }),
          fetch('/api/car-park/query/parking-rate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
          }),
        ]);

        const lotsData = await lotsResponse.json();
        const ratesData = await ratesResponse.json();

        const combinedData = nearbyCarparkLocations.map((carpark) => {
          const lotsInfo = lotsData.data?.find((d: any) => d.id === carpark.id);
          const ratesInfo = ratesData.data?.find((d: any) => d.id === carpark.id);

          return {
            ...carpark,
            totalLots: lotsInfo?.lots[0]?.total ?? null,
            availableLots: lotsInfo?.lots[0]?.available ?? null,
            estimatedFee: ratesInfo?.rates[0]?.estimatedFee ?? null,
          };
        });

        setNearbyCarparks(combinedData);
      } catch (error) {
        console.error('Failed to fetch carpark details:', error);
        setNearbyCarparks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCarparkDetails();
  }, [anchor, carparks, radiusKm, startTime, endTime, lotType]);

  return { nearbyCarparks, loading };
};
