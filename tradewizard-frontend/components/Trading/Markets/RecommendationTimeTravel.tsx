"use client";

import { useState, useMemo } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  DollarSign,
  Calendar,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Brain,
  Users,
  Target,
  Info,
  Zap
} from "lucide-react";

import Card from "@/components/shared/Card";
import Badge from "@/components/shared/Badge";
import LoadingState from "@/components/shared/LoadingState";
import ErrorState from "@/components/shared/ErrorState";
import { 
  useHistoricalRecommendations, 
  useRecommendationComparison,
  usePotentialPnL,
  useRecommendationTimeline,
  type HistoricalRecommendation,
  type PotentialPnL
} from "@/hooks/useHistoricalRecommendations";
import RecommendationAnalytics from "@/components/Trading/Markets/RecommendationAnalytics";

interface RecommendationTimeTravelProps {
  conditionId: string | null;
  currentMarketPrice: number;
  className?: string;
}

export default function RecommendationTimeTravel({ 
  conditionId, 
  currentMarketPrice,
  className = "" 
}: RecommendationTimeTravelProps) {
  const [selectedRecommendationIndex, setSelectedRecommendationIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'timeline' | 'comparison' | 'pnl' | 'analytics'>('timeline');

  const { 
    data: recommendations, 
    isLoading, 
    error 
  } = useHistoricalRecommendations(conditionId, { 
    limit: 20, 
    includeAgentSignals: true 
  });

  const { data: timeline } = useRecommendationTimeline(conditionId);
  const { data: pnlData } = usePotentialPnL(conditionId, currentMarketPrice);

  const selectedRecommendation = recommendations?.[selectedRecommendationIndex];
  const { data: comparison } = useRecommendationComparison(
    conditionId, 
    selectedRecommendation?.id
  );

  const canGoBack = selectedRecommendationIndex < (recommendations?.length || 0) - 1;
  const canGoForward = selectedRecommendationIndex > 0;

  const handlePrevious = () => {
    if (canGoBack) {
      setSelectedRecommendationIndex(prev => prev + 1);
    }
  };

  const handleNext = () => {
    if (canGoForward) {
      setSelectedRecommendationIndex(prev => prev - 1);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'LONG_YES': return <TrendingUp className="w-4 h-4" />;
      case 'LONG_NO': return <TrendingDown className="w-4 h-4" />;
      case 'NO_TRADE': return <Minus className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'LONG_YES': return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'LONG_NO': return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'NO_TRADE': return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
      default: return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    }
  };

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;
  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;

  if (isLoading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <Clock className="w-5 h-5 text-indigo-400" />
          <h3 className="font-semibold text-white">Recommendation Time Travel</h3>
        </div>
        <LoadingState message="Loading recommendation history..." />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <Clock className="w-5 h-5 text-indigo-400" />
          <h3 className="font-semibold text-white">Recommendation Time Travel</h3>
        </div>
        <ErrorState error={error instanceof Error ? error.message : 'Failed to load history'} />
      </Card>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <Clock className="w-5 h-5 text-indigo-400" />
          <h3 className="font-semibold text-white">Recommendation Time Travel</h3>
        </div>
        <div className="text-center py-8 text-gray-400">
          <Clock className="w-8 h-8 mx-auto mb-3 opacity-50" />
          <p>No historical recommendations available</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`${className} border-indigo-500/20 bg-gradient-to-br from-indigo-500/5 to-purple-500/5`}>
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
              <Clock className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Recommendation Time Travel</h3>
              <p className="text-sm text-gray-400">
                {recommendations.length} recommendation{recommendations.length !== 1 ? 's' : ''} found
              </p>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg border border-white/10">
            {[
              { id: 'timeline', label: 'Timeline', icon: Calendar },
              { id: 'comparison', label: 'Compare', icon: BarChart3 },
              { id: 'pnl', label: 'P&L', icon: DollarSign },
              { id: 'analytics', label: 'Analytics', icon: Brain }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setViewMode(id as any)}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all
                  ${viewMode === id 
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' 
                    : 'text-gray-400 hover:text-gray-300 hover:bg-white/5'
                  }
                `}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Navigation Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrevious}
              disabled={!canGoBack}
              className={`
                p-2 rounded-lg border transition-all
                ${canGoBack 
                  ? 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white' 
                  : 'bg-gray-800/50 border-gray-700/50 text-gray-600 cursor-not-allowed'
                }
              `}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="text-center">
              <div className="text-sm font-medium text-white">
                {format(new Date(selectedRecommendation?.timestamp || ''), 'MMM d, yyyy')}
              </div>
              <div className="text-xs text-gray-400">
                {formatDistanceToNow(new Date(selectedRecommendation?.timestamp || ''), { addSuffix: true })}
              </div>
            </div>

            <button
              onClick={handleNext}
              disabled={!canGoForward}
              className={`
                p-2 rounded-lg border transition-all
                ${canGoForward 
                  ? 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white' 
                  : 'bg-gray-800/50 border-gray-700/50 text-gray-600 cursor-not-allowed'
                }
              `}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="text-xs text-gray-400">
            {selectedRecommendationIndex + 1} of {recommendations.length}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {viewMode === 'timeline' && selectedRecommendation && (
          <TimelineView 
            recommendation={selectedRecommendation}
            comparison={comparison}
            currentMarketPrice={currentMarketPrice}
          />
        )}

        {viewMode === 'comparison' && comparison && (
          <ComparisonView comparison={comparison} />
        )}

        {viewMode === 'pnl' && pnlData && (
          <PnLView 
            pnlData={pnlData} 
            selectedRecommendation={selectedRecommendation}
            currentMarketPrice={currentMarketPrice}
          />
        )}

        {viewMode === 'analytics' && (
          <RecommendationAnalytics
            conditionId={conditionId}
            currentMarketPrice={currentMarketPrice}
          />
        )}
      </div>
    </Card>
  );
}

// Timeline View Component
function TimelineView({ 
  recommendation, 
  comparison, 
  currentMarketPrice 
}: { 
  recommendation: HistoricalRecommendation;
  comparison: any;
  currentMarketPrice: number;
}) {
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'LONG_YES': return <TrendingUp className="w-4 h-4" />;
      case 'LONG_NO': return <TrendingDown className="w-4 h-4" />;
      case 'NO_TRADE': return <Minus className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'LONG_YES': return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'LONG_NO': return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'NO_TRADE': return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
      default: return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    }
  };

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;

  return (
    <div className="space-y-6">
      {/* Recommendation Summary */}
      <div className="flex items-start gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
        <div className={`p-2 rounded-lg border ${getActionColor(recommendation.action)}`}>
          {getActionIcon(recommendation.action)}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Badge variant="outline" className={getActionColor(recommendation.action)}>
              {recommendation.action.replace('_', ' ')}
            </Badge>
            <span className="text-sm text-gray-400">
              Fair Value: {formatPercentage(recommendation.metadata.consensusProbability)}
            </span>
            <span className="text-sm text-gray-400">
              Edge: {formatPercentage(recommendation.metadata.edge)}
            </span>
          </div>
          
          <p className="text-sm text-gray-300 leading-relaxed">
            {recommendation.explanation.summary}
          </p>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-3 bg-white/5 rounded-lg border border-white/10">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
            <Target className="w-3 h-3" />
            Entry Zone
          </div>
          <div className="text-sm font-semibold text-white">
            {formatPercentage(recommendation.entryZone[0])} - {formatPercentage(recommendation.entryZone[1])}
          </div>
        </div>

        <div className="p-3 bg-white/5 rounded-lg border border-white/10">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
            <TrendingUp className="w-3 h-3" />
            Target Zone
          </div>
          <div className="text-sm font-semibold text-white">
            {formatPercentage(recommendation.targetZone[0])} - {formatPercentage(recommendation.targetZone[1])}
          </div>
        </div>

        <div className="p-3 bg-white/5 rounded-lg border border-white/10">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
            <DollarSign className="w-3 h-3" />
            Expected Value
          </div>
          <div className="text-sm font-semibold text-white">
            {formatPercentage(recommendation.expectedValue)}
          </div>
        </div>

        <div className="p-3 bg-white/5 rounded-lg border border-white/10">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
            <Users className="w-3 h-3" />
            Agents
          </div>
          <div className="text-sm font-semibold text-white">
            {recommendation.metadata.agentCount || 0}
          </div>
        </div>
      </div>

      {/* Catalysts and Risks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-green-500/5 rounded-lg border border-green-500/20">
          <div className="flex items-center gap-2 text-green-400 text-sm font-medium mb-3">
            <Zap className="w-4 h-4" />
            Key Catalysts
          </div>
          <div className="space-y-2">
            {recommendation.explanation.keyCatalysts.map((catalyst, index) => (
              <div key={index} className="text-sm text-gray-300 flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 flex-shrink-0" />
                {catalyst}
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-red-500/5 rounded-lg border border-red-500/20">
          <div className="flex items-center gap-2 text-red-400 text-sm font-medium mb-3">
            <AlertTriangle className="w-4 h-4" />
            Failure Scenarios
          </div>
          <div className="space-y-2">
            {recommendation.explanation.failureScenarios.map((risk, index) => (
              <div key={index} className="text-sm text-gray-300 flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 flex-shrink-0" />
                {risk}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Changes from Previous */}
      {comparison && (
        <div className="p-4 bg-blue-500/5 rounded-lg border border-blue-500/20">
          <div className="flex items-center gap-2 text-blue-400 text-sm font-medium mb-3">
            <BarChart3 className="w-4 h-4" />
            Changes from Previous Recommendation
          </div>
          
          <div className="space-y-2 text-sm">
            {comparison.changes.actionChanged && (
              <div className="flex items-center gap-2 text-yellow-400">
                <ArrowUpRight className="w-3 h-3" />
                Action changed from {comparison.previous.action} to {comparison.current.action}
              </div>
            )}
            
            {Math.abs(comparison.changes.probabilityDelta) > 0.01 && (
              <div className="flex items-center gap-2 text-gray-300">
                {comparison.changes.probabilityDelta > 0 ? (
                  <ArrowUpRight className="w-3 h-3 text-green-400" />
                ) : (
                  <ArrowDownRight className="w-3 h-3 text-red-400" />
                )}
                Fair probability {comparison.changes.probabilityDelta > 0 ? 'increased' : 'decreased'} by {Math.abs(comparison.changes.probabilityDelta * 100).toFixed(1)}%
              </div>
            )}

            {comparison.changes.newCatalysts.length > 0 && (
              <div className="text-gray-300">
                <span className="text-green-400">New catalysts:</span> {comparison.changes.newCatalysts.join(', ')}
              </div>
            )}

            {comparison.changes.newRisks.length > 0 && (
              <div className="text-gray-300">
                <span className="text-red-400">New risks:</span> {comparison.changes.newRisks.join(', ')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Comparison View Component
function ComparisonView({ comparison }: { comparison: any }) {
  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current Recommendation */}
        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <div className="flex items-center gap-2 text-white font-medium mb-3">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            Current Recommendation
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Action:</span>
              <span className="text-white font-medium">{comparison.current.action}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Fair Value:</span>
              <span className="text-white font-medium">{formatPercentage(comparison.current.metadata.consensusProbability)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Edge:</span>
              <span className="text-white font-medium">{formatPercentage(comparison.current.metadata.edge)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Expected Value:</span>
              <span className="text-white font-medium">{formatPercentage(comparison.current.expectedValue)}</span>
            </div>
          </div>
        </div>

        {/* Previous Recommendation */}
        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <div className="flex items-center gap-2 text-white font-medium mb-3">
            <div className="w-2 h-2 rounded-full bg-gray-400" />
            Previous Recommendation
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Action:</span>
              <span className="text-white font-medium">{comparison.previous.action}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Fair Value:</span>
              <span className="text-white font-medium">{formatPercentage(comparison.previous.metadata.consensusProbability)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Edge:</span>
              <span className="text-white font-medium">{formatPercentage(comparison.previous.metadata.edge)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Expected Value:</span>
              <span className="text-white font-medium">{formatPercentage(comparison.previous.expectedValue)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Key Changes */}
      <div className="p-4 bg-indigo-500/5 rounded-lg border border-indigo-500/20">
        <div className="flex items-center gap-2 text-indigo-400 font-medium mb-3">
          <BarChart3 className="w-4 h-4" />
          Key Changes
        </div>
        
        <div className="space-y-3">
          {comparison.changes.actionChanged && (
            <div className="flex items-center gap-2 p-2 bg-yellow-500/10 rounded border border-yellow-500/20">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-yellow-300">
                Action changed from {comparison.previous.action} to {comparison.current.action}
              </span>
            </div>
          )}

          {Math.abs(comparison.changes.probabilityDelta) > 0.01 && (
            <div className={`flex items-center gap-2 p-2 rounded border ${
              comparison.changes.probabilityDelta > 0 
                ? 'bg-green-500/10 border-green-500/20' 
                : 'bg-red-500/10 border-red-500/20'
            }`}>
              {comparison.changes.probabilityDelta > 0 ? (
                <ArrowUpRight className="w-4 h-4 text-green-400" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-red-400" />
              )}
              <span className="text-sm text-gray-300">
                Fair probability {comparison.changes.probabilityDelta > 0 ? 'increased' : 'decreased'} by {Math.abs(comparison.changes.probabilityDelta * 100).toFixed(1)}%
              </span>
            </div>
          )}

          {comparison.changes.newCatalysts.length > 0 && (
            <div className="p-2 bg-green-500/10 rounded border border-green-500/20">
              <div className="text-sm text-green-400 font-medium mb-1">New Catalysts:</div>
              <div className="text-sm text-gray-300">
                {comparison.changes.newCatalysts.join(', ')}
              </div>
            </div>
          )}

          {comparison.changes.newRisks.length > 0 && (
            <div className="p-2 bg-red-500/10 rounded border border-red-500/20">
              <div className="text-sm text-red-400 font-medium mb-1">New Risks:</div>
              <div className="text-sm text-gray-300">
                {comparison.changes.newRisks.join(', ')}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// P&L View Component
function PnLView({ 
  pnlData, 
  selectedRecommendation,
  currentMarketPrice 
}: { 
  pnlData: PotentialPnL[];
  selectedRecommendation?: HistoricalRecommendation;
  currentMarketPrice: number;
}) {
  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;
  const formatPercentage = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;

  const selectedPnL = selectedRecommendation 
    ? pnlData.find(p => p.recommendationId === selectedRecommendation.id)
    : null;

  return (
    <div className="space-y-6">
      {/* Selected Recommendation P&L */}
      {selectedPnL && (
        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <div className="flex items-center gap-2 text-white font-medium mb-4">
            <DollarSign className="w-4 h-4" />
            Potential P&L for Selected Recommendation
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-xs text-gray-400 mb-1">Entry Price</div>
              <div className="text-lg font-semibold text-white">
                {formatPercentage(selectedPnL.entryPrice * 100)}
              </div>
            </div>

            <div className="text-center">
              <div className="text-xs text-gray-400 mb-1">Current Price</div>
              <div className="text-lg font-semibold text-white">
                {formatPercentage(selectedPnL.currentPrice * 100)}
              </div>
            </div>

            <div className="text-center">
              <div className="text-xs text-gray-400 mb-1">Return</div>
              <div className={`text-lg font-semibold ${
                selectedPnL.wouldHaveProfit ? 'text-green-400' : 'text-red-400'
              }`}>
                {formatPercentage(selectedPnL.potentialReturnPercent)}
              </div>
            </div>

            <div className="text-center">
              <div className="text-xs text-gray-400 mb-1">Days Held</div>
              <div className="text-lg font-semibold text-white">
                {selectedPnL.daysHeld}
              </div>
            </div>
          </div>

          {selectedPnL.annualizedReturn && (
            <div className="mt-4 p-3 bg-indigo-500/10 rounded border border-indigo-500/20">
              <div className="text-sm text-indigo-400 font-medium">
                Annualized Return: {formatPercentage(selectedPnL.annualizedReturn)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* All Recommendations P&L Summary */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-white font-medium">
          <BarChart3 className="w-4 h-4" />
          All Recommendations Performance
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {pnlData.map((pnl, index) => (
            <div 
              key={pnl.recommendationId}
              className={`
                p-3 rounded-lg border transition-all cursor-pointer
                ${selectedRecommendation?.id === pnl.recommendationId
                  ? 'bg-indigo-500/10 border-indigo-500/30'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
                }
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded border ${
                    pnl.action === 'LONG_YES' 
                      ? 'bg-green-500/10 border-green-500/20 text-green-400'
                      : 'bg-red-500/10 border-red-500/20 text-red-400'
                  }`}>
                    {pnl.action === 'LONG_YES' ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium text-white">
                      {pnl.action.replace('_', ' ')}
                    </div>
                    <div className="text-xs text-gray-400">
                      {format(new Date(pnl.timestamp), 'MMM d, yyyy')}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className={`text-sm font-semibold ${
                    pnl.wouldHaveProfit ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {formatPercentage(pnl.potentialReturnPercent)}
                  </div>
                  <div className="text-xs text-gray-400">
                    {pnl.daysHeld}d held
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
          <div className="text-center">
            <div className="text-xs text-gray-400 mb-1">Win Rate</div>
            <div className="text-sm font-semibold text-white">
              {((pnlData.filter(p => p.wouldHaveProfit).length / pnlData.length) * 100).toFixed(0)}%
            </div>
          </div>

          <div className="text-center">
            <div className="text-xs text-gray-400 mb-1">Avg Return</div>
            <div className="text-sm font-semibold text-white">
              {formatPercentage(pnlData.reduce((sum, p) => sum + p.potentialReturnPercent, 0) / pnlData.length)}
            </div>
          </div>

          <div className="text-center">
            <div className="text-xs text-gray-400 mb-1">Best Return</div>
            <div className="text-sm font-semibold text-green-400">
              {formatPercentage(Math.max(...pnlData.map(p => p.potentialReturnPercent)))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}