import React, { memo } from "react";
import { convertPriceToCents } from "@/utils/order";
import { cn } from "@/utils/classNames";
import { TrendingUp, TrendingDown } from "lucide-react";

interface OutcomeButtonsProps {
  outcomes: string[];
  outcomePrices: number[];
  tokenIds: string[];
  isClosed: boolean;
  negRisk: boolean;
  marketQuestion: string;
  disabled?: boolean;
  onOutcomeClick: (
    marketTitle: string,
    outcome: string,
    price: number,
    tokenId: string,
    negRisk: boolean
  ) => void;
  layout?: "horizontal" | "vertical";
}

const OutcomeButtons = memo(function OutcomeButtons({
  outcomes,
  outcomePrices,
  tokenIds,
  isClosed,
  negRisk,
  marketQuestion,
  disabled = false,
  onOutcomeClick,
  layout = "horizontal",
}: OutcomeButtonsProps) {
  if (outcomes.length === 0) return null;

  const isDisabled = isClosed || disabled;

  return (
    <div className={cn(
      "grid w-full",
      // Optimized grid layout - maintain horizontal for better visual balance
      layout === "vertical" 
        ? "grid-cols-1 gap-2 sm:gap-3" 
        : "grid-cols-2 gap-2 lg:gap-3"
    )}>
      {outcomes.map((outcome: string, idx: number) => {
        const tokenId = tokenIds[idx] || "";
        const price = outcomePrices[idx] || 0;
        const priceInCents = convertPriceToCents(price);
        const percentage = Math.round(price * 100);

        // Determine colors based on outcome name
        const isYes = outcome.toLowerCase() === "yes";
        const isNo = outcome.toLowerCase() === "no";

        let baseClasses = "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20";
        let textClasses = "text-gray-300";
        let progressBarColor = "bg-gray-500";

        if (isYes) {
          baseClasses = isDisabled || !tokenId
            ? "bg-green-500/5 border-green-500/10"
            : "bg-gradient-to-r from-emerald-500/10 to-green-500/10 border-green-500/20 hover:border-green-400/40 hover:from-emerald-500/20 hover:to-green-500/20 active:scale-[0.98] hover:shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]";
          textClasses = "text-green-400 group-hover:text-green-300";
          progressBarColor = "bg-green-500";
        } else if (isNo) {
          baseClasses = isDisabled || !tokenId
            ? "bg-red-500/5 border-red-500/10"
            : "bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/20 hover:border-red-400/40 hover:from-red-500/20 hover:to-orange-500/20 active:scale-[0.98] hover:shadow-[0_0_15px_-3px_rgba(239,68,68,0.2)]";
          textClasses = "text-red-400 group-hover:text-red-300";
          progressBarColor = "bg-red-500";
        } else {
          // styles for other outcomes (non-binary)
          baseClasses = isDisabled || !tokenId
            ? "bg-blue-500/5 border-blue-500/10"
            : "bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border-blue-500/20 hover:border-blue-400/40 hover:from-blue-500/20 hover:to-indigo-500/20 active:scale-[0.98] hover:shadow-[0_0_15px_-3px_rgba(59,130,246,0.2)]";
          textClasses = "text-blue-400 group-hover:text-blue-300";
          progressBarColor = "bg-blue-500";
        }

        return (
          <button
            key={`outcome-${idx}`}
            onClick={(e) => {
              e.stopPropagation();
              if (!isDisabled && tokenId) {
                onOutcomeClick(
                  marketQuestion,
                  outcome,
                  price,
                  tokenId,
                  negRisk
                );
              }
            }}
            disabled={isDisabled || !tokenId}
            className={cn(
              "group relative flex items-center justify-between rounded-lg lg:rounded-xl border transition-all duration-300 shadow-sm overflow-hidden",
              // Optimized padding for better proportions
              "p-2.5 lg:p-3",
              // Touch-friendly minimum height on mobile
              "min-h-[44px]",
              isDisabled || !tokenId
                ? "cursor-not-allowed opacity-50"
                : "cursor-pointer hover:shadow-md",
              baseClasses
            )}
          >
            {/* Progress Bar Background */}
            {!isDisabled && tokenId && (
              <div
                className={cn("absolute bottom-0 left-0 h-0.5 transition-all duration-500 ease-out opacity-40 group-hover:opacity-100", progressBarColor)}
                style={{ width: `${percentage}%` }}
              />
            )}

            <div className="flex flex-col items-start gap-0.5 z-10 min-w-0">
              <span className={cn(
                "font-bold transition-colors uppercase tracking-wider",
                // Responsive text sizing
                "text-[10px] lg:text-[11px]",
                textClasses
              )}>
                {outcome}
              </span>
              <span className="text-[9px] lg:text-xs text-gray-500 font-medium tracking-wide group-hover:text-gray-400 transition-colors">
                Probability
              </span>
            </div>

            <div className="flex flex-col items-end z-10 flex-shrink-0">
              <div className={cn(
                "font-bold tracking-tight flex items-center gap-1 transition-colors",
                // Responsive text sizing
                "text-base lg:text-xl",
                textClasses
              )}>
                {priceInCents}¢
                {isYes && <TrendingUp className="w-3 h-3 lg:w-4 lg:h-4 opacity-50 group-hover:opacity-100 transition-opacity" />}
                {isNo && <TrendingDown className="w-3 h-3 lg:w-4 lg:h-4 opacity-50 group-hover:opacity-100 transition-opacity" />}
              </div>
              <span className="text-[9px] lg:text-xs text-gray-400 font-mono group-hover:text-gray-300 transition-colors">
                {percentage}%
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
});

export default OutcomeButtons;
