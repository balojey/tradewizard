"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { 
    TrendingUp, 
    Brain, 
    Zap, 
    Clock, 
    Activity, 
    BarChart3,
    Bookmark,
    RefreshCw
} from "lucide-react";
import { 
    ProcessedSeries, 
    ProcessedMarket, 
    SeriesAIInsights,
    isSeriesMarket 
} from "@/lib/enhanced-polymarket-types";
import { ErrorBoundary, MarketErrorFallback } from "@/components/error-boundary";
import { LazyMarketImage } from "@/components/lazy-market-image";
import { useRealtimePricesSafe } from "@/lib/realtime-context";
import { useState, useEffect, useRef } from "react";
import { 
    useScreenReader, 
    useAccessibilityPreferences, 
    useFocusManagement,
    AriaUtils 
} from "@/lib/accessibility";

interface SeriesCardProps {
    // Core series data
    series: ProcessedSeries;
    
    // Display options
    showAIInsights?: boolean;
    enableRealTimeUpdates?: boolean;
    compact?: boolean;
    
    // Visual enhancements
    featured?: boolean;
    trending?: boolean;
    
    // Event handlers
    onClick?: (seriesSlug: string) => void;
    onMarketClick?: (marketSlug: string) => void;
}

/**
 * SeriesCard Component for Series-Based Markets
 * Professional implementation matching the exact Fed decision structure
 * Implements Requirements 13.1, 13.2, 13.3, 13.6, 13.7
 */
export function SeriesCard({
    series,
    showAIInsights = false,
    enableRealTimeUpdates = true,
    compact = false,
    featured = false,
    trending = false,
    onClick,
    onMarketClick,
}: SeriesCardProps) {
    // Accessibility hooks
    const { announce, announceMarketUpdate } = useScreenReader();
    const { reduceMotion, screenReader, keyboardNavigation } = useAccessibilityPreferences();
    const { saveFocus, restoreFocus } = useFocusManagement();

    // Enhanced hover state for trading features
    const [isHovered, setIsHovered] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const cardRef = useRef<HTMLAnchorElement>(null);

    // Filter to only show active markets
    const activeMarkets = series.markets.filter(market => market.active && !market.closed);

    // Real-time price subscription for active markets only
    const allTokenIds = activeMarkets
        .flatMap(market => market.outcomes?.filter(o => o.tokenId).map(o => o.tokenId!) || []);
    const { prices, isSubscribed } = useRealtimePricesSafe(enableRealTimeUpdates ? allTokenIds : []);

    // Time until series ends (earliest end date)
    const timeUntilEnd = series.endDate ? getTimeUntilEnd(series.endDate) : null;

    // Generate unique IDs for ARIA relationships
    const cardId = AriaUtils.generateId('series-card');
    const titleId = AriaUtils.generateId('series-title');
    const marketsId = AriaUtils.generateId('series-markets');

    // Handle keyboard navigation
    const handleKeyDown = (event: React.KeyboardEvent) => {
        switch (event.key) {
            case 'Enter':
            case ' ':
                event.preventDefault();
                if (onClick) {
                    onClick(series.slug);
                } else if (cardRef.current) {
                    cardRef.current.click();
                }
                break;
            case 'Escape':
                if (cardRef.current) {
                    cardRef.current.blur();
                }
                break;
        }
    };

    // Handle focus events for accessibility
    const handleFocus = () => {
        setIsFocused(true);
        if (screenReader) {
            const statusText = [
                featured && "Featured series",
                trending && "Trending series",
                `${activeMarkets.length} active markets`
            ].filter(Boolean).join(", ");
            
            const announcement = `Series: ${series.title}. Total volume: ${series.totalVolumeFormatted}. ${statusText}`;
            announce(announcement, 'low');
        }
    };

    const handleBlur = () => {
        setIsFocused(false);
    };

    // Handle click events
    const handleClick = (event: React.MouseEvent) => {
        event.preventDefault();
        if (onClick) {
            onClick(series.slug);
        }
    };

    // Handle bookmark toggle
    const handleBookmarkClick = (event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        setIsBookmarked(!isBookmarked);
    };

    // Create comprehensive ARIA label
    const createAriaLabel = () => {
        const statusParts = [];
        if (featured) statusParts.push("Featured series");
        if (trending) statusParts.push("Trending series");
        
        const volumeText = AriaUtils.createVolumeLabel(series.totalVolumeFormatted);
        const statusText = AriaUtils.createMarketStatusLabel(series.active, false, series.endDate);
        
        return [
            `View series: ${series.title}`,
            volumeText,
            `${activeMarkets.length} active markets`,
            statusText,
            statusParts.join(", ")
        ].filter(Boolean).join(". ");
    };

    return (
        <ErrorBoundary fallback={MarketErrorFallback} name="SeriesCard">
            <Link 
                ref={cardRef}
                href={`/series/${series.slug}`}
                className={cn(
                    "group block h-full cursor-pointer transition-all duration-200",
                    "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background",
                    keyboardNavigation && "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                    isFocused && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                )}
                aria-label={createAriaLabel()}
                aria-describedby={marketsId}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                onClick={handleClick}
                role="link"
                tabIndex={0}
            >
                <Card 
                    id={cardId}
                    className={cn(
                        "h-full flex flex-col overflow-hidden border-border/40 bg-card",
                        !reduceMotion && "transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 hover:bg-card/95 group-hover:scale-[1.02] transform-gpu",
                        reduceMotion && "transition-colors duration-200 hover:border-primary/50",
                        "focus-within:border-primary/50 focus-within:shadow-lg",
                        featured && "ring-2 ring-primary/20 border-primary/30",
                        trending && "bg-gradient-to-br from-card to-primary/5",
                        isHovered && !reduceMotion && "shadow-xl shadow-primary/20"
                    )}
                    role="article"
                    aria-labelledby={titleId}
                >
                    {/* Series Header with Image and Title */}
                    <div className="relative">
                        <div className="flex items-center gap-3 p-4 pb-3">
                            {/* Series Image */}
                            <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                                <LazyMarketImage
                                    eventImage={series.image}
                                    title={series.title}
                                    className="w-full h-full object-cover"
                                    priority={featured}
                                    placeholder="gradient"
                                    enableProgressiveLoading={true}
                                />
                            </div>

                            {/* Series Title and Info */}
                            <div className="flex-1 min-w-0">
                                <h3 
                                    id={titleId}
                                    className="text-lg font-semibold leading-tight text-foreground group-hover:text-primary transition-colors line-clamp-2"
                                >
                                    {series.title}
                                </h3>
                            </div>
                        </div>

                        {/* Status badges */}
                        <div className="absolute top-2 right-2 flex flex-col gap-1">
                            {featured && (
                                <div 
                                    className="rounded-full bg-amber-500/90 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md shadow-sm"
                                    aria-label="Featured series"
                                    role="status"
                                >
                                    <span aria-hidden="true">Featured</span>
                                </div>
                            )}
                            {trending && (
                                <div 
                                    className="rounded-full bg-emerald-500/90 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md shadow-sm flex items-center gap-1"
                                    aria-label="Trending series with high activity"
                                    role="status"
                                >
                                    <Zap className="h-3 w-3" aria-hidden="true" />
                                    <span aria-hidden="true">Hot</span>
                                </div>
                            )}
                        </div>

                        {/* Real-time update indicator */}
                        {enableRealTimeUpdates && isSubscribed && Object.keys(prices).length > 0 && (
                            <div className="absolute top-2 left-2">
                                <div 
                                    className={cn(
                                        "rounded-full bg-emerald-500/90 p-1.5 backdrop-blur-sm shadow-sm",
                                        !reduceMotion && "animate-pulse"
                                    )}
                                    aria-label="Live price updates active"
                                    role="status"
                                >
                                    <Activity className="h-3 w-3 text-white" aria-hidden="true" />
                                </div>
                            </div>
                        )}

                        {/* AI Insights indicator */}
                        {showAIInsights && series.seriesInsights && (
                            <div className="absolute top-12 right-2">
                                <SeriesAIInsightsIndicator 
                                    insights={series.seriesInsights} 
                                    isHovered={isHovered}
                                    reduceMotion={reduceMotion}
                                />
                            </div>
                        )}
                    </div>

                    <CardContent className="flex-1 p-4 pt-0 space-y-3">
                        {/* Active Markets List */}
                        {activeMarkets.length > 0 && (
                            <div 
                                id={marketsId}
                                className="space-y-2"
                                role="region"
                                aria-label="Active markets in series"
                            >
                                {activeMarkets.slice(0, 4).map((market, idx) => (
                                    <SeriesMarketRow 
                                        key={market.id}
                                        market={market}
                                        prices={prices}
                                        onClick={onMarketClick}
                                        isLast={idx === Math.min(activeMarkets.length - 1, 3)}
                                    />
                                ))}
                                {activeMarkets.length > 4 && (
                                    <div className="text-xs text-muted-foreground text-center py-2 border-t border-border/30">
                                        +{activeMarkets.length - 4} more markets
                                    </div>
                                )}
                            </div>
                        )}

                        {/* No Active Markets State */}
                        {activeMarkets.length === 0 && (
                            <div className="text-center py-6 text-muted-foreground">
                                <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No active markets</p>
                                <p className="text-xs mt-1">{series.completedMarkets} completed</p>
                            </div>
                        )}

                        {/* Series Footer */}
                        <div className="flex items-center justify-between pt-3 border-t border-border/30">
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div 
                                    className="flex items-center gap-1"
                                    aria-label={AriaUtils.createVolumeLabel(series.totalVolumeFormatted)}
                                >
                                    <TrendingUp className="h-4 w-4" aria-hidden="true" />
                                    <span className="font-medium" aria-hidden="true">{series.totalVolumeFormatted} Vol</span>
                                </div>
                                <div 
                                    className="flex items-center gap-1"
                                    aria-label={`Series recurrence: ${series.recurrence}`}
                                >
                                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                                    <span aria-hidden="true">{series.recurrence}</span>
                                </div>
                            </div>
                            
                            <button
                                onClick={handleBookmarkClick}
                                className={cn(
                                    "p-2 rounded-md transition-colors hover:bg-muted",
                                    isBookmarked ? "text-primary" : "text-muted-foreground"
                                )}
                                aria-label={isBookmarked ? "Remove from bookmarks" : "Add to bookmarks"}
                            >
                                <Bookmark 
                                    className={cn(
                                        "h-4 w-4",
                                        isBookmarked && "fill-current"
                                    )} 
                                />
                            </button>
                        </div>

                        {/* AI Insights summary */}
                        {showAIInsights && series.seriesInsights && isHovered && (
                            <SeriesAIInsightsSummary insights={series.seriesInsights} />
                        )}
                    </CardContent>
                </Card>
            </Link>
        </ErrorBoundary>
    );
}

/**
 * Series Market Row Component - Matches Fed Decision Structure
 * Displays individual markets within a series in the exact format shown in the image
 */
function SeriesMarketRow({ 
    market, 
    prices, 
    onClick, 
    isLast = false 
}: { 
    market: ProcessedMarket;
    prices: Record<string, any>;
    onClick?: (marketSlug: string) => void;
    isLast?: boolean;
}) {
    const handleClick = (event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        if (onClick) {
            onClick(market.slug);
        }
    };

    // Get the primary outcome (usually "Yes") and secondary outcome (usually "No")
    const yesOutcome = market.outcomes?.find(o => o.color === 'yes' || o.name.toLowerCase().includes('yes'));
    const noOutcome = market.outcomes?.find(o => o.color === 'no' || o.name.toLowerCase().includes('no'));
    
    // Use the first outcome if we can't find yes/no specifically
    const primaryOutcome = yesOutcome || market.outcomes?.[0];
    const secondaryOutcome = noOutcome || market.outcomes?.[1];

    // Get real-time price if available
    const realtimePrice = primaryOutcome?.tokenId && prices[primaryOutcome.tokenId];
    const currentProbability = realtimePrice?.price ? realtimePrice.price * 100 : primaryOutcome?.probability || 50;

    // Format probability display
    const formatProbability = (prob: number) => {
        if (prob < 1) return '<1%';
        if (prob > 99) return '>99%';
        return `${Math.round(prob)}%`;
    };

    return (
        <div 
            className={cn(
                "flex items-center justify-between py-3 cursor-pointer hover:bg-muted/30 transition-colors rounded-md px-2",
                !isLast && "border-b border-border/20"
            )}
            onClick={handleClick}
            role="button"
            tabIndex={0}
        >
            {/* Market Title and Probability */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                    <div className="font-medium text-foreground text-sm line-clamp-1 flex-1 mr-4">
                        {market.groupItemTitle || market.title}
                    </div>
                    <div className="text-sm font-medium text-muted-foreground">
                        {formatProbability(currentProbability)}
                    </div>
                </div>
            </div>

            {/* Yes/No Buttons */}
            <div className="flex items-center gap-2 ml-4">
                {/* Yes Button */}
                <button
                    className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-md text-sm font-medium hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
                    onClick={(e) => {
                        e.stopPropagation();
                        // Handle Yes button click
                    }}
                    aria-label={`Buy Yes for ${market.groupItemTitle || market.title}`}
                >
                    Yes
                </button>

                {/* No Button */}
                <button
                    className="px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md text-sm font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                    onClick={(e) => {
                        e.stopPropagation();
                        // Handle No button click
                    }}
                    aria-label={`Buy No for ${market.groupItemTitle || market.title}`}
                >
                    No
                </button>
            </div>
        </div>
    );
}

/**
 * Series AI Insights Indicator Component
 */
function SeriesAIInsightsIndicator({ 
    insights, 
    isHovered, 
    reduceMotion = false 
}: { 
    insights: SeriesAIInsights; 
    isHovered: boolean;
    reduceMotion?: boolean;
}) {
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

    const getConfidenceLevel = (confidence: number) => {
        if (confidence >= 80) return 'High';
        if (confidence >= 60) return 'Medium';
        return 'Low';
    };

    const createAriaLabel = () => {
        const confidenceLevel = getConfidenceLevel(insights.confidence);
        const parts = [
            `Series AI analysis available`,
            `Confidence: ${confidenceLevel} at ${insights.confidence}%`,
            `Risk level: ${insights.seriesRisk}`
        ];
        
        return parts.join(", ");
    };

    return (
        <div 
            className={cn(
                "rounded-full bg-black/60 backdrop-blur-sm border border-white/10",
                !reduceMotion && "transition-all duration-300",
                isHovered ? "px-3 py-1.5 shadow-lg" : "p-1.5"
            )}
            role="status"
            aria-label={createAriaLabel()}
            tabIndex={0}
        >
            <div className="flex items-center gap-1.5">
                <Brain 
                    className={cn(
                        "h-3 w-3",
                        !reduceMotion && "transition-colors",
                        getConfidenceColor(insights.confidence)
                    )} 
                    aria-hidden="true"
                />
                {isHovered && (
                    <div className="flex items-center gap-2 text-[10px] text-white">
                        <span className="font-medium" aria-label={`${insights.confidence}% confidence`}>
                            {insights.confidence}%
                        </span>
                        <span 
                            className={cn("font-bold", getRiskColor(insights.seriesRisk))}
                            aria-label={`${insights.seriesRisk} risk level`}
                        >
                            {insights.seriesRisk.toUpperCase()}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * Series AI Insights Summary Component
 */
function SeriesAIInsightsSummary({ insights }: { insights: SeriesAIInsights }) {
    const getConfidenceLevel = (confidence: number) => {
        if (confidence >= 80) return { label: 'High', color: 'text-emerald-600 dark:text-emerald-400' };
        if (confidence >= 60) return { label: 'Medium', color: 'text-yellow-600 dark:text-yellow-400' };
        return { label: 'Low', color: 'text-red-600 dark:text-red-400' };
    };

    const confidenceLevel = getConfidenceLevel(insights.confidence);
    const timeSinceUpdate = Date.now() - insights.lastUpdated;
    const isRecent = timeSinceUpdate < 300000; // 5 minutes

    return (
        <div className="p-3 bg-muted/50 rounded-lg border border-border/30 space-y-3 backdrop-blur-sm">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">Series Analysis</span>
                    {isRecent && (
                        <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
                    )}
                </div>
                <div className="text-xs text-muted-foreground">
                    <span className={confidenceLevel.color}>{confidenceLevel.label}</span>
                    <span className="ml-1">({insights.confidence}%)</span>
                </div>
            </div>
            
            <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                    Series Risk: <span className={cn(
                        "font-medium",
                        insights.seriesRisk === 'low' ? 'text-emerald-600 dark:text-emerald-400' :
                        insights.seriesRisk === 'medium' ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-red-600 dark:text-red-400'
                    )}>
                        {insights.seriesRisk.toUpperCase()}
                    </span>
                </div>
                
                <div className="text-xs text-muted-foreground">
                    Trend: <span className={cn(
                        "font-medium",
                        insights.seriesTrend === 'bullish' ? 'text-emerald-600 dark:text-emerald-400' :
                        insights.seriesTrend === 'bearish' ? 'text-red-600 dark:text-red-400' :
                        'text-yellow-600 dark:text-yellow-400'
                    )}>
                        {insights.seriesTrend.toUpperCase()}
                    </span>
                </div>
            </div>
            
            <div className="space-y-1">
                <div className="text-xs font-medium text-foreground">Series Summary:</div>
                <div className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {insights.seriesSummary}
                </div>
            </div>
            
            <div className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
                <Clock className="h-2.5 w-2.5" />
                Updated {formatTimeAgo(insights.lastUpdated)}
            </div>
        </div>
    );
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
        
        if (days > 0) return `${days}d`;
        if (hours > 0) return `${hours}h`;
        
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `${minutes}m`;
    } catch {
        return null;
    }
}

/**
 * Format time ago helper
 */
function formatTimeAgo(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
}