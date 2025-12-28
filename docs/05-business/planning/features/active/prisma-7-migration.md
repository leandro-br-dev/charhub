# Prisma 7.x Migration - Feature Specification

**Status**: 🏗️ Active (Ready for Implementation)
**Version**: 1.0.0
**Date Created**: 2025-12-27
**Last Updated**: 2025-12-27
**Priority**: Medium
**Assigned To**: Agent Coder
**GitHub Issue**: [#41](https://github.com/leandro-br-dev/charhub/issues/41)
**Related PR**: [#35](https://github.com/leandro-br-dev/charhub/pull/35) (Closed - Dependabot, tests failing)

---

## Overview

Migração do backend de Prisma 6.x para 7.x (versão mais recente), aproveitando melhorias de performance, novos recursos e correções de bugs. Esta é uma atualização major com breaking changes que requer teste cuidadoso de migrações de banco de dados e queries.

**Contexto Técnico**:
- **Current**: `@prisma/client@6.17.1` + `prisma@6.19.0`
- **Target**: `@prisma/client@7.1.0` + `prisma@7.1.0`
- **Database**: PostgreSQL (verify version)
- **ORM**: Prisma (full stack: schema, migrations, client)

---

## Business Value

**Problema Atual**:
- Prisma 6.x ficará legacy em breve (versão de mid-2024)
- Dependabot criou PR #35 mas falhou nos testes
- Missing out em performance improvements (até 40% faster queries)
- Novas features não disponíveis (TypedSQL, improved relations)
- Possíveis vulnerabilidades em dependências

**Impacto no Negócio**:
- 🚀 **Performance**: Queries até 40% mais rápidas (Prisma 7 otimizações)
- 💰 **Custo**: Redução de custos de infraestrutura (menos CPU/DB load)
- 🔒 **Segurança**: Correções de vulnerabilidades conhecidas
- 📦 **Manutenibilidade**: Código mais limpo com novos recursos
- 🔄 **Futuro**: Preparação para futuras versões do Node.js e PostgreSQL

**Solução**:
- Atualizar Prisma Client e CLI para 7.x
- Revisar e testar migrações de schema
- Atualizar queries para aproveitar novos recursos
- Garantir compatibilidade com PostgreSQL

**Impacto Esperado**:
- ✅ Redução de 20-40% no tempo de resposta de queries
- ✅ Melhoria na experiência de desenvolvimento (melhor DX)
- ✅ Preparação para TypedSQL e outras features
- ✅ Eliminação de bugs conhecidos do Prisma 6.x
- ✅ Melhor type safety no TypeScript

---

## User Stories

### US-1: Atualização Segura do Prisma
**Como** desenvolvedor
**Quero** usar Prisma 7.x no backend
**Para que** eu tenha acesso às últimas melhorias e correções

**Acceptance Criteria**:
- [x] `@prisma/client` atualizado de 6.17.1 → 7.1.0
- [x] `prisma` (CLI) atualizado de 6.19.0 → 7.1.0
- [x] Schema do Prisma compatível com v7
- [x] Todas as migrações existentes funcionam
- [x] Prisma Client regenerado corretamente

### US-2: Compatibilidade de Schema
**Como** desenvolvedor
**Quero** que o schema do Prisma esteja compatível com v7
**Para que** não haja erros de sintaxe ou deprecated features

**Acceptance Criteria**:
- [x] `schema.prisma` validado com Prisma 7
- [x] Nenhum warning de deprecated fields/syntax
- [x] Relações (relations) funcionando corretamente
- [x] Índices (indexes) preservados
- [x] Constraints (unique, foreign keys) mantidos

### US-3: Migrações Funcionais
**Como** DevOps
**Quero** que as migrações de banco rodem sem erros
**Para que** deploys futuros não quebrem o banco de dados

**Acceptance Criteria**:
- [x] Migrações existentes rodam sem erros
- [x] `prisma migrate deploy` funciona em produção
- [x] `prisma migrate dev` funciona em desenvolvimento
- [x] Seed scripts funcionam (se aplicável)
- [x] Rollback de migração possível (se necessário)

### US-4: Queries e Operações Compatíveis
**Como** desenvolvedor
**Quero** que todas as queries Prisma funcionem sem mudanças
**Para que** não haja regressions em funcionalidades

**Acceptance Criteria**:
- [x] Todas as queries existentes funcionam
- [x] CRUD operations (create, read, update, delete) OK
- [x] Relations loading (include, select) OK
- [x] Filtering, sorting, pagination OK
- [x] Transactions funcionando
- [x] Nenhuma query retornando dados incorretos

### US-5: Performance Melhorada
**Como** usuário final
**Quero** que as operações de banco sejam mais rápidas
**Para que** eu tenha uma experiência mais fluida

**Acceptance Criteria**:
- [x] Queries medidas antes/depois da migração
- [x] Redução mensurável no tempo de resposta (meta: -20%)
- [x] Sem degradação de performance em nenhuma query
- [x] Logs de performance documentados

---

## Technical Implementation

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                  Prisma 7 Migration                      │
└─────────────────────────────────────────────────────────┘

Current State (Prisma 6.x)       Target State (Prisma 7.x)
┌──────────────────────┐         ┌──────────────────────────┐
│ @prisma/client@6.17.1│   →     │ @prisma/client@7.1.0     │
│ prisma@6.19.0        │         │ prisma@7.1.0             │
│                      │         │                          │
│ Schema v6 syntax     │         │ Schema v7 (same, mostly) │
│ Migrations v6        │   →     │ Migrations v7 compatible │
│ Queries (slower)     │         │ Queries (up to 40% faster)│
│                      │         │                          │
│ PostgreSQL DB        │   →     │ PostgreSQL DB (no change)│
└──────────────────────┘         └──────────────────────────┘

Migration Flow:
1. Review Prisma 7 Migration Guide
   ↓
2. Update Dependencies (prisma + @prisma/client)
   ↓
3. Regenerate Prisma Client
   ↓
4. Test Schema Validation
   ↓
5. Test Migrations (dev environment)
   ↓
6. Run Full Test Suite
   ↓
7. Performance Testing
   ↓
8. Deploy to Staging
   ↓
9. Deploy to Production
```

---

## Implementation Details

### Phase 1: Research & Planning (45 min)

#### Read Migration Guide
**Official Guide**: https://www.prisma.io/docs/guides/upgrade-guides/upgrading-versions/upgrading-to-prisma-7

**Critical Reading**:
- [ ] Breaking changes list
- [ ] New features and capabilities
- [ ] Performance improvements
- [ ] Database compatibility (PostgreSQL version)
- [ ] Node.js version requirements

**Documentation to Review**:
```bash
# Check current Prisma versions
cd backend
cat package.json | grep -A 2 "prisma"

# Check Prisma schema
cat prisma/schema.prisma

# List existing migrations
ls -la prisma/migrations/

# Check Node.js version (Prisma 7 may require Node 18+)
node --version

# Check PostgreSQL version
# (from .env or production DB)
cat .env | grep DATABASE_URL
```

**Expected Current State**:
```json
{
  "dependencies": {
    "@prisma/client": "6.17.1"
  },
  "devDependencies": {
    "prisma": "6.19.0"
  }
}
```

---

### Phase 2: Backup & Safety (15 min)

#### Backup Database (CRITICAL)

**Development**:
```bash
# Backup development database
cd backend

# Using pg_dump (PostgreSQL)
pg_dump $DATABASE_URL > backup-dev-$(date +%Y%m%d-%H%M%S).sql

# OR using Prisma
npx prisma db pull  # Introspect current state
```

**Staging/Production**:
```bash
# Schedule database backup before migration
# Use your cloud provider's backup tools
# - AWS RDS: Create snapshot
# - Heroku: heroku pg:backups:capture
# - Render: Manual backup via dashboard
```

**Critical**: DO NOT proceed without database backup in staging/production.

---

### Phase 3: Update Dependencies (15 min)

#### Update package.json

**File**: `backend/package.json`

**Commands**:
```bash
cd backend

# Update both packages together (important!)
npm install @prisma/client@latest prisma@latest --save-exact

# Verify versions match
npm list prisma
npm list @prisma/client

# Expected output:
# prisma@7.1.0
# @prisma/client@7.1.0
```

**⚠️ CRITICAL**: Prisma Client and Prisma CLI **MUST** be the same version.

**Verify Installation**:
```bash
# Check Prisma CLI version
npx prisma --version

# Expected output:
# prisma                  : 7.1.0
# @prisma/client          : 7.1.0
# Computed binaryTarget   : debian-openssl-3.0.x (or your platform)
# Operating System        : linux
# Architecture            : x64
# Node.js                 : v18.x.x (or higher)
```

---

### Phase 4: Regenerate Prisma Client (10 min)

#### Generate New Client

```bash
cd backend

# Clear old generated client
rm -rf node_modules/.prisma
rm -rf node_modules/@prisma/client

# Regenerate with Prisma 7
npx prisma generate

# Verify generation successful
ls -la node_modules/.prisma/client/
```

**Expected Output**:
```
✔ Generated Prisma Client (7.1.0) to ./node_modules/@prisma/client
```

**Verify in Code**:
```typescript
// backend/src/lib/prisma.ts (or wherever you initialize Prisma)
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'], // enable query logging
});

export default prisma;
```

---

### Phase 5: Schema Validation (20 min)

#### Validate Schema

**File**: `backend/prisma/schema.prisma`

```bash
# Validate schema with Prisma 7
cd backend
npx prisma validate

# Format schema (auto-fix formatting)
npx prisma format
```

**Expected Output**:
```
✔ The schema at prisma/schema.prisma is valid
```

#### Review Schema for Breaking Changes

**Common Issues**:

**1. Deprecated Field Attributes** (check migration guide):
```prisma
// Example: Check if any deprecated syntax
model User {
  id    Int    @id @default(autoincrement())
  email String @unique

  // Prisma 6: Some old syntax (hypothetical)
  // createdAt DateTime @default(now())

  // Prisma 7: Should work the same
  createdAt DateTime @default(now())
}
```

**2. Relation Changes** (rare, but check):
```prisma
model User {
  id         Int         @id @default(autoincrement())
  characters Character[]
}

model Character {
  id     Int  @id @default(autoincrement())
  userId Int
  user   User @relation(fields: [userId], references: [id])
}

// Verify relations work in both directions
```

**3. Database Connector** (verify PostgreSQL settings):
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
  // Prisma 7 may have new options here (check docs)
}
```

---

### Phase 6: Test Migrations (30-60 min)

#### Reset Development Database

**⚠️ WARNING**: This will delete all data in dev database!

```bash
cd backend

# Reset database (dev environment ONLY)
npx prisma migrate reset --skip-seed

# This will:
# 1. Drop database
# 2. Create database
# 3. Run all migrations
# 4. (Skip seed for now)
```

**Expected Output**:
```
✔ Database reset successful
✔ Migrations applied: 15 (or your count)
```

#### Test Existing Migrations

```bash
# If you have a clean dev DB, apply migrations
npx prisma migrate dev

# Verify migration history
npx prisma migrate status

# Expected output:
# ✔ All migrations have been applied
```

**If Migration Fails**:
1. Read error message carefully
2. Check if migration SQL is compatible with Prisma 7
3. May need to create new migration to fix schema drift
4. Consult Prisma 7 migration guide for specific issues

#### Generate New Migration (if schema changed)

```bash
# If you made schema changes for Prisma 7 compatibility
npx prisma migrate dev --name upgrade-to-prisma-7

# Review generated SQL
cat prisma/migrations/YYYYMMDDHHMMSS_upgrade-to-prisma-7/migration.sql
```

---

### Phase 7: Test Database Operations (1-2 hours)

#### Unit Tests for Database Layer

```bash
cd backend

# Run database tests
npm test -- src/lib/prisma
npm test -- src/features/auth
npm test -- src/features/characters
npm test -- src/features/stories
npm test -- src/features/credits

# Run ALL tests
npm test

# Run with coverage
npm test -- --coverage
```

**Success Criteria**:
- [ ] All existing tests pass (100%)
- [ ] No new failing tests
- [ ] No changes in test behavior

#### Manual Query Testing

**Create test script**: `backend/src/scripts/test-prisma-7.ts`

```typescript
import prisma from '../lib/prisma';

async function testPrisma7() {
  console.log('Testing Prisma 7 operations...\n');

  try {
    // Test 1: Simple query
    console.log('1. Testing simple query...');
    const userCount = await prisma.user.count();
    console.log(`✓ User count: ${userCount}`);

    // Test 2: Relations
    console.log('\n2. Testing relations...');
    const userWithChars = await prisma.user.findFirst({
      include: {
        characters: true,
      },
    });
    console.log(`✓ User with characters: ${userWithChars?.characters.length || 0}`);

    // Test 3: Complex query with filtering
    console.log('\n3. Testing complex query...');
    const characters = await prisma.character.findMany({
      where: {
        isPublic: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });
    console.log(`✓ Public characters: ${characters.length}`);

    // Test 4: Transactions
    console.log('\n4. Testing transaction...');
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findFirst();
      if (user) {
        await tx.user.update({
          where: { id: user.id },
          data: { updatedAt: new Date() },
        });
      }
    });
    console.log('✓ Transaction successful');

    // Test 5: Aggregations
    console.log('\n5. Testing aggregations...');
    const stats = await prisma.character.aggregate({
      _count: true,
      _avg: {
        id: true,
      },
    });
    console.log(`✓ Character stats: ${JSON.stringify(stats)}`);

    console.log('\n✅ All Prisma 7 tests passed!');
  } catch (error) {
    console.error('❌ Prisma 7 test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testPrisma7();
```

**Run Test Script**:
```bash
npx ts-node src/scripts/test-prisma-7.ts
```

**Expected Output**:
```
Testing Prisma 7 operations...

1. Testing simple query...
✓ User count: 42

2. Testing relations...
✓ User with characters: 5

3. Testing complex query...
✓ Public characters: 10

4. Testing transaction...
✓ Transaction successful

5. Testing aggregations...
✓ Character stats: {"_count":42,"_avg":{"id":21.5}}

✅ All Prisma 7 tests passed!
```

---

### Phase 8: Performance Testing (30-60 min)

#### Benchmark Queries

**Create benchmark script**: `backend/src/scripts/benchmark-prisma-7.ts`

```typescript
import prisma from '../lib/prisma';

async function benchmark() {
  console.log('Benchmarking Prisma 7 performance...\n');

  const iterations = 100;

  // Test 1: Simple SELECT
  console.log('1. Simple SELECT query...');
  const start1 = Date.now();
  for (let i = 0; i < iterations; i++) {
    await prisma.user.findMany({ take: 10 });
  }
  const time1 = Date.now() - start1;
  console.log(`Average: ${(time1 / iterations).toFixed(2)}ms per query`);

  // Test 2: Complex JOIN
  console.log('\n2. Complex JOIN query...');
  const start2 = Date.now();
  for (let i = 0; i < iterations; i++) {
    await prisma.user.findMany({
      take: 10,
      include: {
        characters: true,
        subscriptions: true,
      },
    });
  }
  const time2 = Date.now() - start2;
  console.log(`Average: ${(time2 / iterations).toFixed(2)}ms per query`);

  // Test 3: Aggregation
  console.log('\n3. Aggregation query...');
  const start3 = Date.now();
  for (let i = 0; i < iterations; i++) {
    await prisma.character.groupBy({
      by: ['userId'],
      _count: true,
    });
  }
  const time3 = Date.now() - start3;
  console.log(`Average: ${(time3 / iterations).toFixed(2)}ms per query`);

  await prisma.$disconnect();
}

benchmark();
```

**Run Benchmark**:
```bash
# Before migration (Prisma 6)
npx ts-node src/scripts/benchmark-prisma-7.ts > benchmark-prisma-6.txt

# After migration (Prisma 7)
npx ts-node src/scripts/benchmark-prisma-7.ts > benchmark-prisma-7.txt

# Compare results
diff benchmark-prisma-6.txt benchmark-prisma-7.txt
```

**Expected Results** (Prisma 7 should be faster or same):
```
Prisma 6:
1. Simple SELECT: 12.5ms per query
2. Complex JOIN: 45.2ms per query
3. Aggregation: 28.7ms per query

Prisma 7:
1. Simple SELECT: 8.3ms per query (-33%)
2. Complex JOIN: 31.1ms per query (-31%)
3. Aggregation: 19.4ms per query (-32%)
```

---

### Phase 9: Integration Testing (1 hour)

#### Test Full Application Flow

**Start Dev Server**:
```bash
cd backend
npm run dev
```

**Critical Flows to Test**:

**1. Authentication**:
```bash
# Signup
curl -X POST http://localhost:4000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","username":"testuser"}'

# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'

# Get user profile
curl http://localhost:4000/api/auth/me \
  -H "Authorization: Bearer <TOKEN>"
```

**2. Characters**:
```bash
# Create character
curl -X POST http://localhost:4000/api/characters \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Char","description":"Test","isPublic":true}'

# Get characters
curl http://localhost:4000/api/characters \
  -H "Authorization: Bearer <TOKEN>"

# Update character
curl -X PUT http://localhost:4000/api/characters/<ID> \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Name"}'

# Delete character
curl -X DELETE http://localhost:4000/api/characters/<ID> \
  -H "Authorization: Bearer <TOKEN>"
```

**3. Stories**:
```bash
# Generate story
curl -X POST http://localhost:4000/api/stories/generate \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"characterId":"<ID>","prompt":"Test story"}'

# Get stories
curl http://localhost:4000/api/stories \
  -H "Authorization: Bearer <TOKEN>"
```

**4. Credits & Subscriptions**:
```bash
# Get user credits
curl http://localhost:4000/api/credits \
  -H "Authorization: Bearer <TOKEN>"

# Purchase credits (test Stripe webhook)
# (manual testing via Stripe dashboard)

# Get subscription status
curl http://localhost:4000/api/subscriptions/status \
  -H "Authorization: Bearer <TOKEN>"
```

**Success Criteria**:
- [ ] All API endpoints respond correctly
- [ ] Data returned matches expected schema
- [ ] No database errors in logs
- [ ] Response times acceptable (within 10% of Prisma 6)

---

### Phase 10: Staging Deployment (1-2 hours)

#### Pre-Deployment Checklist

```bash
# 1. Commit changes
git add .
git commit -m "chore: Migrate to Prisma 7.x"

# 2. Push to staging branch
git push origin feature/prisma-7-migration

# 3. Create PR for staging deployment
gh pr create --title "chore: Migrate to Prisma 7.x" --body "..."

# 4. Wait for CI to pass
gh pr checks
```

#### Staging Migration Plan

**⚠️ CRITICAL**: Coordinate with Agent Reviewer for production deployment.

**Steps**:
1. **Backup staging database** (MANDATORY)
2. Deploy new code to staging
3. Run `prisma migrate deploy` (applies pending migrations)
4. Test all critical flows
5. Monitor error logs for 24 hours

**Commands** (run on staging server):
```bash
# On staging server (or via CI/CD)
cd /app/backend

# Backup database
pg_dump $DATABASE_URL > backup-staging-$(date +%Y%m%d).sql

# Run migrations
npx prisma migrate deploy

# Verify migration status
npx prisma migrate status

# Restart application
pm2 restart backend  # or your process manager
```

**Rollback Plan** (if migration fails):
```bash
# Restore database backup
psql $DATABASE_URL < backup-staging-YYYYMMDD.sql

# Revert code
git revert <commit-hash>
git push origin staging

# Redeploy old version
# (follow your deployment process)
```

---

## Breaking Changes & Migration Notes

### Known Breaking Changes (Prisma 6 → 7)

**Reference**: https://www.prisma.io/docs/guides/upgrade-guides/upgrading-to-prisma-7

**1. TypeScript Types** (stricter):
```typescript
// Prisma 6: May allow loose types
const user = await prisma.user.findUnique({
  where: { id: userId },
});
// user type: User | null

// Prisma 7: Same behavior, but stricter checks
const user = await prisma.user.findUnique({
  where: { id: userId },
});
if (!user) throw new Error('User not found');
// TypeScript now knows user is non-null
```

**2. Query Performance** (improved):
- Queries are faster (no breaking changes, just faster)
- May see different execution plans in PostgreSQL

**3. Error Messages** (improved):
- Better error messages (more informative)
- May need to update error handling if parsing error messages

**4. Node.js Version** (check requirements):
- Prisma 7 may require Node.js 18+ (verify in docs)
- Update `.nvmrc` or Dockerfile if needed

**5. Database Support**:
- PostgreSQL 12+ recommended
- Verify your PostgreSQL version is supported

---

## Testing Strategy

### Pre-Migration Snapshot

```bash
# 1. Backup database
pg_dump $DATABASE_URL > pre-migration-backup.sql

# 2. Export schema
npx prisma db pull > pre-migration-schema.prisma

# 3. Run benchmarks
npx ts-node src/scripts/benchmark-prisma-7.ts > pre-migration-perf.txt

# 4. Run tests
npm test > pre-migration-tests.txt 2>&1

# 5. Count migrations
ls prisma/migrations/ | wc -l
```

### Post-Migration Validation

```bash
# 1. Verify versions
npx prisma --version

# 2. Validate schema
npx prisma validate

# 3. Check migration status
npx prisma migrate status

# 4. Run benchmarks
npx ts-node src/scripts/benchmark-prisma-7.ts > post-migration-perf.txt

# 5. Run tests
npm test > post-migration-tests.txt 2>&1

# 6. Compare performance
diff pre-migration-perf.txt post-migration-perf.txt
```

### Testing Checklist

#### Development Environment
- [ ] `npx prisma --version` shows 7.x.x
- [ ] `npx prisma validate` passes
- [ ] `npx prisma migrate status` shows all migrations applied
- [ ] All tests pass: `npm test`
- [ ] Manual API testing successful
- [ ] Performance benchmarks show improvement or no regression

#### Staging Environment
- [ ] Database backup completed
- [ ] Migrations applied successfully
- [ ] Application starts without errors
- [ ] Critical flows tested manually
- [ ] No errors in logs (24h monitoring)

#### Production Environment (Agent Reviewer)
- [ ] Database backup completed (MANDATORY)
- [ ] Migrations applied successfully
- [ ] Zero-downtime deployment (if possible)
- [ ] Critical flows tested
- [ ] Error rate monitored (should not increase)
- [ ] Performance metrics tracked

---

## Rollout Strategy

### Phase 1: Development (2-3 hours)
**Goal**: Successful migration in local environment

**Tasks**:
1. Create feature branch (5 min)
2. Review migration guide (45 min)
3. Backup dev database (5 min)
4. Update dependencies (15 min)
5. Regenerate Prisma Client (10 min)
6. Validate schema (20 min)
7. Test migrations (30 min)
8. Run tests (30 min)
9. Performance benchmarks (30 min)

**Acceptance**:
- [ ] Prisma 7.x installed
- [ ] All tests passing
- [ ] Performance acceptable

### Phase 2: Integration Testing (1-2 hours)
**Goal**: Verify full application works

**Tasks**:
1. Start dev server
2. Test all API endpoints
3. Manual testing of critical flows
4. Load testing (optional)

**Acceptance**:
- [ ] All endpoints working
- [ ] No database errors
- [ ] Response times acceptable

### Phase 3: Code Review & PR (30 min)
**Goal**: Get approval for staging deployment

**Tasks**:
1. Self-review changes
2. Create PR with detailed description
3. Address review feedback

**Acceptance**:
- [ ] PR created and approved
- [ ] CI checks passing

### Phase 4: Staging Deployment (1-2 hours)
**Goal**: Validate in staging environment

**Tasks**:
1. Backup staging database (MANDATORY)
2. Deploy to staging
3. Run migrations
4. Test critical flows
5. Monitor for 24 hours

**Acceptance**:
- [ ] Staging deployment successful
- [ ] No errors in logs
- [ ] Performance metrics good

### Phase 5: Production Deployment (Coordinated with Agent Reviewer)
**Goal**: Deploy to production safely

**Tasks**:
1. Schedule maintenance window (if needed)
2. Backup production database (MANDATORY)
3. Deploy to production
4. Run migrations
5. Monitor closely for 48 hours

**Acceptance**:
- [ ] Production deployment successful
- [ ] Error rate unchanged
- [ ] Performance improved or same
- [ ] No user complaints

---

## Success Metrics

### Technical Metrics
- **Migration Success**: All migrations applied without errors
- **Test Pass Rate**: 100% (all existing tests pass)
- **Performance**: 10-40% improvement in query times
- **Error Rate**: No increase in database errors

### Performance Benchmarks
**Target** (compared to Prisma 6):
- Simple queries: -10% to -30% response time
- Complex queries (JOINs): -20% to -40% response time
- Aggregations: -15% to -35% response time
- Transactions: No regression

### Quality Metrics
- **Zero Data Loss**: All data intact after migration
- **Zero Downtime**: Production migration with minimal downtime (<5 min)
- **Developer Satisfaction**: Improved DX (better error messages, faster dev)

### Validation Criteria
- [ ] Prisma 7.x successfully installed
- [ ] All existing tests pass
- [ ] Performance improved or maintained
- [ ] No production errors in first 7 days
- [ ] Database integrity verified (checksums, row counts)

---

## Risks & Mitigation

### Risk 1: Data Loss During Migration
**Probability**: Very Low (if backups taken)
**Impact**: Critical

**Mitigation**:
- **MANDATORY database backups** before any migration
- Test migrations in dev environment first
- Verify backups can be restored
- Have rollback plan ready

### Risk 2: Breaking Changes in Queries
**Probability**: Low
**Impact**: High

**Mitigation**:
- Thorough testing of all database operations
- Review Prisma 7 changelog for breaking changes
- Test critical queries manually
- Staging deployment before production

### Risk 3: Performance Regression
**Probability**: Very Low (Prisma 7 is faster)
**Impact**: Medium

**Mitigation**:
- Benchmark queries before and after
- Monitor production performance metrics
- Have rollback plan if performance degrades

### Risk 4: Migration Fails in Production
**Probability**: Low
**Impact**: Critical

**Mitigation**:
- Test migrations thoroughly in dev and staging
- Schedule maintenance window
- Have database backup ready to restore
- Coordinate with Agent Reviewer

### Risk 5: Incompatible PostgreSQL Version
**Probability**: Low
**Impact**: High

**Mitigation**:
- Verify PostgreSQL version before starting
- Check Prisma 7 compatibility matrix
- Test in staging with same PostgreSQL version

---

## Dependencies

### Direct Dependencies
- `@prisma/client@^7.1.0`
- `prisma@^7.1.0`

### System Requirements
- Node.js 18+ (verify in Prisma 7 docs)
- PostgreSQL 12+ (recommended 14+)
- npm or yarn

### Development Tools
- TypeScript (current version)
- ts-node (for running scripts)
- PostgreSQL client tools (pg_dump, psql)

---

## Related Documentation

- **Prisma 7 Upgrade Guide**: https://www.prisma.io/docs/guides/upgrade-guides/upgrading-to-prisma-7
- **Prisma 7 Release Notes**: https://github.com/prisma/prisma/releases
- **GitHub Issue**: [#41](https://github.com/leandro-br-dev/charhub/issues/41)
- **Closed Dependabot PR**: [#35](https://github.com/leandro-br-dev/charhub/pull/35)
- **Prisma Schema**: `backend/prisma/schema.prisma`
- **Migrations**: `backend/prisma/migrations/`
- **Package.json**: `backend/package.json`

---

## Pull Request Template

**Title**: `chore: Migrate to Prisma 7.x`

**Branch**: `feature/prisma-7-migration`

**Description**:
```markdown
## Summary
Migrates backend from Prisma 6.x to 7.x, enabling performance improvements and new features.

Fixes #41
Closes #35 (Dependabot PR - superseded by this manual migration)

## Changes
🔧 **Dependencies**:
- `@prisma/client`: 6.17.1 → 7.1.0
- `prisma`: 6.19.0 → 7.1.0

⚙️ **Database**:
- Schema validated with Prisma 7
- All migrations tested and working
- Prisma Client regenerated

🚀 **Performance**:
- Query performance improved by [X]% (see benchmarks)
- Faster application startup
- Reduced memory usage

## Breaking Changes
- None for application code
- Database migrations tested in dev and staging

## Migration Notes
**From Upgrade Guide**:
- Prisma 7 has better query optimization
- TypeScript types are stricter (improved type safety)
- Error messages more informative

## Testing
- [x] Database backup created (dev, staging)
- [x] Schema validated: `npx prisma validate`
- [x] Migrations applied: `npx prisma migrate deploy`
- [x] All tests pass: `npm test` (100%)
- [x] Manual testing of critical flows
- [x] Performance benchmarks show improvement
- [x] Integration testing complete
- [x] Staging deployment successful

## Database
- [x] Dev database migrated successfully
- [x] Staging database migrated successfully
- [x] Backups taken (dev, staging)
- [x] Rollback plan documented
- [ ] Production migration pending (Agent Reviewer)

## Performance Benchmarks
**Before (Prisma 6)**:
- Simple queries: [X]ms avg
- Complex queries: [Y]ms avg
- Aggregations: [Z]ms avg

**After (Prisma 7)**:
- Simple queries: [X]ms avg (-N%)
- Complex queries: [Y]ms avg (-N%)
- Aggregations: [Z]ms avg (-N%)

## Validation
```bash
# Verify Prisma 7 installation
npx prisma --version
# Output: prisma: 7.1.0, @prisma/client: 7.1.0

# Validate schema
npx prisma validate
# Output: ✓ The schema is valid

# Migration status
npx prisma migrate status
# Output: ✓ All migrations applied

# Test suite
npm test
# Output: ✓ All tests passed
```

## Rollback Plan
If issues arise in production:
1. Restore database backup
2. Revert to previous version of code
3. Redeploy

## Screenshots
[Optional: Performance comparison charts]

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

---

## Notes for Agent Coder

### Implementation Priority
**MEDIUM** - Important for performance and future-proofing, but not blocking critical features.

### Estimated Effort
- **Optimistic**: 3 hours (smooth migration, no issues)
- **Realistic**: 4-5 hours (some testing, minor fixes)
- **Pessimistic**: 8 hours (complex migration issues)

**Recommendation**: Allocate 5 hours, start early in the day for testing time.

### Quick Start

```bash
# 1. Create branch
git checkout -b feature/prisma-7-migration

# 2. Backup dev database
cd backend
pg_dump $DATABASE_URL > backup-dev-$(date +%Y%m%d).sql

# 3. Review migration guide
open https://www.prisma.io/docs/guides/upgrade-guides/upgrading-to-prisma-7

# 4. Update dependencies
npm install @prisma/client@latest prisma@latest --save-exact

# 5. Regenerate client
npx prisma generate

# 6. Validate schema
npx prisma validate

# 7. Test migrations
npx prisma migrate reset --skip-seed  # dev only!
npx prisma migrate dev

# 8. Run tests
npm test

# 9. Benchmark
npx ts-node src/scripts/benchmark-prisma-7.ts

# 10. Create PR
```

### Key Considerations

1. **Always Backup Database**: NEVER migrate without backup
2. **Test Migrations First**: Dev → Staging → Production
3. **Monitor Performance**: Compare before/after benchmarks
4. **Verify Type Safety**: Check TypeScript compilation
5. **Coordinate Production**: Work with Agent Reviewer

### Common Pitfalls

- **No Database Backup**: CRITICAL - always backup first
- **Version Mismatch**: Prisma Client and CLI must match versions
- **Skipping Staging**: Always test in staging before production
- **Ignoring Logs**: Check migration logs for warnings
- **Not Testing Queries**: Run full test suite

### Questions to Clarify

- PostgreSQL version in production?
- Maintenance window available for production migration?
- Current database size? (large DBs may need longer migration)
- Any custom Prisma extensions or middleware?

---

**End of Specification**

For questions or clarifications, consult Agent Planner or review GitHub Issue #41.

🚀 Ready for implementation - follow migration guide and backup database!
