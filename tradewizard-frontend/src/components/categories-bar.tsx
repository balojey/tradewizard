"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { TrendingUp, Sparkles, Zap, ChevronRight, ChevronLeft, Search } from "lucide-react";
import { useRef, useState } from "react";

const CATEGORIES = [
    { label: "Politics", slug: "politics" },
    { label: "Geopolitics", slug: "geopolitics" },
    { label: "Economy", slug: "economy" },
    { label: "Elections", slug: "elections" },
];

const TAGS = [
    "All", "Trump", "Harris", "Bitcoin", "NFL", "Premier League", "Elon Musk", "AI", "Interest Rates", "Recession", "Oscars", "TikTok", "Ethereum", "Solana"
];

export function CategoriesBar() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentTag = searchParams.get("tag") || "All";

    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: "left" | "right") => {
        if (scrollContainerRef.current) {
            const scrollAmount = 300;
            scrollContainerRef.current.scrollBy({ left: direction === "left" ? -scrollAmount : scrollAmount, behavior: "smooth" });
        }
    };

    return (
        <div className="border-b border-border/40 bg-background/95 backdrop-blur-sm sticky top-16 z-40">
            <div className="container max-w-screen-2xl mx-auto px-4">
                <div className="flex h-12 items-center gap-1 overflow-x-auto scrollbar-hide">

                    {/* Main Categories (Static-ish) */}
                    <div className="flex bg-transparent pr-4 border-r border-border/30 h-8 items-center gap-1 shrink-0">
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                                "h-8 px-3 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50",
                                // "text-foreground bg-muted/60" // Active state example
                            )}
                        >
                            <TrendingUp className="mr-1.5 h-3.5 w-3.5" />
                            Trending
                        </Button>
                        {CATEGORIES.slice(0, 3).map((cat) => (
                            <Button
                                key={cat.slug}
                                variant="ghost"
                                size="sm"
                                className="h-8 px-3 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            >
                                {cat.icon && <cat.icon className="mr-1.5 h-3.5 w-3.5" />}
                                {cat.label}
                            </Button>
                        ))}
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
                            {TAGS.map((tag) => (
                                <button
                                    key={tag}
                                    className={cn(
                                        "whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium transition-colors hover:bg-muted/60 hover:text-foreground",
                                        currentTag === tag ? "bg-muted text-foreground" : "text-muted-foreground"
                                    )}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => scroll("right")}
                            className="absolute right-0 z-10 hidden group-hover:flex bg-gradient-to-l from-background to-transparent w-8 h-full items-center justify-end"
                        >
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </button>
                    </div>

                    {/* Small Tools */}
                    <div className="flex items-center gap-1 pl-2 border-l border-border/30 h-8 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                            <Search className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
