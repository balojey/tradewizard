# Database Migrations

This directory contains SQL migration files for the TradeWizard database schema.

## Quick Start

### Run All Migrations

```bash
# Using Supabase CLI (recommended)
supabase db push

# Or check status first
npm run migrate:status
```

### Create New Migration

```bash
# Generate timestamp
TIMESTAMP=$(date +%Y%m%d%H%M%S)

# Create migration file
touch supabase/migrations/${TIMESTAMP}_your_migration_name.sql
```

## Migration Files

Migrations are executed in chronological order based on the timestamp prefix:

| Version        | Name                  | Description                                    |
|----------------|-----------------------|------------------------------------------------|
| 20260115162601 | migration_tracking    | Sets up migration tracking infrastructure      |
| 20260115162602 | initial_schema        | Creates core tables (markets, recommendations) |

## File Naming Convention

```
YYYYMMDDHHMMSS_description.sql
```

- **YYYY**: 4-digit year
- **MM**: 2-digit month
- **DD**: 2-digit day
- **HH**: 2-digit hour (24-hour format)
- **MM**: 2-digit minute
- **SS**: 2-digit second
- **description**: Snake_case description of the migration

Example: `20260115162602_initial_schema.sql`

## Migration Template

```sql
-- ============================================================================
-- Migration Title
-- ============================================================================
-- Description of what this migration does and why
-- ============================================================================

-- Create tables
CREATE TABLE IF NOT EXISTS my_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_my_table_name ON my_table(name);

-- Apply triggers (if needed)
DROP TRIGGER IF EXISTS update_my_table_updated_at ON my_table;
CREATE TRIGGER update_my_table_updated_at
  BEFORE UPDATE ON my_table
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

## Best Practices

1. **Always use `IF NOT EXISTS`** - Makes migrations idempotent
2. **Add descriptive comments** - Explain what and why
3. **Create indexes** - For foreign keys and frequently queried columns
4. **Test locally first** - Use `supabase start` and `supabase db push`
5. **One logical change per migration** - Keep migrations focused

## Documentation

For detailed migration documentation, see:
- [src/database/MIGRATIONS.md](../../src/database/MIGRATIONS.md) - Complete migration guide
- [Supabase Docs](https://supabase.com/docs/guides/cli/local-development#database-migrations)

## Troubleshooting

### Migration tracking not initialized

```bash
# Run the tracking migration first
psql "your-connection-string" < 20260115162601_migration_tracking.sql
```

### Check migration status

```bash
npm run migrate:status
```

### View applied migrations

```sql
SELECT version, name, applied_at, success 
FROM schema_migrations 
ORDER BY version DESC;
```
