"use client";

import { useTradeRecommendation } from "@/hooks/useTradeRecommendation";
import { Brain, TrendingUp, TrendingDown, AlertTriangle, Zap } from "lucide-react";

interface RecommendationBadgeProps {
  conditionId: string | null;
  size?: 'sm' | 'md';
  showDetails?: boolean;
}

export default function RecommendationBadge({ 
  conditionId, 
  size = 'md',
  showDetails = true 
}: RecommendationBadgeProps) {
  const { data: recommendation, isLoading } = useTradeRecommendation(conditionId, {
    enabled: !!conditionId,
  });

  if (!conditionId) return null;

  const sizeClasses = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm';

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg ${sizeClasses}`}>
        <div className="w-3 h-3 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        <span className="font-medium text-blue-700">AI...</span>
      </div>
    );
  }

  if (!recommendation) {
    return null; // Don't show anything if no recommendation
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'LONG_YES': return 'bg-green-50 border-green-200 text-green-700';
      case 'LONG_NO': return 'bg-red-50 border-red-200 text-red-700';
      case 'NO_TRADE': return 'bg-gray-50 border-gray-200 text-gray-700';
      default: return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  const getActionIcon = (action: string) => {
    const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
    switch (action) {
      case 'LONG_YES': return <TrendingUp className={iconSize} />;
      case 'LONG_NO': return <TrendingDown className={iconSize} />;
      case 'NO_TRADE': return <AlertTriangle className={iconSize} />;
      default: return <Brain className={iconSize} />;
    }
  };

  const getActionText = (action: string) => {
    switch (action) {
      case 'LONG_YES': return size === 'sm' ? 'BUY YES' : 'AI: BUY YES';
      case 'LONG_NO': return size === 'sm' ? 'BUY NO' : 'AI: BUY NO';
      case 'NO_TRADE': return size === 'sm' ? 'NO TRADE' : 'AI: NO TRADE';
      default: return 'AI';
    }
  };

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;

  return (
    <div className={`flex items-center justify-between gap-2 border rounded-lg ${getActionColor(recommendation.action)} ${sizeClasses}`}>
      <div className="flex items-center gap-2">
        {getActionIcon(recommendation.action)}
        <span className="font-medium">{getActionText(recommendation.action)}</span>
      </div>
      {showDetails && recommendation.action !== 'NO_TRADE' && (
        <div className="flex items-center gap-2 text-xs opacity-80">
          <span>EV: ${recommendation.expectedValue.toFixed(1)}</span>
          {size === 'md' && (
            <>
              <span>•</span>
              <span>{formatPercentage(recommendation.winProbability)} win</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}