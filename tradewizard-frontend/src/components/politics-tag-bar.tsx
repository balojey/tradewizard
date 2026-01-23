"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Vote, ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useCallback, useEffect } from "react";
import { isValidPoliticalTag } from "@/lib/politics-data";

// Politics-focused related tags based on Polymarket data
const RELATED_TAGS = [
    { label: "All", slug: "all" },
    { label: "Trump", slug: "trump" },
    { label: "Elections", slug: "elections" },
    { label: "U.S. Politics", slug: "us-politics" },
    { label: "Immigration", slug: "immigration" },
    { label: "World", slug: "world" },
];

interface PoliticsTagBarProps {
    currentTag?: string;
}

export function PoliticsTagBar({ currentTag = "all" }: PoliticsTagBarProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Enhanced navigation function with proper URL handling (Requirements 8.4, 8.5)
    const navigateToTag = useCallback((tagSlug: string) => {
        // Validate tag before navigation
        const validatedTag = isValidPoliticalTag(tagSlug) ? tagSlug : "all";
        
        // Create new URL search params
        const params = new URLSearchParams(searchParams.toString());
        
        if (validatedTag === "all") {
            // Remove tag parameter for "all" to keep URL clean
            params.delete("tag");
        } else {
            params.set("tag", validatedTag);
        }
        
        // Build new URL
        const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
        
        // Navigate with proper browser history support
        router.push(newUrl, { scroll: false });
    }, [router, pathname, searchParams]);

    // Handle browser back/forward navigation (Requirement 8.5)
    useEffect(() => {
        const handlePopState = () => {
            // The component will re-render with new searchParams automatically
            // This ensures proper state synchronization with browser navigation
        };
        
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    const scroll = (direction: "left" | "right") => {
        if (scrollContainerRef.current) {
            const scrollAmount = 200;
            scrollContainerRef.current.scrollBy({ 
                left: direction === "left" ? -scrollAmount : scrollAmount, 
                behavior: "smooth" 
            });
        }
    };

    return (
        <div className="border-b border-border/40 bg-background/95 backdrop-blur-sm sticky top-14 z-40">
            <div className="container max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex h-12 sm:h-14 items-center gap-4 sm:gap-6">
                    
                    {/* Politics Headline - Primary Category */}
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                            <Vote className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                            <h1 className="text-base sm:text-lg font-bold text-foreground">Politics</h1>
                        </div>
                        <div className="w-px h-4 sm:h-6 bg-border/50" />
                    </div>

                    {/* Related Tags with Custom Scrolling */}
                    <div className="flex-1 flex items-center gap-1 sm:gap-2 overflow-hidden relative group">
                        {/* Left Scroll Control */}
                        <button
                            onClick={() => scroll("left")}
                            className="absolute left-0 z-10 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-gradient-to-r from-background via-background/90 to-transparent w-8 sm:w-10 h-full flex items-center justify-start hover:from-background/95"
                            aria-label="Scroll tags left"
                        >
                            <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground hover:text-foreground transition-colors duration-200" />
                        </button>

                        {/* Scrollable Tags Container */}
                        <div 
                            ref={scrollContainerRef} 
                            className="flex gap-1 sm:gap-2 overflow-x-auto scrollbar-hide py-1 sm:py-2 px-1"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                            {RELATED_TAGS.map((tag) => {
                                const isActive = currentTag.toLowerCase() === tag.slug.toLowerCase();
                                
                                return (
                                    <button
                                        key={tag.slug}
                                        onClick={() => navigateToTag(tag.slug)}
                                        className={cn(
                                            "whitespace-nowrap h-7 sm:h-8 px-2 sm:px-4 text-xs sm:text-sm font-medium transition-all duration-300 hover:bg-muted/80 hover:text-foreground hover:scale-105 active:scale-95 rounded-md border-0 bg-transparent cursor-pointer",
                                            isActive 
                                                ? "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 shadow-sm" 
                                                : "text-muted-foreground hover:text-foreground hover:shadow-sm"
                                        )}
                                        aria-pressed={isActive}
                                        aria-label={`Filter by ${tag.label} markets`}
                                    >
                                        {tag.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Right Scroll Control */}
                        <button
                            onClick={() => scroll("right")}
                            className="absolute right-0 z-10 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-gradient-to-l from-background via-background/90 to-transparent w-8 sm:w-10 h-full flex items-center justify-end hover:from-background/95"
                            aria-label="Scroll tags right"
                        >
                            <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground hover:text-foreground transition-colors duration-200" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}