# Project Structure

## Repository Layout

```
├── docs/                           # Product documentation
├── tradewizard-agents/            # Backend multi-agent system
├── tradewizard-frontend/          # Next.js web application
└── .kiro/                         # Kiro configuration and specs
    ├── specs/                     # Feature specifications
    └── steering/                  # Project steering documents
```

## Backend Structure (tradewizard-agents/)

### Core Directories

```
src/
├── nodes/                         # LangGraph node implementations
│   ├── market-ingestion.ts       # Polymarket data ingestion
│   ├── agents.ts                 # Intelligence agent nodes
│   ├── thesis-construction.ts    # Bull/bear thesis generation
│   ├── cross-examination.ts      # Adversarial testing
│   ├── consensus-engine.ts       # Probability consensus
│   └── recommendation-generation.ts # Trade recommendations
├── models/                        # Data models and schemas
│   ├── types.ts                  # TypeScript interfaces
│   ├── schemas.ts                # Zod validation schemas
│   └── state.ts                  # LangGraph state definition
├── utils/                         # Utility functions and services
│   ├── polymarket-client.ts      # Market data client
│   ├── audit-logger.ts           # Audit trail logging
│   ├── newsdata-*.ts             # News data integration
│   └── performance-*.ts          # Performance monitoring
├── config/                        # Configuration management
├── database/                      # Database layer
│   ├── persistence.ts            # Data persistence
│   ├── migrations/               # Database migrations
│   └── supabase-client.ts        # Supabase integration
├── workflow.ts                    # Main LangGraph workflow
├── cli.ts                        # Command-line interface
└── monitor.ts                    # Automated monitoring service
```

### Supporting Files

```
├── dist/                          # Compiled JavaScript output
├── docs/                         # Technical documentation
├── scripts/                      # Utility scripts
├── supabase/                     # Database configuration
│   ├── migrations/               # SQL migration files
│   └── config.toml              # Supabase configuration
├── .env.example                  # Environment template
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
├── vitest.config.ts              # Test configuration
└── eslint.config.js              # Linting rules
```

## Frontend Structure (tradewizard-frontend/)

### Next.js App Router Structure

```
src/
├── app/                          # Next.js app router
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Home page
│   └── globals.css              # Global styles
├── components/                   # React components
│   ├── ui/                      # Base UI components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── navbar.tsx
│   ├── categories-bar.tsx       # Market categories
│   └── market-card.tsx          # Market display component
└── lib/                         # Utility libraries
    ├── polymarket.ts            # Market data utilities
    └── utils.ts                 # General utilities
```

## File Naming Conventions

### Backend
- **Node files**: `kebab-case.ts` (e.g., `market-ingestion.ts`)
- **Test files**: `*.test.ts` for unit tests, `*.property.test.ts` for property-based tests
- **Integration tests**: `*.integration.test.ts`
- **Performance tests**: `*.performance.test.ts`
- **Utility files**: Descriptive names with service suffix (e.g., `polymarket-client.ts`)

### Frontend
- **Components**: `kebab-case.tsx`
- **Pages**: Next.js convention (`page.tsx`, `layout.tsx`)
- **Utilities**: `camelCase.ts`

## Configuration Files

### Backend Configuration
- **TypeScript**: `tsconfig.json` with ES2022 target and strict mode
- **Testing**: `vitest.config.ts` with 30s timeout for LLM calls
- **Linting**: `eslint.config.js` with TypeScript-specific rules
- **Environment**: `.env` files for different environments

### Frontend Configuration
- **Next.js**: `next.config.ts` for framework configuration
- **Styling**: `postcss.config.mjs` and Tailwind CSS
- **TypeScript**: `tsconfig.json` with Next.js optimizations

## Key Architectural Patterns

### Multi-Agent System
- Each agent is implemented as a separate LangGraph node
- Shared state flows through the workflow using GraphState schema
- Parallel execution where possible, sequential where dependencies exist

### Data Flow
```
Polymarket APIs → MarketBriefingDocument → AgentSignals → 
Thesis Construction → Cross-Examination → Consensus → 
Trade Recommendation
```

### Testing Strategy
- **Unit Tests**: Specific examples and edge cases
- **Property Tests**: Universal properties across random inputs
- **Integration Tests**: End-to-end workflows with real APIs
- **Performance Tests**: Load and stress testing