# Market Intelligence Engine

Multi-agent system for prediction market analysis using LangGraph and Opik observability.

## Overview

The Market Intelligence Engine transforms raw prediction market data from Polymarket into explainable, probability-driven trade recommendations through a structured debate protocol where specialized AI agents independently analyze markets, construct competing theses, challenge assumptions, and reach consensus.

## Architecture

Built on **LangGraph** for stateful multi-agent workflows with **Opik** for comprehensive observability and tracing.

### Key Components

- **Market Ingestion**: Fetches and transforms Polymarket data
- **Intelligence Agents**: Parallel analysis from multiple perspectives
- **Thesis Construction**: Bull and bear argument generation
- **Cross-Examination**: Adversarial testing of assumptions
- **Consensus Engine**: Probability estimation with uncertainty quantification
- **Recommendation Generator**: Actionable trade recommendations

## Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn
- API keys for:
  - OpenAI (GPT-4)
  - Anthropic (Claude)
  - Google (Gemini)
  - Opik (optional, for observability)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your API keys
```

3. Configure Opik for tracing (optional):
```bash
npx opik-ts configure
# Or set OPIK_API_KEY in .env
```

### Environment Variables

See `.env.example` for all configuration options.

Required:
- `OPENAI_API_KEY`: OpenAI API key
- `ANTHROPIC_API_KEY`: Anthropic API key  
- `GOOGLE_API_KEY`: Google API key

Optional:
- `OPIK_API_KEY`: Opik API key for observability
- `OPIK_PROJECT_NAME`: Project name in Opik (default: market-intelligence-engine)

## Development

### Build

```bash
npm run build
```

### Run

```bash
npm start
```

### Development Mode

```bash
npm run dev
```

### Testing

```bash
npm test
```

### Linting

```bash
npm run lint
npm run lint:fix
```

### Formatting

```bash
npm run format
npm run format:check
```

## Project Structure

```
src/
├── nodes/          # LangGraph node implementations
├── models/         # Data models and types
├── utils/          # Utility functions
├── config/         # Configuration management
├── schemas/        # Zod schemas for validation
└── index.ts        # Entry point
```

## License

ISC
