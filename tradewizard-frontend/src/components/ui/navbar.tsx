"use client";

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from './button';
import { Search, Menu, X } from 'lucide-react';
import { LoginModal } from '@/components/auth/login-modal';
import { UserMenu } from '@/components/auth/user-menu';
import { useMagic } from '@/lib/magic';

export function Navbar() {
    const router = useRouter();
    const [loginModalOpen, setLoginModalOpen] = useState(false);
    const [loginMode, setLoginMode] = useState<'login' | 'signup'>('login');
    const [searchQuery, setSearchQuery] = useState('');
    const [showMobileSearch, setShowMobileSearch] = useState(false);
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

    // Focus search input when / is pressed
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                // Only trigger if not in an input field
                if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                    searchInputRef.current?.focus();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Focus mobile search when opened
    useEffect(() => {
        if (showMobileSearch) {
            setTimeout(() => mobileSearchInputRef.current?.focus(), 100);
        }
    }, [showMobileSearch]);

    return (
        <>
            <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-14 max-w-screen-2xl items-center mx-auto px-4 gap-4">

                    {/* Left: Logo & Links */}
                    <div className="flex items-center gap-6 md:gap-8 flex-1 md:flex-none">
                        <Link href="/" className="flex items-center space-x-2">
                            <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
                                TradeWizard
                            </span>
                        </Link>
                        
                        {/* Navigation Links */}
                        <nav className="hidden md:flex items-center gap-6">
                            <Link 
                                href="/" 
                                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Markets
                            </Link>
                            <Link 
                                href="/dashboard" 
                                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Dashboard
                            </Link>
                        </nav>
                    </div>

                    {/* Center: Search Bar (Desktop) */}
                    <div className="flex-1 hidden md:flex max-w-xl mx-auto">
                        <div className="relative w-full">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Search markets..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleSearchKeyPress}
                                className="h-10 w-full rounded-lg border border-input bg-muted/30 px-10 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                            {searchQuery && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted"
                                >
                                    <X className="h-3 w-3" />
                                </Button>
                            )}
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden lg:flex items-center gap-1">
                                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                                    <span className="text-xs">/</span>
                                </kbd>
                            </div>
                        </div>
                    </div>

                    {/* Right: Auth & Tools */}
                    <div className="flex items-center gap-2 justify-end flex-1 md:flex-none">
                        {isLoggedIn ? (
                            <UserMenu />
                        ) : (
                            <>
                                <Button 
                                    variant="ghost" 
                                    className="hidden sm:flex text-sm font-medium"
                                    onClick={handleLoginClick}
                                >
                                    Log In
                                </Button>
                                <Button 
                                    className="h-9 px-4 font-semibold text-white bg-blue-600 hover:bg-blue-700"
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
                            {showMobileSearch ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
                        </Button>
                        
                        <Button variant="ghost" size="icon">
                            <Menu className="h-5 w-5" />
                        </Button>
                    </div>
                </div>

                {/* Mobile Search Bar */}
                {showMobileSearch && (
                    <div className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur-md">
                        <div className="container max-w-screen-2xl mx-auto px-4 py-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    ref={mobileSearchInputRef}
                                    type="text"
                                    placeholder="Search markets..."
                                    onKeyDown={handleMobileSearchKeyPress}
                                    className="h-10 w-full rounded-lg border border-input bg-background px-10 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                />
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        const input = mobileSearchInputRef.current;
                                        if (input?.value.trim()) {
                                            handleSearch(input.value);
                                        }
                                    }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 h-6 px-2 text-xs"
                                >
                                    Search
                                </Button>
                            </div>
                        </div>
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
