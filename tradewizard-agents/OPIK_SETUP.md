# Opik Setup Guide

Opik is an open-source LLM observability platform that provides tracing, debugging, and cost tracking for the Market Intelligence Engine.

## Option 1: Opik Cloud (Recommended for Quick Start)

1. Sign up for a free account at [https://www.comet.com/opik](https://www.comet.com/opik)

2. Get your API key from the Opik dashboard

3. Configure Opik using the CLI:
```bash
npx opik-ts configure
```

4. Or set the API key in your `.env` file:
```bash
OPIK_API_KEY=your_api_key_here
OPIK_PROJECT_NAME=market-intelligence-engine
OPIK_WORKSPACE=default
```

## Option 2: Self-Hosted Opik

1. Run Opik locally using Docker:
```bash
docker run -d -p 5000:5000 --name opik comet-ml/opik:latest
```

2. Configure the base URL in your `.env` file:
```bash
OPIK_BASE_URL=http://localhost:5000
OPIK_PROJECT_NAME=market-intelligence-engine
# No API key needed for self-hosted
```

## Features Enabled by Opik

### Automatic Tracing
- Every LangGraph node execution is logged
- All LLM calls are traced with input/output
- Token usage and costs are tracked automatically

### Graph Visualization
- Visual representation of the LangGraph workflow
- Step-by-step execution trace with timing
- Easy debugging of complex multi-agent flows

### Cost Tracking
- Per-provider cost calculation (OpenAI, Anthropic, Gemini)
- Aggregated costs per market analysis
- Cost breakdown by agent and node

### Thread-Based Debugging
- Each market analysis uses the condition ID as thread ID
- Complete audit trail per market
- Easy to replay and debug specific analyses

## Accessing Traces

After running a market analysis, you can:

1. View traces in the Opik UI dashboard
2. Query traces programmatically using the Opik SDK
3. Export traces for further analysis

## Disabling Opik

If you don't want to use Opik, simply don't set the `OPIK_API_KEY` environment variable. The system will work without observability features.

## Troubleshooting

### Connection Issues
- Verify your API key is correct
- Check network connectivity
- For self-hosted: ensure Docker container is running

### Missing Traces
- Verify `OPIK_TRACK_COSTS=true` in `.env`
- Check that the project name matches your configuration
- Ensure LangChain callbacks are not disabled

## Learn More

- [Opik Documentation](https://www.comet.com/docs/opik/)
- [LangChain Integration Guide](https://www.comet.com/docs/opik/integrations/langchain/)
