import { convertPriceToCents } from "@/utils/order";
import { cn } from "@/utils/classNames";

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
}

export default function OutcomeButtons({
  outcomes,
  outcomePrices,
  tokenIds,
  isClosed,
  negRisk,
  marketQuestion,
  disabled = false,
  onOutcomeClick,
}: OutcomeButtonsProps) {
  if (outcomes.length === 0) return null;

  const isDisabled = isClosed || disabled;

  return (
    <div className="flex gap-2 flex-wrap w-full">
      {outcomes.map((outcome: string, idx: number) => {
        const tokenId = tokenIds[idx] || "";
        const price = outcomePrices[idx] || 0;
        const priceInCents = convertPriceToCents(price);

        // Determine colors based on outcome name
        const isYes = outcome.toLowerCase() === "yes";
        const isNo = outcome.toLowerCase() === "no";

        let colors = "bg-white/5 border-white/10 hover:bg-blue-500/20 hover:border-blue-500/40";
        let tempTextColor = "text-blue-400";

        if (isYes) {
          colors = isDisabled || !tokenId
            ? "bg-green-500/5 border-green-500/10"
            : "bg-green-500/10 border-green-500/20 hover:bg-green-500/20 hover:border-green-500/40";
          tempTextColor = "text-green-500";
        } else if (isNo) {
          colors = isDisabled || !tokenId
            ? "bg-red-500/5 border-red-500/10"
            : "bg-red-500/10 border-red-500/20 hover:bg-red-500/20 hover:border-red-500/40";
          tempTextColor = "text-red-500";
        }

        return (
          <button
            key={`outcome-${idx}`}
            onClick={(e) => {
              e.stopPropagation(); // Prevent card click
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
              "flex-1 min-w-[100px] px-3 py-3 rounded-md border transition-all duration-200 flex flex-col items-center justify-center",
              isDisabled || !tokenId
                ? "cursor-not-allowed opacity-50"
                : "cursor-pointer",
              colors
            )}
          >
            <p className="text-sm font-medium mb-1">{outcome}</p>
            <p className={cn("font-bold text-lg", tempTextColor)}>{priceInCents}¢</p>
          </button>
        );
      })}
    </div>
  );
}
