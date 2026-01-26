"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, Bookmark, AlertTriangle, Brain, Zap, Clock, TrendingDown, Activity, Minus } from "lucide-react";
import { MarketType, ProcessedOutcome } from "@/lib/polymarket-types";
import { 
    ProcessedMarket, 
    AIMarketInsights, 
    MarketOutcome as EnhancedMarketOutcome
} from "@/lib/enhanced-polymarket-types";
import { ErrorBoundary, MarketErrorFallback } from "@/components/error-boundary";
import { MarketImage } from "@/components/market-image";
import { LazyMarketImage } from "@/components/lazy-market-image";
import { RealtimePrice } from "@/components/realtime-price";
import { useRealtimePricesSafe } from "@/lib/realtime-context";
import { useState, useEffect, useRef } from "react";
import { 
    useScreenReader, 
    useAccessibilityPreferences, 
    useFocusManagement,
    AriaUtils 
} from "@/lib/accessibility";

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
    volatilityPrediction: 'low' | 'medium' | 'high';
    keyFactors: string[];
    recommendation?: 'buy' | 'sell' | 'hold';
    lastUpdated: number;
}

interface MarketCardProps {
    // Core market data - can accept either legacy or enhanced format
    market?: ProcessedMarket; // Enhanced format (preferred)
    
    // Legacy format support (for backward compatibility)
    id?: string;
    title?: string;
    image?: string;
    marketImage?: string; // Additional fallback image from market data
    volume?: string;
    outcomes?: Outcome[];
    isNew?: boolean;
    marketType?: MarketType;
    hasError?: boolean;
    errorMessage?: string;
    
    // Trading features
    showAIInsights?: boolean;
    aiInsights?: AIInsights | AIMarketInsights;
    enableRealTimeUpdates?: boolean;
    
    // Visual enhancements
    featured?: boolean;
    trending?: boolean;
    endDate?: string;
    
    // Series support (Requirements 13.3, 13.4)
    showSeriesInfo?: boolean;
    seriesTitle?: string;
    groupItemTitle?: string;
    
    // Event handlers
    onClick?: (marketSlug: string) => void;
    onSeriesClick?: (seriesSlug: string) => void;
}

/**
 * Enhanced MarketCard with comprehensive accessibility features and series support
 * Implements Requirements 1.2, 1.3, 1.4, 1.5, 1.6, 1.9, 1.10, 13.3, 13.4, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6
 */
export function MarketCard(props: MarketCardProps) {
    // Extract data from either enhanced market object or legacy props
    const market = props.market;
    const id = market?.id || props.id || `fallback-${Date.now()}`;
    const title = market?.title || props.title || "Market data unavailable";
    const image = market?.image || props.image || "";
    const marketImage = props.marketImage;
    const volume = market?.volumeFormatted || props.volume || "0";
    const outcomes = market?.outcomes || props.outcomes || getDefaultOutcomes(props.marketType);
    const isNew = market?.isNew || props.isNew || false;
    const marketType = props.marketType || 'simple';
    const hasError = props.hasError || false;
    const errorMessage = props.errorMessage;
    const showAIInsights = props.showAIInsights || false;
    const aiInsights = market?.aiInsights || props.aiInsights;
    const enableRealTimeUpdates = props.enableRealTimeUpdates ?? true;
    const featured = market?.featured || props.featured || false;
    const trending = props.trending || false;
    const endDate = market?.endDate || props.endDate;
    
    // Series support (Requirements 13.3, 13.4)
    const showSeriesInfo = props.showSeriesInfo || false;
    const seriesTitle = market?.seriesTitle || props.seriesTitle;
    const groupItemTitle = market?.groupItemTitle || props.groupItemTitle;
    
    // Local helper function to determine if this is a series market
    const isSeriesMarket = (market: ProcessedMarket): boolean => {
        return !!(market.groupItemTitle || market.seriesTitle);
    };
    
    const isSeriesMarketCard = market ? isSeriesMarket(market) : !!(seriesTitle || groupItemTitle);
    
    // Event handlers
    const onClick = props.onClick;
    const onSeriesClick = props.onSeriesClick;

    // Handle malformed or missing data with fallbacks
    const safeTitle = title || "Market data unavailable";
    const safeVolume = volume || "0";
    const safeOutcomes = outcomes && outcomes.length > 0 ? outcomes : getDefaultOutcomes(marketType);
    const safeId = id || `fallback-${Date.now()}`;

    // Accessibility hooks
    const { announce, announceMarketUpdate } = useScreenReader();
    const { reduceMotion, screenReader, keyboardNavigation } = useAccessibilityPreferences();
    const { saveFocus, restoreFocus } = useFocusManagement();

    // Real-time price subscription for outcomes with tokenIds
    const tokenIds = safeOutcomes.filter(o => o.tokenId).map(o => o.tokenId!);
    const { prices, isSubscribed } = useRealtimePricesSafe(enableRealTimeUpdates ? tokenIds : []);

    // Enhanced hover state for trading features
    const [isHovered, setIsHovered] = useState(false);
    const [priceUpdateFlash, setPriceUpdateFlash] = useState<string | null>(null);
    const [isFocused, setIsFocused] = useState(false);
    const cardRef = useRef<HTMLAnchorElement>(null);

    // Time until market ends
    const timeUntilEnd = endDate ? getTimeUntilEnd(endDate) : null;

    // Generate unique IDs for ARIA relationships
    const cardId = AriaUtils.generateId('market-card');
    const titleId = AriaUtils.generateId('market-title');
    const outcomesId = AriaUtils.generateId('market-outcomes');
    const volumeId = AriaUtils.generateId('market-volume');
    const seriesId = AriaUtils.generateId('series-info');

    // Track price changes for flash animations and announcements
    useEffect(() => {
        if (enableRealTimeUpdates && Object.keys(prices).length > 0) {
            // Flash animation for price updates (respect reduced motion)
            if (!reduceMotion) {
                setPriceUpdateFlash('price-flash');
                const timer = setTimeout(() => setPriceUpdateFlash(null), 1000);
                
                // Announce price changes to screen readers
                if (screenReader) {
                    const firstOutcome = safeOutcomes[0];
                    if (firstOutcome?.tokenId && prices[firstOutcome.tokenId]) {
                        const newPrice = prices[firstOutcome.tokenId].price * 100;
                        announceMarketUpdate(safeTitle, firstOutcome.probability, newPrice);
                    }
                }
                
                return () => clearTimeout(timer);
            }
        }
    }, [prices, enableRealTimeUpdates, reduceMotion, screenReader, safeTitle, safeOutcomes, announceMarketUpdate]);

    // Handle keyboard navigation
    const handleKeyDown = (event: React.KeyboardEvent) => {
        switch (event.key) {
            case 'Enter':
            case ' ':
                event.preventDefault();
                if (cardRef.current) {
                    // Determine navigation target based on series info
                    if (isSeriesMarketCard && onSeriesClick && market?.slug) {
                        onSeriesClick(market.slug);
                    } else if (onClick) {
                        const identifier = market?.slug || safeId;
                        onClick(identifier);
                    } else {
                        cardRef.current.click();
                    }
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
                isNew && "New market",
                featured && "Featured market", 
                trending && "Trending market",
                isSeriesMarketCard && "Part of series"
            ].filter(Boolean).join(", ");
            
            const seriesText = isSeriesMarketCard && seriesTitle ? `Series: ${seriesTitle}. ` : "";
            const groupText = groupItemTitle ? `Option: ${groupItemTitle}. ` : "";
            
            const announcement = `${seriesText}${groupText}Market: ${safeTitle}. Volume: ${safeVolume}. ${statusText}`;
            announce(announcement, 'low');
        }
    };

    const handleBlur = () => {
        setIsFocused(false);
    };

    // Handle click events
    const handleClick = (event: React.MouseEvent) => {
        event.preventDefault();
        
        // Determine the correct route and call appropriate handler
        if (isSeriesMarketCard && onSeriesClick && market?.slug) {
            onSeriesClick(market.slug);
        } else if (onClick) {
            // For regular markets, pass the slug if available, otherwise ID
            const identifier = market?.slug || safeId;
            onClick(identifier);
        }
        // If no custom handlers, let the Link handle navigation
    };

    // Create comprehensive ARIA label
    const createAriaLabel = () => {
        const statusParts = [];
        if (isNew) statusParts.push("New market");
        if (featured) statusParts.push("Featured market");
        if (trending) statusParts.push("Trending market");
        if (isSeriesMarketCard) statusParts.push("Part of series");
        
        const outcomesText = safeOutcomes.map(outcome => 
            AriaUtils.createProbabilityLabel(outcome.name, Math.round(outcome.probability))
        ).join(", ");
        
        const volumeText = AriaUtils.createVolumeLabel(safeVolume);
        const statusText = AriaUtils.createMarketStatusLabel(true, false, endDate);
        
        const seriesText = isSeriesMarketCard && seriesTitle ? `Series: ${seriesTitle}. ` : "";
        const groupText = groupItemTitle ? `Option: ${groupItemTitle}. ` : "";
        
        return [
            `${seriesText}${groupText}View market: ${safeTitle}`,
            volumeText,
            outcomesText,
            statusText,
            statusParts.join(", ")
        ].filter(Boolean).join(". ");
    };

    // If the market has critical errors, show error state
    if (hasError) {
        return (
            <Card 
                className="h-full border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20"
                role="alert"
                aria-live="polite"
            >
                <CardContent className="flex flex-col items-center justify-center p-6 text-center h-full min-h-[300px]">
                    <AlertTriangle 
                        className="h-8 w-8 text-red-500 mb-3" 
                        aria-hidden="true"
                    />
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

    // Only show active markets as requested
    if (market && !market.active) {
        return null;
    }

    // Determine the correct route based on market type and available data
    const getMarketRoute = () => {
        // If it's a series market and we have a slug, route to series
        if (isSeriesMarketCard && market?.slug) {
            return `/series/${market.slug}`;
        }
        
        // For regular markets, use slug if available, otherwise fall back to ID
        if (market?.slug) {
            return `/market/${market.slug}`;
        }
        
        // Fallback to ID-based routing (should be avoided in production)
        return `/market/${safeId}`;
    };

    return (
        <ErrorBoundary fallback={MarketErrorFallback} name="MarketCard">
            <Link 
                ref={cardRef}
                href={getMarketRoute()}
                className={cn(
                    "group block h-full cursor-pointer transition-all duration-200",
                    "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background",
                    keyboardNavigation && "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                    isFocused && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                )}
                aria-label={createAriaLabel()}
                aria-describedby={`${outcomesId} ${volumeId} ${isSeriesMarketCard ? seriesId : ''}`}
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
                        "h-full flex flex-col overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm",
                        !reduceMotion && "transition-all duration-300 hover:shadow-lg hover:-translate-y-1 transform-gpu",
                        reduceMotion && "transition-colors duration-200",
                        "focus-within:border-primary/50 focus-within:shadow-lg",
                        featured && "ring-2 ring-primary/20 border-primary/30",
                        trending && "bg-gradient-to-br from-card to-primary/5",
                        !reduceMotion && priceUpdateFlash && "animate-pulse bg-emerald-50/50 dark:bg-emerald-950/20",
                        isHovered && !reduceMotion && "shadow-xl shadow-primary/20"
                    )}
                    role="article"
                    aria-labelledby={titleId}
                >
                    {/* Market Image with Profile Picture Overlay */}
                    <div className="relative w-full h-32 bg-gray-100 dark:bg-gray-800 overflow-hidden">
                        <LazyMarketImage
                            eventImage={image}
                            marketImage={marketImage}
                            title={safeTitle}
                            className={cn(
                                "w-full h-full object-cover",
                                !reduceMotion && "transition-transform duration-300 group-hover:scale-105"
                            )}
                            priority={featured}
                            placeholder="gradient"
                            enableProgressiveLoading={true}
                            onImageError={(source) => {
                                if (process.env.NODE_ENV === 'development') {
                                    console.warn(`Failed to load ${source} image for market ${safeId}`);
                                }
                            }}
                        />
                        
                        {/* Profile Picture Overlay - Small circular image in top left */}
                        <div className="absolute top-3 left-3">
                            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white dark:border-gray-800 shadow-sm bg-white dark:bg-gray-800">
                                <LazyMarketImage
                                    eventImage={image}
                                    marketImage={marketImage}
                                    title={safeTitle}
                                    className="w-full h-full object-cover"
                                    placeholder="gradient"
                                />
                            </div>
                        </div>

                        {/* Probability Indicator - Top Right */}
                        <div className="absolute top-3 right-3">
                            <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-full px-3 py-1 shadow-sm">
                                <div className="text-center">
                                    <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                        {Math.round(safeOutcomes[0]?.probability || 50)}%
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
                                        chance
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Status badges */}
                        {(isNew || featured || trending) && (
                            <div className="absolute bottom-3 left-3 flex gap-1">
                                {isNew && (
                                    <div className="rounded-full bg-blue-600/90 px-2 py-1 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-md shadow-sm">
                                        New
                                    </div>
                                )}
                                {featured && (
                                    <div className="rounded-full bg-amber-500/90 px-2 py-1 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-md shadow-sm">
                                        Featured
                                    </div>
                                )}
                                {trending && (
                                    <div className="rounded-full bg-emerald-500/90 px-2 py-1 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-md shadow-sm flex items-center gap-1">
                                        <Zap className="h-3 w-3" />
                                        Hot
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Market Content */}
                    <CardContent className="flex-1 p-4 space-y-4">
                        {/* Market Title */}
                        <h3 
                            id={titleId}
                            className="text-base font-semibold leading-tight text-gray-900 dark:text-gray-100 line-clamp-2 group-hover:text-primary transition-colors"
                        >
                            {safeTitle}
                        </h3>

                        {/* Outcome Buttons */}
                        <div 
                            id={outcomesId}
                            className="grid grid-cols-2 gap-3"
                            role="region" 
                            aria-label="Market outcomes"
                        >
                            {safeOutcomes.slice(0, 2).map((outcome, idx) => {
                                const isYes = outcome.name.toLowerCase() === 'yes' || outcome.color === 'yes';
                                const probability = Math.round(outcome.probability || 50);
                                
                                return (
                                    <button
                                        key={idx}
                                        className={cn(
                                            "flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all duration-200 cursor-pointer",
                                            isYes 
                                                ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-900/50" 
                                                : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-900/50"
                                        )}
                                        aria-label={`${outcome.name} - ${probability}% probability`}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            // Handle outcome click if needed
                                        }}
                                    >
                                        {outcome.name}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Bottom Row - Volume and Bookmark */}
                        <div className="flex items-center justify-between pt-2">
                            <div 
                                id={volumeId}
                                className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400"
                                aria-label={`Volume: ${safeVolume}`}
                            >
                                <TrendingUp className="h-4 w-4" />
                                <span>{safeVolume} Vol</span>
                            </div>
                            
                            <button
                                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                aria-label="Bookmark market"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    // Handle bookmark click
                                }}
                            >
                                <Bookmark className="h-5 w-5" />
                            </button>
                        </div>

                        {/* AI Insights (if enabled and hovered) */}
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
 * AI Insights Indicator Component - Enhanced for accessibility and trading features
 * Implements Requirements 12.1, 12.2, 12.3, 12.4
 */
function AIInsightsIndicator({ 
    insights, 
    isHovered, 
    reduceMotion = false 
}: { 
    insights: AIInsights | AIMarketInsights; 
    isHovered: boolean;
    reduceMotion?: boolean;
}) {
    // Handle both legacy and enhanced AI insights formats
    const confidence = insights.confidence;
    const riskLevel = 'volatilityPrediction' in insights ? insights.volatilityPrediction : 'medium';
    const recommendation = 'recommendation' in insights ? insights.recommendation : undefined;
    
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

    const getRecommendationIcon = (rec?: string) => {
        switch (rec) {
            case 'buy': return <TrendingUp className="h-2.5 w-2.5 text-emerald-500" aria-hidden="true" />;
            case 'sell': return <TrendingDown className="h-2.5 w-2.5 text-red-500" aria-hidden="true" />;
            case 'hold': return <Minus className="h-2.5 w-2.5 text-yellow-500" aria-hidden="true" />;
            default: return null;
        }
    };

    const getConfidenceLevel = (confidence: number) => {
        if (confidence >= 80) return 'High';
        if (confidence >= 60) return 'Medium';
        return 'Low';
    };

    const createAriaLabel = () => {
        const confidenceLevel = getConfidenceLevel(confidence);
        const parts = [
            `AI analysis available`,
            `Confidence: ${confidenceLevel} at ${confidence}%`,
            `Risk level: ${riskLevel}`
        ];
        
        if (recommendation) {
            parts.push(`Recommendation: ${recommendation}`);
        }
        
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
                        getConfidenceColor(confidence)
                    )} 
                    aria-hidden="true"
                />
                {isHovered && (
                    <div className="flex items-center gap-2 text-[10px] text-white">
                        <span className="font-medium" aria-label={`${confidence}% confidence`}>
                            {confidence}%
                        </span>
                        <span 
                            className={cn("font-bold", getRiskColor(riskLevel))}
                            aria-label={`${riskLevel} risk level`}
                        >
                            {riskLevel.toUpperCase()}
                        </span>
                        {recommendation && (
                            <span aria-label={`Recommendation: ${recommendation}`}>
                                {getRecommendationIcon(recommendation)}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * AI Insights Summary Component - Enhanced for trading features
 */
function AIInsightsSummary({ insights }: { insights: AIInsights | AIMarketInsights }) {
    // Handle both legacy and enhanced AI insights formats
    const confidence = insights.confidence;
    const riskLevel = 'volatilityPrediction' in insights ? insights.volatilityPrediction : 'medium';
    const recommendation = 'recommendation' in insights ? insights.recommendation : undefined;
    const keyFactors = insights.keyFactors;
    const lastUpdated = insights.lastUpdated;
    
    const getRecommendationColor = (rec?: string) => {
        switch (rec) {
            case 'buy': return 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-800';
            case 'sell': return 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/30 dark:border-red-800';
            case 'hold': return 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-950/30 dark:border-yellow-800';
            default: return 'text-gray-600 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-gray-950/30 dark:border-gray-800';
        }
    };

    const getConfidenceLevel = (confidence: number) => {
        if (confidence >= 80) return { label: 'High', color: 'text-emerald-600 dark:text-emerald-400' };
        if (confidence >= 60) return { label: 'Medium', color: 'text-yellow-600 dark:text-yellow-400' };
        return { label: 'Low', color: 'text-red-600 dark:text-red-400' };
    };

    const confidenceLevel = getConfidenceLevel(confidence);
    const timeSinceUpdate = Date.now() - lastUpdated;
    const isRecent = timeSinceUpdate < 300000; // 5 minutes

    return (
        <div className="p-3 bg-muted/50 rounded-lg border border-border/30 space-y-3 backdrop-blur-sm">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">AI Analysis</span>
                    {isRecent && (
                        <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
                    )}
                </div>
                <div className="text-xs text-muted-foreground">
                    <span className={confidenceLevel.color}>{confidenceLevel.label}</span>
                    <span className="ml-1">({confidence}%)</span>
                </div>
            </div>
            
            <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                    Risk Level: <span className={cn(
                        "font-medium",
                        riskLevel === 'low' ? 'text-emerald-600 dark:text-emerald-400' :
                        riskLevel === 'medium' ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-red-600 dark:text-red-400'
                    )}>
                        {riskLevel.toUpperCase()}
                    </span>
                </div>
                
                {recommendation && (
                    <div className={cn(
                        "px-2 py-1 rounded-md text-xs font-bold text-center border",
                        getRecommendationColor(recommendation)
                    )}>
                        {recommendation.toUpperCase()}
                    </div>
                )}
            </div>
            
            {keyFactors.length > 0 && (
                <div className="space-y-1">
                    <div className="text-xs font-medium text-foreground">Key Factors:</div>
                    <div className="text-xs text-muted-foreground leading-relaxed">
                        {keyFactors.slice(0, 3).map((factor, idx) => (
                            <div key={idx} className="flex items-start gap-1">
                                <span className="text-primary">•</span>
                                <span>{factor}</span>
                            </div>
                        ))}
                        {keyFactors.length > 3 && (
                            <div className="text-xs text-muted-foreground/70 mt-1">
                                +{keyFactors.length - 3} more factors
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            <div className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
                <Clock className="h-2.5 w-2.5" />
                Updated {formatTimeAgo(lastUpdated)}
            </div>
        </div>
    );
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

/**
 * Renders outcomes for simple markets (Yes/No format) with comprehensive accessibility
 * Enhanced with error handling for malformed outcome data and real-time updates
 * Implements Requirements 1.2, 1.3, 1.4, 1.6, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6
 */
function SimpleMarketOutcomes({ 
    outcomes, 
    prices = {}, 
    enableRealTimeUpdates = true,
    reduceMotion = false
}: { 
    outcomes: Outcome[];
    prices?: Record<string, any>;
    enableRealTimeUpdates?: boolean;
    reduceMotion?: boolean;
}) {
    // Ensure we have valid outcomes
    const safeOutcomes = outcomes && outcomes.length > 0 ? outcomes : [
        { name: 'Yes', probability: 50, color: 'yes' as const },
        { name: 'No', probability: 50, color: 'no' as const }
    ];

    return (
        <div 
            className="space-y-2 sm:space-y-2.5" 
            role="list" 
            aria-label="Market outcomes with probabilities"
        >
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

                const probabilityId = AriaUtils.generateId('probability');
                const progressId = AriaUtils.generateId('progress');

                return (
                    <div key={idx} className="space-y-1 sm:space-y-1.5" role="listitem">
                        <div className="flex justify-between text-xs sm:text-sm">
                            <span className="font-medium text-muted-foreground">
                                {safeName}
                            </span>
                            <div className="flex items-center gap-1.5">
                                <span 
                                    id={probabilityId}
                                    className={cn(
                                        "font-bold font-mono",
                                        !reduceMotion && "transition-all duration-300",
                                        safeColor === 'yes' ? "text-emerald-600 dark:text-emerald-400" :
                                            safeColor === 'no' ? "text-red-600 dark:text-red-400" : "text-foreground",
                                        !reduceMotion && realtimePrice && "animate-pulse"
                                    )}
                                    aria-label={AriaUtils.createProbabilityLabel(safeName, Math.round(safeProbability))}
                                    role="status"
                                    aria-live="polite"
                                >
                                    {Math.round(safeProbability)}%
                                </span>
                                {priceChange !== undefined && (
                                    <PriceChangeIndicator 
                                        change={priceChange} 
                                        reduceMotion={reduceMotion}
                                    />
                                )}
                                {realtimePrice && (
                                    <div 
                                        className={cn(
                                            "h-2 w-2 bg-emerald-500 rounded-full",
                                            !reduceMotion && "animate-pulse"
                                        )}
                                        title="Live price updates"
                                        aria-label="Real-time price data available"
                                        role="status"
                                    />
                                )}
                            </div>
                        </div>
                        <div 
                            id={progressId}
                            className={cn(
                                "h-1.5 sm:h-2 w-full overflow-hidden rounded-full bg-secondary/60",
                                !reduceMotion && "group-hover:bg-secondary transition-colors duration-200"
                            )}
                            role="progressbar"
                            aria-valuenow={safeProbability}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-labelledby={probabilityId}
                            aria-describedby={probabilityId}
                        >
                            <div
                                className={cn(
                                    "h-full rounded-full",
                                    !reduceMotion && "transition-all duration-700 ease-out group-hover:shadow-sm",
                                    safeColor === 'yes' ? "bg-emerald-500 dark:bg-emerald-500 group-hover:bg-emerald-600 dark:group-hover:bg-emerald-400" :
                                        safeColor === 'no' ? "bg-red-500 dark:bg-red-500 group-hover:bg-red-600 dark:group-hover:bg-red-400" : "bg-primary group-hover:bg-primary/90",
                                    !reduceMotion && realtimePrice && "shadow-lg shadow-current/20"
                                )}
                                style={{ width: `${Math.min(Math.max(safeProbability, 0), 100)}%` }}
                                aria-hidden="true"
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/**
 * Renders outcomes for complex markets (Category + Yes/No format) with comprehensive accessibility
 * Enhanced with error handling for malformed outcome data and real-time updates
 * Implements Requirements 1.2, 1.3, 1.4, 1.6, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6
 */
function ComplexMarketOutcomes({ 
    outcomes, 
    prices = {}, 
    enableRealTimeUpdates = true,
    reduceMotion = false
}: { 
    outcomes: Outcome[];
    prices?: Record<string, any>;
    enableRealTimeUpdates?: boolean;
    reduceMotion?: boolean;
}) {
    // Ensure we have valid outcomes
    const safeOutcomes = outcomes && outcomes.length > 0 ? outcomes : [
        { name: 'Yes', probability: 50, color: 'yes' as const, category: 'Option A' },
        { name: 'Yes', probability: 50, color: 'yes' as const, category: 'Option B' }
    ];

    return (
        <div 
            className="space-y-2.5 sm:space-y-3" 
            role="list" 
            aria-label="Market outcome categories with probabilities"
        >
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

                const categoryId = AriaUtils.generateId('category');
                const probabilityId = AriaUtils.generateId('probability');
                const progressId = AriaUtils.generateId('progress');

                return (
                    <div key={idx} className="space-y-1 sm:space-y-1.5" role="listitem">
                        {/* Category title */}
                        <div className="flex items-center justify-between">
                            <span 
                                id={categoryId}
                                className="text-xs sm:text-sm font-medium text-foreground truncate"
                            >
                                {safeCategory}
                            </span>
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <span className="text-[10px] sm:text-xs text-muted-foreground">
                                    {safeName}
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <span 
                                        id={probabilityId}
                                        className={cn(
                                            "text-xs sm:text-sm font-bold font-mono",
                                            !reduceMotion && "transition-all duration-300",
                                            safeColor === 'yes' ? "text-emerald-600 dark:text-emerald-400" :
                                                safeColor === 'no' ? "text-red-600 dark:text-red-400" : "text-foreground",
                                            !reduceMotion && realtimePrice && "animate-pulse"
                                        )}
                                        aria-label={AriaUtils.createProbabilityLabel(`${safeCategory} ${safeName}`, Math.round(safeProbability))}
                                        role="status"
                                        aria-live="polite"
                                    >
                                        {Math.round(safeProbability)}%
                                    </span>
                                    {priceChange !== undefined && (
                                        <PriceChangeIndicator 
                                            change={priceChange} 
                                            reduceMotion={reduceMotion}
                                        />
                                    )}
                                    {realtimePrice && (
                                        <div 
                                            className={cn(
                                                "h-2 w-2 bg-emerald-500 rounded-full",
                                                !reduceMotion && "animate-pulse"
                                            )}
                                            title="Live price updates"
                                            aria-label="Real-time price data available"
                                            role="status"
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        {/* Probability bar */}
                        <div 
                            id={progressId}
                            className={cn(
                                "h-1.5 sm:h-2 w-full overflow-hidden rounded-full bg-secondary/60",
                                !reduceMotion && "group-hover:bg-secondary transition-colors duration-200"
                            )}
                            role="progressbar"
                            aria-valuenow={safeProbability}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-labelledby={`${categoryId} ${probabilityId}`}
                            aria-describedby={probabilityId}
                        >
                            <div
                                className={cn(
                                    "h-full rounded-full",
                                    !reduceMotion && "transition-all duration-700 ease-out group-hover:shadow-sm",
                                    safeColor === 'yes' ? "bg-emerald-500 dark:bg-emerald-500 group-hover:bg-emerald-600 dark:group-hover:bg-emerald-400" :
                                        safeColor === 'no' ? "bg-red-500 dark:bg-red-500 group-hover:bg-red-600 dark:group-hover:bg-red-400" : "bg-primary group-hover:bg-primary/90",
                                    !reduceMotion && realtimePrice && "shadow-lg shadow-current/20"
                                )}
                                style={{ width: `${Math.min(Math.max(safeProbability, 0), 100)}%` }}
                                aria-hidden="true"
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/**
 * Price Change Indicator Component - Enhanced for accessibility and trading features
 * Implements Requirements 12.1, 12.2, 12.3, 12.4, 12.5
 */
function PriceChangeIndicator({ 
    change, 
    reduceMotion = false 
}: { 
    change: number;
    reduceMotion?: boolean;
}) {
    const isPositive = change > 0;
    const isNegative = change < 0;
    
    if (change === 0) return null;
    
    const magnitude = Math.abs(change);
    const isSignificant = magnitude >= 5; // 5% or more is significant
    
    const ariaLabel = AriaUtils.createPriceChangeLabel(change);
    
    return (
        <span 
            className={cn(
                "text-[10px] font-bold flex items-center gap-0.5 px-1 py-0.5 rounded-md",
                !reduceMotion && "transition-all duration-200",
                isPositive ? "text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-950/30" : 
                            "text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-950/30",
                !reduceMotion && isSignificant && "animate-pulse shadow-sm"
            )}
            aria-label={ariaLabel}
            role="status"
            title={ariaLabel}
        >
            {isPositive ? (
                <TrendingUp className="h-2.5 w-2.5" aria-hidden="true" />
            ) : (
                <TrendingDown className="h-2.5 w-2.5" aria-hidden="true" />
            )}
            <span aria-hidden="true">{magnitude.toFixed(1)}%</span>
        </span>
    );
}
