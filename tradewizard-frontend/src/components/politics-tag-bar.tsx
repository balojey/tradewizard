"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Vote, ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";

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
    const scrollContainerRef = useRef<HTMLDivElement>(null);

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
            <div className="container max-w-screen-2xl mx-auto px-4">
                <div className="flex h-14 items-center gap-6">
                    
                    {/* Politics Headline - Primary Category */}
                    <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-2">
                            <Vote className="h-5 w-5 text-primary" />
                            <h1 className="text-lg font-bold text-foreground">Politics</h1>
                        </div>
                        <div className="w-px h-6 bg-border/50" />
                    </div>

                    {/* Related Tags with Custom Scrolling */}
                    <div className="flex-1 flex items-center gap-2 overflow-hidden relative group">
                        {/* Left Scroll Control */}
                        <button
                            onClick={() => scroll("left")}
                            className="absolute left-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-to-r from-background via-background/90 to-transparent w-10 h-full flex items-center justify-start"
                            aria-label="Scroll tags left"
                        >
                            <ChevronLeft className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        </button>

                        {/* Scrollable Tags Container */}
                        <div 
                            ref={scrollContainerRef} 
                            className="flex gap-2 overflow-x-auto scrollbar-hide py-2 px-1"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                            {RELATED_TAGS.map((tag) => {
                                const isActive = currentTag.toLowerCase() === tag.slug.toLowerCase();
                                
                                return (
                                    <Link key={tag.slug} href={`/?tag=${tag.slug}`} passHref>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className={cn(
                                                "whitespace-nowrap h-8 px-4 text-sm font-medium transition-all duration-200 hover:bg-muted/60 hover:text-foreground",
                                                isActive 
                                                    ? "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15" 
                                                    : "text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            {tag.label}
                                        </Button>
                                    </Link>
                                );
                            })}
                        </div>

                        {/* Right Scroll Control */}
                        <button
                            onClick={() => scroll("right")}
                            className="absolute right-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-to-l from-background via-background/90 to-transparent w-10 h-full flex items-center justify-end"
                            aria-label="Scroll tags right"
                        >
                            <ChevronRight className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}