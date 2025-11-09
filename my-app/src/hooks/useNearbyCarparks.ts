import { useEffect, useMemo, useState } from 'react';

import type { CarparkLocation, NearbyCarpark } from '../types/carpark';
import { getDistanceInKm } from '../utils/geo';
import { md5 } from '../utils/md5';

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

const computeOccupancyRatio = (available: number | null, total: number | null) => {
  if (available === null || total === null || total === 0) {
    return null;
  }
  return available / total;
};

const computeCongestionLevel = (ratio: number | null) => {
  if (ratio === null) {
    return 'unknown';
  }
  if (ratio >= 0.6) {
    return 'low';
  }
  if (ratio >= 0.3) {
    return 'medium';
  }
  return 'high';
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

    const controller = new AbortController();

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

        const requestBody_key = {
          parkingStartTime: formatDate(startTime),
          parkingEndTime: formatDate(endTime),
          carParkIds,
          lotType,
          key: md5(JSON.stringify(carParkIds)),
        };

        const [lotsResponse, ratesResponse] = await Promise.all([
          fetch('/api/car-park/query/lots', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody_key),
            signal: controller.signal,
          }),
          fetch('/api/car-park/query/parking-rate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
          }),
        ]);

        if (!lotsResponse.ok || !ratesResponse.ok) {
          throw new Error('Failed to fetch nearby carpark data');
        }

        const lotsData = await lotsResponse.json();
        const ratesData = await ratesResponse.json();

        const combinedData: NearbyCarpark[] = nearbyCarparkLocations.map((carpark) => {
          const lotsInfo = lotsData.data?.find((d: any) => d.id === carpark.id);
          const ratesInfo = ratesData.data?.find((d: any) => d.id === carpark.id);

          const availableLots = lotsInfo?.lots?.[0]?.available ?? null;
          const totalLots = lotsInfo?.lots?.[0]?.total ?? null;
          const occupancyRatio = computeOccupancyRatio(availableLots, totalLots);

          return {
            id: carpark.id,
            address: ratesInfo?.address ?? 'Address not available',
            latitude: carpark.latitude,
            longitude: carpark.longitude,
            distanceKm: carpark.distanceKm ?? 0,
            totalLots,
            availableLots,
            estimatedFee: ratesInfo?.rates?.[0]?.estimatedFee ?? null,
            lotType: ratesInfo?.type,
            agency: ratesInfo?.agency,
            type: ratesInfo?.type,
            parkingSystemType: ratesInfo?.parkingSystemType,
            shortTermParkingPeriod: ratesInfo?.shortTermParkingPeriod,
            freeParkingPeriod: ratesInfo?.freeParkingPeriod,
            nightParkingFlag: ratesInfo?.nightParkingFlag,
            basementFlag: ratesInfo?.basementFlag,
            deckCount: ratesInfo?.deckCount,
            gantryHeight: ratesInfo?.gantryHeight,
            occupancyRatio,
            congestionLevel: computeCongestionLevel(occupancyRatio),
          };
        });

        setNearbyCarparks(combinedData);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        console.error('Failed to fetch carpark details:', error);
        setNearbyCarparks([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchCarparkDetails();

    return () => controller.abort();
  }, [anchor, carparks, radiusKm, startTime, endTime, lotType]);

  const decoratedCarparks = useMemo(() => nearbyCarparks, [nearbyCarparks]);

  return { nearbyCarparks: decoratedCarparks, loading };
};
