"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Vote, ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useCallback, useEffect, useState } from "react";
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
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    const [focusedTagIndex, setFocusedTagIndex] = useState(-1);

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

    // Handle keyboard navigation for accessibility
    const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
        const { key } = event;
        
        if (key === 'ArrowLeft' || key === 'ArrowRight') {
            event.preventDefault();
            
            const direction = key === 'ArrowLeft' ? -1 : 1;
            const newIndex = Math.max(0, Math.min(RELATED_TAGS.length - 1, focusedTagIndex + direction));
            
            setFocusedTagIndex(newIndex);
            
            // Focus the tag button
            const tagButtons = scrollContainerRef.current?.querySelectorAll('[role="tab"]');
            if (tagButtons && tagButtons[newIndex]) {
                (tagButtons[newIndex] as HTMLElement).focus();
            }
        } else if (key === 'Enter' || key === ' ') {
            event.preventDefault();
            
            if (focusedTagIndex >= 0 && focusedTagIndex < RELATED_TAGS.length) {
                navigateToTag(RELATED_TAGS[focusedTagIndex].slug);
            }
        } else if (key === 'Home') {
            event.preventDefault();
            setFocusedTagIndex(0);
            const tagButtons = scrollContainerRef.current?.querySelectorAll('[role="tab"]');
            if (tagButtons && tagButtons[0]) {
                (tagButtons[0] as HTMLElement).focus();
            }
        } else if (key === 'End') {
            event.preventDefault();
            const lastIndex = RELATED_TAGS.length - 1;
            setFocusedTagIndex(lastIndex);
            const tagButtons = scrollContainerRef.current?.querySelectorAll('[role="tab"]');
            if (tagButtons && tagButtons[lastIndex]) {
                (tagButtons[lastIndex] as HTMLElement).focus();
            }
        }
    }, [focusedTagIndex, navigateToTag]);

    // Check scroll position and update button visibility
    const checkScrollPosition = useCallback(() => {
        if (scrollContainerRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
            setCanScrollLeft(scrollLeft > 0);
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
        }
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

    // Throttled scroll event handler for performance
    const handleScroll = useCallback(() => {
        requestAnimationFrame(checkScrollPosition);
    }, [checkScrollPosition]);

    // Initialize scroll position check
    useEffect(() => {
        checkScrollPosition();
        
        const container = scrollContainerRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll, { passive: true });
            
            // Check on resize
            const resizeObserver = new ResizeObserver(checkScrollPosition);
            resizeObserver.observe(container);
            
            return () => {
                container.removeEventListener('scroll', handleScroll);
                resizeObserver.disconnect();
            };
        }
    }, [handleScroll, checkScrollPosition]);

    // Handle browser back/forward navigation (Requirement 8.5)
    useEffect(() => {
        const handlePopState = () => {
            // The component will re-render with new searchParams automatically
            // This ensures proper state synchronization with browser navigation
        };
        
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    return (
        <div className="border-b border-border/40 bg-background/95 backdrop-blur-sm sticky top-14 z-40">
            <div className="container max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                <nav 
                    className="flex h-12 sm:h-14 items-center gap-4 sm:gap-6"
                    role="navigation"
                    aria-label="Political market categories"
                >
                    
                    {/* Politics Headline - Primary Category */}
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                            <Vote className="h-4 w-4 sm:h-5 sm:w-5 text-primary" aria-hidden="true" />
                            <h1 className="text-base sm:text-lg font-bold text-foreground">Politics</h1>
                        </div>
                        <div className="w-px h-4 sm:h-6 bg-border/50" aria-hidden="true" />
                    </div>

                    {/* Related Tags with Custom Scrolling */}
                    <div className="flex-1 flex items-center gap-1 sm:gap-2 overflow-hidden relative group">
                        {/* Left Scroll Control */}
                        <button
                            onClick={() => scroll("left")}
                            className={cn(
                                "absolute left-0 z-10 transition-all duration-300 bg-gradient-to-r from-background via-background/90 to-transparent w-8 sm:w-10 h-full flex items-center justify-start hover:from-background/95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm",
                                canScrollLeft ? "opacity-0 group-hover:opacity-100 focus:opacity-100" : "opacity-0 pointer-events-none"
                            )}
                            aria-label="Scroll tags left"
                            disabled={!canScrollLeft}
                            tabIndex={canScrollLeft ? 0 : -1}
                        >
                            <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground hover:text-foreground transition-colors duration-200" />
                        </button>

                        {/* Scrollable Tags Container */}
                        <div 
                            ref={scrollContainerRef} 
                            className="flex gap-1 sm:gap-2 overflow-x-auto scrollbar-hide py-1 sm:py-2 px-1 scroll-smooth"
                            style={{ 
                                scrollbarWidth: 'none', 
                                msOverflowStyle: 'none',
                                WebkitOverflowScrolling: 'touch' // iOS smooth scrolling
                            }}
                            role="tablist"
                            aria-label="Political market filters"
                            onKeyDown={handleKeyDown}
                        >
                            {RELATED_TAGS.map((tag, index) => {
                                const isActive = currentTag.toLowerCase() === tag.slug.toLowerCase();
                                
                                return (
                                    <button
                                        key={tag.slug}
                                        onClick={() => navigateToTag(tag.slug)}
                                        onFocus={() => setFocusedTagIndex(index)}
                                        className={cn(
                                            "whitespace-nowrap h-7 sm:h-8 px-2 sm:px-4 text-xs sm:text-sm font-medium transition-all duration-300 hover:bg-muted/80 hover:text-foreground hover:scale-105 active:scale-95 rounded-md border-0 bg-transparent cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                                            isActive 
                                                ? "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 shadow-sm" 
                                                : "text-muted-foreground hover:text-foreground hover:shadow-sm"
                                        )}
                                        role="tab"
                                        aria-selected={isActive}
                                        aria-controls={`markets-${tag.slug}`}
                                        aria-label={`Filter by ${tag.label} markets${isActive ? ' (currently selected)' : ''}`}
                                        tabIndex={index === 0 ? 0 : -1} // Only first tab is in tab order initially
                                        id={`tag-${tag.slug}`}
                                    >
                                        {tag.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Right Scroll Control */}
                        <button
                            onClick={() => scroll("right")}
                            className={cn(
                                "absolute right-0 z-10 transition-all duration-300 bg-gradient-to-l from-background via-background/90 to-transparent w-8 sm:w-10 h-full flex items-center justify-end hover:from-background/95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm",
                                canScrollRight ? "opacity-0 group-hover:opacity-100 focus:opacity-100" : "opacity-0 pointer-events-none"
                            )}
                            aria-label="Scroll tags right"
                            disabled={!canScrollRight}
                            tabIndex={canScrollRight ? 0 : -1}
                        >
                            <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground hover:text-foreground transition-colors duration-200" />
                        </button>
                    </div>
                </nav>
            </div>
        </div>
    );
}