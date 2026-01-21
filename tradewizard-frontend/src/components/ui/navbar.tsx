import Link from 'next/link';
import { Button } from './button';
import { Search } from 'lucide-react';

export function Navbar() {
    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 max-w-screen-2xl items-center mx-auto px-4">
                <div className="mr-8 hidden md:flex">
                    <Link href="/" className="mr-6 flex items-center space-x-2">
                        {/* Logo placeholder - text for now */}
                        <span className="hidden font-bold sm:inline-block text-xl tracking-tight bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
                            TradeWizard
                        </span>
                    </Link>
                    <nav className="flex items-center gap-6 text-sm font-medium">
                        <Link href="/" className="transition-colors hover:text-primary text-primary">
                            Markets
                        </Link>
                        <Link href="/portfolio" className="transition-colors hover:text-foreground/80 text-foreground/60">
                            Portfolio
                        </Link>
                        <Link href="/activity" className="transition-colors hover:text-foreground/80 text-foreground/60">
                            Activity
                        </Link>
                        <Link href="/ranks" className="transition-colors hover:text-foreground/80 text-foreground/60">
                            Leaderboard
                        </Link>
                    </nav>
                </div>

                <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
                    <div className="w-full flex-1 md:w-auto md:flex-none">
                        <Button variant="outline" className="relative h-9 w-full justify-start rounded-md bg-muted/50 text-sm font-normal text-muted-foreground shadow-none sm:pr-12 md:w-64">
                            <Search className="mr-2 h-4 w-4" />
                            <span className="hidden lg:inline-flex">Search markets...</span>
                            <span className="inline-flex lg:hidden">Search...</span>
                        </Button>
                    </div>
                    <nav className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" className="hidden sm:flex">
                            Log In
                        </Button>
                        <Button variant="default" size="sm" className="font-semibold">
                            Sign Up
                        </Button>
                    </nav>
                </div>
            </div>
        </header>
    );
}
