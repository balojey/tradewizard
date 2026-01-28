# Market Status Filter

The Market Status Filter allows users to filter prediction markets by their current status, providing better navigation and discovery of relevant markets.

## Features

### Filter Options
- **All Markets** 🏛️ - Shows all available markets
- **Active** 🟢 - Shows only active, tradeable markets
- **Closed** 🔴 - Shows markets that have ended and are no longer tradeable
- **Ending Soon** ⏰ - Shows active markets ending within 7 days

### Visual Indicators
Each market card displays a status badge:
- **Active**: Green badge for markets that are currently tradeable
- **Closed**: Red badge for markets that have ended
- **Ending Soon**: Yellow badge for markets ending within 7 days

### Market Counts
The filter dropdown shows the count of markets for each status category, helping users understand the distribution of markets.

## Implementation

### Components
- `MarketStatusFilter.tsx` - The main filter dropdown component
- `MarketCard.tsx` - Updated to show status badges
- `index.tsx` - Main markets component with filter integration

### Utilities
- `marketFilters.ts` - Utility functions for filtering and counting markets
  - `filterMarketsByStatus()` - Filters markets by status
  - `getMarketStatusCounts()` - Counts markets by status
  - `isMarketEndingSoon()` - Determines if a market is ending soon

### Usage
The filter is automatically integrated into the main Markets component and persists the selected filter state during the user session.

## Market Status Logic

### Active Markets
- `market.active === true`
- `market.closed === false`

### Closed Markets
- `market.closed === true`

### Ending Soon Markets
- `market.active === true`
- `market.closed === false`
- End date is within 7 days from now
- Uses `endDateIso` or `endDate` fields from market data