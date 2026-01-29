import type { PolymarketMarket } from "@/hooks/useMarkets";
import { isMarketEndingSoon } from "@/utils/marketFilters";

import Card from "@/components/shared/Card";
import OutcomeButtons from "@/components/Trading/Markets/OutcomeButtons";
import PercentageGauge from "@/components/shared/PercentageGauge";
import RecommendationBadge from "@/components/Trading/Markets/RecommendationBadge";

import { formatVolume } from "@/utils/formatting";

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
      return { text: "Closed", color: "bg-red-500/20 text-red-400 border-red-500/30" };
    }
    if (isEndingSoon) {
      return { text: "Ending Soon", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" };
    }
    if (isActive) {
      return { text: "Active", color: "bg-green-500/20 text-green-400 border-green-500/30" };
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
    <Card hover className="flex flex-col h-full bg-[#1C1C1E] border-white/5 hover:border-white/10 transition-colors">
      <div className="p-4 flex-1 flex flex-col gap-4">
        {/* Header: Icon + Title + Gauge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-3">
            {/* Market Icon */}
            {market.icon ? (
              <img
                src={market.icon}
                alt=""
                className="w-10 h-10 rounded-md object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-md bg-white/10 flex-shrink-0" />
            )}

            {/* Title and Status */}
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-base line-clamp-3 leading-snug mb-2">
                {market.question}
              </h4>
              
              {/* Status Badge */}
              {statusBadge && (
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${statusBadge.color}`}>
                  {statusBadge.text}
                </span>
              )}
            </div>
          </div>

          {/* Probability Gauge (Visual only, based on 'Yes' price) */}
          <div className="flex-shrink-0 ml-1">
            <PercentageGauge value={yesChance} />
          </div>
        </div>

        {/* Outcome Buttons */}
        <div className="mt-auto pt-2 space-y-3">
          {/* AI Recommendation Display */}
          <RecommendationBadge 
            conditionId={market.conditionId || null}
            size="md"
            showDetails={true}
          />
          
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
      <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between text-xs text-gray-400">
        <span className="font-medium">{formatVolume(volumeUSD)} Vol.</span>
        <button className="hover:text-white transition-colors">
          {/* Simple bookmark icon */}
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
          </svg>
        </button>
      </div>
    </Card>
  );
}
