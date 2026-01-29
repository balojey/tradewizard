# TradeWizard Frontend

A Next.js-based web application that provides the user interface for accessing AI-generated market intelligence and executing trades on Polymarket.

## Features

### 🤖 AI-Powered Trade Recommendations
- **Supabase Integration**: Direct connection to the TradeWizard agents database
- **Real-time Recommendations**: Fetch AI-generated trade recommendations stored by the backend
- **Multi-Agent Analysis**: Display insights from specialized AI agents with adversarial reasoning
- **Explainable AI**: Full transparency into recommendation logic, catalysts, and risk scenarios

### 📊 Market Intelligence
- **Market Discovery**: Browse and filter prediction markets with infinite scroll
- **Real-time Pricing**: Live market prices via Polymarket CLOB API
- **Market Analytics**: Volume, liquidity, and trend analysis
- **Event-based Organization**: Markets grouped by events and categories

### 💰 Trading Interface
- **Magic Link Authentication**: Seamless wallet connection via Magic Link
- **Safe Wallet Integration**: Deterministic Safe deployment from EOA
- **Order Management**: Place, cancel, and track orders via Polymarket CLOB
- **Token Approvals**: Automated ERC-20 and ERC-1155 approvals
- **USDC.e Management**: Balance tracking and Polygon transfers

## Architecture

### Core Components

#### AI Recommendation System
- `useTradeRecommendation()` - Fetch recommendations from Supabase
- `TradeRecommendation` - Full recommendation display with detailed analysis
- `RecommendationButton` - Quick recommendation preview in market cards

#### Market Data
- `useMarkets()` - Market discovery with filtering and pagination
- `usePublicMarketPrices()` - Real-time pricing for unauthenticated users
- `MarketCard` - Market display with AI recommendation integration

#### Trading Session
- `useTradingSession()` - Complete trading session orchestration
- `useClobClient()` - Authenticated CLOB client management
- `useUserApiCredentials()` - API credential derivation and management

### Database Integration

The frontend connects directly to the same Supabase database used by the TradeWizard agents backend:

```typescript
// Database Tables
- markets: Market metadata and analysis status
- recommendations: AI-generated trade recommendations
- agent_signals: Individual agent analysis results
- analysis_history: Audit trail of analysis runs
```

### Data Flow

```
TradeWizard Agents (Backend)
    ↓ (Stores recommendations)
Supabase Database
    ↓ (Real-time queries)
Frontend Hooks
    ↓ (React Query caching)
UI Components
    ↓ (User interaction)
Trading Execution
```

## Getting Started

### Prerequisites

1. **Supabase Configuration**
   ```bash
   # Copy environment template
   cp .env.example .env.local
   
   # Configure Supabase connection
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

2. **Magic Link Setup**
   ```bash
   # Configure Magic Link for wallet authentication
   NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY=your_magic_publishable_key
   ```

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Database Types

The frontend uses auto-generated TypeScript types from the Supabase schema:

```bash
# Generate types (requires Supabase CLI)
npx supabase gen types typescript --local > lib/database.types.ts
```

## Key Features

### AI Recommendation Integration

The frontend seamlessly integrates with the TradeWizard agents backend through Supabase:

1. **Automatic Loading**: Recommendations are automatically fetched when viewing markets
2. **Real-time Updates**: React Query provides caching and background updates
3. **Detailed Analysis**: Full breakdown of agent reasoning, catalysts, and risks
4. **Visual Indicators**: Clear action signals (BUY YES, BUY NO, NO TRADE) with expected value

### Market Intelligence

- **Smart Filtering**: Filter by categories, tags, and market status
- **Trend Analysis**: Volume and liquidity trending indicators
- **Event Grouping**: Related markets grouped by events
- **Real-time Pricing**: Live bid/ask spreads and mid prices

### Trading Execution

- **One-Click Trading**: Direct integration from AI recommendations to order placement
- **Risk Management**: Liquidity risk assessment and position sizing
- **Order Management**: Track active orders and positions
- **Safe Integration**: Secure multi-sig wallet deployment and management

## Development

### Project Structure

```
├── app/                    # Next.js App Router pages
├── components/
│   ├── Trading/           # Trading-related components
│   │   ├── Markets/       # Market discovery and display
│   │   ├── TradeRecommendation/  # AI recommendation components
│   │   ├── Orders/        # Order management
│   │   └── Positions/     # Position tracking
│   └── shared/            # Reusable UI components
├── hooks/                 # Custom React hooks
├── lib/                   # Utility libraries (Supabase, Magic)
├── providers/             # React context providers
└── utils/                 # Pure utility functions
```

### Key Hooks

- `useTradeRecommendation(conditionId)` - Fetch AI recommendation for a market
- `useMultipleRecommendations(conditionIds)` - Batch fetch recommendations
- `useMarkets(options)` - Market discovery with filtering
- `useTradingSession()` - Complete trading session management
- `useClobClient()` - Authenticated Polymarket CLOB client

### Component Architecture

Components follow a feature-based organization with clear separation of concerns:

- **Smart Components**: Handle data fetching and state management
- **Presentation Components**: Pure UI components with props
- **Shared Components**: Reusable UI elements (Card, Badge, LoadingState)

## Integration with TradeWizard Agents

The frontend is designed to work seamlessly with the TradeWizard agents backend:

1. **Shared Database**: Both systems use the same Supabase database
2. **Real-time Sync**: Frontend automatically reflects backend analysis results
3. **Type Safety**: Shared TypeScript types ensure data consistency
4. **Graceful Degradation**: Frontend handles missing recommendations gracefully

## Deployment

The frontend can be deployed independently of the backend:

```bash
# Build for production
npm run build

# Start production server
npm start
```

Environment variables must be configured for:
- Supabase connection
- Magic Link authentication
- Application configuration

## Contributing

1. Follow the established component patterns
2. Use TypeScript strictly (no `any` types)
3. Implement proper error handling
4. Add loading states for async operations
5. Test with real Supabase data

## License

This project is part of the TradeWizard platform for AI-powered prediction market trading.