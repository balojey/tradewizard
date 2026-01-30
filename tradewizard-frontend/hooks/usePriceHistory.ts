import { useQuery } from "@tanstack/react-query";

export interface PriceHistoryPoint {
  timestamp: string;
  price: number;
  volume: number;
  high: number;
  low: number;
}

export interface PriceHistoryResponse {
  conditionId: string;
  tokenId: string;
  timeRange: string;
  data: PriceHistoryPoint[];
  dataSource: 'real' | 'synthetic';
  points: number;
}

export type TimeRange = '1H' | '4H' | '1D' | '7D' | '30D';

interface UsePriceHistoryOptions {
  enabled?: boolean;
  refetchInterval?: number;
}

export default function usePriceHistory(
  conditionId: string | null,
  tokenId: string | null,
  timeRange: TimeRange = '1D',
  options: UsePriceHistoryOptions = {}
) {
  const { enabled = true, refetchInterval } = options;

  return useQuery({
    queryKey: ["price-history", conditionId, tokenId, timeRange],
    queryFn: async (): Promise<PriceHistoryResponse> => {
      if (!conditionId || !tokenId) {
        throw new Error("Missing conditionId or tokenId");
      }

      const response = await fetch("/api/polymarket/price-history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conditionId,
          tokenId,
          timeRange,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    },
    enabled: enabled && !!conditionId && !!tokenId,
    staleTime: 30_000, // 30 seconds
    refetchInterval: refetchInterval || (timeRange === '1H' ? 30_000 : 60_000), // More frequent for shorter timeframes
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}