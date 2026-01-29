"use client";

import { useState } from "react";
import { Zap, Target, TrendingUp, AlertTriangle, Clock, DollarSign } from "lucide-react";
import { useTrading } from "@/providers/TradingProvider";
import type { TradeRecommendation } from "@/hooks/useTradeRecommendation";
import { useQuickTrade } from "@/hooks/useQuickTrade";
import Card from "@/components/shared/Card";
import OrderPlacementModal from "@/components/Trading/OrderModal";

interface QuickTradeServiceProps {
  recommendation: TradeRecommendation;
  marketTitle: string;
  currentPrice: number;
  tokenId: string;
  negRisk: boolean;
  outcomes: string[];
  disabled?: boolean;
  userPosition?: {
    size: number;
    avgPrice: number;
  } | null;
}

export default function QuickTradeService({
  recommendation,
  marketTitle,
  currentPrice,
  tokenId,
  negRisk,
  outcomes,
  disabled = false,
  userPosition = null
}: QuickTradeServiceProps) {
  const { clobClient } = useTrading();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [autoCreateTarget, setAutoCreateTarget] = useState(true); // Default to true for better UX
  
  const {
    analysis,
    selectedZone,
    selectZone,
    clearSelection,
    getZone,
    shouldTrade,
    getOptimalZone
  } = useQuickTrade({ recommendation, currentPrice });

  // Determine the outcome based on recommendation action
  const recommendedOutcome = recommendation.action === 'LONG_YES' ? 'Yes' : 
                           recommendation.action === 'LONG_NO' ? 'No' : null;

  // Check if user has position in the recommended outcome token
  const hasPosition = userPosition && userPosition.size > 0;

  const handleQuickTrade = (zoneType: 'entry' | 'target' | 'current') => {
    if (!recommendedOutcome || !shouldTrade) return;
    
    selectZone(zoneType);
    setIsModalOpen(true);
  };

  // Determine order side based on zone type
  const getOrderSide = (zoneType: 'entry' | 'target' | 'current'): 'BUY' | 'SELL' => {
    if (zoneType === 'target') return 'SELL'; // Target zone is for taking profits
    return 'BUY'; // Entry and current are for entering positions
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    clearSelection();
    setAutoCreateTarget(true); // Reset to default
  };

  if (!shouldTrade) {
    return (
      <Card className="p-6 border-yellow-500/20 bg-yellow-500/5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-yellow-500/20 rounded-lg text-yellow-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white">No Trade Recommended</h3>
            <p className="text-sm text-gray-400">AI analysis suggests waiting for better opportunities</p>
          </div>
        </div>
        <p className="text-sm text-gray-300 leading-relaxed">
          {recommendation.explanation.summary}
        </p>
      </Card>
    );
  }

  const entryZone = getZone('entry')!;
  const currentZone = getZone('current')!;
  const targetZone = getZone('target')!;

  return (
    <div className="space-y-4">
      {/* Quick Trade Header */}
      <Card className="p-6 border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
            <Zap className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-white">Quick Trade Service</h3>
            <p className="text-sm text-gray-400">Execute AI recommendations with optimal entry & target zones</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400">Potential Return</div>
            <div className={`font-bold ${analysis.potentialReturn > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {analysis.potentialReturn > 0 ? '+' : ''}{analysis.potentialReturn.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Auto-Target Toggle */}
        <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 mb-4">
          <div className="flex items-center gap-3">
            <Target className="w-4 h-4 text-purple-400" />
            <div>
              <div className="text-sm font-semibold text-white">Auto-create sell targets</div>
              <div className="text-xs text-gray-400">
                Automatically place sell orders at {(targetZone.price * 100).toFixed(1)}% after market buy orders
              </div>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={autoCreateTarget}
              onChange={(e) => setAutoCreateTarget(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
          </label>
        </div>

        {/* Recommendation Summary */}
        <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/5">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="font-semibold text-white">
              {analysis.recommendation} {recommendedOutcome}
            </span>
          </div>
          <div className="text-sm text-gray-400">•</div>
          <div className="text-sm text-gray-300">
            Win Rate: <span className="font-mono text-white">{(recommendation.winProbability * 100).toFixed(1)}%</span>
          </div>
          <div className="text-sm text-gray-400">•</div>
          <div className="text-sm text-gray-300">
            Edge: <span className="font-mono text-green-400">+{(recommendation.metadata.edge * 100).toFixed(1)}%</span>
          </div>
        </div>
      </Card>

      {/* Trading Zones */}
      <div className={`grid grid-cols-1 gap-4 ${hasPosition ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
        {/* Entry Zone */}
        <Card className={`p-5 transition-all hover:scale-[1.02] cursor-pointer ${
          analysis.isInEntryZone 
            ? 'border-green-500/30 bg-green-500/10 shadow-[0_0_20px_-8px_rgba(34,197,94,0.3)]' 
            : 'border-white/10 hover:border-green-500/20 hover:bg-green-500/5'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-green-400" />
              <span className="font-semibold text-white">Entry Zone</span>
            </div>
            {analysis.isInEntryZone && (
              <div className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-semibold rounded-full border border-green-500/30">
                ACTIVE
              </div>
            )}
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Range</span>
              <span className="font-mono text-white">
                {(recommendation.entryZone[0] * 100).toFixed(1)}% - {(recommendation.entryZone[1] * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Optimal</span>
              <span className="font-mono text-green-400">
                {(entryZone.price * 100).toFixed(1)}%
              </span>
            </div>
            {autoCreateTarget && (
              <div className="text-xs text-purple-400 bg-purple-500/10 p-2 rounded border border-purple-500/20">
                🎯 Auto-target at {(targetZone.price * 100).toFixed(1)}% (market orders only)
              </div>
            )}
          </div>

          <button
            onClick={() => handleQuickTrade('entry')}
            disabled={disabled || !clobClient}
            className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all ${
              analysis.isInEntryZone
                ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-500/20'
                : 'bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/20'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {analysis.isInEntryZone ? 'Trade Now' : 'Set Entry Order'}
          </button>
        </Card>

        {/* Current Price */}
        <Card className="p-5 border-blue-500/20 bg-blue-500/5">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="font-semibold text-white">Current Price</span>
          </div>

          <div className="space-y-2 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">
                {(currentPrice * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-gray-400">
                {currentPrice < recommendation.entryZone[0] && 'Below Entry Zone'}
                {analysis.isInEntryZone && 'In Entry Zone'}
                {currentPrice > recommendation.entryZone[1] && 'Above Entry Zone'}
              </div>
            </div>
            {autoCreateTarget && (
              <div className="text-xs text-purple-400 bg-purple-500/10 p-2 rounded border border-purple-500/20">
                🎯 Auto-target at {(targetZone.price * 100).toFixed(1)}% (market orders only)
              </div>
            )}
          </div>

          <button
            onClick={() => handleQuickTrade('current')}
            disabled={disabled || !clobClient}
            className="w-full py-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/20 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Trade at Market
          </button>
        </Card>

        {/* Target Zone - Only show if user has position */}
        {hasPosition && (
          <Card className="p-5 border-purple-500/20 bg-purple-500/5">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-4 h-4 text-purple-400" />
              <span className="font-semibold text-white">Target Zone</span>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Range</span>
                <span className="font-mono text-white">
                  {(recommendation.targetZone[0] * 100).toFixed(1)}% - {(recommendation.targetZone[1] * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Target</span>
                <span className="font-mono text-purple-400">
                  {(targetZone.price * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Your Position</span>
                <span className="font-mono text-green-400">
                  {userPosition?.size.toFixed(2)} shares
                </span>
              </div>
              <div className="text-xs text-gray-500 bg-white/5 p-2 rounded">
                💡 Sell order - you own {userPosition?.size.toFixed(2)} shares
              </div>
            </div>

            <button
              onClick={() => handleQuickTrade('target')}
              disabled={disabled || !clobClient}
              className="w-full py-2.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-500/20 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Set Sell Target
            </button>
          </Card>
        )}

        {/* No Position Message - Show when user has no position */}
        {!hasPosition && (
          <Card className="p-5 border-gray-500/20 bg-gray-500/5 md:col-span-2">
            <div className="flex items-center gap-3 mb-3">
              <DollarSign className="w-4 h-4 text-gray-400" />
              <span className="font-semibold text-white">Target Zone</span>
              <span className="text-xs text-gray-500 bg-gray-500/20 px-2 py-1 rounded-full">
                No Position
              </span>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Target Range</span>
                <span className="font-mono text-gray-500">
                  {(recommendation.targetZone[0] * 100).toFixed(1)}% - {(recommendation.targetZone[1] * 100).toFixed(1)}%
                </span>
              </div>
              <div className="text-sm text-gray-400 bg-white/5 p-3 rounded-lg border border-white/5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-yellow-400">ℹ️</span>
                  <span className="font-medium">Buy shares first to unlock sell targets</span>
                </div>
                <p className="text-xs text-gray-500">
                  Use the Entry Zone or Current Price to buy {recommendedOutcome} shares, then you can set sell targets here.
                </p>
              </div>
            </div>

            <button
              disabled={true}
              className="w-full py-2.5 bg-gray-600/20 text-gray-500 border border-gray-500/20 rounded-lg text-sm font-semibold cursor-not-allowed opacity-50"
            >
              No Position to Sell
            </button>
          </Card>
        )}
      </div>

      {/* Risk Warning */}
      {analysis.riskLevel === 'high' && (
        <Card className="p-4 border-yellow-500/20 bg-yellow-500/5">
          <div className="flex items-center gap-2 text-yellow-400">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-semibold">High Liquidity Risk</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            This market has limited liquidity. Large orders may experience significant slippage.
          </p>
        </Card>
      )}

      {/* Order Modal */}
      {selectedZone && recommendedOutcome && (
        <OrderPlacementModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          marketTitle={marketTitle}
          outcome={recommendedOutcome}
          currentPrice={getZone(selectedZone)?.price || currentPrice}
          tokenId={tokenId}
          negRisk={negRisk}
          clobClient={clobClient}
          orderSide={getOrderSide(selectedZone)}
          userPosition={userPosition}
          quickTradeMode={{
            zone: selectedZone,
            recommendedPrice: getZone(selectedZone)?.price || currentPrice,
            entryZone: recommendation.entryZone,
            targetZone: recommendation.targetZone,
            autoCreateTarget: selectedZone !== 'target' ? autoCreateTarget : false,
          }}
        />
      )}
    </div>
  );
}