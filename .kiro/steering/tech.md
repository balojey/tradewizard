---
inclusion: always
---

# Technology Stack & Development Guidelines

## Backend (tradewizard-agents/)

### Core Stack
- **Runtime**: Node.js 18+ with TypeScript 5.9+ (strict mode)
- **Framework**: LangGraph for multi-agent workflows
- **Database**: Supabase (PostgreSQL) with type-safe migrations
- **Testing**: Vitest + fast-check for property-based testing
- **Observability**: Opik for LLM tracing and cost tracking

### Key Dependencies & Patterns
- **LLM Providers**: OpenAI, Anthropic, Google GenAI (use factory pattern)
- **Market Data**: Polymarket CLOB Client (with rate limiting)
- **Logging**: Pino structured logging (use consistent log levels)
- **Validation**: Zod schemas for all data boundaries
- **CLI**: Commander.js with Chalk/Ora for user feedback

### Architecture Requirements
- **LangGraph Nodes**: Place in `src/nodes/`, use kebab-case naming
- **State Management**: All data flows through `GraphState` schema
- **Error Handling**: Implement graceful degradation, no workflow crashes
- **External APIs**: Create dedicated clients with retry logic and caching
- **Database**: Use migrations for schema changes, type-safe queries

## Frontend (tradewizard-frontend/)

### Core Stack
- **Framework**: Next.js 16.1.4 with App Router
- **React**: Version 19 with TypeScript
- **Styling**: Tailwind CSS 4.0 (use design system tokens)
- **Icons**: Lucide React (consistent icon set)
- **Animation**: Framer Motion for interactions

### UI/UX Standards
- **Components**: Feature-based organization in `components/`
- **Shared UI**: Place reusable components in `components/shared/`
- **Hooks**: Custom hooks in `hooks/` with `use` prefix
- **State**: React Context for global state, local state for components

## Development Commands

### Backend (tradewizard-agents/)
```bash
# Development & Build
npm run dev              # Hot-reload with TypeScript watching
npm run build           # Compile to dist/ with source maps
npm start               # Run production build

# Testing (REQUIRED for all features)
npm test                # Run all tests
npm test:watch          # Watch mode for development
npm test:e2e            # Integration tests with real APIs
npm test:performance    # Load testing (30s timeout)

# CLI Operations
npm run cli -- analyze <market-id>        # Analyze market
npm run cli -- analyze <market-id> --debug # With debug output

# Monitoring & Health
npm run monitor:start   # Start automated monitoring
npm run monitor:health  # Health check endpoint

# Database Operations
npm run migrate         # Apply pending migrations
npm run migrate:status  # Check migration state
```

### Frontend (tradewizard-frontend/)
```bash
npm run dev             # Development server (localhost:3000)
npm run build           # Production build with optimization
npm run start           # Serve production build
npm run lint            # ESLint with TypeScript rules
```

## Code Quality Requirements

### TypeScript Standards
- **Strict Mode**: Always enabled, no `any` types
- **Explicit Returns**: All functions must declare return types
- **Zod Validation**: Use schemas for all external data
- **Error Types**: Define custom error classes with proper inheritance

### Testing Requirements
- **Dual Testing**: Both unit tests AND property-based tests required
- **Coverage**: Minimum 80% for new features
- **Integration**: Test complete workflows with real external APIs
- **Performance**: Load test LLM-heavy operations (30s timeout configured)

### File Naming Conventions
- **Backend**: `kebab-case.ts` for all files
- **Frontend**: `PascalCase.tsx` for components, `camelCase.ts` for utilities
- **Tests**: `*.test.ts` (unit), `*.property.test.ts` (property-based), `*.integration.test.ts`

## Configuration Management

### Environment Variables (Type-Safe)
- **LLM APIs**: OpenAI, Anthropic, Google API keys
- **Database**: Supabase connection strings with connection pooling
- **Observability**: Opik project settings and API keys
- **LangGraph**: Checkpointer configuration for state persistence

### Development Workflow
1. **Feature Development**: Create LangGraph node → Add to workflow → Write tests
2. **Database Changes**: Migration → Update types → Update schemas → Test
3. **External APIs**: Client class → Rate limiting → Error handling → Observability
4. **Frontend**: Component → Hook (if needed) → Integration → Styling

## Critical Patterns

### LangGraph Node Development
- Each node must be self-contained with clear input/output types
- Use dependency injection for external services
- Implement proper error boundaries
- Add Opik tracing for observability

### External API Integration
- Always implement rate limiting and retry logic
- Use circuit breaker pattern for unreliable services
- Cache expensive API calls appropriately
- Log all external calls with structured data

### Database Operations
- Use type-safe queries with proper error handling
- Implement connection pooling for performance
- Always use migrations for schema changes
- Add proper indexes for query performance