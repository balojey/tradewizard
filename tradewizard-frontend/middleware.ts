import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware for handling URL routing and tag validation
 * Ensures proper navigation between different political tag views
 * Requirements: 8.4, 8.5
 */
export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  
  // Handle tag parameter validation on homepage
  if (pathname === '/') {
    const tag = searchParams.get('tag');
    
    if (tag) {
      // Define valid political tags (keep in sync with politics-data.ts)
      const validTags = [
        'all', 'trump', 'elections', 'us-politics', 'immigration', 'world', 'politics',
        'france', 'macron', 'biden', 'harris', 'desantis'
      ];
      
      // If tag is invalid, redirect to clean homepage
      if (!validTags.includes(tag.toLowerCase())) {
        const url = request.nextUrl.clone();
        url.pathname = '/';
        url.search = '';
        return NextResponse.redirect(url);
      }
      
      // If tag is "all", redirect to clean homepage URL
      if (tag.toLowerCase() === 'all') {
        const url = request.nextUrl.clone();
        url.search = '';
        return NextResponse.redirect(url);
      }
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};