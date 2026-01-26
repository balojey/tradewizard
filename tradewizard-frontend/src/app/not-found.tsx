'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home, Search, ArrowLeft } from 'lucide-react';

/**
 * 404 Not Found Page
 * Provides helpful navigation options when users encounter missing pages
 */
export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md mx-auto text-center">
        {/* 404 Illustration */}
        <div className="mb-8">
          <div className="text-6xl font-bold text-muted-foreground mb-2">404</div>
          <h1 className="text-2xl font-bold mb-2">Page Not Found</h1>
          <p className="text-muted-foreground">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        {/* Navigation Options */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/">
              <Button className="w-full sm:w-auto gap-2">
                <Home className="h-4 w-4" />
                Go to Markets
              </Button>
            </Link>
            
            <Link href="/search">
              <Button variant="outline" className="w-full sm:w-auto gap-2">
                <Search className="h-4 w-4" />
                Search Markets
              </Button>
            </Link>
          </div>

          <Button
            variant="ghost"
            onClick={() => window.history.back()}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
        </div>

        {/* Helpful Links */}
        <div className="mt-8 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground mb-4">
            Looking for something specific?
          </p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Link 
              href="/?tag=politics" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Politics Markets
            </Link>
            <Link 
              href="/?tag=sports" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Sports Markets
            </Link>
            <Link 
              href="/?tag=crypto" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Crypto Markets
            </Link>
            <Link 
              href="/dashboard" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}