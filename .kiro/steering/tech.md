# Technology Stack

## Backend (tradewizard-agents)

### Core Technologies
- **Runtime**: Node.js 18+ with TypeScript 5.9+
- **Framework**: LangGraph (multi-agent workflow framework)
- **Observability**: Opik for LLM tracing and cost tracking
- **Database**: Supabase (PostgreSQL) with migrations
- **Testing**: Vitest with property-based testing (fast-check)

### Key Dependencies
- **LLM Providers**: OpenAI, Anthropic, Google GenAI
- **Market Data**: Polymarket CLOB Client
- **Logging**: Pino with structured logging
- **CLI**: Commander.js with Chalk and Ora
- **Validation**: Zod schemas

### Build System
- **Compiler**: TypeScript with ES2022 target
- **Module System**: ES modules
- **Build Output**: `dist/` directory
- **Source Maps**: Enabled for debugging

## Frontend (tradewizard-frontend)

### Core Technologies
- **Framework**: Next.js 16.1.4 with React 19
- **Styling**: Tailwind CSS 4.0
- **UI Components**: Custom components with Lucide React icons
- **Animation**: Framer Motion
- **TypeScript**: Full TypeScript support

## Common Commands

### Backend Development
```bash
# Development
npm run dev              # Hot-reload development server
npm run build           # Compile TypeScript to dist/
npm start               # Run compiled application

# Testing
npm test                # Run all tests
npm test:watch          # Watch mode testing
npm test:e2e            # End-to-end tests
npm test:performance    # Performance tests

# CLI Usage
npm run cli -- analyze <market-id>  # Analyze a market
npm run cli -- analyze <market-id> --debug  # With debug info

# Monitoring
npm run monitor:start   # Start market monitor
npm run monitor:status  # Check monitor status
npm run monitor:health  # Health check

# Database
npm run migrate         # Run database migrations
npm run migrate:status  # Check migration status

# Code Quality
npm run lint            # ESLint checking
npm run lint:fix        # Auto-fix linting issues
npm run format          # Prettier formatting
npm run format:check    # Check formatting
```

### Frontend Development
```bash
npm run dev             # Development server (localhost:3000)
npm run build           # Production build
npm start               # Start production server
npm run lint            # ESLint checking
```

## Configuration

### Environment Variables
- **LLM Providers**: OpenAI, Anthropic, Google API keys
- **Observability**: Opik API key and project settings
- **Database**: Supabase connection strings
- **LangGraph**: Checkpointer and execution settings

### Testing Configuration
- **Timeout**: 30 seconds for LLM API calls
- **Coverage**: V8 provider with text/json/html reports
- **Property Testing**: fast-check for correctness properties

## Code Quality Standards
- **TypeScript**: Strict mode enabled
- **ESLint**: TypeScript-specific rules with explicit return types
- **Prettier**: Consistent code formatting
- **Testing**: Dual approach with unit tests and property-based tests