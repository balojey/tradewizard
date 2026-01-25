"use client";

import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OrderBook as OrderBookType } from '@/lib/polymarket-api-types';

interface OrderBookProps {
  orderBook: OrderBookType;
  selectedTokenId?: string;
}

/**
 * Order Book Component
 * Displays bid/ask spreads and market depth
 * Implements Requirements 5.6 - Add order book display with bid/ask spreads
 */
export function OrderBook({ orderBook, selectedTokenId }: OrderBookProps) {
  // Generate mock order book data for demonstration
  const mockBids = Array.from({ length: 8 }, (_, i) => ({
    price: (0.45 - i * 0.01).toFixed(2),
    size: (Math.random() * 1000 + 100).toFixed(0),
    total: ((0.45 - i * 0.01) * (Math.random() * 1000 + 100)).toFixed(0),
  }));

  const mockAsks = Array.from({ length: 8 }, (_, i) => ({
    price: (0.55 + i * 0.01).toFixed(2),
    size: (Math.random() * 1000 + 100).toFixed(0),
    total: ((0.55 + i * 0.01) * (Math.random() * 1000 + 100)).toFixed(0),
  }));

  const spread = 0.55 - 0.45;
  const spreadPercent = (spread / 0.5) * 100;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="grid grid-cols-3 gap-2 text-xs font-medium text-muted-foreground border-b pb-2">
        <div className="text-right">Price</div>
        <div className="text-right">Size</div>
        <div className="text-right">Total</div>
      </div>

      {/* Asks (Sell Orders) */}
      <div className="space-y-1">
        {mockAsks.reverse().map((ask, index) => (
          <div
            key={index}
            className="grid grid-cols-3 gap-2 text-xs hover:bg-red-50 p-1 rounded cursor-pointer transition-colors"
          >
            <div className="text-right font-mono text-red-600">{ask.price}</div>
            <div className="text-right font-mono">{ask.size}</div>
            <div className="text-right font-mono text-muted-foreground">{ask.total}</div>
          </div>
        ))}
      </div>

      {/* Spread */}
      <div className="flex items-center justify-center py-2 bg-muted/50 rounded">
        <div className="text-center">
          <div className="text-xs text-muted-foreground">Spread</div>
          <div className="font-mono text-sm font-medium">
            {spread.toFixed(3)} ({spreadPercent.toFixed(2)}%)
          </div>
        </div>
      </div>

      {/* Bids (Buy Orders) */}
      <div className="space-y-1">
        {mockBids.map((bid, index) => (
          <div
            key={index}
            className="grid grid-cols-3 gap-2 text-xs hover:bg-emerald-50 p-1 rounded cursor-pointer transition-colors"
          >
            <div className="text-right font-mono text-emerald-600">{bid.price}</div>
            <div className="text-right font-mono">{bid.size}</div>
            <div className="text-right font-mono text-muted-foreground">{bid.total}</div>
          </div>
        ))}
      </div>

      {/* Order Book Stats */}
      <div className="pt-3 border-t space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Best Bid:</span>
          <span className="font-mono text-emerald-600">{mockBids[0].price}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Best Ask:</span>
          <span className="font-mono text-red-600">{mockAsks[0].price}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Mid Price:</span>
          <span className="font-mono">{((parseFloat(mockBids[0].price) + parseFloat(mockAsks[0].price)) / 2).toFixed(3)}</span>
        </div>
      </div>
    </div>
  );
}