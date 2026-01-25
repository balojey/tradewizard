"use client";

import { TrendingUp, DollarSign, Users, Activity, Clock, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { DetailedMarket } from '@/lib/polymarket-api-types';

interface MarketStatsProps {
  market: DetailedMarket;
}

/**
 * Market Statistics Component
 * Displays comprehensive market metrics and statistics
 * Implements Requirements 4.2, 4.4, 4.5 - Show market information, volume, liquidity, and number of traders
 */
export function MarketStats({ market }: MarketStatsProps) {
  // Calculate additional metrics
  const liquidityRatio = market.liquidity > 0 ? (market.volume24h / market.liquidity) * 100 : 0;
  const averageTradeSize = market.totalTrades > 0 ? market.volume24h / market.totalTrades : 0;
  
  // Market health indicators
  const healthColor = getHealthColor(market.healthScore);
  const liquidityScore = market.liquidityScore || 0;
  const liquidityColor = getLiquidityColor(liquidityScore);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Market Statistics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {/* Volume 24h */}
          <StatCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="24h Volume"
            value={market.volumeFormatted}
            change={market.priceChangeFormatted}
            changeColor={market.priceChange24h && market.priceChange24h >= 0 ? 'positive' : 'negative'}
          />

          {/* Liquidity */}
          <StatCard
            icon={<DollarSign className="h-4 w-4" />}
            label="Liquidity"
            value={market.liquidityFormatted}
            subValue={`Score: ${liquidityScore}/10`}
            subValueColor={liquidityColor}
          />

          {/* Unique Traders */}
          <StatCard
            icon={<Users className="h-4 w-4" />}
            label="Traders"
            value={market.uniqueTraders.toLocaleString()}
            subValue={`${market.totalTrades} trades`}
          />

          {/* Market Health */}
          <StatCard
            icon={<Target className="h-4 w-4" />}
            label="Health Score"
            value={`${market.healthScore}/100`}
            valueColor={healthColor}
            subValue={getHealthLabel(market.healthScore)}
          />
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
          {/* Spread Information */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Spread & Depth</h4>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Bid-Ask Spread:</span>
                <span className="font-mono">
                  {market.spreadFormatted || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Market Depth:</span>
                <span className="font-mono">
                  {formatVolume(market.marketDepth)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Liquidity Ratio:</span>
                <span className="font-mono">
                  {liquidityRatio.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Trading Activity */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Trading Activity</h4>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Avg Trade Size:</span>
                <span className="font-mono">
                  {formatVolume(averageTradeSize)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Largest Trade:</span>
                <span className="font-mono">
                  {formatVolume(market.largestTrade)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Last Trade:</span>
                <span className="font-mono">
                  {market.lastTradePrice ? `${(market.lastTradePrice * 100).toFixed(1)}%` : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Market Timing */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Market Timing</h4>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Started:</span>
                <span className="font-mono">
                  {formatDate(market.startDate)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Ends:</span>
                <span className="font-mono">
                  {formatDate(market.endDate)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Duration:</span>
                <span className="font-mono">
                  {calculateDuration(market.startDate, market.endDate)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Volatility & Risk Indicators */}
        <div className="pt-4 border-t mt-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Risk Assessment</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Volatility */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <div className="text-sm font-medium">Volatility</div>
                <div className="text-xs text-muted-foreground">Price movement</div>
              </div>
              <div className={cn(
                "px-2 py-1 rounded text-xs font-medium",
                market.volatilityRegime === 'high' ? "bg-red-100 text-red-800" :
                market.volatilityRegime === 'medium' ? "bg-yellow-100 text-yellow-800" :
                "bg-green-100 text-green-800"
              )}>
                {market.volatilityRegime?.toUpperCase()}
              </div>
            </div>

            {/* Risk Level */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <div className="text-sm font-medium">Risk Level</div>
                <div className="text-xs text-muted-foreground">Overall risk</div>
              </div>
              <div className={cn(
                "px-2 py-1 rounded text-xs font-medium",
                market.riskLevel === 'high' ? "bg-red-100 text-red-800" :
                market.riskLevel === 'medium' ? "bg-yellow-100 text-yellow-800" :
                "bg-green-100 text-green-800"
              )}>
                {market.riskLevel?.toUpperCase()}
              </div>
            </div>

            {/* Confidence */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <div className="text-sm font-medium">AI Confidence</div>
                <div className="text-xs text-muted-foreground">Analysis confidence</div>
              </div>
              <div className={cn(
                "px-2 py-1 rounded text-xs font-medium",
                (market.confidence || 0) >= 70 ? "bg-green-100 text-green-800" :
                (market.confidence || 0) >= 50 ? "bg-yellow-100 text-yellow-800" :
                "bg-red-100 text-red-800"
              )}>
                {market.confidence || 0}%
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Individual Stat Card Component
 */
function StatCard({
  icon,
  label,
  value,
  change,
  changeColor,
  subValue,
  subValueColor,
  valueColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  change?: string;
  changeColor?: 'positive' | 'negative';
  subValue?: string;
  subValueColor?: string;
  valueColor?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="space-y-1">
        <div className={cn(
          "text-lg font-bold font-mono",
          valueColor && `text-${valueColor}-600`
        )}>
          {value}
        </div>
        {change && (
          <div className={cn(
            "text-xs font-medium",
            changeColor === 'positive' ? "text-emerald-600" : "text-red-600"
          )}>
            {change}
          </div>
        )}
        {subValue && (
          <div className={cn(
            "text-xs",
            subValueColor ? `text-${subValueColor}-600` : "text-muted-foreground"
          )}>
            {subValue}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Utility Functions
 */

function formatVolume(volume: number): string {
  if (volume >= 1000000) {
    return `$${(volume / 1000000).toFixed(1)}M`;
  }
  if (volume >= 1000) {
    return `$${(volume / 1000).toFixed(1)}K`;
  }
  return `$${volume.toFixed(0)}`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
  });
}

function calculateDuration(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays >= 365) {
    const years = Math.floor(diffDays / 365);
    return `${years}y`;
  }
  if (diffDays >= 30) {
    const months = Math.floor(diffDays / 30);
    return `${months}mo`;
  }
  return `${diffDays}d`;
}

function getHealthColor(score: number): string {
  if (score >= 80) return 'emerald';
  if (score >= 60) return 'yellow';
  if (score >= 40) return 'orange';
  return 'red';
}

function getHealthLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Poor';
}

function getLiquidityColor(score: number): string {
  if (score >= 8) return 'emerald';
  if (score >= 6) return 'yellow';
  if (score >= 4) return 'orange';
  return 'red';
}