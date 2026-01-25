"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { TrendingUp, TrendingDown, BarChart3, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface PriceChartProps {
  tokenId: string;
  timeframe: '1h' | '24h' | '7d' | '30d';
  height?: number;
  showVolume?: boolean;
}

interface PricePoint {
  timestamp: number;
  price: number;
  volume?: number;
}

interface TouchState {
  startDistance: number;
  startScale: number;
  startPan: { x: number; y: number };
  lastTouchTime: number;
}

/**
 * Price Chart Component with Mobile Touch Interactions
 * Displays historical price data with volume (if enabled)
 * Implements Requirements 4.3, 9.4 - Add price chart integration with mobile touch support
 */
export function PriceChart({ tokenId, timeframe, height = 300, showVolume = false }: PriceChartProps) {
  const [priceData, setPriceData] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Mobile interaction state
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isTouching, setIsTouching] = useState(false);
  const [touchState, setTouchState] = useState<TouchState | null>(null);
  
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Detect if device supports touch
  const isMobile = typeof window !== 'undefined' && 'ontouchstart' in window;

  // Generate mock price data for demonstration
  useEffect(() => {
    const generateMockData = () => {
      setLoading(true);
      setError(null);

      try {
        const now = Date.now();
        const intervals = {
          '1h': { points: 60, interval: 60 * 1000 }, // 1 minute intervals
          '24h': { points: 24, interval: 60 * 60 * 1000 }, // 1 hour intervals
          '7d': { points: 7, interval: 24 * 60 * 60 * 1000 }, // 1 day intervals
          '30d': { points: 30, interval: 24 * 60 * 60 * 1000 }, // 1 day intervals
        };

        const config = intervals[timeframe];
        const basePrice = 0.5 + Math.random() * 0.4; // Random base price between 0.5-0.9
        const data: PricePoint[] = [];

        for (let i = config.points; i >= 0; i--) {
          const timestamp = now - (i * config.interval);
          
          // Generate realistic price movement
          const volatility = 0.02; // 2% volatility
          const trend = (Math.random() - 0.5) * 0.001; // Small trend component
          const noise = (Math.random() - 0.5) * volatility;
          
          const previousPrice = i === config.points ? basePrice : data[data.length - 1]?.price || basePrice;
          let price = previousPrice + trend + noise;
          
          // Keep price within reasonable bounds (0.01 to 0.99)
          price = Math.max(0.01, Math.min(0.99, price));
          
          const volume = showVolume ? Math.random() * 10000 + 1000 : undefined;

          data.push({
            timestamp,
            price,
            volume,
          });
        }

        setPriceData(data);
      } catch (err) {
        setError('Failed to generate chart data');
        console.error('Chart data generation error:', err);
      } finally {
        setLoading(false);
      }
    };

    generateMockData();
  }, [tokenId, timeframe, showVolume]);

  // Touch event handlers for mobile interactions
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    setIsTouching(true);
    
    if (e.touches.length === 1) {
      // Single touch - start pan
      const touch = e.touches[0];
      setTouchState({
        startDistance: 0,
        startScale: scale,
        startPan: { x: touch.clientX - pan.x, y: touch.clientY - pan.y },
        lastTouchTime: Date.now(),
      });
    } else if (e.touches.length === 2) {
      // Two touches - start pinch zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + 
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      
      setTouchState({
        startDistance: distance,
        startScale: scale,
        startPan: pan,
        lastTouchTime: Date.now(),
      });
    }
  }, [scale, pan]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    
    if (!touchState) return;

    if (e.touches.length === 1 && touchState.startDistance === 0) {
      // Single touch - pan
      const touch = e.touches[0];
      const newPan = {
        x: touch.clientX - touchState.startPan.x,
        y: touch.clientY - touchState.startPan.y,
      };
      
      // Constrain panning to reasonable bounds
      const maxPan = 100;
      newPan.x = Math.max(-maxPan, Math.min(maxPan, newPan.x));
      newPan.y = Math.max(-maxPan, Math.min(maxPan, newPan.y));
      
      setPan(newPan);
    } else if (e.touches.length === 2) {
      // Two touches - pinch zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + 
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      
      const scaleChange = distance / touchState.startDistance;
      const newScale = touchState.startScale * scaleChange;
      
      // Constrain zoom to reasonable bounds
      const minScale = 0.5;
      const maxScale = 3;
      setScale(Math.max(minScale, Math.min(maxScale, newScale)));
    }
  }, [touchState]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    setIsTouching(false);
    
    // Check for double tap to reset zoom
    if (touchState && e.touches.length === 0) {
      const timeSinceStart = Date.now() - touchState.lastTouchTime;
      if (timeSinceStart < 300 && scale !== 1) {
        // Quick tap - could be part of double tap
        setTimeout(() => {
          if (!isTouching) {
            resetZoom();
          }
        }, 300);
      }
    }
    
    setTouchState(null);
  }, [touchState, scale, isTouching]);

  // Reset zoom and pan
  const resetZoom = useCallback(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Zoom in/out functions
  const zoomIn = useCallback(() => {
    setScale(prev => Math.min(3, prev * 1.2));
  }, []);

  const zoomOut = useCallback(() => {
    setScale(prev => Math.max(0.5, prev / 1.2));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center text-muted-foreground" style={{ height }}>
        <BarChart3 className="h-8 w-8 mb-2" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (priceData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-muted-foreground" style={{ height }}>
        <BarChart3 className="h-8 w-8 mb-2" />
        <p className="text-sm">No price data available</p>
      </div>
    );
  }

  // Calculate price statistics
  const prices = priceData.map(p => p.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const firstPrice = prices[0];
  const lastPrice = prices[prices.length - 1];
  const priceChange = lastPrice - firstPrice;
  const priceChangePercent = (priceChange / firstPrice) * 100;

  return (
    <div className="space-y-4">
      {/* Chart Statistics and Mobile Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 text-sm">
        <div className="flex items-center gap-3 sm:gap-4">
          <div>
            <span className="text-muted-foreground">Current: </span>
            <span className="font-mono font-medium">
              {(lastPrice * 100).toFixed(1)}%
            </span>
          </div>
          <div className={cn(
            "flex items-center gap-1",
            priceChange >= 0 ? "text-emerald-600" : "text-red-600"
          )}>
            {priceChange >= 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            <span className="font-mono">
              {priceChange >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%
            </span>
          </div>
        </div>
        
        <div className="flex items-center justify-between w-full sm:w-auto gap-3 sm:gap-4">
          <div className="flex items-center gap-3 sm:gap-4 text-muted-foreground">
            <div>
              <span>High: </span>
              <span className="font-mono">{(maxPrice * 100).toFixed(1)}%</span>
            </div>
            <div>
              <span>Low: </span>
              <span className="font-mono">{(minPrice * 100).toFixed(1)}%</span>
            </div>
          </div>
          
          {/* Mobile Chart Controls */}
          {isMobile && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={zoomOut}
                disabled={scale <= 0.5}
                className="h-8 w-8 p-0"
                title="Zoom out"
              >
                <ZoomOut className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetZoom}
                disabled={scale === 1 && pan.x === 0 && pan.y === 0}
                className="h-8 w-8 p-0"
                title="Reset zoom"
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={zoomIn}
                disabled={scale >= 3}
                className="h-8 w-8 p-0"
                title="Zoom in"
              >
                <ZoomIn className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Chart Container with Mobile Touch Support */}
      <div 
        ref={containerRef}
        className="relative select-none"
        style={{ height }}
      >
        {/* Touch Instructions for Mobile */}
        {isMobile && (
          <div className="absolute top-2 left-2 z-10 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
            Pinch to zoom • Drag to pan • Double tap to reset
          </div>
        )}
        
        {/* Zoom Level Indicator */}
        {scale !== 1 && (
          <div className="absolute top-2 right-2 z-10 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
            {(scale * 100).toFixed(0)}%
          </div>
        )}
        
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox={`0 0 800 ${height}`}
          className={cn(
            "overflow-visible transition-transform duration-200",
            isTouching && "cursor-grabbing",
            !isTouching && isMobile && "cursor-grab"
          )}
          style={{
            transform: `scale(${scale}) translate(${pan.x}px, ${pan.y}px)`,
            transformOrigin: 'center center'
          }}
          onTouchStart={isMobile ? handleTouchStart : undefined}
          onTouchMove={isMobile ? handleTouchMove : undefined}
          onTouchEnd={isMobile ? handleTouchEnd : undefined}
        >
          {/* Grid Lines */}
          <defs>
            <pattern id="grid" width="40" height="30" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 30" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Price Line */}
          <PriceLine
            data={priceData}
            width={800}
            height={showVolume ? height * 0.7 : height}
            minPrice={minPrice}
            maxPrice={maxPrice}
            isPositive={priceChange >= 0}
            scale={scale}
          />

          {/* Volume Bars (if enabled) */}
          {showVolume && (
            <VolumeBars
              data={priceData}
              width={800}
              height={height * 0.3}
              yOffset={height * 0.7}
            />
          )}
        </svg>

        {/* Hover Tooltip (placeholder for future enhancement) */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Tooltip would be rendered here based on mouse position */}
        </div>
      </div>
    </div>
  );
}

/**
 * Price Line Component with Mobile Scaling Support
 */
function PriceLine({
  data,
  width,
  height,
  minPrice,
  maxPrice,
  isPositive,
  scale = 1,
}: {
  data: PricePoint[];
  width: number;
  height: number;
  minPrice: number;
  maxPrice: number;
  isPositive: boolean;
  scale?: number;
}) {
  const padding = 20;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  // Adjust stroke width based on scale for better visibility when zoomed
  const strokeWidth = Math.max(1, 2 / scale);
  const pointRadius = Math.max(1, 2 / scale);

  // Create path for price line
  const pathData = data.map((point, index) => {
    const x = padding + (index / (data.length - 1)) * chartWidth;
    const y = padding + (1 - (point.price - minPrice) / (maxPrice - minPrice)) * chartHeight;
    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  // Create area fill path
  const areaData = pathData + 
    ` L ${padding + chartWidth} ${padding + chartHeight}` +
    ` L ${padding} ${padding + chartHeight} Z`;

  return (
    <g>
      {/* Area Fill */}
      <path
        d={areaData}
        fill={`url(#gradient-${isPositive ? 'positive' : 'negative'})`}
        opacity="0.1"
      />
      
      {/* Price Line with responsive stroke width */}
      <path
        d={pathData}
        fill="none"
        stroke={isPositive ? "#10b981" : "#ef4444"}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Gradient Definitions */}
      <defs>
        <linearGradient id="gradient-positive" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.3"/>
          <stop offset="100%" stopColor="#10b981" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="gradient-negative" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3"/>
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0"/>
        </linearGradient>
      </defs>

      {/* Data Points with responsive radius */}
      {data.map((point, index) => {
        const x = padding + (index / (data.length - 1)) * chartWidth;
        const y = padding + (1 - (point.price - minPrice) / (maxPrice - minPrice)) * chartHeight;
        
        return (
          <circle
            key={index}
            cx={x}
            cy={y}
            r={pointRadius}
            fill={isPositive ? "#10b981" : "#ef4444"}
            opacity="0.7"
          />
        );
      })}
    </g>
  );
}

/**
 * Volume Bars Component
 */
function VolumeBars({
  data,
  width,
  height,
  yOffset,
}: {
  data: PricePoint[];
  width: number;
  height: number;
  yOffset: number;
}) {
  const padding = 20;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding;

  const volumes = data.map(p => p.volume || 0);
  const maxVolume = Math.max(...volumes);

  if (maxVolume === 0) return null;

  return (
    <g>
      {data.map((point, index) => {
        const x = padding + (index / (data.length - 1)) * chartWidth;
        const barHeight = ((point.volume || 0) / maxVolume) * chartHeight;
        const y = yOffset + chartHeight - barHeight;
        
        return (
          <rect
            key={index}
            x={x - 2}
            y={y}
            width="4"
            height={barHeight}
            fill="currentColor"
            opacity="0.3"
          />
        );
      })}
    </g>
  );
}