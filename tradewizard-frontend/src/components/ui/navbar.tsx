"use client";

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from './button';
import { Search, Menu, X } from 'lucide-react';
import { LoginModal } from '@/components/auth/login-modal';
import { UserMenu } from '@/components/auth/user-menu';
import { useMagic } from '@/lib/magic';

export function Navbar() {
    const router = useRouter();
    const pathname = usePathname();
    const [loginModalOpen, setLoginModalOpen] = useState(false);
    const [loginMode, setLoginMode] = useState<'login' | 'signup'>('login');
    const [searchQuery, setSearchQuery] = useState('');
    const [showMobileSearch, setShowMobileSearch] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const mobileSearchInputRef = useRef<HTMLInputElement>(null);
    const { isLoggedIn } = useMagic();

    const handleLoginClick = () => {
        setLoginMode('login');
        setLoginModalOpen(true);
    };

    const handleSignupClick = () => {
        setLoginMode('signup');
        setLoginModalOpen(true);
    };

    // Handle search submission
    const handleSearch = (query: string) => {
        if (query.trim()) {
            router.push(`/search?q=${encodeURIComponent(query.trim())}`);
            setShowMobileSearch(false);
        }
    };

    // Handle search input key press
    const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSearch(searchQuery);
        } else if (e.key === 'Escape') {
            setSearchQuery('');
            searchInputRef.current?.blur();
        }
    };

    // Handle mobile search key press
    const handleMobileSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSearch(e.currentTarget.value);
        } else if (e.key === 'Escape') {
            setShowMobileSearch(false);
        }
    };

    // Focus mobile search when opened
    useEffect(() => {
        if (showMobileSearch) {
            setTimeout(() => {
                mobileSearchInputRef.current?.focus();
            }, 100);
        }
    }, [showMobileSearch]);

    return (
        <>
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-16 items-center">
                    {/* Logo */}
                    <div className="mr-4 hidden md:flex">
                        <Link href="/" className="mr-6 flex items-center space-x-2">
                            <span className="hidden font-bold sm:inline-block text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                TradeWizard
                            </span>
                        </Link>
                    </div>

                    {/* Mobile Logo */}
                    <div className="mr-2 flex md:hidden">
                        <Link href="/" className="flex items-center space-x-2">
                            <span className="font-bold text-lg bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                TradeWizard
                            </span>
                        </Link>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="mr-4 hidden md:flex">
                        <nav className="flex items-center space-x-6 text-sm font-medium">
                            <Link
                                href="/"
                                className={`transition-colors hover:text-foreground/80 ${
                                    pathname === "/" ? "text-foreground" : "text-foreground/60"
                                }`}
                            >
                                Markets
                            </Link>
                            <Link
                                href="/dashboard"
                                className={`transition-colors hover:text-foreground/80 ${
                                    pathname === "/dashboard" ? "text-foreground" : "text-foreground/60"
                                }`}
                            >
                                Dashboard
                            </Link>
                        </nav>
                    </div>

                    {/* Search Bar - Desktop */}
                    <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
                        <div className="w-full flex-1 md:w-auto md:flex-none">
                            <div className="hidden md:block">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <input
                                        ref={searchInputRef}
                                        type="search"
                                        placeholder="Search markets..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={handleSearchKeyPress}
                                        className="h-9 w-[300px] rounded-md border border-input bg-transparent pl-8 pr-3 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    />
                                    <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 sm:flex">
                                        <span className="text-xs">/</span>
                                    </kbd>
                                </div>
                            </div>
                        </div>

                        {/* Auth Buttons */}
                        <nav className="flex items-center space-x-2">
                            {isLoggedIn ? (
                                <UserMenu />
                            ) : (
                                <>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="hidden sm:inline-flex"
                                        onClick={handleLoginClick}
                                    >
                                        Log In
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={handleSignupClick}
                                    >
                                        Sign Up
                                    </Button>
                                </>
                            )}

                            {/* Mobile Search Toggle */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="md:hidden"
                                onClick={() => setShowMobileSearch(!showMobileSearch)}
                            >
                                <Search className="h-4 w-4" />
                                <span className="sr-only">Search</span>
                            </Button>

                            {/* Mobile Menu Toggle */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="md:hidden"
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            >
                                <Menu className="h-4 w-4" />
                                <span className="sr-only">Menu</span>
                            </Button>
                        </nav>
                    </div>
                </div>

                {/* Mobile Search */}
                {showMobileSearch && (
                    <div className="border-t px-4 py-4 md:hidden">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <input
                                ref={mobileSearchInputRef}
                                type="search"
                                placeholder="Search markets..."
                                onKeyDown={handleMobileSearchKeyPress}
                                className="h-9 w-full rounded-md border border-input bg-transparent pl-8 pr-3 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>
                    </div>
                )}

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="border-t px-4 py-4 md:hidden">
                        <nav className="grid gap-4">
                            <Link
                                href="/"
                                className={`block px-2 py-1 text-lg font-medium ${
                                    pathname === "/" ? "text-foreground" : "text-foreground/70"
                                }`}
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                Markets
                            </Link>
                            <Link
                                href="/dashboard"
                                className={`block px-2 py-1 text-lg font-medium ${
                                    pathname === "/dashboard" ? "text-foreground" : "text-foreground/70"
                                }`}
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                Dashboard
                            </Link>
                            {!isLoggedIn && (
                                <div className="grid gap-2 pt-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            handleLoginClick();
                                            setMobileMenuOpen(false);
                                        }}
                                    >
                                        Log In
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            handleSignupClick();
                                            setMobileMenuOpen(false);
                                        }}
                                    >
                                        Sign Up
                                    </Button>
                                </div>
                            )}
                        </nav>
                    </div>
                )}
            </header>

            <LoginModal
                isOpen={loginModalOpen}
                onClose={() => setLoginModalOpen(false)}
                mode={loginMode}
            />
        </>
    );
}
