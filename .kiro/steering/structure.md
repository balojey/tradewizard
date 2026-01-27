---
inclusion: always
---

# Project Structure & Development Guidelines

## Repository Layout

TradeWizard is a monorepo with two main applications:

```
├── tradewizard-agents/            # Backend: Multi-agent LangGraph system
├── tradewizard-frontend/          # Frontend: Next.js web application
├── docs/                          # Product documentation
└── .kiro/                         # Kiro configuration and specs
```

## Backend Architecture (tradewizard-agents/)

### Core Directory Structure

When working with the backend, follow this organization:

```
src/
├── nodes/                         # LangGraph workflow nodes (core business logic)
├── models/                        # Data models, schemas, and state definitions
├── utils/                         # Reusable services and utilities
├── config/                        # Configuration management
├── database/                      # Data persistence layer
├── workflow.ts                    # Main LangGraph workflow orchestration
├── cli.ts                        # Command-line interface
└── monitor.ts                    # Automated monitoring service
```

### Development Rules

**File Placement Guidelines:**
- **New LangGraph nodes**: Place in `src/nodes/` with descriptive kebab-case names
- **Data models**: Define TypeScript interfaces in `src/models/types.ts`, Zod schemas in `src/models/schemas.ts`
- **External integrations**: Create clients in `src/utils/` with `-client.ts` suffix
- **Database operations**: Add to `src/database/` with appropriate migrations
- **Configuration**: Environment-specific configs go in `src/config/`

**Code Organization Patterns:**
- Each LangGraph node should be self-contained with its own types and validation
- Shared state flows through `GraphState` schema defined in `src/models/state.ts`
- Use dependency injection pattern for external services (Polymarket, news APIs)
- Implement graceful degradation - partial failures shouldn't crash the workflow

## Frontend Architecture (tradewizard-frontend/)

### Next.js App Router Structure

```
├── app/                          # Next.js 13+ app router pages
├── components/                   # React components (organized by feature)
├── hooks/                        # Custom React hooks
├── lib/                          # Utility libraries and configurations
├── providers/                    # React context providers
└── utils/                        # Pure utility functions
```

**Component Organization:**
- Group related components in feature folders under `components/`
- Shared UI components go in `components/shared/`
- Page-specific components can be co-located with their routes

## File Naming Conventions

### Backend (TypeScript)
- **LangGraph nodes**: `kebab-case.ts` (e.g., `market-ingestion.ts`)
- **Utilities/Services**: `kebab-case.ts` with descriptive suffix (e.g., `polymarket-client.ts`)
- **Test files**: 
  - Unit tests: `*.test.ts`
  - Property-based tests: `*.property.test.ts`
  - Integration tests: `*.integration.test.ts`
  - Performance tests: `*.performance.test.ts`

### Frontend (React/Next.js)
- **Components**: `PascalCase.tsx` for component files
- **Pages**: Follow Next.js conventions (`page.tsx`, `layout.tsx`)
- **Hooks**: `camelCase.ts` with `use` prefix
- **Utilities**: `camelCase.ts`

## Testing Strategy & Requirements

### Backend Testing
- **Unit Tests**: Test individual functions and classes with specific examples
- **Property Tests**: Use fast-check for testing universal properties across random inputs
- **Integration Tests**: Test complete workflows with real external APIs
- **Performance Tests**: Load testing for LLM-heavy operations (30s timeout configured)

### Test File Requirements
- All new backend features MUST include both unit and property-based tests
- LangGraph nodes MUST have integration tests that verify the complete workflow
- External API clients MUST have tests that can run against real APIs (with proper mocking for CI)

## Architecture Patterns

### Multi-Agent System Design
- **Node Independence**: Each LangGraph node operates independently with clear inputs/outputs
- **State Management**: Use `GraphState` for passing data between nodes
- **Parallel Execution**: Design nodes to run in parallel where possible
- **Error Handling**: Implement graceful degradation - node failures shouldn't crash the entire workflow

### Data Flow Pattern
```
External APIs → Data Ingestion → Agent Analysis → 
Thesis Construction → Cross-Examination → Consensus → 
Final Recommendation
```

### External Integration Pattern
- **Client Pattern**: Create dedicated client classes for external APIs (Polymarket, news sources)
- **Rate Limiting**: Implement rate limiting and retry logic for all external calls
- **Caching**: Use appropriate caching strategies for expensive API calls
- **Observability**: All external calls must be traced through Opik integration

## Development Workflow

### Adding New Features
1. **Backend**: Create LangGraph node in `src/nodes/`, add to workflow, write tests
2. **Frontend**: Create components in appropriate feature folder, add routing if needed
3. **Integration**: Ensure proper error handling and observability
4. **Testing**: Write comprehensive test suite including property-based tests

### Database Changes
1. Create migration in `src/database/migrations/`
2. Update TypeScript types in `src/models/types.ts`
3. Update Zod schemas in `src/models/schemas.ts`
4. Test migration with `npm run migrate`

### Configuration Management
- Environment variables go in `.env` files with examples in `.env.example`
- Type-safe config validation using Zod schemas in `src/config/`
- Different configs for development, staging, and production environments