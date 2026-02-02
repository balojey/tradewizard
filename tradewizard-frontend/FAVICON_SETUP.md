# TradeWizard Favicon Setup

This document explains the favicon configuration for the TradeWizard frontend.

## Current Setup

The favicon system uses Next.js 13+ App Router conventions with dynamic icon generation:

### Dynamic Icons (Recommended)
- `app/icon.tsx` - Generates 32x32 PNG favicon dynamically
- `app/apple-icon.tsx` - Generates 180x180 Apple Touch Icon dynamically  
- `app/favicon.ico/route.ts` - Generates ICO format dynamically

### Static Icons (Fallback)
- `public/favicon.svg` - Vector favicon for modern browsers
- `public/safari-pinned-tab.svg` - Safari pinned tab icon
- `public/favicon-32x32.png` - Static 32x32 PNG (if needed)

## Benefits of Dynamic Icons

1. **Always up-to-date**: Icons are generated on-demand
2. **Consistent branding**: Uses the same design system colors and fonts
3. **Smaller bundle**: No need to store multiple PNG files
4. **Edge optimized**: Generated at the edge for fast delivery

## Metadata Configuration

The `app/layout.tsx` includes proper metadata for all icon formats:

```typescript
export const metadata: Metadata = {
  icons: {
    icon: "/favicon.svg",           // Vector favicon
    apple: "/apple-icon",           // Dynamic Apple Touch Icon
    other: [
      { rel: "mask-icon", url: "/safari-pinned-tab.svg", color: "#6366f1" },
    ],
  },
  manifest: "/site.webmanifest",
  themeColor: "#000000",
};
```

## PWA Manifest

The `public/site.webmanifest` references the appropriate icons for Progressive Web App functionality.

## Troubleshooting

If favicons aren't showing up on Vercel:

1. **Clear browser cache**: Hard refresh (Ctrl+F5 or Cmd+Shift+R)
2. **Check deployment**: Ensure all icon files are deployed
3. **Verify routes**: Test `/icon`, `/apple-icon`, and `/favicon.ico` directly
4. **Browser dev tools**: Check Network tab for 404s on icon requests

## Fallback Generation

If you need static PNG files, use the `generate-favicons.html` tool:

1. Open `generate-favicons.html` in a browser
2. Click "Generate All Favicons" 
3. Download the generated PNG files
4. Place them in the `public/` directory

## Design Specifications

- **Colors**: Gradient from #111827 to #000000 (background), #818cf8 (text)
- **Typography**: System font stack, 900 weight
- **Border**: Subtle white border with 10% opacity
- **Border radius**: Proportional to icon size (15% of width/height)