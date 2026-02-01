# TradeWizard

> AI-powered prediction trading platform providing intelligent analysis and trading recommendations for real-world outcomes on Polymarket.

## Overview

TradeWizard transforms prediction markets from speculative guessing into guided, intelligence-driven trading. Our multi-agent AI system analyzes markets from multiple perspectives to provide explainable trade recommendations with clear reasoning, catalysts, and risk scenarios.

## Architecture

```
├── tradewizard-agents/     # Multi-agent backend system (Node.js + LangGraph)
├── tradewizard-frontend/   # Web application (Next.js + React)
├── docs/                   # Product and technical documentation
└── .kiro/                  # AI assistant configuration and specs
```

### Backend (tradewizard-agents)
- **Multi-Agent AI System**: LangGraph orchestrates specialized agents for market analysis
- **Real-time Data**: Polymarket API integration with NewsData.io feeds
- **Observability**: Opik integration for LLM tracing and cost tracking
- **Database**: Supabase PostgreSQL with real-time subscriptions

### Frontend (tradewizard-frontend)
- **Modern Web App**: Next.js 16 with App Router and TypeScript
- **Seamless Trading**: Magic Link authentication with Polymarket integration
- **Real-time UI**: Live market data and AI recommendations
- **Professional Analytics**: Bloomberg Terminal-style market intelligence

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account
- API keys for LLM providers (OpenAI, Anthropic, or Google)

### Backend Setup

```bash
cd tradewizard-agents
npm install
cp .env.example .env
# Configure your environment variables
npm run migrate
npm run dev
```

### Frontend Setup

```bash
cd tradewizard-frontend
npm install
cp .env.example .env.local
# Configure your environment variables
npm run dev
```

Visit `http://localhost:3000` to access the application.

## Key Features

### 🤖 Multi-Agent Analysis
- **Market Intelligence**: Specialized agents analyze news, polling, sentiment, and market dynamics
- **Adversarial Testing**: Cross-examination agents challenge assumptions and identify risks
- **Consensus Engine**: Probability fusion from multiple analytical perspectives

### 📊 Professional Trading Interface
- **AI Recommendations**: Clear buy/sell signals with detailed reasoning
- **Risk Assessment**: Scenario analysis and position sizing guidance
- **Real-time Data**: Live market prices and news integration
- **Portfolio Management**: Track positions and performance analytics

### 🔗 Polymarket Integration
- **Direct Trading**: Execute trades through regulated prediction market infrastructure
- **Market Discovery**: Browse and analyze thousands of real-world outcome markets
- **Wallet Integration**: Seamless authentication via Magic Link

## Technology Stack

### Backend
- **Runtime**: Node.js 18+ with TypeScript
- **AI Framework**: LangGraph for multi-agent workflows
- **LLM Providers**: OpenAI (GPT-4), Anthropic (Claude), Google (Gemini)
- **Database**: Supabase (PostgreSQL)
- **Testing**: Vitest with property-based testing (fast-check)

### Frontend
- **Framework**: Next.js 16 with App Router
- **Styling**: Tailwind CSS 4
- **State Management**: React Query (@tanstack/react-query)
- **Authentication**: Magic Link SDK
- **Blockchain**: ethers.js v5 and viem

## Development

### Common Commands

#### Backend
```bash
npm run dev              # Start with hot reload
npm test                 # Run all tests
npm run cli -- analyze  # Analyze specific market
npm run monitor:start    # Start monitoring service
```

#### Frontend
```bash
npm run dev    # Start Next.js dev server
npm run build  # Build for production
npm run lint   # ESLint checking
```

### Testing
- **Unit Tests**: Vitest with 30s timeout for LLM calls
- **Property-Based Tests**: fast-check for correctness properties
- **E2E Tests**: Custom scripts for 24h continuous monitoring
- **Integration Tests**: Full workflow validation

## Documentation

- [Product Overview](docs/TradeWizard.md) - Detailed product specification
- [AI Debate Protocol](docs/TradeWizard%20Debate%20Protocol.md) - Multi-agent system design
- [Technical Architecture](docs/Trade%20Wizard%20—%20Market%20Debate%20League%20(agent%20System%20Specification).md) - System specification
- [Backend Documentation](tradewizard-agents/README.md) - Backend setup and API reference
- [Frontend Documentation](tradewizard-frontend/README.md) - Frontend development guide

## Configuration

### Environment Variables

#### Backend (.env)
```bash
# LLM Providers
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GOOGLE_API_KEY=your_google_key

# Database
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key

# External APIs
POLYMARKET_API_KEY=your_polymarket_key
NEWSDATA_API_KEY=your_newsdata_key

# Observability
OPIK_API_KEY=your_opik_key
```

#### Frontend (.env.local)
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key

# Magic Link
NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY=your_magic_key

# Polymarket
NEXT_PUBLIC_POLYMARKET_API_URL=https://clob.polymarket.com
```

## Deployment

### Production Deployment
- **Backend**: Docker containerization with PM2 process management
- **Frontend**: Vercel or similar Next.js hosting platform
- **Database**: Supabase managed PostgreSQL
- **Monitoring**: Opik for LLM observability

See [Deployment Guide](tradewizard-agents/DEPLOYMENT.md) for detailed instructions.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Quality
- TypeScript strict mode with no `any` types
- ESLint + Prettier for consistent formatting
- Property-based testing for correctness properties
- Comprehensive test coverage requirements

## License

This project is proprietary software. All rights reserved.

## Support

- 📧 Email: support@tradewizard.ai
- 📖 Documentation: [docs/](docs/)
- 🐛 Issues: GitHub Issues
- 💬 Discussions: GitHub Discussions

---

**Disclaimer**: TradeWizard provides AI-generated analysis for educational and informational purposes. All trading involves risk. Past performance does not guarantee future results. Please trade responsibly.