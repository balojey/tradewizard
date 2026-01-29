"use client";

import { useState, useMemo, useCallback } from "react";
import { useTrading } from "@/providers/TradingProvider";
import useMarkets from "@/hooks/useMarkets";
import usePoliticalCategories from "@/hooks/usePoliticalCategories";
import useInfiniteScroll from "@/hooks/useInfiniteScroll";
import useMarketRecommendations from "@/hooks/useMarketRecommendations";
import { type CategoryId, DEFAULT_CATEGORY } from "@/constants/categories";
import { filterMarketsByStatus, getMarketStatusCounts } from "@/utils/marketFilters";

import ErrorState from "@/components/shared/ErrorState";
import EmptyState from "@/components/shared/EmptyState";
import LoadingState from "@/components/shared/LoadingState";
import MarketCard from "@/components/Trading/Markets/MarketCard";
import CategoryTabs from "@/components/Trading/Markets/CategoryTabs";
import MarketStatusFilter, { type MarketStatus } from "@/components/Trading/Markets/MarketStatusFilter";
import OrderPlacementModal from "@/components/Trading/OrderModal";

export default function PoliticalMarkets() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategoryId>(DEFAULT_CATEGORY);
  const [marketStatus, setMarketStatus] = useState<MarketStatus>("all");
  const [selectedOutcome, setSelectedOutcome] = useState<{
    marketTitle: string;
    outcome: string;
    price: number;
    tokenId: string;
    negRisk: boolean;
  } | null>(null);

  const { clobClient, isGeoblocked } = useTrading();

  // Fetch dynamic political categories
  const {
    data: categories = [],
    isLoading: categoriesLoading,
    error: categoriesError
  } = usePoliticalCategories();

  // Get current active category details
  const activeCategoryObj = categories.find(c => c.id === activeCategory);
  const activeTagId = activeCategoryObj?.tagId ?? 2; // Default to politics tag

  // Fetch markets for the active category with infinite query
  const {
    data,
    isLoading: marketsLoading,
    error: marketsError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMarkets({
    pageSize: 20,
    categoryId: activeCategory,
    tagId: activeTagId,
    categories,
  });

  // Flatten all pages into a single array
  const allMarkets = useMemo(() => {
    return data?.pages.flat() ?? [];
  }, [data]);

  // Filter markets by status
  const markets = useMemo(() => {
    return filterMarketsByStatus(allMarkets, marketStatus);
  }, [allMarkets, marketStatus]);

  // Batch fetch recommendations for all visible markets
  const {
    recommendations,
    isLoading: recommendationsLoading,
    getRecommendationCount
  } = useMarketRecommendations(markets);

  // Calculate market counts for filter display
  const marketCounts = useMemo(() => {
    return getMarketStatusCounts(allMarkets);
  }, [allMarkets, marketStatus]);

  const isLoading = categoriesLoading || marketsLoading;
  const error = categoriesError || marketsError;

  // Infinite scroll callback
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Infinite scroll hook
  const { targetRef, resetFetching } = useInfiniteScroll(loadMore);

  // Reset fetching state when new data arrives
  useMemo(() => {
    if (!isFetchingNextPage) {
      resetFetching();
    }
  }, [isFetchingNextPage, resetFetching]);

  // Helper to get consistent label
  const categoryLabel = activeCategoryObj?.label || "Political";

  const handleOutcomeClick = (
    marketTitle: string,
    outcome: string,
    price: number,
    tokenId: string,
    negRisk: boolean
  ) => {
    setSelectedOutcome({ marketTitle, outcome, price, tokenId, negRisk });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOutcome(null);
  };

  const handleCategoryChange = (categoryId: CategoryId) => {
    setActiveCategory(categoryId);
  };

  const handleStatusChange = (status: MarketStatus) => {
    setMarketStatus(status);
  };

  return (
    <>
      <div className="space-y-4">
        {/* Category Tabs */}
        {categories.length > 0 && (
          <CategoryTabs
            categories={categories}
            activeCategory={activeCategory}
            onCategoryChange={handleCategoryChange}
          />
        )}

        {/* Header with Status Filter */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="text-xl font-bold">
              {categoryLabel} Markets {markets.length > 0 ? `(${markets.length}${hasNextPage ? '+' : ''})` : ""}
            </h3>
            
            {/* AI Recommendations Count */}
            {getRecommendationCount() > 0 && (
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-blue-700">
                  {getRecommendationCount()} AI Analysis
                </span>
              </div>
            )}
            
            {/* Market Status Filter */}
            <MarketStatusFilter
              currentStatus={marketStatus}
              onStatusChange={handleStatusChange}
              marketCounts={marketCounts}
            />
          </div>
          
          <p className="text-xs text-gray-400">Political prediction markets only</p>
        </div>

        {/* Loading State - Initial Load */}
        {isLoading && markets.length === 0 && (
          <LoadingState message={`Loading ${categoryLabel.toLowerCase()} markets...`} />
        )}

        {/* Error State */}
        {error && !isLoading && markets.length === 0 && (
          <ErrorState error={error} title="Error loading political markets" />
        )}

        {/* Empty State */}
        {!isLoading && !error && markets.length === 0 && allMarkets.length > 0 && (
          <EmptyState
            title={`No ${marketStatus === "all" ? "" : marketStatus.charAt(0).toUpperCase() + marketStatus.slice(1).replace("-", " ")} Markets`}
            message={`No ${categoryLabel.toLowerCase()} markets match the selected filter.`}
          />
        )}

        {/* Empty State - No markets at all */}
        {!isLoading && !error && allMarkets.length === 0 && (
          <EmptyState
            title="No Political Markets Available"
            message={`No active ${categoryLabel.toLowerCase()} markets found.`}
          />
        )}

        {/* Market Cards */}
        {markets.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {markets.map((market, index) => (
              <MarketCard
                key={`${market.id}-${index}`} // Include index to handle potential duplicates
                market={market}
                disabled={isGeoblocked}
                onOutcomeClick={handleOutcomeClick}
              />
            ))}

            {/* Infinite Scroll Trigger */}
            {hasNextPage && (
              <div ref={targetRef} className="py-4 flex justify-center">
                {isFetchingNextPage ? (
                  <LoadingState message="Loading more markets..." />
                ) : (
                  <div className="text-gray-400 text-sm">
                    Scroll down to load more markets
                  </div>
                )}
              </div>
            )}

            {/* End of Results Indicator */}
            {!hasNextPage && markets.length > 20 && (
              <div className="py-4 text-center text-gray-400 text-sm">
                You've reached the end of available markets
              </div>
            )}
          </div>
        )}
      </div>

      {/* Order Placement Modal */}
      {selectedOutcome && (
        <OrderPlacementModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          marketTitle={selectedOutcome.marketTitle}
          outcome={selectedOutcome.outcome}
          currentPrice={selectedOutcome.price}
          tokenId={selectedOutcome.tokenId}
          negRisk={selectedOutcome.negRisk}
          clobClient={clobClient}
        />
      )}
    </>
  );
}
