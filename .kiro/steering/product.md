# Product Overview

TradeWizard is an AI-powered prediction trading platform that serves as the intelligence layer for real-world prediction markets. The system consists of two main components:

## Core Components

### TradeWizard Agents (Backend)
A multi-agent system built on LangGraph that transforms raw prediction market data from Polymarket into explainable, probability-driven trade recommendations. The system uses specialized AI agents that independently analyze markets, construct competing theses, challenge assumptions, and reach consensus on fair probability estimates.

**Key Features:**
- Multi-agent analysis with adversarial reasoning
- Structured debate protocol between bull and bear theses
- Probability-driven consensus with uncertainty quantification
- Full observability with Opik integration
- Actionable trade recommendations with risk assessment

### TradeWizard Frontend
A Next.js-based web application that provides the user interface for accessing AI-generated market intelligence and executing trades.

## Architecture Principles

1. **Adversarial Reasoning** - Multiple agents with different perspectives prevent groupthink
2. **Explainability First** - Every recommendation traces back to specific data and reasoning
3. **Graceful Degradation** - Partial failures don't crash the entire pipeline
4. **Regulated Infrastructure** - Built on top of compliant prediction market platforms

## Target Market
- Prediction market power users
- Crypto-native event traders  
- Politically engaged retail investors
- Data-driven traders seeking asymmetric information edges