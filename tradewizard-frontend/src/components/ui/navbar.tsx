"use client";

import Link from 'next/link';
import { Button } from './button';
import { Search, Menu } from 'lucide-react';

export function Navbar() {
    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 max-w-screen-2xl items-center mx-auto px-4 gap-4">

                {/* Left: Logo & Links */}
                <div className="flex items-center gap-6 md:gap-8 flex-1 md:flex-none">
                    <Link href="/" className="flex items-center space-x-2">
                        <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
                            TradeWizard
                        </span>
                    </Link>
                    {/* Main navigation removed as it's now in CategoriesBar */}
                </div>

                {/* Center: Search Bar */}
                <div className="flex-1 hidden md:flex max-w-xl mx-auto">
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search markets..."
                            className="h-10 w-full rounded-lg border border-input bg-muted/30 px-10 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden lg:flex items-center gap-1">
                            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                                <span className="text-xs">/</span>
                            </kbd>
                        </div>
                    </div>
                </div>

                {/* Right: Auth & Tools */}
                <div className="flex items-center gap-2 justify-end flex-1 md:flex-none">
                    <Button variant="ghost" className="hidden sm:flex text-sm font-medium">Log In</Button>
                    <Button className="h-9 px-4 font-semibold text-white bg-blue-600 hover:bg-blue-700">Sign Up</Button>
                    <Button variant="ghost" size="icon" className="md:hidden">
                        <Search className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon">
                        <Menu className="h-5 w-5" />
                    </Button>
                </div>
            </div>
        </header>
    );
}
