# Supabase LangGraph Checkpointer Guide

This document explains how TradeWizard uses Supabase as a LangGraph checkpointer for persistent workflow state management.

## Overview

TradeWizard uses Supabase PostgreSQL as the backend for LangGraph checkpointing, enabling:
- **Workflow Persistence**: Resume interrupted workflows
- **Audit Trail**: Complete history of workflow execution
- **State Inspection**: Debug and analyze workflow state
- **Multi-Instance Support**: Multiple workflow instances with unique thread IDs

## Architecture

```
LangGraph Workflow → PostgresSaver → Supabase PostgreSQL → Checkpoint Tables
```

## Configuration

### Environment Variables

```bash
# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional - for explicit database URL
SUPABASE_DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# Production settings
SUPABASE_USE_POOLING=true  # Enable connection pooling for production
SUPABASE_REGION=us-east-1  # Your Supabase region

# LangGraph configuration
LANGGRAPH_CHECKPOINTER=postgres
```

### Connection String Formats

#### Development (Direct Connection)
```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

#### Production (Connection Pooling)
```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
```

## Database Schema

The checkpointer automatically creates these tables in your Supabase database:

### `checkpoints` Table
- `thread_id`: Workflow thread identifier
- `checkpoint_ns`: Checkpoint namespace
- `checkpoint_id`: Unique checkpoint ID
- `parent_checkpoint_id`: Parent checkpoint reference
- `type`: Checkpoint type (input, loop, update, fork)
- `checkpoint`: Serialized checkpoint data
- `metadata`: Additional checkpoint metadata

### `checkpoint_blobs` Table
- `thread_id`: Workflow thread identifier
- `checkpoint_ns`: Checkpoint namespace
- `channel`: Channel name
- `version`: Channel version
- `type`: Blob type
- `checkpoint_id`: Associated checkpoint ID
- `blob`: Binary data storage

## Usage Examples

### Basic Workflow Setup

```typescript
import { createWorkflow } from './workflow.js';
import { createSupabaseClientManager } from './database/supabase-client.js';

// Create Supabase client manager
const supabaseManager = createSupabaseClientManager();

// Create workflow with Supabase checkpointer
const workflow = await createWorkflow({
  checkpointer: 'postgres',
  supabaseManager
});

// Execute workflow with thread ID
const result = await workflow.invoke(
  { marketId: 'market-123' },
  { 
    configurable: { 
      thread_id: 'analysis-session-1' 
    } 
  }
);
```

### Resuming Workflows

```typescript
// Resume from specific checkpoint
const result = await workflow.invoke(
  { marketId: 'market-123' },
  { 
    configurable: { 
      thread_id: 'analysis-session-1',
      checkpoint_id: 'checkpoint-uuid'
    } 
  }
);
```

### Retrieving Workflow History

```typescript
import { createPostgresCheckpointer } from './database/postgres-checkpointer.js';

const checkpointer = await createPostgresCheckpointer(supabaseManager);

// List all checkpoints for a thread
const config = { configurable: { thread_id: 'analysis-session-1' } };
for await (const checkpoint of checkpointer.list(config)) {
  console.log('Checkpoint:', checkpoint.id, 'Type:', checkpoint.metadata?.source);
}
```

## Production Deployment

### 1. Enable Connection Pooling

Set environment variables:
```bash
SUPABASE_USE_POOLING=true
NODE_ENV=production
```

### 2. Database Optimization

In your Supabase dashboard:
- Enable connection pooling
- Set appropriate connection limits
- Configure statement timeout
- Enable query optimization

### 3. Monitoring

Monitor checkpoint performance:
```sql
-- Check checkpoint table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE tablename IN ('checkpoints', 'checkpoint_blobs');

-- Monitor checkpoint creation rate
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as checkpoints_created
FROM checkpoints 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour;
```

## Troubleshooting

### Common Issues

1. **Connection Timeout**
   - Check Supabase service status
   - Verify connection string format
   - Enable connection pooling for production

2. **Permission Errors**
   - Ensure service role key has database access
   - Check RLS policies if enabled
   - Verify schema permissions

3. **Table Creation Failures**
   - Ensure `setup()` is called before first use
   - Check database permissions
   - Verify schema exists

### Debug Commands

```bash
# Test database connection
npm run cli -- test-db-connection

# Check checkpoint tables
npm run cli -- list-checkpoints --thread-id analysis-session-1

# Cleanup old checkpoints
npm run cli -- cleanup-checkpoints --older-than 7d
```

## Performance Considerations

### Checkpoint Cleanup

Implement regular cleanup of old checkpoints:

```typescript
// Cleanup checkpoints older than 7 days
const cleanupDate = new Date();
cleanupDate.setDate(cleanupDate.getDate() - 7);

await supabase
  .from('checkpoints')
  .delete()
  .lt('created_at', cleanupDate.toISOString());
```

### Batch Operations

For high-throughput scenarios:
- Use connection pooling
- Batch checkpoint operations
- Implement checkpoint compression
- Consider checkpoint retention policies

## Security

### Access Control

- Use service role key for server-side operations
- Implement Row Level Security (RLS) if needed
- Rotate keys regularly
- Monitor database access logs

### Data Encryption

- Supabase encrypts data at rest by default
- Use SSL/TLS for connections
- Consider application-level encryption for sensitive data

## Migration from Memory Checkpointer

To migrate from memory to Supabase checkpointer:

1. Update environment variables
2. Change `LANGGRAPH_CHECKPOINTER=postgres`
3. Restart application
4. Existing workflows will start fresh (memory state is lost)

## Support

For issues related to:
- **Supabase**: Check Supabase documentation and support
- **LangGraph**: Refer to LangChain documentation
- **TradeWizard**: Check project documentation and logs