/**
 * Database module for Supabase PostgreSQL integration
 * 
 * This module provides:
 * - Supabase client management with retry logic
 * - TypeScript types generated from Supabase schema
 * - Connection health checks
 * - Database persistence layer for market analysis data
 */

export {
  SupabaseClientManager,
  SupabaseConfig,
  TypedSupabaseClient,
  loadSupabaseConfig,
  createSupabaseClientManager,
} from './supabase-client.js';

export type { Database, Tables, TablesInsert, TablesUpdate } from './types.js';

export {
  DatabasePersistence,
  DatabasePersistenceImpl,
  createDatabasePersistence,
  MarketData,
  AnalysisRecord,
} from './persistence.js';

export type { MarketData as MarketDataType, AnalysisRecord as AnalysisRecordType } from './persistence.js';
