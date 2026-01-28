import { useInfiniteQuery } from "@tanstack/react-query";
import { useTrading } from "@/providers/TradingProvider";
import { Side } from "@polymarket/clob-client";
import type { CategoryId, Category } from "@/constants/categories";

export type PolymarketMarket = {
  id: string;
  question: string;
  description?: string;
  slug: string;
  active: boolean;
  closed: boolean;
  icon?: string;
  image?: string;
  volume?: string;
  volume24hr?: string | number;
  liquidity?: string | number;
  spread?: string;
  outcomes?: string;
  outcomePrices?: string;
  clobTokenIds?: string;
  conditionId?: string;
  endDate?: string;
  endDateIso?: string;
  gameStartTime?: string;
  events?: any[];
  eventTitle?: string;
  eventSlug?: string;
  eventId?: string;
  eventIcon?: string;
  negRisk?: boolean;
  realtimePrices?: Record<
    string,
    {
      bidPrice: number;
      askPrice: number;
      midPrice: number;
      spread: number;
    }
  >;
  [key: string]: any;
};

interface UseMarketsOptions {
  pageSize?: number;
  categoryId?: CategoryId;
  tagId?: number | null;
  categories?: Category[];
}

export default function useMarkets(options: UseMarketsOptions = {}) {
  const { pageSize = 20, categoryId = "trending", tagId, categories = [] } = options;
  const { clobClient } = useTrading();

  return useInfiniteQuery({
    queryKey: ["political-markets", pageSize, categoryId, tagId, !!clobClient],
    queryFn: async ({ pageParam = 0 }): Promise<PolymarketMarket[]> => {
      let url = `/api/polymarket/markets?limit=${pageSize}&offset=${pageParam}`;
      let targetTagId = tagId;

      // If no explicit tagId provided, get it from the category
      if (targetTagId === undefined && categories.length > 0) {
        const category = categories.find(c => c.id === categoryId);
        targetTagId = category?.tagId ?? 2; // Default to politics tag (2)
      }

      // Always ensure we're filtering by politics (tag 2) or its subcategories
      if (targetTagId) {
        url += `&tag_id=${targetTagId}`;
      } else {
        url += `&tag_id=2`; // Default to politics
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Failed to fetch political markets");
      }

      const markets: PolymarketMarket[] = await response.json();

      // Fetch realtime prices from CLOB if client is available
      if (clobClient) {
        await Promise.all(
          markets.map(async (market) => {
            try {
              const tokenIds = market.clobTokenIds
                ? JSON.parse(market.clobTokenIds)
                : [];

              const priceMap: Record<string, any> = {};

              await Promise.all(
                tokenIds.map(async (tokenId: string) => {
                  try {
                    const [bidResponse, askResponse] = await Promise.all([
                      clobClient.getPrice(tokenId, Side.BUY),
                      clobClient.getPrice(tokenId, Side.SELL),
                    ]);

                    const bidPrice = parseFloat(bidResponse.price);
                    const askPrice = parseFloat(askResponse.price);

                    if (
                      !isNaN(bidPrice) &&
                      !isNaN(askPrice) &&
                      bidPrice > 0 &&
                      bidPrice < 1 &&
                      askPrice > 0 &&
                      askPrice < 1
                    ) {
                      priceMap[tokenId] = {
                        bidPrice,
                        askPrice,
                        midPrice: (bidPrice + askPrice) / 2,
                        spread: askPrice - bidPrice,
                      };
                    }
                  } catch (error) {
                    console.warn(
                      `Error fetching price for token ${tokenId}:`,
                      error
                    );
                  }
                })
              );

              market.realtimePrices = priceMap;
            } catch (error) {
              console.warn(
                `Failed to fetch prices for market ${market.id}:`,
                error
              );
            }
          })
        );
      }

      return markets;
    },
    getNextPageParam: (lastPage, allPages) => {
      // If the last page has fewer markets than pageSize, we've reached the end
      if (lastPage.length < pageSize) {
        return undefined;
      }
      // Return the offset for the next page
      return allPages.length * pageSize;
    },
    initialPageParam: 0,
    staleTime: 2_000,
    refetchInterval: 10_000, // Reduced frequency for infinite queries
    refetchIntervalInBackground: false, // Disable background refetch for infinite queries
    refetchOnWindowFocus: false, // Disable refetch on window focus for infinite queries
  });
}

