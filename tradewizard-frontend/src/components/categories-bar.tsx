"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { TrendingUp, Globe, Briefcase, Vote, ChevronLeft, ChevronRight, Search, Filter, X, AlertCircle } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { PoliticsTag, MarketTag } from "@/lib/enhanced-polymarket-types";
import { POLITICAL_TAGS, RELATED_POLITICAL_TAGS } from "@/lib/enhanced-polymarket-types";

interface Category {
    label: string;
    slug: string;
    id: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
    description?: string;
}

interface CategoryFilterProps {
    // Enhanced props for politics-focused filtering (Requirements 2.1, 2.2, 2.3)
    politicsTags?: PoliticsTag[];
    activeTag?: string | null;
    onTagChange?: (tagSlug: string | null) => void;
    marketCounts?: Record<string, number>;
    
    // Legacy support
    categories?: Category[];
    activeCategory?: string | null;
    onCategoryChange?: (category: string | null) => void;
    
    // Configuration
    showCounts?: boolean;
    enableSearch?: boolean;
    showFilterButton?: boolean;
    
    // Loading and error states
    loading?: boolean;
    error?: string;
}

const DEFAULT_CATEGORIES: Category[] = [
    { label: "Politics", slug: "politics", id: "2", icon: Vote, description: "Political events and elections" },
    { label: "Geopolitics", slug: "geopolitics", id: "3", icon: Globe, description: "International relations and conflicts" },
    { label: "Economy", slug: "economy", id: "4", icon: Briefcase, description: "Economic indicators and markets" },
    { label: "Elections", slug: "elections", id: "5", icon: Vote, description: "Electoral outcomes and campaigns" },
];

// Default politics-focused tags for fallback
const DEFAULT_POLITICS_TAGS: PoliticsTag[] = [
    { id: "trump", label: "Trump", slug: "trump", isPolitics: true, marketCount: 0, forceShow: true },
    { id: "harris", label: "Harris", slug: "harris", isPolitics: true, marketCount: 0, forceShow: true },
    { id: "biden", label: "Biden", slug: "biden", isPolitics: true, marketCount: 0, forceShow: true },
    { id: "elections", label: "Elections", slug: "elections", isPolitics: true, marketCount: 0, forceShow: true },
    { id: "congress", label: "Congress", slug: "congress", isPolitics: true, marketCount: 0, forceShow: true },
    { id: "supreme-court", label: "Supreme Court", slug: "supreme-court", isPolitics: true, marketCount: 0, forceShow: true },
];

/**
 * Enhanced Category Filter Component with Politics Focus
 * Implements Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8
 */
export function CategoryFilter({
    politicsTags = DEFAULT_POLITICS_TAGS,
    activeTag = null,
    onTagChange,
    marketCounts = {},
    
    // Legacy support
    categories = DEFAULT_CATEGORIES,
    activeCategory = null,
    onCategoryChange,
    
    // Configuration
    showCounts = true,
    enableSearch = false, // Disabled by default as per requirements
    showFilterButton = true,
    
    // Loading and error states
    loading = false,
    error,
}: CategoryFilterProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [searchQuery, setSearchQuery] = useState("");
    const [showAllTags, setShowAllTags] = useState(false);
    const [filterPanelOpen, setFilterPanelOpen] = useState(false);
    
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Use politics tags as primary navigation (Requirements 2.1, 2.2)
    const activePoliticsTag = activeTag || activeCategory;
    const handleTagClick = onTagChange || onCategoryChange;

    const scroll = (direction: "left" | "right") => {
        if (scrollContainerRef.current) {
            const scrollAmount = 300;
            scrollContainerRef.current.scrollBy({ 
                left: direction === "left" ? -scrollAmount : scrollAmount, 
                behavior: "smooth" 
            });
        }
    };

    const handleTagSelection = (tagSlug: string | null) => {
        if (handleTagClick) {
            handleTagClick(tagSlug);
        } else {
            // Default slug-based routing (Requirements 2.7)
            if (tagSlug) {
                router.push(`/${tagSlug}`);
            } else {
                router.push('/');
            }
        }
    };

    // Filter politics tags based on search query
    const filteredPoliticsTags = politicsTags.filter(tag => 
        !searchQuery || tag.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Show only visible tags initially, expand on demand
    const visibleTags = showAllTags ? filteredPoliticsTags : filteredPoliticsTags.slice(0, 8);
    const hasMoreTags = filteredPoliticsTags.length > 8;

    // Check if any tags have no markets for empty state handling (Requirements 2.6)
    const hasActiveMarkets = Object.values(marketCounts).some(count => count > 0);

    if (error) {
        return (
            <div className="border-b border-border/40 bg-background/95 backdrop-blur-sm sticky top-14 sm:top-16 z-40">
                <div className="container max-w-screen-2xl mx-auto px-2 sm:px-4">
                    <div className="flex h-12 sm:h-14 items-center justify-center">
                        <div className="flex items-center gap-2 text-destructive">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-sm">Failed to load categories</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="border-b border-border/40 bg-background/95 backdrop-blur-sm sticky top-14 sm:top-16 z-40">
            <div className="container max-w-screen-2xl mx-auto px-2 sm:px-4">
                <div className="flex h-12 sm:h-14 items-center gap-1 overflow-x-auto scrollbar-hide">

                    {/* Main Politics Categories Section - Enhanced mobile layout */}
                    <div className="flex bg-transparent pr-2 sm:pr-4 border-r border-border/30 h-8 sm:h-10 items-center gap-1 shrink-0">
                        {/* All Markets Button */}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTagSelection(null)}
                            disabled={loading}
                            className={cn(
                                "h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap",
                                !activePoliticsTag 
                                    ? "text-foreground bg-muted/60 shadow-sm" 
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                                loading && "opacity-50"
                            )}
                        >
                            <TrendingUp className="mr-1 sm:mr-1.5 h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            <span className="hidden xs:inline">All Markets</span>
                            <span className="xs:hidden">All</span>
                            {showCounts && marketCounts['all'] && (
                                <span className="ml-1 sm:ml-1.5 px-1 sm:px-1.5 py-0.5 text-[9px] sm:text-[10px] bg-primary/10 text-primary rounded-full">
                                    {marketCounts['all']}
                                </span>
                            )}
                        </Button>

                        {/* Politics Tag Buttons - Enhanced mobile layout (Requirements 2.3, 2.4) */}
                        {visibleTags.map((tag) => {
                            const isActive = activePoliticsTag === tag.slug;
                            const count = marketCounts[tag.slug] || tag.marketCount || 0;
                            
                            return (
                                <Button
                                    key={tag.slug}
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleTagSelection(tag.slug)}
                                    disabled={loading || count === 0}
                                    className={cn(
                                        "h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm font-semibold transition-all duration-200 relative whitespace-nowrap",
                                        isActive 
                                            ? "text-foreground bg-muted/60 shadow-sm" 
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                                        count === 0 && "opacity-50",
                                        loading && "opacity-50",
                                        tag.trending && "bg-gradient-to-r from-primary/10 to-transparent"
                                    )}
                                    title={`${tag.label} - ${count} markets`}
                                >
                                    <Vote className="mr-1 sm:mr-1.5 h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                    <span className="hidden xs:inline">{tag.label}</span>
                                    <span className="xs:hidden">{tag.label.slice(0, 4)}</span>
                                    {showCounts && count > 0 && (
                                        <span className={cn(
                                            "ml-1 sm:ml-1.5 px-1 sm:px-1.5 py-0.5 text-[9px] sm:text-[10px] rounded-full",
                                            isActive 
                                                ? "bg-primary/20 text-primary" 
                                                : "bg-muted-foreground/10 text-muted-foreground"
                                        )}>
                                            {count}
                                        </span>
                                    )}
                                    {tag.trending && (
                                        <div className="absolute -top-1 -right-1 h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
                                    )}
                                </Button>
                            );
                        })}

                        {/* Show More/Less Button */}
                        {hasMoreTags && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowAllTags(!showAllTags)}
                                disabled={loading}
                                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                            >
                                {showAllTags ? (
                                    <>
                                        <ChevronLeft className="h-3.5 w-3.5" />
                                        Less
                                    </>
                                ) : (
                                    <>
                                        More
                                        <ChevronRight className="h-3.5 w-3.5" />
                                    </>
                                )}
                            </Button>
                        )}
                    </div>

                    {/* Additional Tags Scrollable Section */}
                    <div className="flex-1 flex items-center gap-2 overflow-hidden px-2 relative group">
                        <button
                            onClick={() => scroll("left")}
                            className="absolute left-0 z-10 hidden group-hover:flex bg-gradient-to-r from-background to-transparent w-8 h-full items-center justify-start"
                            disabled={loading}
                        >
                            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                        </button>

                        <div ref={scrollContainerRef} className="flex gap-2 overflow-x-auto scrollbar-hide py-1 px-1">
                            {/* Additional politics-related tags */}
                            {RELATED_POLITICAL_TAGS.map((tagSlug) => {
                                const tag = politicsTags.find(t => t.slug === tagSlug);
                                if (!tag || visibleTags.includes(tag)) return null;
                                
                                const isActive = pathname?.split('/').pop()?.toLowerCase() === tag.slug.toLowerCase();
                                const count = marketCounts[tag.slug] || tag.marketCount || 0;
                                
                                return (
                                    <Link key={tag.slug} href={`/${tag.slug}`} passHref>
                                        <button
                                            disabled={loading || count === 0}
                                            className={cn(
                                                "whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium transition-colors hover:bg-muted/60 hover:text-foreground",
                                                isActive ? "bg-muted text-foreground" : "text-muted-foreground",
                                                count === 0 && "opacity-50 cursor-not-allowed",
                                                loading && "opacity-50"
                                            )}
                                        >
                                            {tag.label}
                                            {showCounts && count > 0 && (
                                                <span className="ml-1 text-[10px] opacity-70">
                                                    {count}
                                                </span>
                                            )}
                                        </button>
                                    </Link>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => scroll("right")}
                            disabled={loading}
                            className="absolute right-0 z-10 hidden group-hover:flex bg-gradient-to-l from-background to-transparent w-8 h-full items-center justify-end"
                        >
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </button>
                    </div>

                    {/* Filter Button (Requirements 2.8) */}
                    <div className="flex items-center gap-1 pl-2 border-l border-border/30 h-8 shrink-0">
                        {enableSearch && (
                            <div className="relative">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                    onClick={() => setSearchQuery(searchQuery ? "" : "search")}
                                    disabled={loading}
                                >
                                    {searchQuery ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
                                </Button>
                                {searchQuery && (
                                    <input
                                        type="text"
                                        placeholder="Search politics tags..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="absolute right-0 top-0 h-8 w-48 px-3 text-xs bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        autoFocus
                                    />
                                )}
                            </div>
                        )}
                        {showFilterButton && (
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className={cn(
                                    "h-8 w-8 text-muted-foreground hover:text-foreground",
                                    filterPanelOpen && "bg-muted text-foreground"
                                )}
                                onClick={() => setFilterPanelOpen(!filterPanelOpen)}
                                disabled={loading}
                                title="Filter options"
                            >
                                <Filter className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>

                {/* Filter Panel */}
                {filterPanelOpen && (
                    <div className="border-t border-border/30 bg-muted/30 p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold">Filter Options</h3>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setFilterPanelOpen(false)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <label className="flex items-center space-x-2 text-sm">
                                <input type="checkbox" defaultChecked={showCounts} className="rounded" />
                                <span>Show counts</span>
                            </label>
                            <label className="flex items-center space-x-2 text-sm">
                                <input type="checkbox" className="rounded" />
                                <span>Trending only</span>
                            </label>
                            <label className="flex items-center space-x-2 text-sm">
                                <input type="checkbox" className="rounded" />
                                <span>Active markets</span>
                            </label>
                            <label className="flex items-center space-x-2 text-sm">
                                <input type="checkbox" className="rounded" />
                                <span>High volume</span>
                            </label>
                        </div>
                    </div>
                )}

                {/* Empty State for Tags (Requirements 2.6) */}
                {activePoliticsTag && marketCounts[activePoliticsTag] === 0 && (
                    <div className="absolute top-full left-0 right-0 bg-background border-b border-border/40 py-8">
                        <EmptyStateMessage 
                            tagSlug={activePoliticsTag} 
                            politicsTags={politicsTags}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * Empty State Message Component for Politics Tags
 * Implements Requirements 2.6, 2.8
 */
function EmptyStateMessage({ 
    tagSlug, 
    politicsTags 
}: { 
    tagSlug: string;
    politicsTags: PoliticsTag[];
}) {
    const tagInfo = politicsTags.find(tag => tag.slug === tagSlug);
    
    return (
        <div className="container max-w-screen-2xl mx-auto px-4">
            <div className="max-w-md mx-auto text-center">
                <div className="text-muted-foreground mb-2">
                    <Vote className="h-8 w-8 mx-auto mb-2 opacity-50" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                    No {tagInfo?.label || tagSlug} Markets
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                    There are currently no active prediction markets for {tagInfo?.label || tagSlug}. 
                    New markets will appear here when they become available.
                </p>
                <div className="flex gap-2 justify-center">
                    <Button variant="outline" size="sm" onClick={() => window.location.href = '/'}>
                        Browse All Markets
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
                        Refresh
                    </Button>
                </div>
            </div>
        </div>
    );
}

// Legacy export for backward compatibility
export function CategoriesBar() {
    return <CategoryFilter />;
}
