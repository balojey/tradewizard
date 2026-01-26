/**
 * Navigation Configuration
 * Centralized routing and navigation utilities
 * Requirements: 1.1, 2.1, 4.1
 */

export interface NavigationItem {
  name: string;
  href: string;
  description?: string;
  requiresAuth?: boolean;
  icon?: string;
  external?: boolean;
}

export interface NavigationSection {
  title: string;
  items: NavigationItem[];
}

/**
 * Main navigation items for the application
 */
export const mainNavigation: NavigationItem[] = [
  {
    name: 'Markets',
    href: '/',
    description: 'Browse prediction markets',
    icon: 'home'
  },
  {
    name: 'Search',
    href: '/search',
    description: 'Find specific markets',
    icon: 'search'
  },
  {
    name: 'Dashboard',
    href: '/dashboard',
    description: 'Your positions and orders',
    requiresAuth: true,
    icon: 'bar-chart-3'
  }
];

/**
 * Footer navigation sections
 */
export const footerNavigation: NavigationSection[] = [
  {
    title: 'Markets',
    items: [
      { name: 'All Markets', href: '/' },
      { name: 'Politics', href: '/?tag=politics' },
      { name: 'Sports', href: '/?tag=sports' },
      { name: 'Crypto', href: '/?tag=crypto' },
      { name: 'Finance', href: '/?tag=finance' }
    ]
  },
  {
    title: 'Trading',
    items: [
      { name: 'Dashboard', href: '/dashboard', requiresAuth: true },
      { name: 'Search Markets', href: '/search' },
      { name: 'How to Trade', href: '/help/trading' }
    ]
  },
  {
    title: 'Support',
    items: [
      { name: 'Help Center', href: '/help' },
      { name: 'API Documentation', href: '/docs', external: true },
      { name: 'Contact Us', href: '/contact' }
    ]
  },
  {
    title: 'Company',
    items: [
      { name: 'About', href: '/about' },
      { name: 'Privacy Policy', href: '/privacy' },
      { name: 'Terms of Service', href: '/terms' }
    ]
  }
];

/**
 * Market category routes
 */
export const marketCategories = [
  { name: 'All', slug: 'all', href: '/' },
  { name: 'Politics', slug: 'politics', href: '/?tag=politics' },
  { name: 'Sports', slug: 'sports', href: '/?tag=sports' },
  { name: 'Crypto', slug: 'crypto', href: '/?tag=crypto' },
  { name: 'Finance', slug: 'finance', href: '/?tag=finance' },
  { name: 'Entertainment', slug: 'entertainment', href: '/?tag=entertainment' },
  { name: 'Science', slug: 'science', href: '/?tag=science' }
];

/**
 * Breadcrumb generation utilities
 */
export interface BreadcrumbItem {
  name: string;
  href?: string;
  current?: boolean;
}

export function generateBreadcrumbs(pathname: string, marketTitle?: string): BreadcrumbItem[] {
  const breadcrumbs: BreadcrumbItem[] = [
    { name: 'Markets', href: '/' }
  ];

  if (pathname.startsWith('/search')) {
    breadcrumbs.push({ name: 'Search', current: true });
  } else if (pathname.startsWith('/dashboard')) {
    breadcrumbs.push({ name: 'Dashboard', current: true });
  } else if (pathname.startsWith('/market/')) {
    breadcrumbs.push({ name: 'Market Detail', href: pathname });
    if (marketTitle) {
      breadcrumbs.push({ name: marketTitle, current: true });
    }
  } else if (pathname !== '/') {
    // Handle other routes
    const segments = pathname.split('/').filter(Boolean);
    segments.forEach((segment, index) => {
      const isLast = index === segments.length - 1;
      breadcrumbs.push({
        name: segment.charAt(0).toUpperCase() + segment.slice(1),
        href: isLast ? undefined : `/${segments.slice(0, index + 1).join('/')}`,
        current: isLast
      });
    });
  }

  return breadcrumbs;
}

/**
 * Route validation utilities
 */
export function isValidRoute(pathname: string): boolean {
  const validRoutes = [
    '/',
    '/search',
    '/dashboard',
    '/about',
    '/help',
    '/contact',
    '/privacy',
    '/terms'
  ];

  // Check exact matches
  if (validRoutes.includes(pathname)) {
    return true;
  }

  // Check dynamic routes
  if (pathname.startsWith('/market/')) {
    return true;
  }

  // Check category routes
  const categoryPattern = /^\/(politics|sports|crypto|finance|entertainment|science)$/;
  if (categoryPattern.test(pathname)) {
    return true;
  }

  return false;
}

/**
 * Navigation state utilities
 */
export function getActiveNavItem(pathname: string): string | null {
  if (pathname === '/') return 'markets';
  if (pathname.startsWith('/search')) return 'search';
  if (pathname.startsWith('/dashboard')) return 'dashboard';
  if (pathname.startsWith('/market/')) return 'markets';
  
  return null;
}

/**
 * URL generation utilities
 */
export function generateMarketUrl(marketId: string): string {
  return `/market/${marketId}`;
}

export function generateSearchUrl(query?: string, filters?: Record<string, string>): string {
  const params = new URLSearchParams();
  
  if (query) {
    params.set('q', query);
  }
  
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });
  }
  
  const queryString = params.toString();
  return `/search${queryString ? `?${queryString}` : ''}`;
}

export function generateCategoryUrl(category: string): string {
  if (category === 'all') {
    return '/';
  }
  return `/?tag=${category}`;
}

/**
 * External link utilities
 */
export const externalLinks = {
  polymarket: 'https://polymarket.com',
  documentation: 'https://docs.tradewizard.ai',
  github: 'https://github.com/tradewizard',
  twitter: 'https://twitter.com/tradewizard',
  discord: 'https://discord.gg/tradewizard'
};

/**
 * Navigation event tracking
 */
export function trackNavigation(from: string, to: string, method: 'click' | 'search' | 'direct' = 'click') {
  // Analytics tracking would go here
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'navigation', {
      from_page: from,
      to_page: to,
      method: method
    });
  }
}

/**
 * Deep linking utilities
 */
export function createDeepLink(marketId: string, outcome?: string): string {
  let url = generateMarketUrl(marketId);
  
  if (outcome) {
    url += `?outcome=${encodeURIComponent(outcome)}`;
  }
  
  return url;
}

export function parseDeepLink(url: string): { marketId?: string; outcome?: string; category?: string } {
  try {
    const urlObj = new URL(url, 'https://tradewizard.ai');
    const pathname = urlObj.pathname;
    const searchParams = urlObj.searchParams;
    
    const result: { marketId?: string; outcome?: string; category?: string } = {};
    
    // Parse market ID from path
    const marketMatch = pathname.match(/^\/market\/(.+)$/);
    if (marketMatch) {
      result.marketId = marketMatch[1];
    }
    
    // Parse outcome from query params
    const outcome = searchParams.get('outcome');
    if (outcome) {
      result.outcome = outcome;
    }
    
    // Parse category from query params
    const category = searchParams.get('tag');
    if (category) {
      result.category = category;
    }
    
    return result;
  } catch (error) {
    console.error('Failed to parse deep link:', error);
    return {};
  }
}