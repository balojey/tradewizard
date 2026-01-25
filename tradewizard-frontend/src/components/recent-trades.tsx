"use client";

import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RecentTrade } from '@/lib/polymarket-api-types';

interface RecentTradesProps {
  trades: RecentTrade[];
  selectedTokenId?: string;
}

/**
 * Recent Trades Component
 * Displays recent trading activity
 */
export function RecentTrades({ trades, selectedTokenId }: RecentTradesProps) {
  // Generate mock trades for demonstration
  const mockTrades = Array.from({ length: 12 }, (_, i) => ({
    tradeId: `trade-${i}`,
    tokenId: selectedTokenId || 'mock-token',
    outcome: Math.random() > 0.5 ? 'Yes' : 'No',
    price: 0.4 + Math.random() * 0.2,
    size: Math.random() * 500 + 50,
    side: Math.random() > 0.5 ? 'buy' : 'sell',
    timestamp: Date.now() - i * 60000 * Math.random() * 30, // Random times in last 30 minutes
  })) as RecentTrade[];

  if (mockTrades.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <div className="text-sm">No recent trades</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="grid grid-cols-4 gap-2 text-xs font-medium text-muted-foreground border-b pb-2">
        <div>Side</div>
        <div className="text-right">Price</div>
        <div className="text-right">Size</div>
        <div className="text-right">Time</div>
      </div>

      {/* Trades List */}
      <div className="space-y-1 max-h-64 overflow-y-auto">
        {mockTrades.map((trade, index) => (
          <div
            key={trade.tradeId}
            className={cn(
              "grid grid-cols-4 gap-2 text-xs p-2 rounded hover:bg-muted/50 transition-colors",
              trade.side === 'buy' ? "hover:bg-emerald-50" : "hover:bg-red-50"
            )}
          >
            {/* Side */}
            <div className="flex items-center gap-1">
              {trade.side === 'buy' ? (
                <TrendingUp className="h-3 w-3 text-emerald-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600" />
              )}
              <span className={cn(
                "font-medium capitalize",
                trade.side === 'buy' ? "text-emerald-600" : "text-red-600"
              )}>
                {trade.side}
              </span>
            </div>

            {/* Price */}
            <div className={cn(
              "text-right font-mono",
              trade.side === 'buy' ? "text-emerald-600" : "text-red-600"
            )}>
              {(trade.price * 100).toFixed(1)}%
            </div>

            {/* Size */}
            <div className="text-right font-mono">
              ${trade.size.toFixed(0)}
            </div>

            {/* Time */}
            <div className="text-right text-muted-foreground">
              {formatTradeTime(trade.timestamp)}
            </div>
          </div>
        ))}
      </div>

      {/* Trade Summary */}
      <div className="pt-3 border-t space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total Trades:</span>
          <span className="font-medium">{mockTrades.length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Buy/Sell Ratio:</span>
          <span className="font-medium">
            {mockTrades.filter(t => t.side === 'buy').length}:
            {mockTrades.filter(t => t.side === 'sell').length}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Avg Trade Size:</span>
          <span className="font-mono">
            ${(mockTrades.reduce((sum, t) => sum + t.size, 0) / mockTrades.length).toFixed(0)}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Format trade timestamp for display
 */
function formatTradeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  
  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  
  return new Date(timestamp).toLocaleDateString();
}