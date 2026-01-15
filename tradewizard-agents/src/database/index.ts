/**
 * Database module for Supabase PostgreSQL integration
 * 
 * This module provides:
 * - Supabase client management with retry logic
 * - TypeScript types generated from Supabase schema
 * - Connection health checks
 */

export {
  SupabaseClientManager,
  SupabaseConfig,
  TypedSupabaseClient,
  loadSupabaseConfig,
  createSupabaseClientManager,
} from './supabase-client.js';

export type { Database, Tables, TablesInsert, TablesUpdate } from './types.js';
