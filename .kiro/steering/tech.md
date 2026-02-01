# TradeWizard Technical Stack

## Architecture Overview

TradeWizard is a full-stack TypeScript application with a multi-agent backend and modern web frontend, integrated with Polymarket's prediction market infrastructure.

## Backend (tradewizard-agents)

### Core Technologies
- **Runtime**: Node.js 18+ with ES2022 modules
- **Language**: TypeScript with strict mode enabled
- **AI Framework**: LangGraph for multi-agent workflows
- **LLM Providers**: OpenAI (GPT-4), Anthropic (Claude), Google (Gemini)
- **Observability**: Opik for LLM tracing and cost tracking
- **Database**: Supabase (PostgreSQL) with real-time subscriptions
- **Validation**: Zod schemas for type-safe data validation

### Key Dependencies
- `@langchain/langgraph` - Multi-agent workflow orchestration
- `@langchain/core` - LangChain core abstractions
- `@polymarket/clob-client` - Polymarket API integration
- `@supabase/supabase-js` - Database and real-time subscriptions
- `opik` - LLM observability and tracing
- `zod` - Runtime type validation

### Testing Framework
- **Unit Tests**: Vitest with 30s timeout for LLM calls
- **Property-Based Tests**: fast-check for correctness properties
- **Coverage**: V8 provider with text/json/html reports
- **E2E Tests**: Custom scripts for 24h continuous monitoring

## Frontend (tradewizard-frontend)

### Core Technologies
- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS 4
- **State Management**: React Query (@tanstack/react-query)
- **Authentication**: Magic Link SDK for wallet connection
- **Blockchain**: ethers.js v5 and viem for Web3 interactions
- **UI Components**: Lucide React icons, Framer Motion animations

### Key Dependencies
- `@polymarket/clob-client` - Trading API integration
- `@supabase/supabase-js` - Real-time data subscriptions
- `magic-sdk` - Wallet authentication
- `recharts` - Data visualization
- `date-fns` - Date manipulation

## Database & Infrastructure

### Supabase PostgreSQL
- **Real-time subscriptions** for live market data
- **Row Level Security (RLS)** for data access control
- **Auto-generated TypeScript types** from schema
- **Migration system** for schema versioning

### Key Tables
- `markets` - Market metadata and analysis status
- `recommendations` - AI-generated trade recommendations  
- `agent_signals` - Individual agent analysis results
- `analysis_history` - Audit trail of analysis runs

## Development Workflow

### Common Commands

#### Backend (tradewizard-agents)
```bash
# Development
npm run dev              # Start with hot reload
npm run build           # Compile TypeScript to dist/
npm start              # Run compiled JavaScript

# Testing
npm test               # Run all tests
npm run test:watch     # Watch mode
npm run test:e2e       # End-to-end tests
npm run test:24h       # 24-hour continuous test

# CLI Usage
npm run cli -- analyze <conditionId>  # Analyze market
npm run cli -- history <conditionId>  # Query traces

# Monitoring
npm run monitor:start   # Start monitoring service
npm run monitor:status  # Check service status

# Database
npm run migrate        # Run database migrations
npm run migrate:status # Check migration status
```

#### Frontend (tradewizard-frontend)
```bash
# Development
npm run dev    # Start Next.js dev server
npm run build  # Build for production
npm start      # Start production server
npm run lint   # ESLint checking
```

### Code Quality Standards
- **TypeScript**: Strict mode with no `any` types
- **ESLint**: Configured for TypeScript with Next.js rules
- **Prettier**: Consistent code formatting
- **Property-based testing**: Universal correctness properties
- **Error handling**: Graceful degradation patterns

## Configuration Management

### Environment Variables
- **Multi-provider LLM setup** (OpenAI, Anthropic, Google)
- **Single-provider mode** for budget-friendly operation
- **Opik integration** for observability (cloud or self-hosted)
- **LangGraph checkpointing** (memory, SQLite, PostgreSQL)

### Build Configuration
- **esbuild** for fast backend compilation
- **TypeScript** with ES2022 target
- **Vitest** for testing with globals enabled
- **Next.js** with Tailwind CSS integration

## Integration Points

### External APIs
- **Polymarket CLOB API** - Market data and trade execution
- **NewsData.io** - Real-time news feeds
- **Multiple LLM providers** - AI analysis capabilities
- **Supabase** - Database and real-time subscriptions

### Security
- **API key management** via environment variables
- **Rate limiting** for external API calls
- **Input validation** with Zod schemas
- **Audit logging** for all operations