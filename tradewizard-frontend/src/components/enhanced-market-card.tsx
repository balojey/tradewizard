/**
 * Enhanced Market Card Component with Real-time Integration
 * Displays market information with live price updates and connection status
 * Requirements: 3.6, 11.5
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, TrendingUp, TrendingDown, Users, DollarSign, Activity, Wifi, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ProcessedMarket } from '../lib/polymarket-api-types';
import { formatVolume } from '../lib/polymarket-config';
import { RealtimePrice } from './realtime-price';
import { ConnectionIndicator } from './connection-status';
import { useRealtimePricesSafe } from '../lib/realtime-context';
import { MarketImage } from '@/components/market-image';

interface EnhancedMarketCardProps {
  market: ProcessedMarket;
  onClick?: (marketId: string) => void;
  showAIInsights?: boolean;
  compact?: boolean;
  enableRealtime?: boolean;
  className?: string;
  href?: string;
}

export function EnhancedMarketCard({
  market,
  onClick,
  showAIInsights = false,
  compact = false,
  enableRealtime = true,
  className = '',
  href,
}: EnhancedMarketCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  // Get real-time price updates for market outcomes
  const tokenIds = enableRealtime ? market.outcomes.map(outcome => outcome.tokenId).filter(Boolean) : [];
  const { prices, isSubscribed } = useRealtimePricesSafe(tokenIds);

  // Calculate time until market ends
  const timeUntilEnd = new Date(market.endDate).getTime() - Date.now();
  const daysUntilEnd = Math.ceil(timeUntilEnd / (1000 * 60 * 60 * 24));

  const handleClick = () => {
    if (onClick) {
      onClick(market.id);
    }
  };

  const getTimeDisplay = () => {
    if (market.closed) return 'Closed';
    if (daysUntilEnd <= 0) return 'Ending soon';
    if (daysUntilEnd === 1) return '1 day left';
    if (daysUntilEnd <= 7) return `${daysUntilEnd} days left`;
    return new Date(market.endDate).toLocaleDateString();
  };

  const getTimeColor = () => {
    if (market.closed) return 'text-gray-500';
    if (daysUntilEnd <= 1) return 'text-red-600';
    if (daysUntilEnd <= 7) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const CardWrapper = ({ children }: { children: React.ReactNode }) => {
    if (href) {
      return (
        <Link 
          href={href}
          className="group block h-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg"
          aria-label={`View market: ${market.title}. Volume: ${market.volumeFormatted}${market.isNew ? '. New market' : ''}`}
        >
          {children}
        </Link>
      );
    }

    return (
      <div 
        className="group block h-full cursor-pointer"
        onClick={handleClick}
      >
        {children}
      </div>
    );
  };

  return (
    <CardWrapper>
      <motion.div
        className={cn(
          "h-full flex flex-col overflow-hidden border border-gray-200 bg-white rounded-lg shadow-sm",
          "hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 hover:bg-card/95",
          "focus-within:border-primary/50 focus-within:shadow-lg transition-all duration-300",
          compact ? 'p-4' : 'p-6',
          className
        )}
        whileHover={{ y: -2 }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
      >
        {/* Market Image and Status */}
        <div className="relative aspect-[1.91/1] w-full overflow-hidden bg-muted rounded-lg mb-4">
          <MarketImage
            eventImage={market.image}
            title={market.title}
            className="w-full h-full"
          />

          {/* Status Badges */}
          <div className="absolute left-2 top-2 flex gap-2">
            {market.isNew && (
              <span className="px-2 py-1 bg-blue-600/90 text-white text-xs font-bold uppercase tracking-wider rounded-full backdrop-blur-md shadow-sm">
                New
              </span>
            )}
            {market.featured && (
              <span className="px-2 py-1 bg-purple-600/90 text-white text-xs font-bold uppercase tracking-wider rounded-full backdrop-blur-md shadow-sm">
                Featured
              </span>
            )}
          </div>

          {/* Real-time Status */}
          {enableRealtime && (
            <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-black/60 rounded-full backdrop-blur-sm">
              <ConnectionIndicator size="sm" />
              {isSubscribed && (
                <span className="text-xs text-white">Live</span>
              )}
            </div>
          )}

          {/* Volume */}
          <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 rounded-md backdrop-blur-sm">
            <div className="flex items-center gap-1 text-white text-xs font-medium">
              <TrendingUp className="w-3 h-3" />
              <span>{market.volumeFormatted}</span>
            </div>
          </div>
        </div>

        {/* Market Title */}
        <h3 className={cn(
          "font-semibold text-gray-900 line-clamp-2 mb-4 group-hover:text-primary transition-colors",
          compact ? 'text-sm' : 'text-base'
        )}>
          {market.title}
        </h3>

        {/* Outcomes with Real-time Prices */}
        <div className="space-y-2 mb-4 flex-1">
          {market.outcomes.map((outcome, index) => {
            const realtimePrice = enableRealtime && outcome.tokenId ? prices[outcome.tokenId] : null;
            const displayProbability = realtimePrice ? realtimePrice.price : outcome.probability;
            const hasRealtimeUpdate = !!realtimePrice;

            return (
              <div
                key={outcome.name}
                className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-sm font-medium",
                    outcome.color === 'yes' ? 'text-emerald-600' :
                    outcome.color === 'no' ? 'text-red-600' :
                    'text-gray-600'
                  )}>
                    {outcome.name}
                  </span>
                  {hasRealtimeUpdate && (
                    <Activity className="w-3 h-3 text-emerald-500" />
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  {enableRealtime && outcome.tokenId ? (
                    <RealtimePrice
                      tokenId={outcome.tokenId}
                      showChange={!compact}
                      showTimestamp={false}
                      size={compact ? 'sm' : 'md'}
                      animated={true}
                    />
                  ) : (
                    <span className={cn(
                      "font-semibold",
                      outcome.color === 'yes' ? 'text-emerald-600' :
                      outcome.color === 'no' ? 'text-red-600' :
                      'text-gray-600'
                    )}>
                      {(displayProbability * 100).toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Market Stats */}
        <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              <span>{market.volumeFormatted}</span>
            </div>
            
            {market.liquidity && (
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{formatVolume(market.liquidity)}</span>
              </div>
            )}
          </div>

          <div className={cn("flex items-center gap-1", getTimeColor())}>
            <Clock className="w-4 h-4" />
            <span>{getTimeDisplay()}</span>
          </div>
        </div>

        {/* AI Insights (if enabled) */}
        {showAIInsights && market.aiInsights && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ 
              opacity: isHovered ? 1 : 0, 
              height: isHovered ? 'auto' : 0 
            }}
            className="border-t border-gray-200 pt-3 mt-3"
          >
            <div className="text-xs text-gray-600">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium">AI Insight:</span>
                <span className={cn(
                  "px-2 py-1 rounded-full text-xs",
                  market.aiInsights.sentiment === 'bullish' ? 'bg-emerald-100 text-emerald-800' :
                  market.aiInsights.sentiment === 'bearish' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                )}>
                  {market.aiInsights.sentiment}
                </span>
              </div>
              <p className="line-clamp-2">{market.aiInsights.summary}</p>
            </div>
          </motion.div>
        )}

        {/* Real-time Status Footer */}
        {enableRealtime && (
          <div className="flex items-center justify-between text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <span>Real-time data</span>
              {isSubscribed ? (
                <div className="flex items-center gap-1">
                  <Wifi className="w-3 h-3 text-emerald-600" />
                  <span className="text-emerald-600">Active</span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <WifiOff className="w-3 h-3 text-gray-400" />
                  <span className="text-gray-400">Inactive</span>
                </div>
              )}
            </div>
            
            {Object.keys(prices).length > 0 && (
              <div className="text-emerald-600">
                {Object.keys(prices).length} live updates
              </div>
            )}
          </div>
        )}
      </motion.div>
    </CardWrapper>
  );
}

// ============================================================================
// Market Grid with Real-time Support
// ============================================================================

interface EnhancedMarketGridProps {
  markets: ProcessedMarket[];
  loading?: boolean;
  error?: string;
  onMarketClick?: (marketId: string) => void;
  showAIInsights?: boolean;
  enableRealtime?: boolean;
  className?: string;
  columns?: 1 | 2 | 3 | 4;
}

export function EnhancedMarketGrid({
  markets,
  loading = false,
  error,
  onMarketClick,
  showAIInsights = false,
  enableRealtime = true,
  className = '',
  columns = 3,
}: EnhancedMarketGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  }[columns];

  if (loading) {
    return (
      <div className={cn("grid gap-6", gridCols, className)}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-200 rounded-lg h-80"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-2">Error loading markets</div>
        <div className="text-gray-500 text-sm">{error}</div>
      </div>
    );
  }

  if (markets.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 mb-2">No markets found</div>
        <div className="text-gray-400 text-sm">Try adjusting your filters</div>
      </div>
    );
  }

  return (
    <div className={cn("grid gap-6", gridCols, className)}>
      {markets.map((market) => (
        <EnhancedMarketCard
          key={market.id}
          market={market}
          onClick={onMarketClick}
          showAIInsights={showAIInsights}
          enableRealtime={enableRealtime}
          href={`/market/${market.id}`}
        />
      ))}
    </div>
  );
}