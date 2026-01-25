"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { TrendingUp, Globe, Briefcase, Vote, ChevronLeft, ChevronRight, Search, Filter, X } from "lucide-react";
import { useRef, useState, useEffect } from "react";

interface Category {
    label: string;
    slug: string;
    id: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
    description?: string;
}

interface CategoryFilterProps {
    categories?: Category[];
    activeCategory?: string | null;
    onCategoryChange?: (category: string | null) => void;
    marketCounts?: Record<string, number>;
    showCounts?: boolean;
    enableSearch?: boolean;
}

const DEFAULT_CATEGORIES: Category[] = [
    { label: "Politics", slug: "politics", id: "2", icon: Vote, description: "Political events and elections" },
    { label: "Geopolitics", slug: "geopolitics", id: "3", icon: Globe, description: "International relations and conflicts" },
    { label: "Economy", slug: "economy", id: "4", icon: Briefcase, description: "Economic indicators and markets" },
    { label: "Elections", slug: "elections", id: "5", icon: Vote, description: "Electoral outcomes and campaigns" },
];

const DEFAULT_TAGS = [
    "All", "Trump", "Harris", "Bitcoin", "NFL", "Premier League", "Elon Musk", "AI", "Interest Rates", "Recession", "Oscars", "TikTok", "Ethereum", "Solana"
];

/**
 * Enhanced Category Filter Component
 * Implements Requirements 2.1, 2.2, 2.3, 2.4, 2.5
 */
export function CategoryFilter({
    categories = DEFAULT_CATEGORIES,
    activeCategory = null,
    onCategoryChange,
    marketCounts = {},
    showCounts = true,
    enableSearch = true,
}: CategoryFilterProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [searchQuery, setSearchQuery] = useState("");
    const [showAllCategories, setShowAllCategories] = useState(false);
    
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: "left" | "right") => {
        if (scrollContainerRef.current) {
            const scrollAmount = 300;
            scrollContainerRef.current.scrollBy({ 
                left: direction === "left" ? -scrollAmount : scrollAmount, 
                behavior: "smooth" 
            });
        }
    };

    const handleCategoryClick = (categorySlug: string | null) => {
        if (onCategoryChange) {
            onCategoryChange(categorySlug);
        } else {
            // Default navigation behavior
            if (categorySlug) {
                router.push(`/${categorySlug}`);
            } else {
                router.push('/');
            }
        }
    };

    const filteredCategories = categories.filter(cat => 
        !searchQuery || cat.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const visibleCategories = showAllCategories ? filteredCategories : filteredCategories.slice(0, 4);
    const hasMoreCategories = filteredCategories.length > 4;

    return (
        <div className="border-b border-border/40 bg-background/95 backdrop-blur-sm sticky top-14 sm:top-16 z-40">
            <div className="container max-w-screen-2xl mx-auto px-2 sm:px-4">
                <div className="flex h-12 sm:h-14 items-center gap-1 overflow-x-auto scrollbar-hide">

                    {/* Main Categories Section - Enhanced mobile layout */}
                    <div className="flex bg-transparent pr-2 sm:pr-4 border-r border-border/30 h-8 sm:h-10 items-center gap-1 shrink-0">
                        {/* All/Trending Button */}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCategoryClick(null)}
                            className={cn(
                                "h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap",
                                !activeCategory 
                                    ? "text-foreground bg-muted/60 shadow-sm" 
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
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

                        {/* Category Buttons - Enhanced mobile layout */}
                        {visibleCategories.map((cat) => {
                            const isActive = activeCategory === cat.slug;
                            const count = marketCounts[cat.slug] || 0;
                            
                            return (
                                <Button
                                    key={cat.slug}
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCategoryClick(cat.slug)}
                                    className={cn(
                                        "h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm font-semibold transition-all duration-200 relative whitespace-nowrap",
                                        isActive 
                                            ? "text-foreground bg-muted/60 shadow-sm" 
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                                        count === 0 && "opacity-50"
                                    )}
                                    disabled={count === 0}
                                    title={cat.description}
                                >
                                    {cat.icon && <cat.icon className="mr-1 sm:mr-1.5 h-3 w-3 sm:h-3.5 sm:w-3.5" />}
                                    <span className="hidden xs:inline">{cat.label}</span>
                                    <span className="xs:hidden">{cat.label.slice(0, 3)}</span>
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
                                </Button>
                            );
                        })}

                        {/* Show More/Less Button */}
                        {hasMoreCategories && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowAllCategories(!showAllCategories)}
                                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                            >
                                {showAllCategories ? (
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

                    {/* Scrollable Tags */}
                    <div className="flex-1 flex items-center gap-2 overflow-hidden px-2 relative group">
                        <button
                            onClick={() => scroll("left")}
                            className="absolute left-0 z-10 hidden group-hover:flex bg-gradient-to-r from-background to-transparent w-8 h-full items-center justify-start"
                        >
                            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                        </button>

                        <div ref={scrollContainerRef} className="flex gap-2 overflow-x-auto scrollbar-hide py-1 px-1">
                            {DEFAULT_TAGS.map((tag) => {
                                const isActive = pathname?.split('/').pop()?.toLowerCase() === tag.toLowerCase();
                                return (
                                    <Link key={tag} href={`/${tag.toLowerCase()}`} passHref>
                                        <button
                                            className={cn(
                                                "whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium transition-colors hover:bg-muted/60 hover:text-foreground",
                                                isActive ? "bg-muted text-foreground" : "text-muted-foreground"
                                            )}
                                        >
                                            {tag}
                                        </button>
                                    </Link>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => scroll("right")}
                            className="absolute right-0 z-10 hidden group-hover:flex bg-gradient-to-l from-background to-transparent w-8 h-full items-center justify-end"
                        >
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </button>
                    </div>

                    {/* Search and Tools */}
                    <div className="flex items-center gap-1 pl-2 border-l border-border/30 h-8 shrink-0">
                        {enableSearch && (
                            <div className="relative">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                    onClick={() => setSearchQuery(searchQuery ? "" : "search")}
                                >
                                    {searchQuery ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
                                </Button>
                                {searchQuery && (
                                    <input
                                        type="text"
                                        placeholder="Search categories..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="absolute right-0 top-0 h-8 w-48 px-3 text-xs bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        autoFocus
                                    />
                                )}
                            </div>
                        )}
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            title="Filter options"
                        >
                            <Filter className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Empty State for Categories */}
                {activeCategory && marketCounts[activeCategory] === 0 && (
                    <div className="py-8 text-center">
                        <EmptyStateMessage category={activeCategory} />
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * Empty State Message Component
 * Implements Requirements 2.4, 2.5
 */
function EmptyStateMessage({ category }: { category: string }) {
    const categoryInfo = DEFAULT_CATEGORIES.find(cat => cat.slug === category);
    
    return (
        <div className="max-w-md mx-auto">
            <div className="text-muted-foreground mb-2">
                {categoryInfo?.icon && <categoryInfo.icon className="h-8 w-8 mx-auto mb-2 opacity-50" />}
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
                No {categoryInfo?.label || category} Markets
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
                There are currently no active markets in this category. 
                {categoryInfo?.description && ` ${categoryInfo.description} markets will appear here when available.`}
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
    );
}

// Legacy export for backward compatibility
export function CategoriesBar() {
    return <CategoryFilter />;
}
