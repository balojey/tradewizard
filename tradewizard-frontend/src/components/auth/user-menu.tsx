"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { User, LogOut, Settings, Wallet, ChevronDown } from 'lucide-react';
import { useMagic } from '@/lib/magic';

export function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout, loading } = useMagic();

  if (loading) {
    return (
      <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
    );
  }

  if (!user) return null;

  const handleLogout = async () => {
    try {
      await logout();
      setIsOpen(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getInitials = (email: string) => {
    return email.charAt(0).toUpperCase();
  };

  const truncateEmail = (email: string) => {
    if (email.length <= 20) return email;
    return email.substring(0, 17) + '...';
  };

  return (
    <div className="relative">
      {/* User Avatar Button */}
      <Button
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className="h-9 w-auto px-2 gap-2"
      >
        <div className="h-7 w-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
          {getInitials(user.email)}
        </div>
        <span className="hidden sm:block text-sm font-medium">
          {truncateEmail(user.email)}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div className="absolute right-0 top-full mt-2 w-64 bg-background border border-border rounded-lg shadow-lg z-50 py-2">
            {/* User Info */}
            <div className="px-4 py-3 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                  {getInitials(user.email)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {user.publicAddress ? 
                      `${user.publicAddress.slice(0, 6)}...${user.publicAddress.slice(-4)}` : 
                      'Wallet connected'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-2">
              <button
                className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-3"
                onClick={() => setIsOpen(false)}
              >
                <User className="h-4 w-4" />
                Profile
              </button>
              
              <button
                className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-3"
                onClick={() => setIsOpen(false)}
              >
                <Wallet className="h-4 w-4" />
                Wallet
              </button>
              
              <button
                className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-3"
                onClick={() => setIsOpen(false)}
              >
                <Settings className="h-4 w-4" />
                Settings
              </button>
            </div>

            {/* Logout */}
            <div className="border-t border-border pt-2">
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-3 text-red-600 dark:text-red-400"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}