"use client";

import { useState, useEffect } from 'react';
import { ArrowLeft, TrendingUp, Clock, Users, DollarSign, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MarketImage } from '@/components/market-image';
import { PriceChart } from '@/components/price-chart';
import { TradingPanel } from '@/components/trading-panel';
import { OrderBook } from '@/components/order-book';
import { RecentTrades } from '@/components/recent-trades';
import { MarketStats } from '@/components/market-stats';
import { AIInsightsPanel } from '@/components/ai-insights-panel';
import { ErrorBoundary } from '@/components/error-boundary';
import type { DetailedMarket } from '@/lib/enhanced-polymarket-types';

interface MarketDetailViewProps {
  market: DetailedMarket;
}

/**
 * Market Detail View Component
 * Implements Requirements 4.1, 4.2, 4.3, 4.6
 */
export function MarketDetailView({ market }: MarketDetailViewProps) {
  const [selectedOutcome, setSelectedOutcome] = useState(market.outcomes[0]);
  const [showTradingPanel, setShowTradingPanel] = useState(false);
  const [chartTimeframe, setChartTimeframe] = useState<'1h' | '24h' | '7d' | '30d'>('24h');

  // Calculate time until market ends
  const timeUntilEnd = getTimeUntilEnd(market.endDate);
  const isExpiringSoon = timeUntilEnd && timeUntilEnd.includes('h') && parseInt(timeUntilEnd) < 24;

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-muted rounded-lg transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  {market.title}
                </h1>
                {market.isNew && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                    New
                  </span>
                )}
                {market.featured && (
                  <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">
                    Featured
                  </span>
                )}
              </div>
              <p className="text-muted-foreground max-w-3xl">
                {market.description}
              </p>
            </div>
          </div>
          
          {/* Market Status */}
          <div className="flex flex-col items-end gap-2">
            <MarketStatusBadge market={market} />
            {timeUntilEnd && (
              <div className={cn(
                "flex items-center gap-1 text-sm",
                isExpiringSoon ? "text-red-600" : "text-muted-foreground"
              )}>
                <Clock className="h-4 w-4" />
                <span>{timeUntilEnd} remaining</span>
              </div>
            )}
          </div>
        </div>

        {/* Risk Warnings */}
        {market.riskWarnings && market.riskWarnings.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-yellow-800 mb-1">Risk Warnings</h3>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {market.riskWarnings.map((warning, index) => (
                    <li key={index}>• {warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Market Info & Chart */}
          <div className="lg:col-span-2 space-y-6">
            {/* Market Image & Basic Info */}
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Market Image */}
                  <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                    <MarketImage
                      eventImage={market.image}
                      title={market.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {/* Market Outcomes */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Current Odds</h3>
                    <div className="space-y-3">
                      {market.outcomes.map((outcome, index) => (
                        <div
                          key={index}
                          className={cn(
                            "p-3 rounded-lg border cursor-pointer transition-all",
                            selectedOutcome.tokenId === outcome.tokenId
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          )}
                          onClick={() => setSelectedOutcome(outcome)}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium">{outcome.name}</span>
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "text-lg font-bold",
                                outcome.color === 'yes' ? "text-emerald-600" :
                                outcome.color === 'no' ? "text-red-600" : "text-foreground"
                              )}>
                                {Math.round(outcome.probability)}%
                              </span>
                              {outcome.priceChange24h !== undefined && (
                                <PriceChangeIndicator change={outcome.priceChange24h} />
                              )}
                            </div>
                          </div>
                          <div className="w-full bg-secondary rounded-full h-2">
                            <div
                              className={cn(
                                "h-2 rounded-full transition-all duration-300",
                                outcome.color === 'yes' ? "bg-emerald-500" :
                                outcome.color === 'no' ? "bg-red-500" : "bg-primary"
                              )}
                              style={{ width: `${Math.min(outcome.probability, 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Trade Button */}
                    {market.tradingEnabled && (
                      <Button
                        onClick={() => setShowTradingPanel(true)}
                        className="w-full"
                        size="lg"
                      >
                        Trade on {selectedOutcome.name}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Price Chart */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Price Chart - {selectedOutcome.name}</CardTitle>
                  <div className="flex gap-1">
                    {(['1h', '24h', '7d', '30d'] as const).map((timeframe) => (
                      <Button
                        key={timeframe}
                        variant={chartTimeframe === timeframe ? "default" : "outline"}
                        size="sm"
                        onClick={() => setChartTimeframe(timeframe)}
                      >
                        {timeframe}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <PriceChart
                  tokenId={selectedOutcome.tokenId}
                  timeframe={chartTimeframe}
                  height={300}
                  showVolume={true}
                />
              </CardContent>
            </Card>

            {/* Market Statistics */}
            <MarketStats market={market} />

            {/* AI Insights */}
            {market.aiInsights && (
              <AIInsightsPanel insights={market.aiInsights} />
            )}

            {/* Market Details */}
            <Card>
              <CardHeader>
                <CardTitle>Market Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Resolution Source</h4>
                    <p className="text-sm text-muted-foreground">
                      {market.resolutionSource || 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Market Category</h4>
                    <p className="text-sm text-muted-foreground">
                      {market.category}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Start Date</h4>
                    <p className="text-sm text-muted-foreground">
                      {new Date(market.startDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">End Date</h4>
                    <p className="text-sm text-muted-foreground">
                      {new Date(market.endDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                {market.resolutionDetails && (
                  <div>
                    <h4 className="font-medium mb-2">Resolution Criteria</h4>
                    <p className="text-sm text-muted-foreground">
                      {market.resolutionDetails}
                    </p>
                  </div>
                )}

                {market.tradingRestrictions && market.tradingRestrictions.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Trading Restrictions</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {market.tradingRestrictions.map((restriction, index) => (
                        <li key={index}>• {restriction}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Trading & Order Book */}
          <div className="space-y-6">
            {/* Order Book */}
            <Card>
              <CardHeader>
                <CardTitle>Order Book - {selectedOutcome.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <OrderBook
                  orderBook={market.orderBook}
                  selectedTokenId={selectedOutcome.tokenId}
                />
              </CardContent>
            </Card>

            {/* Recent Trades */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Trades</CardTitle>
              </CardHeader>
              <CardContent>
                <RecentTrades
                  trades={market.recentTrades}
                  selectedTokenId={selectedOutcome.tokenId}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Trading Panel Modal */}
        {showTradingPanel && (
          <TradingPanel
            market={market}
            selectedOutcome={selectedOutcome}
            onClose={() => setShowTradingPanel(false)}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}

/**
 * Market Status Badge Component
 */
function MarketStatusBadge({ market }: { market: DetailedMarket }) {
  if (market.resolved) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
        <CheckCircle className="h-4 w-4" />
        Resolved
      </div>
    );
  }

  if (market.closed) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
        <Clock className="h-4 w-4" />
        Closed
      </div>
    );
  }

  if (!market.active) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
        <AlertTriangle className="h-4 w-4" />
        Inactive
      </div>
    );
  }

  if (!market.tradingEnabled) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
        <AlertTriangle className="h-4 w-4" />
        Trading Disabled
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm font-medium">
      <TrendingUp className="h-4 w-4" />
      Active
    </div>
  );
}

/**
 * Price Change Indicator Component
 */
function PriceChangeIndicator({ change }: { change: number }) {
  const isPositive = change > 0;
  const isNegative = change < 0;
  
  if (change === 0) return null;
  
  return (
    <span className={cn(
      "text-xs font-medium flex items-center gap-1",
      isPositive ? "text-emerald-600" : "text-red-600"
    )}>
      <TrendingUp className={cn(
        "h-3 w-3",
        isNegative && "rotate-180"
      )} />
      {Math.abs(change * 100).toFixed(1)}%
    </span>
  );
}

/**
 * Calculate time until market ends
 */
function getTimeUntilEnd(endDate: string): string | null {
  try {
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return 'Ended';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  } catch {
    return null;
  }
}