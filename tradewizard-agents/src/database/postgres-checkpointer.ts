/**
 * PostgreSQL Checkpointer for LangGraph
 *
 * This module provides a PostgreSQL-backed checkpointer for LangGraph workflows.
 * It uses Supabase PostgreSQL to persist workflow state, enabling:
 * - Workflow resumption after interruptions
 * - Audit trail of workflow execution
 * - State inspection for debugging
 */

import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import type { SupabaseClientManager } from './supabase-client.js';

/**
 * PostgreSQL checkpointer configuration
 */
export interface PostgresCheckpointerConfig {
  /**
   * Connection string
   */
  connectionString: string;
}

/**
 * Create a PostgreSQL checkpointer for LangGraph
 *
 * This function creates a PostgresSaver instance that uses the Supabase
 * PostgreSQL database for checkpoint storage.
 *
 * @param supabaseManager - Supabase client manager
 * @returns PostgresSaver instance
 */
export async function createPostgresCheckpointer(
  supabaseManager: SupabaseClientManager
): Promise<PostgresSaver> {
  // Extract connection details from Supabase client
  const connectionString = getConnectionString(supabaseManager);

  // Create PostgresSaver
  const checkpointer = PostgresSaver.fromConnString(connectionString);

  // Setup the checkpointer (creates tables if they don't exist)
  await checkpointer.setup();

  console.log('[PostgresCheckpointer] Checkpointer initialized successfully');

  return checkpointer;
}

/**
 * Extract PostgreSQL connection string from Supabase client manager
 *
 * @param _supabaseManager - Supabase client manager (unused, kept for future use)
 * @returns PostgreSQL connection string
 */
function getConnectionString(_supabaseManager: SupabaseClientManager): string {
  // Get Supabase URL from environment
  const supabaseUrl = process.env.SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('[PostgresCheckpointer] SUPABASE_URL environment variable is required');
  }

  // Extract project reference from Supabase URL
  // Format: https://<project-ref>.supabase.co
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  if (!projectRef) {
    throw new Error('[PostgresCheckpointer] Invalid SUPABASE_URL format');
  }

  // Get database password from environment
  const dbPassword = process.env.SUPABASE_DB_PASSWORD || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!dbPassword) {
    throw new Error(
      '[PostgresCheckpointer] SUPABASE_DB_PASSWORD or SUPABASE_SERVICE_ROLE_KEY environment variable is required'
    );
  }

  // Construct PostgreSQL connection string
  // Supabase PostgreSQL connection format:
  // postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
  const connectionString = `postgresql://postgres:${dbPassword}@db.${projectRef}.supabase.co:5432/postgres`;

  return connectionString;
}

/**
 * Create a PostgreSQL checkpointer with custom configuration
 *
 * @param config - PostgreSQL checkpointer configuration
 * @returns PostgresSaver instance
 */
export async function createPostgresCheckpointerWithConfig(
  config: PostgresCheckpointerConfig
): Promise<PostgresSaver> {
  if (!config.connectionString) {
    throw new Error('[PostgresCheckpointer] connectionString is required');
  }

  // Create PostgresSaver
  const checkpointer = PostgresSaver.fromConnString(config.connectionString);

  // Setup the checkpointer (creates tables if they don't exist)
  await checkpointer.setup();

  console.log('[PostgresCheckpointer] Checkpointer initialized with custom config');

  return checkpointer;
}
