"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { 
    TrendingUp, 
    Vote, 
    AlertTriangle, 
    Brain, 
    Zap, 
    Clock, 
    TrendingDown, 
    Activity, 
    Minus,
    ChevronRight,
    BarChart3,
    Users,
    Calendar
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
    showMarketPreviews?: boolean;
    maxMarketPreviews?: number;
    
    // Visual enhancements
    featured?: boolean;
    trending?: boolean;
    
    // Event handlers
    onClick?: (seriesSlug: string) => void;
    onMarketClick?: (marketSlug: string) => void;
}

/**
 * SeriesCard Component for Series-Based Markets
 * Implements Requirements 13.1, 13.2, 13.3, 13.6, 13.7
 */
export function SeriesCard({
    series,
    showAIInsights = false,
    enableRealTimeUpdates = true,
    compact = false,
    showMarketPreviews = true,
    maxMarketPreviews = 3,
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
    const cardRef = useRef<HTMLAnchorElement>(null);

    // Real-time price subscription for all markets in series
    const allTokenIds = series.markets
        .flatMap(market => market.outcomes?.filter(o => o.tokenId).map(o => o.tokenId!) || []);
    const { prices, isSubscribed } = useRealtimePricesSafe(enableRealTimeUpdates ? allTokenIds : []);

    // Time until series ends (earliest end date)
    const timeUntilEnd = series.endDate ? getTimeUntilEnd(series.endDate) : null;

    // Generate unique IDs for ARIA relationships
    const cardId = AriaUtils.generateId('series-card');
    const titleId = AriaUtils.generateId('series-title');
    const statsId = AriaUtils.generateId('series-stats');
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
                `${series.activeMarkets} active markets`
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
            `${series.marketCount} markets in series`,
            `${series.activeMarkets} active markets`,
            statusText,
            statusParts.join(", ")
        ].filter(Boolean).join(". ");
    };

    // Get preview markets for display
    const previewMarkets = showMarketPreviews 
        ? series.markets.slice(0, maxMarketPreviews)
        : [];

    return (
        <ErrorBoundary fallback={MarketErrorFallback} name="SeriesCard">
            <Link 
                ref={cardRef}
                href={`/series/${series.slug}`}
                className={cn(
                    "group block h-full cursor-pointer rounded-lg transition-all duration-200",
                    "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background",
                    keyboardNavigation && "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                    isFocused && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                )}
                aria-label={createAriaLabel()}
                aria-describedby={`${statsId} ${marketsId}`}
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
                        isHovered && !reduceMotion && "shadow-xl shadow-primary/20",
                        compact && "min-h-[200px]"
                    )}
                    role="article"
                    aria-labelledby={titleId}
                >
                    {/* Series Header with Image */}
                    <div className="relative aspect-[2/1] w-full overflow-hidden bg-muted">
                        <LazyMarketImage
                            eventImage={series.image}
                            title={series.title}
                            className={cn(
                                "w-full h-full",
                                !reduceMotion && "transition-transform duration-300 group-hover:scale-105"
                            )}
                            priority={featured}
                            placeholder="gradient"
                            enableProgressiveLoading={true}
                        />

                        {/* Status badges */}
                        <div className="absolute left-2 top-2 flex flex-col gap-1 max-w-[calc(100%-4rem)]">
                            <div 
                                className="rounded-full bg-blue-600/90 px-2 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white backdrop-blur-md shadow-sm"
                                aria-label="Series of markets"
                                role="status"
                            >
                                <span aria-hidden="true">Series</span>
                            </div>
                            {featured && (
                                <div 
                                    className="rounded-full bg-amber-500/90 px-2 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white backdrop-blur-md shadow-sm"
                                    aria-label="Featured series"
                                    role="status"
                                >
                                    <span aria-hidden="true">Featured</span>
                                </div>
                            )}
                            {trending && (
                                <div 
                                    className="rounded-full bg-emerald-500/90 px-2 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white backdrop-blur-md shadow-sm flex items-center gap-1"
                                    aria-label="Trending series with high activity"
                                    role="status"
                                >
                                    <Zap className="h-3 w-3" aria-hidden="true" />
                                    <span className="hidden xs:inline" aria-hidden="true">Trending</span>
                                    <span className="xs:hidden" aria-hidden="true">Hot</span>
                                </div>
                            )}
                        </div>

                        {/* Real-time update indicator */}
                        {enableRealTimeUpdates && isSubscribed && Object.keys(prices).length > 0 && (
                            <div className="absolute top-2 right-2">
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

                        {/* Series stats overlay */}
                        <div className="absolute bottom-2 right-2 flex flex-col gap-1 items-end max-w-[calc(100%-4rem)]">
                            <div 
                                className="rounded-md bg-black/70 px-2 py-1 text-[10px] sm:text-xs font-medium text-white backdrop-blur-sm flex items-center gap-1"
                                aria-label={AriaUtils.createVolumeLabel(series.totalVolumeFormatted)}
                                role="status"
                            >
                                <TrendingUp className="h-3 w-3" aria-hidden="true" />
                                <span className="truncate" aria-hidden="true">{series.totalVolumeFormatted}</span>
                            </div>
                            <div 
                                className="rounded-md bg-black/70 px-2 py-1 text-[10px] sm:text-xs font-medium text-white backdrop-blur-sm flex items-center gap-1"
                                aria-label={`${series.marketCount} markets in series`}
                                role="status"
                            >
                                <BarChart3 className="h-3 w-3" aria-hidden="true" />
                                <span aria-hidden="true">{series.marketCount} markets</span>
                            </div>
                            {timeUntilEnd && (
                                <div 
                                    className="rounded-md bg-black/70 px-2 py-1 text-[10px] sm:text-xs font-medium text-white backdrop-blur-sm flex items-center gap-1"
                                    aria-label={`Series ends in ${timeUntilEnd}`}
                                    role="status"
                                >
                                    <Clock className="h-3 w-3" aria-hidden="true" />
                                    <span aria-hidden="true">{timeUntilEnd}</span>
                                </div>
                            )}
                        </div>

                        {/* AI Insights indicator */}
                        {showAIInsights && series.seriesInsights && (
                            <div className="absolute top-2 right-2 z-10">
                                <SeriesAIInsightsIndicator 
                                    insights={series.seriesInsights} 
                                    isHovered={isHovered}
                                    reduceMotion={reduceMotion}
                                />
                            </div>
                        )}
                    </div>

                    <CardContent className="flex-1 p-3 sm:p-4 lg:p-5 space-y-3 sm:space-y-4">
                        {/* Series Title and Type */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <div className="h-1 w-1 bg-primary rounded-full" aria-hidden="true" />
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    {series.seriesType} • {series.recurrence}
                                </span>
                            </div>
                            <h3 
                                id={titleId}
                                className="line-clamp-2 text-sm sm:text-base lg:text-lg font-semibold leading-snug tracking-tight text-foreground group-hover:text-primary transition-colors"
                            >
                                {series.title}
                            </h3>
                            {series.description && (
                                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                                    {series.description}
                                </p>
                            )}
                        </div>

                        {/* Series Statistics */}
                        <div 
                            id={statsId}
                            className="grid grid-cols-3 gap-3 py-2 border-y border-border/30"
                            role="region"
                            aria-label="Series statistics"
                        >
                            <div className="text-center">
                                <div className="text-lg sm:text-xl font-bold text-foreground">
                                    {series.activeMarkets}
                                </div>
                                <div className="text-xs text-muted-foreground">Active</div>
                            </div>
                            <div className="text-center">
                                <div className="text-lg sm:text-xl font-bold text-foreground">
                                    {series.completedMarkets}
                                </div>
                                <div className="text-xs text-muted-foreground">Completed</div>
                            </div>
                            <div className="text-center">
                                <div className="text-lg sm:text-xl font-bold text-foreground">
                                    {series.upcomingMarkets}
                                </div>
                                <div className="text-xs text-muted-foreground">Upcoming</div>
                            </div>
                        </div>

                        {/* Market Previews */}
                        {showMarketPreviews && previewMarkets.length > 0 && (
                            <div 
                                id={marketsId}
                                className="space-y-2"
                                role="region"
                                aria-label="Market previews"
                            >
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-medium text-foreground">Markets</h4>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                </div>
                                <div className="space-y-2">
                                    {previewMarkets.map((market, idx) => (
                                        <MarketPreview 
                                            key={market.id}
                                            market={market}
                                            prices={prices}
                                            onClick={onMarketClick}
                                            compact={compact}
                                        />
                                    ))}
                                    {series.marketCount > maxMarketPreviews && (
                                        <div className="text-xs text-muted-foreground text-center py-1">
                                            +{series.marketCount - maxMarketPreviews} more markets
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

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
 * Market Preview Component for Series Cards
 */
function MarketPreview({ 
    market, 
    prices, 
    onClick, 
    compact = false 
}: { 
    market: ProcessedMarket;
    prices: Record<string, any>;
    onClick?: (marketSlug: string) => void;
    compact?: boolean;
}) {
    const handleClick = (event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        if (onClick) {
            onClick(market.slug);
        }
    };

    // Get primary outcome for display
    const primaryOutcome = market.outcomes?.[0];
    const realtimePrice = primaryOutcome?.tokenId && prices[primaryOutcome.tokenId];
    const currentProbability = realtimePrice?.price ? realtimePrice.price * 100 : primaryOutcome?.probability || 50;

    return (
        <div 
            className={cn(
                "flex items-center justify-between p-2 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer",
                compact && "p-1.5"
            )}
            onClick={handleClick}
            role="button"
            tabIndex={0}
        >
            <div className="flex-1 min-w-0">
                <div className={cn(
                    "font-medium text-foreground line-clamp-1",
                    compact ? "text-xs" : "text-sm"
                )}>
                    {market.groupItemTitle || market.title}
                </div>
                {market.groupItemTitle && (
                    <div className="text-xs text-muted-foreground line-clamp-1">
                        {market.title}
                    </div>
                )}
            </div>
            <div className="flex items-center gap-2 ml-2">
                {primaryOutcome && (
                    <div className="text-right">
                        <div className={cn(
                            "font-bold font-mono",
                            primaryOutcome.color === 'yes' ? "text-emerald-600 dark:text-emerald-400" :
                            primaryOutcome.color === 'no' ? "text-red-600 dark:text-red-400" : "text-foreground",
                            compact ? "text-xs" : "text-sm"
                        )}>
                            {Math.round(currentProbability)}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {primaryOutcome.name}
                        </div>
                    </div>
                )}
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
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