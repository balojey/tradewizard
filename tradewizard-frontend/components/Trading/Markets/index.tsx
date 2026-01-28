"use client";

import { useState } from "react";
import { useTrading } from "@/providers/TradingProvider";
import useMarkets from "@/hooks/useMarkets";
import usePoliticalCategories from "@/hooks/usePoliticalCategories";
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

  // Fetch markets for the active category
  const { 
    data: markets, 
    isLoading: marketsLoading, 
    error: marketsError 
  } = useMarkets({
    limit: 10,
    categoryId: activeCategory,
    tagId: activeTagId,
    categories,
  });

  const isLoading = categoriesLoading || marketsLoading;
  const error = categoriesError || marketsError;

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
            {categoryLabel} Markets {markets ? `(${markets.length})` : ""}
          </h3>
          <p className="text-xs text-gray-400">Political prediction markets only</p>
        </div>

        {/* Loading State */}
        {isLoading && <LoadingState message={`Loading ${categoryLabel.toLowerCase()} markets...`} />}

        {/* Error State */}
        {error && !isLoading && (
          <ErrorState error={error} title="Error loading political markets" />
        )}

        {/* Empty State */}
        {!isLoading && !error && (!markets || markets.length === 0) && (
          <EmptyState
            title="No Political Markets Available"
            message={`No active ${categoryLabel.toLowerCase()} markets found.`}
          />
        )}

        {/* Market Cards */}
        {!isLoading && !error && markets && markets.length > 0 && (
          <div className="space-y-3">
            {markets.map((market) => (
              <MarketCard
                key={market.id}
                market={market}
                disabled={isGeoblocked}
                onOutcomeClick={handleOutcomeClick}
              />
            ))}
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
