"use client";

import { useState, useEffect } from 'react';
import { ArrowLeft, TrendingUp, Clock, Users, DollarSign, BarChart3, Calendar, Activity, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MarketImage } from '@/components/market-image';
import { MarketCard } from '@/components/market-card';
import { ErrorBoundary } from '@/components/error-boundary';
import type { ProcessedSeries, ProcessedMarket } from '@/lib/enhanced-polymarket-types';

interface SeriesDetailViewProps {
  series: ProcessedSeries;
}

/**
 * Series Detail View Component
 * Implements Requirements 13.5, 13.6, 13.7, 13.8
 */
export function SeriesDetailView({ series }: SeriesDetailViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'active' | 'completed' | 'upcoming'>('all');
  const [sortBy, setSortBy] = useState<'volume' | 'endDate' | 'probability'>('volume');

  // Calculate time until series ends
  const timeUntilEnd = getTimeUntilEnd(series.endDate);
  const isExpiringSoon = timeUntilEnd && timeUntilEnd.includes('h') && parseInt(timeUntilEnd) < 24;

  // Filter and sort markets based on selection
  const filteredMarkets = getFilteredMarkets(series.markets, selectedCategory, sortBy);

  // Calculate aggregate statistics
  const aggregateStats = calculateAggregateStats(series.markets);

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
                <div className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                  Series
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  {series.title}
                </h1>
              </div>
              <p className="text-muted-foreground max-w-3xl">
                {series.description}
              </p>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <BarChart3 className="h-4 w-4" />
                  <span>{series.seriesType}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{series.recurrence}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Series Status */}
          <div className="flex flex-col items-end gap-2">
            <SeriesStatusBadge series={series} />
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

        {/* Series Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Series Image and Info */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                <div className="aspect-video rounded-lg overflow-hidden bg-muted mb-4">
                  <MarketImage
                    eventImage={series.image}
                    title={series.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* Series Statistics */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <div className="text-2xl font-bold text-foreground">
                        {series.marketCount}
                      </div>
                      <div className="text-xs text-muted-foreground">Total Markets</div>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <div className="text-2xl font-bold text-emerald-600">
                        {series.activeMarkets}
                      </div>
                      <div className="text-xs text-muted-foreground">Active</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {series.completedMarkets}
                      </div>
                      <div className="text-xs text-muted-foreground">Completed</div>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">
                        {series.upcomingMarkets}
                      </div>
                      <div className="text-xs text-muted-foreground">Upcoming</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Aggregate Statistics */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Series Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <TrendingUp className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="text-lg font-bold text-foreground">
                      {series.totalVolumeFormatted}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Volume</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <DollarSign className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="text-lg font-bold text-foreground">
                      {formatCurrency(series.totalLiquidity)}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Liquidity</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Users className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="text-lg font-bold text-foreground">
                      {aggregateStats.totalTraders.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Traders</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Activity className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className="text-lg font-bold text-foreground">
                      {aggregateStats.avgProbability.toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Avg Probability</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Markets in Series */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <CardTitle>Markets in Series</CardTitle>
              
              {/* Filter and Sort Controls */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                {/* Category Filter */}
                <div className="flex gap-1">
                  {(['all', 'active', 'completed', 'upcoming'] as const).map((category) => (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(category)}
                      className="capitalize"
                    >
                      {category}
                    </Button>
                  ))}
                </div>
                
                {/* Sort Control */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'volume' | 'endDate' | 'probability')}
                  className="px-3 py-1 border rounded-md text-sm bg-background"
                >
                  <option value="volume">Sort by Volume</option>
                  <option value="endDate">Sort by End Date</option>
                  <option value="probability">Sort by Probability</option>
                </select>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            {filteredMarkets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-8 w-8 mx-auto mb-2" />
                <p>No markets found for the selected category.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMarkets.map((market) => (
                  <MarketCard
                    key={market.id}
                    market={market}
                    showAIInsights={false}
                    onClick={(slug) => {
                      // Navigate to individual market
                      window.location.href = `/market/${slug}`;
                    }}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Series Navigation */}
        <Card>
          <CardHeader>
            <CardTitle>Related Series</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="h-8 w-8 mx-auto mb-2" />
              <p>Related series will be displayed here.</p>
              <p className="text-sm mt-1">Feature coming soon...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  );
}

/**
 * Series Status Badge Component
 */
function SeriesStatusBadge({ series }: { series: ProcessedSeries }) {
  if (!series.active) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
        <Clock className="h-4 w-4" />
        Inactive
      </div>
    );
  }

  if (series.activeMarkets === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
        <BarChart3 className="h-4 w-4" />
        Completed
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
 * Filter and sort markets based on selection
 */
function getFilteredMarkets(
  markets: ProcessedMarket[], 
  category: 'all' | 'active' | 'completed' | 'upcoming',
  sortBy: 'volume' | 'endDate' | 'probability'
): ProcessedMarket[] {
  let filtered = [...markets];

  // Filter by category
  switch (category) {
    case 'active':
      filtered = filtered.filter(m => m.active && !m.closed);
      break;
    case 'completed':
      filtered = filtered.filter(m => m.closed);
      break;
    case 'upcoming':
      filtered = filtered.filter(m => !m.active && new Date(m.startDate) > new Date());
      break;
    // 'all' shows everything
  }

  // Sort markets
  filtered.sort((a, b) => {
    switch (sortBy) {
      case 'volume':
        return b.volume24h - a.volume24h;
      case 'endDate':
        return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
      case 'probability':
        const aProbability = a.outcomes[0]?.probability || 50;
        const bProbability = b.outcomes[0]?.probability || 50;
        return bProbability - aProbability;
      default:
        return 0;
    }
  });

  return filtered;
}

/**
 * Calculate aggregate statistics for the series
 */
function calculateAggregateStats(markets: ProcessedMarket[]) {
  const totalTraders = markets.reduce((sum, market) => {
    // Mock calculation - in real implementation, this would come from API
    return sum + Math.floor(market.volume24h / 100);
  }, 0);

  const avgProbability = markets.length > 0 
    ? markets.reduce((sum, market) => {
        const probability = market.outcomes[0]?.probability || 50;
        return sum + probability;
      }, 0) / markets.length
    : 0;

  return {
    totalTraders,
    avgProbability,
  };
}

/**
 * Calculate time until series ends
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

/**
 * Format currency values
 */
function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  return `$${value.toFixed(0)}`;
}