import type { PolymarketMarket } from "@/hooks/useMarkets";
import Link from "next/link";
import { isMarketEndingSoon } from "@/utils/marketFilters";

import Card from "@/components/shared/Card";
import OutcomeButtons from "@/components/Trading/Markets/OutcomeButtons";
import PercentageGauge from "@/components/shared/PercentageGauge";
import RecommendationBadge from "@/components/Trading/Markets/RecommendationBadge";
import AIInsightsBadge from "@/components/Trading/Markets/AIInsightsBadge";

import { formatVolume } from "@/utils/formatting";
import { TrendingUp, BarChart2, Bookmark } from "lucide-react";

interface MarketCardProps {
  market: PolymarketMarket;
  disabled?: boolean;
  onOutcomeClick: (
    marketTitle: string,
    outcome: string,
    price: number,
    tokenId: string,
    negRisk: boolean
  ) => void;
}

export default function MarketCard({
  market,
  disabled = false,
  onOutcomeClick,
}: MarketCardProps) {
  const volumeUSD = parseFloat(
    String(market.volume24hr || market.volume || "0")
  );
  const liquidityUSD = parseFloat(String(market.liquidity || "0"));
  const isClosed = market.closed;
  const isActive = market.active && !market.closed;
  const isEndingSoon = isActive && isMarketEndingSoon(market);

  // Determine status badge
  const getStatusBadge = () => {
    if (isClosed) {
      return { text: "Closed", color: "bg-red-500/10 text-red-500 border-red-500/20" };
    }
    if (isEndingSoon) {
      return { text: "Ending Soon", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" };
    }
    if (isActive) {
      return { text: "Active", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" };
    }
    return null;
  };

  const statusBadge = getStatusBadge();

  const outcomes = market.outcomes ? JSON.parse(market.outcomes) : [];
  const tokenIds = market.clobTokenIds ? JSON.parse(market.clobTokenIds) : [];
  const negRisk = market.negRisk || false;
  const outcomePrices = tokenIds.map((tokenId: string) => {
    // First try to get realtime prices (from CLOB client or public API)
    const realtimePrice = market.realtimePrices?.[tokenId]?.bidPrice;
    if (realtimePrice && realtimePrice > 0) {
      return realtimePrice;
    }

    // Fallback to static outcome prices from market data
    if (market.outcomePrices) {
      try {
        const staticPrices = JSON.parse(market.outcomePrices);
        const tokenIndex = tokenIds.indexOf(tokenId);
        if (tokenIndex !== -1 && staticPrices[tokenIndex]) {
          return parseFloat(staticPrices[tokenIndex]);
        }
      } catch (error) {
        console.warn(`Failed to parse static prices for market ${market.id}`);
      }
    }

    return 0;
  });

  // Calculate "Yes" probability for the gauge if 'Yes' outcome exists
  const yesIndex = outcomes.findIndex((o: string) => o.toLowerCase() === "yes");
  const yesPrice = yesIndex !== -1 ? (outcomePrices?.[yesIndex] || 0) : 0;
  const yesChance = Math.round(yesPrice * 100);

  return (
    <Card hover className="group relative flex flex-col h-full bg-[#1C1C1E] border-white/5 hover:border-indigo-500/30 transition-all duration-300 hover:shadow-[0_0_30px_-10px_rgba(79,70,229,0.2)] overflow-hidden">
      {/* Hover Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 via-transparent to-purple-500/0 group-hover:from-indigo-500/5 group-hover:to-purple-500/5 transition-colors duration-500 pointer-events-none" />

      <div className="p-5 flex-1 flex flex-col gap-5 relative z-10">
        {/* Header: Icon + Title + Gauge */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-4 min-w-0">
            {/* Market Icon */}
            <div className="relative flex-shrink-0">
              {market.icon ? (
                <img
                  src={market.icon}
                  alt=""
                  className="w-12 h-12 rounded-xl object-cover ring-1 ring-white/10 shadow-lg group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 ring-1 ring-white/10 shadow-lg flex items-center justify-center">
                  <BarChart2 className="w-6 h-6 text-gray-600" />
                </div>
              )}
              {/* Active Indicator Dot */}
              {isActive && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#1C1C1E]" />
              )}
            </div>

            {/* Title and Status - Only this area is clickable */}
            <div className="flex-1 min-w-0">
              <Link href={`/market/${market.slug || market.id}`} className="block group/title">
                <h4 className="font-semibold text-[15px] leading-snug mb-2 text-gray-100 group-hover/title:text-indigo-400 transition-colors line-clamp-2">
                  {market.question}
                </h4>
              </Link>

              {/* Status and AI Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                {statusBadge && (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold border ${statusBadge.color}`}>
                    {statusBadge.text}
                  </span>
                )}
                <AIInsightsBadge
                  conditionId={market.conditionId || null}
                  size="sm"
                  showDetails={false}
                />
              </div>
            </div>
          </div>

          {/* Probability Gauge (Visual only, based on 'Yes' price) */}
          <div className="flex-shrink-0 ml-1">
            <PercentageGauge value={yesChance} size={48} />
          </div>
        </div>

        {/* Outcome Buttons */}
        <div className="mt-auto pt-2 space-y-3">
          {/* AI Recommendation Display */}
          <div className="transform transition-transform duration-300 origin-left">
            <RecommendationBadge
              conditionId={market.conditionId || null}
              size="md"
              showDetails={true}
            />
          </div>

          <OutcomeButtons
            outcomes={outcomes}
            outcomePrices={outcomePrices}
            tokenIds={tokenIds}
            isClosed={isClosed}
            negRisk={negRisk}
            marketQuestion={market.question}
            disabled={disabled}
            onOutcomeClick={onOutcomeClick}
          />
        </div>
      </div>

      {/* Footer: Volume + Bookmark */}
      <div className="relative z-10 px-5 py-3 border-t border-white/5 bg-white/[0.02] flex items-center justify-between text-xs text-gray-500 group-hover:text-gray-400 transition-colors">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-medium">
            <BarChart2 className="w-3.5 h-3.5 opacity-70" />
            ${formatVolume(volumeUSD)} Vol.
          </span>
          {market.active && (
            <span className="flex items-center gap-1.5 font-medium text-emerald-500/80">
              <TrendingUp className="w-3.5 h-3.5" />
              Live
            </span>
          )}
        </div>

        <button
          className="p-1.5 -mr-1.5 rounded-lg hover:bg-white/10 text-gray-600 hover:text-white transition-all active:scale-95"
          onClick={(e) => {
            e.stopPropagation();
            // TODO: Implement bookmarking
          }}
        >
          <Bookmark className="w-4 h-4" />
        </button>
      </div>
    </Card>
  );
}
