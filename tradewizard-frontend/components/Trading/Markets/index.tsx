"use client";

import { useState, useEffect } from "react";
import { useTrading } from "@/providers/TradingProvider";
import useMarkets from "@/hooks/useMarkets";
import { type CategoryId, DEFAULT_CATEGORY, CATEGORIES } from "@/constants/categories";

import ErrorState from "@/components/shared/ErrorState";
import EmptyState from "@/components/shared/EmptyState";
import LoadingState from "@/components/shared/LoadingState";
import MarketCard from "@/components/Trading/Markets/MarketCard";
import CategoryTabs from "@/components/Trading/Markets/CategoryTabs";
import OrderPlacementModal from "@/components/Trading/OrderModal";

export default function HighVolumeMarkets() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategoryId>(DEFAULT_CATEGORY);
  const [categories, setCategories] = useState<typeof CATEGORIES>(CATEGORIES);
  const [selectedOutcome, setSelectedOutcome] = useState<{
    marketTitle: string;
    outcome: string;
    price: number;
    tokenId: string;
    negRisk: boolean;
  } | null>(null);

  const { clobClient, isGeoblocked } = useTrading();

  // Determine current active tag ID
  const activeCategoryObj = categories.find(c => c.id === activeCategory);
  const activeTagId = activeCategoryObj?.tagId ?? null;

  const { data: markets, isLoading, error } = useMarkets({
    limit: 10,
    categoryId: activeCategory,
    tagId: activeTagId,
  });

  // Effect to populate dynamic categories from "Trending" (Politics) markets
  useEffect(() => {
    if (activeCategory === "trending" && markets && markets.length > 0) {
      const tagCounts: Record<string, { label: string, id: number, count: number }> = {};

      markets.forEach(market => {
        if (market.tags && Array.isArray(market.tags)) {
          market.tags.forEach((tag: any) => {
            // Skip "Politics" tag (id 2) as it's the parent
            // Also skip "Cloned" or internal tags if any
            if (tag.id === 2 || tag.id === "2") return;

            const label = tag.label || tag.slug;
            if (!label) return;

            if (!tagCounts[label]) {
              tagCounts[label] = { label, id: parseInt(tag.id), count: 0 };
            }
            tagCounts[label].count++;
          });
        }
      });

      // Sort by occurrence
      const sortedTags = Object.values(tagCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 7); // Take top 7 dynamic tags

      const newCategories = [
        CATEGORIES[0], // Keep Trending
        ...sortedTags.map(t => ({
          id: t.label.toLowerCase().replace(/\s+/g, '-'),
          label: t.label,
          tagId: t.id
        }))
      ];

      // Only update if changed to avoid loops
      // Simple check based on length or labels
      setCategories(prev => {
        if (prev.length === newCategories.length && prev[1]?.id === newCategories[1]?.id) return prev;
        return newCategories;
      });
    }
  }, [markets, activeCategory]);


  // Helper to get consistent label
  const categoryLabel = activeCategoryObj?.label || "Markets";

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
        <CategoryTabs
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={handleCategoryChange}
        />

        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">
            {categoryLabel} Markets {markets ? `(${markets.length})` : ""}
          </h3>
          <p className="text-xs text-gray-400">Sorted by volume + liquidity</p>
        </div>

        {/* Loading State */}
        {isLoading && <LoadingState message={`Loading ${categoryLabel.toLowerCase()} markets...`} />}

        {/* Error State */}
        {error && !isLoading && (
          <ErrorState error={error} title="Error loading markets" />
        )}

        {/* Empty State */}
        {!isLoading && !error && (!markets || markets.length === 0) && (
          <EmptyState
            title="No Markets Available"
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
