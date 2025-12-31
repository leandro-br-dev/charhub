# Database Deployment Scripts

This directory contains automated deployment scripts for database migrations.

## Available Scripts

### `runMigration.ts`

**Purpose**: Runs both Prisma schema migrations AND data migrations in sequence.

**Usage**:
```bash
# Via npm script (recommended for production)
npm run db:migrate:deploy

# Or directly via tsx
npx tsx scripts/deploy/runMigration.ts
```

**What it does**:
1. Runs `npx prisma migrate deploy` to apply schema migrations
2. Automatically detects which data migrations need to run
3. Executes data migrations (e.g., gender/species migration)

**When to use**:
- Production deployments
- After pulling new migration files
- When setting up a new database

## Deployment Flow

```
┌─────────────────────────────────────┐
│  1. Prisma Schema Migrations        │
│     (CREATE/ALTER tables)           │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  2. Detect Required Data Migrations │
│     (Check applied migrations)      │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  3. Execute Data Migrations         │
│     (Migrate existing data)         │
└─────────────────────────────────────┘
```

## Data Migrations

Currently supported data migrations:

| Migration Name | Trigger | Description |
|----------------|---------|-------------|
| `20251231102002_add_species_and_gender_enum` | After species/gender schema migration | Migrates gender strings → enum, species names → UUIDs |

## Adding New Data Migrations

1. Create your data migration script in `src/scripts/`
2. Add detection logic in `scripts/deploy/runMigration.ts`:
   ```typescript
   const myMigrationApplied = isMigrationApplied('20250101_my_migration');
   if (myMigrationApplied) {
     // Import and run your migration
   }
   ```
3. Document in the table above

## Environment Variables

Required:
- `DATABASE_URL` - PostgreSQL connection string

## Troubleshooting

**Migration already applied**:
The script automatically detects applied migrations and won't re-run them.

**Partial migration failure**:
Fix the issue and re-run - migrations are idempotent where possible.

**Need to re-run a specific migration**:
You can run individual migration scripts directly:
```bash
npm run db:migrate:gender-species
```
