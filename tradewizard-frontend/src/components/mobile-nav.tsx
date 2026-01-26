"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { 
  Menu, 
  X, 
  Home, 
  Search, 
  BarChart3, 
  User, 
  Settings,
  HelpCircle,
  LogOut
} from 'lucide-react';
import { useMagic } from '@/lib/magic';
import { useWallet } from '@/lib/wallet-context';

interface MobileNavProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function MobileNav({ isOpen, onToggle }: MobileNavProps) {
  const pathname = usePathname();
  const { isLoggedIn, logout } = useMagic();
  const { isConnected, disconnectWallet } = useWallet();

  const navigationItems = [
    {
      name: 'Markets',
      href: '/',
      icon: Home,
      description: 'Browse prediction markets'
    },
    {
      name: 'Search',
      href: '/search',
      icon: Search,
      description: 'Find specific markets'
    },
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: BarChart3,
      description: 'Your positions and orders',
      requiresAuth: true
    }
  ];

  const handleLinkClick = () => {
    onToggle(); // Close menu when link is clicked
  };

  const handleLogout = async () => {
    if (isConnected) {
      disconnectWallet();
    }
    if (isLoggedIn) {
      await logout();
    }
    onToggle();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
        onClick={onToggle}
      />
      
      {/* Mobile Navigation Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-background border-l border-border shadow-lg md:hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-semibold">Navigation</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                const isDisabled = item.requiresAuth && !isLoggedIn && !isConnected;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={handleLinkClick}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg transition-colors
                      ${isActive 
                        ? 'bg-primary/10 text-primary border border-primary/20' 
                        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                      }
                      ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {item.description}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Divider */}
            <div className="my-6 border-t border-border" />

            {/* User Section */}
            <div className="space-y-2">
              {isLoggedIn || isConnected ? (
                <>
                  <Link
                    href="/dashboard"
                    onClick={handleLinkClick}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <User className="h-5 w-5" />
                    <span>Profile</span>
                  </Link>
                  
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors w-full text-left"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>Sign Out</span>
                  </button>
                </>
              ) : (
                <div className="p-3 text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    Sign in to access your dashboard and trading features
                  </p>
                  <Button 
                    className="w-full"
                    onClick={onToggle}
                  >
                    Sign In
                  </Button>
                </div>
              )}
            </div>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>TradeWizard v1.0</span>
              <Link 
                href="/help" 
                onClick={handleLinkClick}
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                <HelpCircle className="h-3 w-3" />
                Help
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}