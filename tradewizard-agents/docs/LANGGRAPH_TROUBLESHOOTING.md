# LangGraph Troubleshooting Guide

Common issues and solutions when working with LangGraph in the Market Intelligence Engine.

## Table of Contents

- [Common Issues](#common-issues)
- [State Management](#state-management)
- [Node Execution](#node-execution)
- [Conditional Edges](#conditional-edges)
- [Checkpointing](#checkpointing)
- [Parallel Execution](#parallel-execution)
- [Debugging Tools](#debugging-tools)
- [Performance Issues](#performance-issues)
- [Best Practices](#best-practices)

## Common Issues

### Recursion Limit Exceeded

**Problem:** `RecursionError: Maximum recursion depth exceeded`

**Cause:** Graph execution exceeds the configured recursion limit.

**Solutions:**

1. **Increase recursion limit:**
   ```bash
   # .env
   LANGGRAPH_RECURSION_LIMIT=50  # Default is 25
   ```

2. **Check for infinite loops:**
   - Review conditional edges
   - Ensure all paths lead to END
   - Check node logic for infinite recursion

3. **Simplify graph structure:**
   - Reduce number of nodes
   - Combine related operations
   - Remove unnecessary edges

**Example Fix:**

```typescript
// Bad: Potential infinite loop
.addConditionalEdges(
  "node_a",
  (state) => state.retry ? "node_a" : "node_b"  // Can loop forever
)

// Good: Add retry limit
.addConditionalEdges(
  "node_a",
  (state) => (state.retry && state.retryCount < 3) ? "node_a" : "node_b"
)
```

### State Not Updating

**Problem:** Node updates state but changes don't appear in subsequent nodes.

**Cause:** Incorrect state update syntax or missing reducer.

**Solutions:**

1. **Return partial state:**
   ```typescript
   // Bad: Mutating state directly
   async function myNode(state: GraphStateType) {
     state.field = newValue;  // Won't work!
     return state;
   }
   
   // Good: Return partial state
   async function myNode(state: GraphStateType) {
     return {
       field: newValue
     };
   }
   ```

2. **Use correct reducer:**
   ```typescript
   // For arrays, use reducer to append
   const GraphState = Annotation.Root({
     items: Annotation<Item[]>({
       reducer: (current, update) => [...current, ...update],
       default: () => []
     })
   });
   ```

3. **Check state type:**
   ```typescript
   // Ensure returned state matches expected type
   async function myNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
     return {
       field: newValue  // Must match GraphState schema
     };
   }
   ```

### Node Not Executing

**Problem:** Node defined but never executes.

**Cause:** Missing edge to the node.

**Solutions:**

1. **Check graph edges:**
   ```typescript
   // Ensure node is connected
   .addNode("my_node", myNodeFunction)
   .addEdge("previous_node", "my_node")  // Must have incoming edge
   ```

2. **Verify conditional edges:**
   ```typescript
   // Check condition returns correct node name
   .addConditionalEdges(
     "router",
     (state) => state.shouldExecute ? "my_node" : "other_node",
     {
       my_node: "my_node",  // Must match node name exactly
       other_node: "other_node"
     }
   )
   ```

3. **Check entry point:**
   ```typescript
   // Ensure graph has entry edge
   .addEdge("__start__", "first_node")
   ```

### Type Errors

**Problem:** TypeScript errors with state types.

**Cause:** Mismatch between state definition and usage.

**Solutions:**

1. **Use correct state type:**
   ```typescript
   // Define state type
   const GraphState = Annotation.Root({
     field: Annotation<string>
   });
   
   type GraphStateType = typeof GraphState.State;
   
   // Use in node
   async function myNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
     return { field: "value" };
   }
   ```

2. **Handle nullable fields:**
   ```typescript
   // Define nullable field
   const GraphState = Annotation.Root({
     field: Annotation<string | null>
   });
   
   // Check before using
   async function myNode(state: GraphStateType) {
     if (!state.field) {
       return { error: "Field is null" };
     }
     // Use state.field safely
   }
   ```

3. **Use type guards:**
   ```typescript
   function isValidState(state: any): state is GraphStateType {
     return state && typeof state.field === 'string';
   }
   ```

## State Management

### State Not Persisting

**Problem:** State resets between executions.

**Cause:** Checkpointer not configured or not working.

**Solutions:**

1. **Configure checkpointer:**
   ```bash
   # .env
   LANGGRAPH_CHECKPOINTER=sqlite  # or postgres
   ```

2. **Use thread_id:**
   ```typescript
   // Provide thread_id for persistence
   await app.invoke(
     { conditionId: "0x123..." },
     { 
       configurable: { 
         thread_id: "0x123..."  // Required for checkpointing
       } 
     }
   );
   ```

3. **Check checkpointer setup:**
   ```typescript
   import { SqliteSaver } from "@langchain/langgraph";
   
   const checkpointer = new SqliteSaver("data/langgraph.db");
   const app = workflow.compile({ checkpointer });
   ```

### State Corruption

**Problem:** State contains unexpected or invalid data.

**Cause:** Incorrect reducer or node returning invalid state.

**Solutions:**

1. **Validate state updates:**
   ```typescript
   async function myNode(state: GraphStateType) {
     const update = { field: newValue };
     
     // Validate before returning
     if (!isValidUpdate(update)) {
       throw new Error("Invalid state update");
     }
     
     return update;
   }
   ```

2. **Use Zod schemas:**
   ```typescript
   import { z } from 'zod';
   
   const StateSchema = z.object({
     field: z.string(),
     count: z.number()
   });
   
   async function myNode(state: GraphStateType) {
     const update = { field: "value", count: 1 };
     StateSchema.parse(update);  // Throws if invalid
     return update;
   }
   ```

3. **Check reducers:**
   ```typescript
   // Ensure reducer handles all cases
   const GraphState = Annotation.Root({
     items: Annotation<Item[]>({
       reducer: (current, update) => {
         // Validate inputs
         if (!Array.isArray(current) || !Array.isArray(update)) {
           return current;
         }
         return [...current, ...update];
       },
       default: () => []
     })
   });
   ```

### State Access Issues

**Problem:** Cannot access state fields in nodes.

**Cause:** Incorrect state type or undefined fields.

**Solutions:**

1. **Check field exists:**
   ```typescript
   async function myNode(state: GraphStateType) {
     if (!state.field) {
       return { error: "Field not found" };
     }
     // Use state.field
   }
   ```

2. **Use optional chaining:**
   ```typescript
   async function myNode(state: GraphStateType) {
     const value = state.nested?.field?.value ?? "default";
     return { result: value };
   }
   ```

3. **Initialize defaults:**
   ```typescript
   const GraphState = Annotation.Root({
     field: Annotation<string>({
       default: () => "default_value"
     })
   });
   ```

## Node Execution

### Node Timeout

**Problem:** Node execution times out.

**Cause:** Long-running operation or slow LLM call.

**Solutions:**

1. **Increase timeout:**
   ```bash
   # .env
   AGENT_TIMEOUT_MS=30000  # 30 seconds
   ```

2. **Implement timeout in node:**
   ```typescript
   async function myNode(state: GraphStateType) {
     const timeout = 10000;  // 10 seconds
     
     const result = await Promise.race([
       longRunningOperation(),
       new Promise((_, reject) => 
         setTimeout(() => reject(new Error("Timeout")), timeout)
       )
     ]);
     
     return { result };
   }
   ```

3. **Optimize operation:**
   - Reduce prompt size
   - Use faster LLM model
   - Cache results
   - Parallelize operations

### Node Error Handling

**Problem:** Node errors crash entire graph.

**Cause:** Unhandled exceptions in node.

**Solutions:**

1. **Wrap in try-catch:**
   ```typescript
   async function myNode(state: GraphStateType) {
     try {
       const result = await riskyOperation();
       return { result };
     } catch (error) {
       return { 
         error: {
           type: "EXECUTION_FAILED",
           message: error.message
         }
       };
     }
   }
   ```

2. **Use conditional edges for errors:**
   ```typescript
   .addConditionalEdges(
     "my_node",
     (state) => state.error ? "error_handler" : "next_node",
     {
       error_handler: "error_handler",
       next_node: "next_node"
     }
   )
   ```

3. **Implement error recovery:**
   ```typescript
   async function myNode(state: GraphStateType) {
     try {
       return await primaryOperation();
     } catch (error) {
       // Try fallback
       try {
         return await fallbackOperation();
       } catch (fallbackError) {
         return { error: fallbackError };
       }
     }
   }
   ```

### Node Not Returning

**Problem:** Node hangs and never returns.

**Cause:** Infinite loop or blocking operation.

**Solutions:**

1. **Add timeout:**
   ```typescript
   async function myNode(state: GraphStateType) {
     return await Promise.race([
       actualOperation(),
       new Promise((_, reject) => 
         setTimeout(() => reject(new Error("Timeout")), 10000)
       )
     ]);
   }
   ```

2. **Check for infinite loops:**
   ```typescript
   // Bad: Infinite loop
   async function myNode(state: GraphStateType) {
     while (true) {  // Never exits!
       await doSomething();
     }
   }
   
   // Good: Add exit condition
   async function myNode(state: GraphStateType) {
     let attempts = 0;
     while (attempts < 3) {
       await doSomething();
       attempts++;
     }
     return { attempts };
   }
   ```

3. **Use async operations correctly:**
   ```typescript
   // Bad: Blocking operation
   async function myNode(state: GraphStateType) {
     const result = blockingSync();  // Blocks event loop
     return { result };
   }
   
   // Good: Use async
   async function myNode(state: GraphStateType) {
     const result = await asyncOperation();
     return { result };
   }
   ```

## Conditional Edges

### Condition Not Working

**Problem:** Conditional edge always takes same path.

**Cause:** Condition function returns wrong value.

**Solutions:**

1. **Debug condition:**
   ```typescript
   .addConditionalEdges(
     "router",
     (state) => {
       const result = state.shouldExecute ? "yes" : "no";
       console.log("Condition result:", result);  // Debug
       return result;
     },
     {
       yes: "execute_node",
       no: "skip_node"
     }
   )
   ```

2. **Check return value:**
   ```typescript
   // Ensure return value matches edge map keys
   .addConditionalEdges(
     "router",
     (state) => state.error ? "error" : "success",  // Must return "error" or "success"
     {
       error: "error_handler",  // Key must match return value
       success: "next_node"
     }
   )
   ```

3. **Handle all cases:**
   ```typescript
   .addConditionalEdges(
     "router",
     (state) => {
       if (state.error) return "error";
       if (state.retry) return "retry";
       return "success";  // Default case
     },
     {
       error: "error_handler",
       retry: "retry_node",
       success: "next_node"
     }
   )
   ```

### Missing Edge Mapping

**Problem:** `Error: No edge mapping for condition result`

**Cause:** Condition returns value not in edge map.

**Solutions:**

1. **Add all possible values:**
   ```typescript
   .addConditionalEdges(
     "router",
     (state) => state.status,  // Can return "pending", "complete", "error"
     {
       pending: "wait_node",
       complete: "finish_node",
       error: "error_node"  // Must handle all possible values
     }
   )
   ```

2. **Use default case:**
   ```typescript
   .addConditionalEdges(
     "router",
     (state) => state.status || "default",  // Ensure always returns valid value
     {
       pending: "wait_node",
       complete: "finish_node",
       default: "default_node"
     }
   )
   ```

## Checkpointing

### Checkpoint Not Saving

**Problem:** State not persisted between runs.

**Cause:** Checkpointer not configured or thread_id missing.

**Solutions:**

1. **Configure checkpointer:**
   ```typescript
   import { SqliteSaver } from "@langchain/langgraph";
   
   const checkpointer = new SqliteSaver("data/langgraph.db");
   const app = workflow.compile({ checkpointer });
   ```

2. **Provide thread_id:**
   ```typescript
   await app.invoke(
     { input: "data" },
     { 
       configurable: { 
         thread_id: "unique-id"  // Required!
       } 
     }
   );
   ```

3. **Check file permissions:**
   ```bash
   # Ensure data directory exists and is writable
   mkdir -p data
   chmod 700 data
   ```

### Checkpoint Corruption

**Problem:** Cannot load checkpoint, corruption errors.

**Cause:** Database corruption or incompatible schema.

**Solutions:**

1. **Delete and recreate:**
   ```bash
   rm data/langgraph.db
   # Restart application
   ```

2. **Backup regularly:**
   ```bash
   # Backup script
   cp data/langgraph.db backups/langgraph_$(date +%Y%m%d).db
   ```

3. **Use PostgreSQL for production:**
   ```bash
   # .env
   LANGGRAPH_CHECKPOINTER=postgres
   POSTGRES_CONNECTION_STRING=postgresql://...
   ```

## Parallel Execution

### Parallel Nodes Not Executing

**Problem:** Nodes that should run in parallel execute sequentially.

**Cause:** Missing parallel edges.

**Solutions:**

1. **Add multiple edges from same node:**
   ```typescript
   // This creates parallel execution
   .addEdge("start", "agent_1")
   .addEdge("start", "agent_2")
   .addEdge("start", "agent_3")
   ```

2. **Ensure nodes don't depend on each other:**
   ```typescript
   // Bad: Sequential
   .addEdge("agent_1", "agent_2")
   .addEdge("agent_2", "agent_3")
   
   // Good: Parallel
   .addEdge("start", "agent_1")
   .addEdge("start", "agent_2")
   .addEdge("start", "agent_3")
   ```

### Race Conditions

**Problem:** Parallel nodes interfere with each other.

**Cause:** Shared state without proper reducers.

**Solutions:**

1. **Use reducers for arrays:**
   ```typescript
   const GraphState = Annotation.Root({
     results: Annotation<Result[]>({
       reducer: (current, update) => [...current, ...update],
       default: () => []
     })
   });
   ```

2. **Use separate state fields:**
   ```typescript
   const GraphState = Annotation.Root({
     agent1Result: Annotation<Result | null>,
     agent2Result: Annotation<Result | null>,
     agent3Result: Annotation<Result | null>
   });
   ```

3. **Implement locking if needed:**
   ```typescript
   // Use mutex for critical sections
   const mutex = new Mutex();
   
   async function myNode(state: GraphStateType) {
     await mutex.runExclusive(async () => {
       // Critical section
     });
   }
   ```

## Debugging Tools

### Using LangGraph Studio

LangGraph Studio provides visual debugging:

1. **Install:**
   ```bash
   npm install -g @langchain/langgraph-studio
   ```

2. **Start:**
   ```bash
   langgraph-studio
   ```

3. **Load workflow:**
   - Point to your `workflow.ts` file
   - View graph visualization
   - Step through execution

4. **Features:**
   - Visual graph representation
   - Breakpoints
   - State inspection
   - Step-by-step execution

### Using Opik

Opik provides execution tracing:

1. **View traces:**
   - Open Opik dashboard
   - Find your execution
   - View timeline and graph

2. **Inspect state:**
   - View state at each checkpoint
   - Check inputs/outputs
   - Review timing

3. **Debug errors:**
   - View error messages
   - Check stack traces
   - Inspect state before failure

### Debug Logging

Enable debug logging:

```bash
# .env
LOG_LEVEL=debug
```

Add logging to nodes:

```typescript
async function myNode(state: GraphStateType) {
  console.log("Node input:", state);
  
  const result = await operation();
  console.log("Node output:", result);
  
  return { result };
}
```

## Performance Issues

### Slow Execution

**Problem:** Graph execution is slow.

**Cause:** Sequential bottlenecks or slow operations.

**Solutions:**

1. **Parallelize operations:**
   ```typescript
   // Use parallel edges for independent operations
   .addEdge("start", "agent_1")
   .addEdge("start", "agent_2")
   .addEdge("start", "agent_3")
   ```

2. **Optimize LLM calls:**
   - Use faster models
   - Reduce prompt size
   - Cache results

3. **Profile execution:**
   ```typescript
   async function myNode(state: GraphStateType) {
     const start = Date.now();
     const result = await operation();
     console.log(`Node took ${Date.now() - start}ms`);
     return { result };
   }
   ```

### Memory Issues

**Problem:** High memory usage or out of memory errors.

**Cause:** Large state objects or memory leaks.

**Solutions:**

1. **Reduce state size:**
   ```typescript
   // Don't store large objects in state
   async function myNode(state: GraphStateType) {
     const largeData = await fetchLargeData();
     const summary = summarize(largeData);  // Store summary only
     return { summary };
   }
   ```

2. **Clean up resources:**
   ```typescript
   async function myNode(state: GraphStateType) {
     const resource = await acquireResource();
     try {
       return await useResource(resource);
     } finally {
       await resource.cleanup();  // Always cleanup
     }
   }
   ```

3. **Increase Node.js memory:**
   ```bash
   NODE_OPTIONS="--max-old-space-size=4096" node dist/index.js
   ```

## Best Practices

### 1. Always Handle Errors

```typescript
async function myNode(state: GraphStateType) {
  try {
    const result = await operation();
    return { result };
  } catch (error) {
    return { 
      error: {
        type: "EXECUTION_FAILED",
        message: error.message
      }
    };
  }
}
```

### 2. Use Type Safety

```typescript
// Define strict types
type GraphStateType = typeof GraphState.State;

// Use in nodes
async function myNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  return { field: "value" };
}
```

### 3. Validate State Updates

```typescript
async function myNode(state: GraphStateType) {
  const update = { field: newValue };
  
  // Validate before returning
  if (!isValid(update)) {
    throw new Error("Invalid state update");
  }
  
  return update;
}
```

### 4. Use Reducers for Arrays

```typescript
const GraphState = Annotation.Root({
  items: Annotation<Item[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => []
  })
});
```

### 5. Provide Thread IDs

```typescript
await app.invoke(
  { input: "data" },
  { 
    configurable: { 
      thread_id: "unique-id"  // For checkpointing
    } 
  }
);
```

### 6. Add Timeouts

```typescript
async function myNode(state: GraphStateType) {
  return await Promise.race([
    operation(),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Timeout")), 10000)
    )
  ]);
}
```

### 7. Log Important Events

```typescript
async function myNode(state: GraphStateType) {
  console.log("Node started:", { timestamp: Date.now() });
  
  const result = await operation();
  
  console.log("Node completed:", { result, timestamp: Date.now() });
  
  return { result };
}
```

### 8. Test Nodes Independently

```typescript
// Test node in isolation
describe("myNode", () => {
  it("should process state correctly", async () => {
    const state = { field: "value" };
    const result = await myNode(state);
    expect(result.field).toBe("expected");
  });
});
```

## Support

For LangGraph-specific issues:
- **Documentation:** [https://langchain-ai.github.io/langgraph/](https://langchain-ai.github.io/langgraph/)
- **GitHub:** [https://github.com/langchain-ai/langgraph](https://github.com/langchain-ai/langgraph)
- **Discord:** [https://discord.gg/langchain](https://discord.gg/langchain)

For application issues:
- Check [Main README](../README.md#troubleshooting)
- Review Opik traces
- Check application logs

---

**Last Updated:** January 2026
