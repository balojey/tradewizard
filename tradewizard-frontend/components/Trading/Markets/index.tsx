"use client";

import { useState, useMemo, useCallback } from "react";
import { useTrading } from "@/providers/TradingProvider";
import useMarkets from "@/hooks/useMarkets";
import usePoliticalCategories from "@/hooks/usePoliticalCategories";
import useInfiniteScroll from "@/hooks/useInfiniteScroll";
import { type CategoryId, DEFAULT_CATEGORY } from "@/constants/categories";

import ErrorState from "@/components/shared/ErrorState";
import EmptyState from "@/components/shared/EmptyState";
import LoadingState from "@/components/shared/LoadingState";
import MarketCard from "@/components/Trading/Markets/MarketCard";
import CategoryTabs from "@/components/Trading/Markets/CategoryTabs";
import OrderPlacementModal from "@/components/Trading/OrderModal";

export default function PoliticalMarkets() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategoryId>(DEFAULT_CATEGORY);
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
  const markets = useMemo(() => {
    return data?.pages.flat() ?? [];
  }, [data]);

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

        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">
            {categoryLabel} Markets {markets.length > 0 ? `(${markets.length}${hasNextPage ? '+' : ''})` : ""}
          </h3>
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
        {!isLoading && !error && markets.length === 0 && (
          <EmptyState
            title="No Political Markets Available"
            message={`No active ${categoryLabel.toLowerCase()} markets found.`}
          />
        )}

        {/* Market Cards */}
        {markets.length > 0 && (
          <div className="space-y-3">
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
