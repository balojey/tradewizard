"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState, useEffect } from "react";

interface Category {
    label: string;
    slug: string;
    id: string;
    count?: number;
}

const DEFAULT_CATEGORIES: Category[] = [
    { label: "All", slug: "all", id: "all" },
    { label: "Trump", slug: "trump", id: "trump" },
    { label: "Epstein", slug: "epstein", id: "epstein" },
    { label: "Venezuela", slug: "venezuela", id: "venezuela" },
    { label: "Midterms", slug: "midterms", id: "midterms" },
    { label: "Primaries", slug: "primaries", id: "primaries" },
    { label: "Minnesota Unrest", slug: "minnesota-unrest", id: "minnesota-unrest" },
    { label: "US Election", slug: "us-election", id: "us-election" },
    { label: "Trade War", slug: "trade-war", id: "trade-war" },
    { label: "Congress", slug: "congress", id: "congress" },
    { label: "Global Elections", slug: "global-elections", id: "global-elections" },
];

const SORT_OPTIONS = [
    { label: "24hr Volume", value: "24hr-volume" },
    { label: "Total Volume", value: "total-volume" },
    { label: "Newest", value: "newest" },
    { label: "Ending Soon", value: "ending-soon" },
];

const FREQUENCY_OPTIONS = [
    { label: "All", value: "all" },
    { label: "Daily", value: "daily" },
    { label: "Weekly", value: "weekly" },
    { label: "Monthly", value: "monthly" },
];

const STATUS_OPTIONS = [
    { label: "Active", value: "active" },
    { label: "Closed", value: "closed" },
    { label: "Resolved", value: "resolved" },
];

interface CategoriesBarProps {
    categories?: Category[];
    activeCategory?: string;
    onCategoryChange?: (category: string) => void;
}

export function CategoriesBar({
    categories = DEFAULT_CATEGORIES,
    activeCategory = "all",
    onCategoryChange,
}: CategoriesBarProps) {
    const router = useRouter();
    const pathname = usePathname();
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    
    const [sortBy, setSortBy] = useState("24hr-volume");
    const [frequency, setFrequency] = useState("all");
    const [status, setStatus] = useState("active");
    const [showSortDropdown, setShowSortDropdown] = useState(false);
    const [showFrequencyDropdown, setShowFrequencyDropdown] = useState(false);
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);

    const handleCategoryClick = (categorySlug: string) => {
        if (onCategoryChange) {
            onCategoryChange(categorySlug);
        } else {
            if (categorySlug === "all") {
                router.push('/');
            } else {
                router.push(`/?tag=${categorySlug}`);
            }
        }
    };

    const scroll = (direction: "left" | "right") => {
        if (scrollContainerRef.current) {
            const scrollAmount = 200;
            scrollContainerRef.current.scrollBy({ 
                left: direction === "left" ? -scrollAmount : scrollAmount, 
                behavior: "smooth" 
            });
        }
    };

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = () => {
            setShowSortDropdown(false);
            setShowFrequencyDropdown(false);
            setShowStatusDropdown(false);
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    return (
        <div className="bg-background border-b border-border/20">
            <div className="container max-w-screen-2xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
                
                {/* Top Row - Category Tags */}
                <div className="flex items-center py-3 border-b border-border/10">
                    <div className="flex items-center gap-1 overflow-hidden relative group flex-1">
                        {/* Scroll Left Button */}
                        <button
                            onClick={() => scroll("left")}
                            className="absolute left-0 z-10 hidden group-hover:flex bg-gradient-to-r from-background via-background/90 to-transparent w-8 h-full items-center justify-start"
                        >
                            <ChevronLeft className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        </button>

                        {/* Categories Container */}
                        <div 
                            ref={scrollContainerRef} 
                            className="flex gap-6 overflow-x-auto scrollbar-hide py-1 px-1"
                        >
                            {categories.map((category) => {
                                const isActive = activeCategory === category.slug;
                                
                                return (
                                    <button
                                        key={category.slug}
                                        onClick={() => handleCategoryClick(category.slug)}
                                        className={cn(
                                            "whitespace-nowrap text-sm font-medium transition-colors hover:text-foreground relative pb-1",
                                            isActive 
                                                ? "text-foreground" 
                                                : "text-muted-foreground"
                                        )}
                                    >
                                        {category.label}
                                        {isActive && (
                                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Scroll Right Button */}
                        <button
                            onClick={() => scroll("right")}
                            className="absolute right-0 z-10 hidden group-hover:flex bg-gradient-to-l from-background via-background/90 to-transparent w-8 h-full items-center justify-end"
                        >
                            <ChevronRight className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        </button>
                    </div>
                </div>

                {/* Bottom Row - Filter Controls */}
                <div className="flex items-center gap-6 py-3">
                    
                    {/* Sort By Dropdown */}
                    <div className="relative">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowSortDropdown(!showSortDropdown);
                                setShowFrequencyDropdown(false);
                                setShowStatusDropdown(false);
                            }}
                            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <span>Sort by</span>
                            <span className="font-medium text-foreground">
                                {SORT_OPTIONS.find(opt => opt.value === sortBy)?.label}
                            </span>
                            <ChevronDown className="h-4 w-4" />
                        </button>
                        
                        {showSortDropdown && (
                            <div className="absolute top-full left-0 mt-1 bg-background border border-border rounded-md shadow-lg z-50 min-w-[140px]">
                                {SORT_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => {
                                            setSortBy(option.value);
                                            setShowSortDropdown(false);
                                        }}
                                        className={cn(
                                            "w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors",
                                            sortBy === option.value && "bg-muted font-medium"
                                        )}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Frequency Dropdown */}
                    <div className="relative">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowFrequencyDropdown(!showFrequencyDropdown);
                                setShowSortDropdown(false);
                                setShowStatusDropdown(false);
                            }}
                            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <span>Frequency:</span>
                            <span className="font-medium text-foreground">
                                {FREQUENCY_OPTIONS.find(opt => opt.value === frequency)?.label}
                            </span>
                            <ChevronDown className="h-4 w-4" />
                        </button>
                        
                        {showFrequencyDropdown && (
                            <div className="absolute top-full left-0 mt-1 bg-background border border-border rounded-md shadow-lg z-50 min-w-[100px]">
                                {FREQUENCY_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => {
                                            setFrequency(option.value);
                                            setShowFrequencyDropdown(false);
                                        }}
                                        className={cn(
                                            "w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors",
                                            frequency === option.value && "bg-muted font-medium"
                                        )}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Status Dropdown */}
                    <div className="relative">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowStatusDropdown(!showStatusDropdown);
                                setShowSortDropdown(false);
                                setShowFrequencyDropdown(false);
                            }}
                            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <span>Status:</span>
                            <span className="font-medium text-foreground">
                                {STATUS_OPTIONS.find(opt => opt.value === status)?.label}
                            </span>
                            <ChevronDown className="h-4 w-4" />
                        </button>
                        
                        {showStatusDropdown && (
                            <div className="absolute top-full left-0 mt-1 bg-background border border-border rounded-md shadow-lg z-50 min-w-[100px]">
                                {STATUS_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => {
                                            setStatus(option.value);
                                            setShowStatusDropdown(false);
                                        }}
                                        className={cn(
                                            "w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors",
                                            status === option.value && "bg-muted font-medium"
                                        )}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}