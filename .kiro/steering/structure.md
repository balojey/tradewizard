# TradeWizard Project Structure

## Repository Organization

TradeWizard is organized as a monorepo with two main applications and shared documentation:

```
├── tradewizard-agents/     # Backend multi-agent system
├── tradewizard-frontend/   # Frontend web application  
├── docs/                   # Product and technical documentation
├── .kiro/                  # Kiro configuration and specs
└── *.json                  # Root-level market data files
```

## Backend Structure (tradewizard-agents/)

### Core Directories

```
src/
├── nodes/              # LangGraph node implementations
│   ├── market-ingestion.ts      # Polymarket data ingestion
│   ├── agents.ts                # Multi-agent analysis nodes
│   ├── thesis-construction.ts   # Bull/bear thesis generation
│   ├── cross-examination.ts     # Adversarial testing
│   ├── consensus-engine.ts      # Probability consensus
│   └── recommendation-generation.ts # Final trade recommendations
├── models/             # Data models and type definitions
│   ├── types.ts               # TypeScript interfaces
│   ├── schemas.ts             # Zod validation schemas
│   └── state.ts               # LangGraph state management
├── utils/              # Utility functions and integrations
│   ├── polymarket-client.ts   # Polymarket API wrapper
│   ├── newsdata-*.ts          # News data integration
│   ├── audit-logger.ts        # Audit trail logging
│   └── enhanced-*.ts          # Enhanced feature implementations
├── config/             # Configuration management
├── database/           # Database utilities and migrations
│   ├── persistence.ts         # Data persistence layer
│   ├── supabase-client.ts     # Supabase integration
│   └── migrations/            # Database schema migrations
├── workflow.ts         # Main LangGraph workflow definition
├── cli.ts             # Command-line interface
├── monitor.ts         # Monitoring service
└── index.ts           # Application entry point
```

### Supporting Directories

```
scripts/               # Utility scripts
├── e2e-test.ts       # End-to-end testing
├── run-24h-test.ts   # Long-running tests
└── migrate-news-api.ts # Data migration scripts

docs/                 # Backend-specific documentation
├── E2E_*.md         # End-to-end testing guides
├── DEPLOYMENT.md    # Deployment instructions
└── *.md             # Various technical guides

supabase/            # Supabase configuration
├── migrations/      # Database migrations
└── config.toml      # Supabase project config
```

## Frontend Structure (tradewizard-frontend/)

### App Router Structure (Next.js 16)

```
app/
├── api/                    # API routes
│   ├── polymarket/        # Polymarket proxy endpoints
│   └── tradewizard/       # TradeWizard-specific APIs
├── market/[slug]/         # Individual market pages
├── performance/           # Performance analytics
├── positions/             # User positions
├── orders/               # Order management
├── wallet/               # Wallet management
└── page.tsx              # Homepage
```

### Component Architecture

```
components/
├── Trading/              # Trading-related components
│   ├── Markets/         # Market discovery and display
│   │   ├── MarketCard.tsx           # Individual market cards
│   │   ├── AIInsightsPanel.tsx      # AI recommendation display
│   │   ├── RecommendationBadge.tsx  # Quick recommendation preview
│   │   └── MarketSearch.tsx         # Market filtering/search
│   ├── TradeRecommendation/  # AI recommendation components
│   ├── Orders/              # Order management UI
│   └── Positions/           # Position tracking UI
├── Performance/          # Performance analytics components
├── Header/              # Navigation and wallet info
├── TradingSession/      # Trading session management
└── shared/              # Reusable UI components
    ├── Card.tsx         # Base card component
    ├── Badge.tsx        # Status badges
    ├── LoadingState.tsx # Loading indicators
    └── ErrorState.tsx   # Error handling UI
```

### Supporting Directories

```
hooks/                   # Custom React hooks
├── useTradeRecommendation.ts  # AI recommendation fetching
├── useMarkets.ts             # Market data management
├── useTradingSession.ts      # Trading session orchestration
└── useClobClient.ts          # Polymarket CLOB integration

lib/                    # Utility libraries
├── supabase.ts        # Supabase client configuration
├── magic.ts           # Magic Link authentication
└── database.types.ts  # Auto-generated DB types

providers/             # React context providers
├── WalletProvider.tsx # Wallet state management
├── TradingProvider.tsx # Trading session context
└── QueryProvider.tsx  # React Query configuration

utils/                 # Pure utility functions
├── formatting.ts      # Data formatting helpers
├── validation.ts      # Input validation
└── marketFilters.ts   # Market filtering logic
```

## Shared Resources

### Documentation (docs/)

```
docs/
├── TradeWizard.md                    # Product overview
├── TradeWizard Debate Protocol.md    # AI agent debate system
├── Trade Wizard — Market Debate League.md # System specification
├── newsdata-docs.md                  # News data integration
└── tradewizard-agentic-workflow.png  # Architecture diagram
```

### Kiro Configuration (.kiro/)

```
.kiro/
├── specs/              # Feature specifications
│   ├── advanced-agent-league/
│   ├── market-intelligence-engine/
│   ├── polymarket-integration-enhancement/
│   └── */              # Other feature specs
└── steering/           # AI assistant guidance
    ├── product.md      # Product overview
    ├── tech.md         # Technical stack
    └── structure.md    # This file
```

## File Naming Conventions

### Backend (TypeScript/Node.js)
- **Kebab-case** for files: `market-ingestion.ts`, `consensus-engine.ts`
- **Test files**: `*.test.ts` for unit tests, `*.property.test.ts` for property-based tests
- **Integration tests**: `*.integration.test.ts`, `*.e2e.test.ts`
- **Configuration**: `*.config.ts`, `*.config.js`

### Frontend (React/Next.js)
- **PascalCase** for components: `MarketCard.tsx`, `AIInsightsPanel.tsx`
- **camelCase** for hooks: `useTradeRecommendation.ts`, `useMarkets.ts`
- **kebab-case** for utilities: `market-filters.ts`, `formatting.ts`
- **Route files**: `page.tsx`, `layout.tsx`, `route.ts`

## Import/Export Patterns

### Barrel Exports
- `src/nodes/index.ts` - Exports all LangGraph nodes
- `components/shared/index.ts` - Exports reusable UI components
- `hooks/index.ts` - Exports custom hooks

### Relative Imports
- Use relative imports within the same feature directory
- Use absolute imports for cross-feature dependencies
- Prefer named exports over default exports for better tree-shaking

## Testing Organization

### Backend Testing
- **Unit tests**: Co-located with source files (`*.test.ts`)
- **Property tests**: Separate files (`*.property.test.ts`)
- **Integration tests**: Feature-specific directories
- **E2E tests**: `scripts/` directory for complex workflows

### Frontend Testing
- **Component tests**: `__tests__/` directories within feature folders
- **Hook tests**: Co-located with hook files
- **Integration tests**: `app/` level for full user flows