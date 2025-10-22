import { useCallback, useEffect, useMemo, useState } from 'react';

import type {
  CarparkAvailabilityLot,
  CarparkAvailabilityResponse,
  CarparkOccupancy,
} from '../types/carpark';

type UseCarparkAvailabilityOptions = {
  parkingStartTime: string;
  parkingEndTime: string;
  lotType?: string;
  enabled?: boolean;
  endpoint?: string;
};

type UseCarparkAvailabilityResult = {
  availability: Record<string, CarparkOccupancy>;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

const MAX_IDS_PER_REQUEST = 100;
const LOT_AVAILABILITY_PATH = '/api/car-park/query/lots';
const UNKNOWN_OCCUPANCY: CarparkOccupancy = {
  availableLots: null,
  totalLots: null,
  lotType: null,
  occupancyRatio: null,
  congestionLevel: 'unknown',
};

const resolveEndpoint = (customEndpoint?: string) => {
  if (customEndpoint) {
    return customEndpoint;
  }

  const envBaseUrl = (import.meta.env?.VITE_API_BASE_URL ?? '').trim();
  const forceBaseUrl =
    (import.meta.env?.VITE_API_FORCE_BASE_URL ?? '').toString().toLowerCase() === 'true';
  const isProd = Boolean(import.meta.env?.PROD);

  if (!envBaseUrl || (!isProd && !forceBaseUrl)) {
    return LOT_AVAILABILITY_PATH;
  }

  const normalized = envBaseUrl.endsWith('/') ? envBaseUrl.slice(0, -1) : envBaseUrl;
  return `${normalized}${LOT_AVAILABILITY_PATH}`;
};

const splitIntoChunks = <T,>(items: T[], chunkSize: number) => {
  if (items.length <= chunkSize) {
    return [items];
  }

  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
};

const pickLot = (lots: CarparkAvailabilityLot[], targetType?: string) => {
  if (!lots || lots.length === 0) {
    return null;
  }

  if (targetType) {
    const matched = lots.find((lot) => lot.type === targetType);
    if (matched) {
      return matched;
    }
  }

  return lots[0];
};

const toOccupancy = (lot: CarparkAvailabilityLot | null | undefined): CarparkOccupancy => {
  if (!lot) {
    return UNKNOWN_OCCUPANCY;
  }

  const { available, total, type } = lot;
  const occupancyRatio = total > 0 ? available / total : null;
  const congestionLevel =
    occupancyRatio === null
      ? 'unknown'
      : occupancyRatio >= 0.6
        ? 'low'
        : occupancyRatio >= 0.3
          ? 'medium'
          : 'high';

  return {
    availableLots: available,
    totalLots: total,
    lotType: type,
    occupancyRatio,
    congestionLevel,
  };
};

export const useCarparkAvailability = (
  carparkIds: string[],
  options: UseCarparkAvailabilityOptions,
): UseCarparkAvailabilityResult => {
  const {
    parkingStartTime,
    parkingEndTime,
    lotType,
    enabled = true,
    endpoint,
  } = options;

  const [availability, setAvailability] = useState<Record<string, CarparkOccupancy>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dedupedIds = useMemo(
    () => Array.from(new Set(carparkIds.filter((id) => id && id.trim().length > 0))),
    [carparkIds],
  );

  const resolvedEndpoint = useMemo(() => resolveEndpoint(endpoint), [endpoint]);

  const fetchAvailability = useCallback(
    async (signal?: AbortSignal) => {
      if (!enabled || dedupedIds.length === 0) {
        setAvailability({});
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const nextAvailability: Record<string, CarparkOccupancy> = {};
        const idChunks = splitIntoChunks(dedupedIds, MAX_IDS_PER_REQUEST);

        for (const ids of idChunks) {
          const response = await fetch(resolvedEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              accept: '*/*',
            },
            body: JSON.stringify({
              parkingStartTime,
              parkingEndTime,
              carParkIds: ids,
              lotType: lotType ?? '',
            }),
            signal,
          });

          if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
          }

          const payload = (await response.json()) as CarparkAvailabilityResponse;
          payload.data.forEach(({ id, lots }) => {
            nextAvailability[id] = toOccupancy(pickLot(lots, lotType));
          });
        }

        dedupedIds.forEach((id) => {
          if (!nextAvailability[id]) {
            nextAvailability[id] = UNKNOWN_OCCUPANCY;
          }
        });

        if (!signal?.aborted) {
          setAvailability(nextAvailability);
        }
      } catch (err) {
        if (signal?.aborted) {
          return;
        }

        const message = err instanceof Error ? err.message : 'Failed to load availability';
        setError(message);
        setAvailability({});
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [dedupedIds, enabled, lotType, parkingEndTime, parkingStartTime, resolvedEndpoint],
  );

  useEffect(() => {
    const controller = new AbortController();

    fetchAvailability(controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchAvailability]);

  const refetch = useCallback(async () => {
    await fetchAvailability();
  }, [fetchAvailability]);

  return {
    availability,
    loading,
    error,
    refetch,
  };
};
