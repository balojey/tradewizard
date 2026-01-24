"use client";

import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, Vote, AlertTriangle } from "lucide-react";
import { MarketType, ProcessedOutcome } from "@/lib/polymarket-types";
import { ErrorBoundary, MarketErrorFallback } from "@/components/error-boundary";
import { MarketImage } from "@/components/market-image";

interface Outcome {
    name: string;
    probability: number;
    color: "yes" | "no" | "neutral";
    category?: string;
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
}

/**
 * Enhanced MarketCard with comprehensive error handling and fallbacks
 * Implements Requirements 9.1, 9.2, 9.4, 9.5
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
    errorMessage
}: MarketCardProps) {
    // Handle malformed or missing data with fallbacks
    const safeTitle = title || "Market data unavailable";
    const safeVolume = volume || "0";
    const safeOutcomes = outcomes && outcomes.length > 0 ? outcomes : getDefaultOutcomes(marketType);
    const safeId = id || `fallback-${Date.now()}`;

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
            >
                <Card className="h-full flex flex-col overflow-hidden border-border/40 bg-card transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 hover:bg-card/95 focus-within:border-primary/50 focus-within:shadow-lg">
                    <div className="relative aspect-[1.91/1] w-full overflow-hidden bg-muted">
                        <MarketImage
                            eventImage={image}
                            marketImage={marketImage}
                            title={safeTitle}
                            className="w-full h-full"
                            onImageError={(source) => {
                                if (process.env.NODE_ENV === 'development') {
                                    console.warn(`Failed to load ${source} image for market ${safeId}`);
                                }
                            }}
                        />

                        {isNew && (
                            <div 
                                className="absolute left-1.5 sm:left-2 top-1.5 sm:top-2 rounded-full bg-blue-600/90 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md shadow-sm"
                                aria-label="New market"
                                role="status"
                            >
                                New
                            </div>
                        )}

                        <div 
                            className="absolute bottom-1.5 sm:bottom-2 right-1.5 sm:right-2 rounded-md bg-black/60 px-1 sm:px-1.5 py-0.5 text-[9px] sm:text-[10px] font-medium text-white backdrop-blur-sm flex items-center gap-0.5 sm:gap-1"
                            aria-label={`Trading volume: ${safeVolume}`}
                        >
                            <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3" aria-hidden="true" />
                            <span>{safeVolume}</span>
                        </div>
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
                                <SimpleMarketOutcomes outcomes={safeOutcomes} />
                            ) : (
                                <ComplexMarketOutcomes outcomes={safeOutcomes} />
                            )}
                        </div>
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
 * Renders outcomes for simple markets (Yes/No format)
 * Enhanced with error handling for malformed outcome data
 * Implements Requirements 9.2, 9.5
 */
function SimpleMarketOutcomes({ outcomes }: { outcomes: Outcome[] }) {
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
                const safeProbability = typeof outcome.probability === 'number' && 
                                      !isNaN(outcome.probability) && 
                                      outcome.probability >= 0 && 
                                      outcome.probability <= 100 
                                      ? outcome.probability : 50;
                const safeColor = outcome.color || 'neutral';

                return (
                    <div key={idx} className="space-y-1 sm:space-y-1.5" role="listitem">
                        <div className="flex justify-between text-xs sm:text-sm">
                            <span className="font-medium text-muted-foreground">{safeName}</span>
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
                                className={cn("h-full rounded-full transition-all duration-700 ease-out group-hover:shadow-sm",
                                    safeColor === 'yes' ? "bg-emerald-500 dark:bg-emerald-500 group-hover:bg-emerald-600 dark:group-hover:bg-emerald-400" :
                                        safeColor === 'no' ? "bg-red-500 dark:bg-red-500 group-hover:bg-red-600 dark:group-hover:bg-red-400" : "bg-primary group-hover:bg-primary/90"
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
 * Enhanced with error handling for malformed outcome data
 * Implements Requirements 9.2, 9.5
 */
function ComplexMarketOutcomes({ outcomes }: { outcomes: Outcome[] }) {
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
                const safeProbability = typeof outcome.probability === 'number' && 
                                      !isNaN(outcome.probability) && 
                                      outcome.probability >= 0 && 
                                      outcome.probability <= 100 
                                      ? outcome.probability : 50;
                const safeColor = outcome.color || 'yes';
                const safeCategory = outcome.category || `Option ${idx + 1}`;

                return (
                    <div key={idx} className="space-y-1 sm:space-y-1.5" role="listitem">
                        {/* Category title */}
                        <div className="flex items-center justify-between">
                            <span className="text-xs sm:text-sm font-medium text-foreground truncate">
                                {safeCategory}
                            </span>
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <span className="text-[10px] sm:text-xs text-muted-foreground">{safeName}</span>
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
                                className={cn("h-full rounded-full transition-all duration-700 ease-out group-hover:shadow-sm",
                                    safeColor === 'yes' ? "bg-emerald-500 dark:bg-emerald-500 group-hover:bg-emerald-600 dark:group-hover:bg-emerald-400" :
                                        safeColor === 'no' ? "bg-red-500 dark:bg-red-500 group-hover:bg-red-600 dark:group-hover:bg-red-400" : "bg-primary group-hover:bg-primary/90"
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
