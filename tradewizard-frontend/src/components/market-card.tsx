"use client";

import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, Vote, AlertTriangle, Brain, Zap, Clock, TrendingDown } from "lucide-react";
import { MarketType, ProcessedOutcome } from "@/lib/polymarket-types";
import { ErrorBoundary, MarketErrorFallback } from "@/components/error-boundary";
import { MarketImage } from "@/components/market-image";
import { RealtimePrice } from "@/components/realtime-price";
import { useRealtimePricesSafe } from "@/lib/realtime-context";
import { useState, useEffect } from "react";

interface Outcome {
    name: string;
    probability: number;
    color: "yes" | "no" | "neutral";
    category?: string;
    tokenId?: string; // For real-time price updates
    priceChange24h?: number; // For change indicators
}

interface AIInsights {
    confidence: number; // 0-100
    riskLevel: 'low' | 'medium' | 'high';
    keyFactors: string[];
    recommendation?: 'buy' | 'sell' | 'hold';
    lastUpdated: number;
}

interface MarketCardProps {
    id: string;
    title: string;
    image: string;
    marketImage?: string; // Additional fallback image from market data
    volume: string;
    outcomes: Outcome[];
    isNew?: boolean;
    marketType?: MarketType;
    hasError?: boolean;
    errorMessage?: string;
    // Trading features
    showAIInsights?: boolean;
    aiInsights?: AIInsights;
    enableRealTimeUpdates?: boolean;
    // Visual enhancements
    featured?: boolean;
    trending?: boolean;
    endDate?: string;
}

/**
 * Enhanced MarketCard with comprehensive error handling, real-time updates, and AI insights
 * Implements Requirements 1.2, 1.3, 1.4, 1.5, 1.6
 */
export function MarketCard({ 
    id, 
    title, 
    image, 
    marketImage,
    volume, 
    outcomes, 
    isNew, 
    marketType = 'simple',
    hasError = false,
    errorMessage,
    showAIInsights = false,
    aiInsights,
    enableRealTimeUpdates = true,
    featured = false,
    trending = false,
    endDate
}: MarketCardProps) {
    // Handle malformed or missing data with fallbacks
    const safeTitle = title || "Market data unavailable";
    const safeVolume = volume || "0";
    const safeOutcomes = outcomes && outcomes.length > 0 ? outcomes : getDefaultOutcomes(marketType);
    const safeId = id || `fallback-${Date.now()}`;

    // Real-time price subscription for outcomes with tokenIds
    const tokenIds = safeOutcomes.filter(o => o.tokenId).map(o => o.tokenId!);
    const { prices } = useRealtimePricesSafe(enableRealTimeUpdates ? tokenIds : []);

    // Hover state for enhanced interactions
    const [isHovered, setIsHovered] = useState(false);

    // Time until market ends
    const timeUntilEnd = endDate ? getTimeUntilEnd(endDate) : null;

    // If the market has critical errors, show error state
    if (hasError) {
        return (
            <Card className="h-full border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
                <CardContent className="flex flex-col items-center justify-center p-6 text-center h-full min-h-[300px]">
                    <AlertTriangle className="h-8 w-8 text-red-500 mb-3" />
                    <h4 className="text-sm font-medium text-red-900 dark:text-red-100 mb-2">
                        Market Unavailable
                    </h4>
                    <p className="text-xs text-red-700 dark:text-red-300">
                        {errorMessage || "Unable to load market data"}
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <ErrorBoundary fallback={MarketErrorFallback}>
            <Link 
                href={`/market/${safeId}`} 
                className="group block h-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg"
                aria-label={`View market: ${safeTitle}. Volume: ${safeVolume}${isNew ? '. New market' : ''}`}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <Card className={cn(
                    "h-full flex flex-col overflow-hidden border-border/40 bg-card transition-all duration-300",
                    "hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 hover:bg-card/95",
                    "focus-within:border-primary/50 focus-within:shadow-lg",
                    featured && "ring-2 ring-primary/20 border-primary/30",
                    trending && "bg-gradient-to-br from-card to-primary/5"
                )}>
                    <div className="relative aspect-[1.91/1] w-full overflow-hidden bg-muted">
                        <MarketImage
                            eventImage={image}
                            marketImage={marketImage}
                            title={safeTitle}
                            className="w-full h-full transition-transform duration-300 group-hover:scale-105"
                            onImageError={(source) => {
                                if (process.env.NODE_ENV === 'development') {
                                    console.warn(`Failed to load ${source} image for market ${safeId}`);
                                }
                            }}
                        />

                        {/* Status badges */}
                        <div className="absolute left-1.5 sm:left-2 top-1.5 sm:top-2 flex flex-col gap-1">
                            {isNew && (
                                <div 
                                    className="rounded-full bg-blue-600/90 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md shadow-sm"
                                    aria-label="New market"
                                    role="status"
                                >
                                    New
                                </div>
                            )}
                            {featured && (
                                <div 
                                    className="rounded-full bg-amber-500/90 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md shadow-sm"
                                    aria-label="Featured market"
                                    role="status"
                                >
                                    Featured
                                </div>
                            )}
                            {trending && (
                                <div 
                                    className="rounded-full bg-emerald-500/90 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md shadow-sm flex items-center gap-0.5"
                                    aria-label="Trending market"
                                    role="status"
                                >
                                    <Zap className="h-2 w-2" />
                                    Trending
                                </div>
                            )}
                        </div>

                        {/* Volume and time info */}
                        <div className="absolute bottom-1.5 sm:bottom-2 right-1.5 sm:right-2 flex flex-col gap-1 items-end">
                            <div 
                                className="rounded-md bg-black/60 px-1 sm:px-1.5 py-0.5 text-[9px] sm:text-[10px] font-medium text-white backdrop-blur-sm flex items-center gap-0.5 sm:gap-1"
                                aria-label={`Trading volume: ${safeVolume}`}
                            >
                                <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3" aria-hidden="true" />
                                <span>{safeVolume}</span>
                            </div>
                            {timeUntilEnd && (
                                <div 
                                    className="rounded-md bg-black/60 px-1 sm:px-1.5 py-0.5 text-[9px] sm:text-[10px] font-medium text-white backdrop-blur-sm flex items-center gap-0.5 sm:gap-1"
                                    aria-label={`Time until market ends: ${timeUntilEnd}`}
                                >
                                    <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" aria-hidden="true" />
                                    <span>{timeUntilEnd}</span>
                                </div>
                            )}
                        </div>

                        {/* AI Insights indicator */}
                        {showAIInsights && aiInsights && (
                            <div className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2">
                                <AIInsightsIndicator insights={aiInsights} isHovered={isHovered} />
                            </div>
                        )}
                    </div>

                    <CardContent className="flex-1 p-3 sm:p-4 space-y-3 sm:space-y-4">
                        <h3 className="line-clamp-2 text-sm sm:text-base font-semibold leading-snug tracking-tight text-foreground group-hover:text-primary transition-colors">
                            {safeTitle}
                        </h3>

                        <div 
                            role="region" 
                            aria-label="Market outcomes and probabilities"
                        >
                            {marketType === 'simple' ? (
                                <SimpleMarketOutcomes 
                                    outcomes={safeOutcomes} 
                                    prices={prices}
                                    enableRealTimeUpdates={enableRealTimeUpdates}
                                />
                            ) : (
                                <ComplexMarketOutcomes 
                                    outcomes={safeOutcomes}
                                    prices={prices}
                                    enableRealTimeUpdates={enableRealTimeUpdates}
                                />
                            )}
                        </div>

                        {/* AI Insights summary */}
                        {showAIInsights && aiInsights && isHovered && (
                            <AIInsightsSummary insights={aiInsights} />
                        )}
                    </CardContent>
                </Card>
            </Link>
        </ErrorBoundary>
    );
}

/**
 * Generate default outcomes for fallback scenarios
 * Implements Requirements 9.2, 9.5
 */
function getDefaultOutcomes(marketType: MarketType = 'simple'): Outcome[] {
    if (marketType === 'simple') {
        return [
            { name: 'Yes', probability: 50, color: 'yes' },
            { name: 'No', probability: 50, color: 'no' }
        ];
    } else {
        return [
            { name: 'Yes', probability: 50, color: 'yes', category: 'Option A' },
            { name: 'Yes', probability: 50, color: 'yes', category: 'Option B' }
        ];
    }
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
        
        if (days > 0) return `${days}d`;
        if (hours > 0) return `${hours}h`;
        
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `${minutes}m`;
    } catch {
        return null;
    }
}

/**
 * AI Insights Indicator Component
 */
function AIInsightsIndicator({ insights, isHovered }: { insights: AIInsights; isHovered: boolean }) {
    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 80) return 'text-emerald-500';
        if (confidence >= 60) return 'text-yellow-500';
        return 'text-red-500';
    };

    const getRiskColor = (risk: string) => {
        switch (risk) {
            case 'low': return 'text-emerald-500';
            case 'medium': return 'text-yellow-500';
            case 'high': return 'text-red-500';
            default: return 'text-gray-500';
        }
    };

    return (
        <div className={cn(
            "rounded-full bg-black/60 backdrop-blur-sm transition-all duration-300",
            isHovered ? "px-2 py-1" : "p-1.5"
        )}>
            <div className="flex items-center gap-1">
                <Brain className={cn("h-3 w-3", getConfidenceColor(insights.confidence))} />
                {isHovered && (
                    <div className="flex items-center gap-1 text-[10px] text-white">
                        <span>{insights.confidence}%</span>
                        <span className={getRiskColor(insights.riskLevel)}>
                            {insights.riskLevel.toUpperCase()}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * AI Insights Summary Component
 */
function AIInsightsSummary({ insights }: { insights: AIInsights }) {
    const getRecommendationColor = (rec?: string) => {
        switch (rec) {
            case 'buy': return 'text-emerald-600 bg-emerald-50';
            case 'sell': return 'text-red-600 bg-red-50';
            case 'hold': return 'text-yellow-600 bg-yellow-50';
            default: return 'text-gray-600 bg-gray-50';
        }
    };

    return (
        <div className="p-2 bg-muted/50 rounded-md border border-border/30 space-y-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                    <Brain className="h-3 w-3 text-primary" />
                    <span className="text-xs font-medium">AI Analysis</span>
                </div>
                <div className="text-xs text-muted-foreground">
                    {insights.confidence}% confidence
                </div>
            </div>
            
            {insights.recommendation && (
                <div className={cn(
                    "px-2 py-1 rounded text-xs font-medium text-center",
                    getRecommendationColor(insights.recommendation)
                )}>
                    {insights.recommendation.toUpperCase()}
                </div>
            )}
            
            {insights.keyFactors.length > 0 && (
                <div className="text-xs text-muted-foreground">
                    Key: {insights.keyFactors.slice(0, 2).join(', ')}
                    {insights.keyFactors.length > 2 && '...'}
                </div>
            )}
        </div>
    );
}

/**
 * Renders outcomes for simple markets (Yes/No format)
 * Enhanced with error handling for malformed outcome data and real-time updates
 * Implements Requirements 1.2, 1.3, 1.4, 1.6
 */
function SimpleMarketOutcomes({ 
    outcomes, 
    prices = {}, 
    enableRealTimeUpdates = true 
}: { 
    outcomes: Outcome[];
    prices?: Record<string, any>;
    enableRealTimeUpdates?: boolean;
}) {
    // Ensure we have valid outcomes
    const safeOutcomes = outcomes && outcomes.length > 0 ? outcomes : [
        { name: 'Yes', probability: 50, color: 'yes' as const },
        { name: 'No', probability: 50, color: 'no' as const }
    ];

    return (
        <div className="space-y-2 sm:space-y-2.5" role="list" aria-label="Market outcomes">
            {safeOutcomes.map((outcome, idx) => {
                // Validate individual outcome data
                const safeName = outcome.name || `Option ${idx + 1}`;
                const safeColor = outcome.color || 'neutral';
                
                // Get real-time price if available
                const realtimePrice = enableRealTimeUpdates && outcome.tokenId && prices[outcome.tokenId];
                const currentProbability = realtimePrice?.price ? realtimePrice.price * 100 : outcome.probability;
                const priceChange = realtimePrice?.change24h || outcome.priceChange24h;
                
                const safeProbability = typeof currentProbability === 'number' && 
                                      !isNaN(currentProbability) && 
                                      currentProbability >= 0 && 
                                      currentProbability <= 100 
                                      ? currentProbability : 50;

                return (
                    <div key={idx} className="space-y-1 sm:space-y-1.5" role="listitem">
                        <div className="flex justify-between text-xs sm:text-sm">
                            <span className="font-medium text-muted-foreground">{safeName}</span>
                            <div className="flex items-center gap-1">
                                <span 
                                    className={cn(
                                        "font-bold font-mono transition-colors duration-200",
                                        safeColor === 'yes' ? "text-emerald-600 dark:text-emerald-400" :
                                            safeColor === 'no' ? "text-red-600 dark:text-red-400" : "text-foreground"
                                    )}
                                    aria-label={`${safeName} probability: ${Math.round(safeProbability)} percent`}
                                >
                                    {Math.round(safeProbability)}%
                                </span>
                                {priceChange !== undefined && (
                                    <PriceChangeIndicator change={priceChange} />
                                )}
                            </div>
                        </div>
                        <div 
                            className="h-1.5 sm:h-2 w-full overflow-hidden rounded-full bg-secondary/60 group-hover:bg-secondary transition-colors duration-200"
                            role="progressbar"
                            aria-valuenow={safeProbability}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${safeName} probability bar`}
                        >
                            <div
                                className={cn(
                                    "h-full rounded-full transition-all duration-700 ease-out group-hover:shadow-sm",
                                    safeColor === 'yes' ? "bg-emerald-500 dark:bg-emerald-500 group-hover:bg-emerald-600 dark:group-hover:bg-emerald-400" :
                                        safeColor === 'no' ? "bg-red-500 dark:bg-red-500 group-hover:bg-red-600 dark:group-hover:bg-red-400" : "bg-primary group-hover:bg-primary/90",
                                    realtimePrice && "animate-pulse"
                                )}
                                style={{ width: `${Math.min(Math.max(safeProbability, 0), 100)}%` }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/**
 * Renders outcomes for complex markets (Category + Yes/No format)
 * Enhanced with error handling for malformed outcome data and real-time updates
 * Implements Requirements 1.2, 1.3, 1.4, 1.6
 */
function ComplexMarketOutcomes({ 
    outcomes, 
    prices = {}, 
    enableRealTimeUpdates = true 
}: { 
    outcomes: Outcome[];
    prices?: Record<string, any>;
    enableRealTimeUpdates?: boolean;
}) {
    // Ensure we have valid outcomes
    const safeOutcomes = outcomes && outcomes.length > 0 ? outcomes : [
        { name: 'Yes', probability: 50, color: 'yes' as const, category: 'Option A' },
        { name: 'Yes', probability: 50, color: 'yes' as const, category: 'Option B' }
    ];

    return (
        <div className="space-y-2.5 sm:space-y-3" role="list" aria-label="Market outcome categories">
            {safeOutcomes.map((outcome, idx) => {
                // Validate individual outcome data
                const safeName = outcome.name || 'Yes';
                const safeColor = outcome.color || 'yes';
                const safeCategory = outcome.category || `Option ${idx + 1}`;
                
                // Get real-time price if available
                const realtimePrice = enableRealTimeUpdates && outcome.tokenId && prices[outcome.tokenId];
                const currentProbability = realtimePrice?.price ? realtimePrice.price * 100 : outcome.probability;
                const priceChange = realtimePrice?.change24h || outcome.priceChange24h;
                
                const safeProbability = typeof currentProbability === 'number' && 
                                      !isNaN(currentProbability) && 
                                      currentProbability >= 0 && 
                                      currentProbability <= 100 
                                      ? currentProbability : 50;

                return (
                    <div key={idx} className="space-y-1 sm:space-y-1.5" role="listitem">
                        {/* Category title */}
                        <div className="flex items-center justify-between">
                            <span className="text-xs sm:text-sm font-medium text-foreground truncate">
                                {safeCategory}
                            </span>
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <span className="text-[10px] sm:text-xs text-muted-foreground">{safeName}</span>
                                <div className="flex items-center gap-1">
                                    <span 
                                        className={cn(
                                            "text-xs sm:text-sm font-bold font-mono transition-colors duration-200",
                                            safeColor === 'yes' ? "text-emerald-600 dark:text-emerald-400" :
                                                safeColor === 'no' ? "text-red-600 dark:text-red-400" : "text-foreground"
                                        )}
                                        aria-label={`${safeCategory} ${safeName} probability: ${Math.round(safeProbability)} percent`}
                                    >
                                        {Math.round(safeProbability)}%
                                    </span>
                                    {priceChange !== undefined && (
                                        <PriceChangeIndicator change={priceChange} />
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        {/* Probability bar */}
                        <div 
                            className="h-1.5 sm:h-2 w-full overflow-hidden rounded-full bg-secondary/60 group-hover:bg-secondary transition-colors duration-200"
                            role="progressbar"
                            aria-valuenow={safeProbability}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${safeCategory} ${safeName} probability bar`}
                        >
                            <div
                                className={cn(
                                    "h-full rounded-full transition-all duration-700 ease-out group-hover:shadow-sm",
                                    safeColor === 'yes' ? "bg-emerald-500 dark:bg-emerald-500 group-hover:bg-emerald-600 dark:group-hover:bg-emerald-400" :
                                        safeColor === 'no' ? "bg-red-500 dark:bg-red-500 group-hover:bg-red-600 dark:group-hover:bg-red-400" : "bg-primary group-hover:bg-primary/90",
                                    realtimePrice && "animate-pulse"
                                )}
                                style={{ width: `${Math.min(Math.max(safeProbability, 0), 100)}%` }}
                            />
                        </div>
                    </div>
                );
            })}
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
            "text-[10px] font-medium flex items-center gap-0.5",
            isPositive ? "text-emerald-600" : "text-red-600"
        )}>
            {isPositive ? (
                <TrendingUp className="h-2.5 w-2.5" />
            ) : (
                <TrendingDown className="h-2.5 w-2.5" />
            )}
            {Math.abs(change).toFixed(1)}%
        </span>
    );
}
