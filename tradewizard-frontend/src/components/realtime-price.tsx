/**
 * Real-time Price Display Components
 * Provides live price updates with visual indicators for changes
 * Requirements: 3.6, 11.5
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Activity,
  Clock,
} from 'lucide-react';
import { useRealtimePrices } from '../lib/realtime-context';
import type { PriceUpdate } from '../lib/polymarket-api-types';
import { formatProbability, formatPriceChange, getPriceChangeColor } from '../lib/polymarket-config';

// ============================================================================
// Real-time Price Display
// ============================================================================

interface RealtimePriceProps {
  tokenId: string;
  className?: string;
  showChange?: boolean;
  showVolume?: boolean;
  showTimestamp?: boolean;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

export function RealtimePrice({
  tokenId,
  className = '',
  showChange = true,
  showVolume = false,
  showTimestamp = false,
  size = 'md',
  animated = true,
}: RealtimePriceProps) {
  const { prices, isSubscribed } = useRealtimePrices([tokenId]);
  const priceUpdate = prices[tokenId];
  
  const [previousPrice, setPreviousPrice] = useState<number | null>(null);
  const [priceDirection, setPriceDirection] = useState<'up' | 'down' | 'same'>('same');
  const [flashColor, setFlashColor] = useState<string | null>(null);

  // Track price changes for animation
  useEffect(() => {
    if (priceUpdate && previousPrice !== null) {
      if (priceUpdate.price > previousPrice) {
        setPriceDirection('up');
        setFlashColor('bg-emerald-100');
      } else if (priceUpdate.price < previousPrice) {
        setPriceDirection('down');
        setFlashColor('bg-red-100');
      } else {
        setPriceDirection('same');
      }
      
      // Clear flash after animation
      if (animated) {
        setTimeout(() => setFlashColor(null), 500);
      }
    }
    
    if (priceUpdate) {
      setPreviousPrice(priceUpdate.price);
    }
  }, [priceUpdate?.price, previousPrice, animated]);

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  const getPriceChangeIcon = () => {
    switch (priceDirection) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-emerald-600" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  if (!priceUpdate) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className={`${sizeClasses[size]} text-gray-400`}>
          --
        </div>
        {!isSubscribed && (
          <div className="text-xs text-gray-400 flex items-center gap-1">
            <Activity className="w-3 h-3" />
            Not subscribed
          </div>
        )}
      </div>
    );
  }

  return (
    <motion.div
      className={`flex items-center gap-2 ${className}`}
      animate={flashColor ? { backgroundColor: flashColor } : {}}
      transition={{ duration: 0.5 }}
    >
      <div className={`font-medium ${sizeClasses[size]}`}>
        {formatProbability(priceUpdate.price)}
      </div>
      
      {showChange && priceUpdate.change24h !== undefined && (
        <div className="flex items-center gap-1">
          {animated && getPriceChangeIcon()}
          <span className={`text-sm ${getPriceChangeColor(priceUpdate.change24h)}`}>
            {formatPriceChange(priceUpdate.change24h)}
          </span>
        </div>
      )}
      
      {showVolume && (
        <div className="text-xs text-gray-500">
          Vol: {priceUpdate.volume.toLocaleString()}
        </div>
      )}
      
      {showTimestamp && (
        <div className="text-xs text-gray-400 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatTimestamp(priceUpdate.timestamp)}
        </div>
      )}
    </motion.div>
  );
}

// ============================================================================
// Real-time Price Chart (Mini)
// ============================================================================

interface RealtimePriceChartProps {
  tokenId: string;
  className?: string;
  height?: number;
  maxDataPoints?: number;
}

export function RealtimePriceChart({
  tokenId,
  className = '',
  height = 60,
  maxDataPoints = 50,
}: RealtimePriceChartProps) {
  const { prices } = useRealtimePrices([tokenId]);
  const priceUpdate = prices[tokenId];
  
  const [priceHistory, setPriceHistory] = useState<{ price: number; timestamp: number }[]>([]);

  // Update price history
  useEffect(() => {
    if (priceUpdate) {
      setPriceHistory(prev => {
        const newHistory = [...prev, { 
          price: priceUpdate.price, 
          timestamp: priceUpdate.timestamp 
        }];
        
        // Keep only the last N data points
        return newHistory.slice(-maxDataPoints);
      });
    }
  }, [priceUpdate, maxDataPoints]);

  const chartData = useMemo(() => {
    if (priceHistory.length < 2) return null;

    const minPrice = Math.min(...priceHistory.map(p => p.price));
    const maxPrice = Math.max(...priceHistory.map(p => p.price));
    const priceRange = maxPrice - minPrice || 0.01; // Avoid division by zero

    const points = priceHistory.map((point, index) => {
      const x = (index / (priceHistory.length - 1)) * 200; // SVG width
      const y = height - ((point.price - minPrice) / priceRange) * (height - 10); // Leave margin
      return `${x},${y}`;
    }).join(' ');

    const currentPrice = priceHistory[priceHistory.length - 1]?.price || 0;
    const previousPrice = priceHistory[priceHistory.length - 2]?.price || currentPrice;
    const isUp = currentPrice >= previousPrice;

    return {
      points,
      color: isUp ? '#10b981' : '#ef4444', // emerald-500 or red-500
      minPrice,
      maxPrice,
      currentPrice,
    };
  }, [priceHistory, height]);

  if (!chartData) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <div className="text-xs text-gray-400">Loading chart...</div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <svg width="200" height={height} className="w-full">
        <polyline
          fill="none"
          stroke={chartData.color}
          strokeWidth="2"
          points={chartData.points}
        />
        {/* Current price dot */}
        <circle
          cx={200}
          cy={height - ((chartData.currentPrice - chartData.minPrice) / (chartData.maxPrice - chartData.minPrice)) * (height - 10)}
          r="3"
          fill={chartData.color}
        />
      </svg>
      
      {/* Price labels */}
      <div className="absolute top-0 right-0 text-xs text-gray-500">
        {formatProbability(chartData.maxPrice)}
      </div>
      <div className="absolute bottom-0 right-0 text-xs text-gray-500">
        {formatProbability(chartData.minPrice)}
      </div>
    </div>
  );
}

// ============================================================================
// Real-time Price Grid
// ============================================================================

interface RealtimePriceGridProps {
  tokenIds: string[];
  className?: string;
  columns?: number;
  showLabels?: boolean;
}

export function RealtimePriceGrid({
  tokenIds,
  className = '',
  columns = 2,
  showLabels = true,
}: RealtimePriceGridProps) {
  const { prices, isSubscribed } = useRealtimePrices(tokenIds);

  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
  }[columns] || 'grid-cols-2';

  return (
    <div className={`grid gap-4 ${gridCols} ${className}`}>
      {tokenIds.map((tokenId, index) => {
        const priceUpdate = prices[tokenId];
        
        return (
          <div
            key={tokenId}
            className="p-3 bg-gray-50 rounded-lg"
          >
            {showLabels && (
              <div className="text-xs text-gray-500 mb-1">
                Token {index + 1}
              </div>
            )}
            <RealtimePrice
              tokenId={tokenId}
              showChange={true}
              showTimestamp={false}
              size="sm"
            />
          </div>
        );
      })}
      
      {!isSubscribed && (
        <div className="col-span-full text-center text-sm text-gray-400 py-4">
          <Activity className="w-4 h-4 mx-auto mb-1" />
          Not subscribed to real-time updates
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Real-time Price Ticker
// ============================================================================

interface RealtimePriceTickerProps {
  tokenIds: string[];
  className?: string;
  speed?: 'slow' | 'medium' | 'fast';
}

export function RealtimePriceTicker({
  tokenIds,
  className = '',
  speed = 'medium',
}: RealtimePriceTickerProps) {
  const { prices } = useRealtimePrices(tokenIds);

  const speedDuration = {
    slow: 60,
    medium: 40,
    fast: 20,
  }[speed];

  return (
    <div className={`overflow-hidden ${className}`}>
      <motion.div
        className="flex gap-8 whitespace-nowrap"
        animate={{ x: '-100%' }}
        transition={{
          duration: speedDuration,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        {tokenIds.map(tokenId => {
          const priceUpdate = prices[tokenId];
          
          return (
            <div key={tokenId} className="flex items-center gap-2 flex-shrink-0">
              <div className="text-sm font-medium">
                Token {tokenId.slice(-4)}:
              </div>
              <RealtimePrice
                tokenId={tokenId}
                showChange={true}
                showTimestamp={false}
                size="sm"
                animated={false}
              />
            </div>
          );
        })}
        
        {/* Duplicate for seamless loop */}
        {tokenIds.map(tokenId => {
          const priceUpdate = prices[tokenId];
          
          return (
            <div key={`${tokenId}-dup`} className="flex items-center gap-2 flex-shrink-0">
              <div className="text-sm font-medium">
                Token {tokenId.slice(-4)}:
              </div>
              <RealtimePrice
                tokenId={tokenId}
                showChange={true}
                showTimestamp={false}
                size="sm"
                animated={false}
              />
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}

// ============================================================================
// Hooks for Price Components
// ============================================================================

/**
 * Hook for managing real-time price subscriptions
 */
export function usePriceSubscription(tokenIds: string[]) {
  const { prices, isSubscribed, lastUpdated } = useRealtimePrices(tokenIds);
  
  const priceData = useMemo(() => {
    return tokenIds.map(tokenId => ({
      tokenId,
      price: prices[tokenId],
      hasUpdate: !!prices[tokenId],
    }));
  }, [tokenIds, prices]);

  return {
    priceData,
    isSubscribed,
    lastUpdated,
    hasAnyUpdates: priceData.some(p => p.hasUpdate),
  };
}