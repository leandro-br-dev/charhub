# Melhorias de Rollback e Backup no Deploy

**Data**: 2025-12-17
**Status**: 🟢 Aprovada - Em Implementação
**Prioridade**: 🔴 Alta (Segurança de Produção)
**Agent**: Reviewer
**Versão**: 2.0 (Atualizada com Git Tags)

---

## 🎯 Objetivo

Implementar mecanismos automáticos de rollback e backup no processo de deploy para garantir estabilidade e recuperação rápida em caso de falhas.

---

## 📋 Problemas Identificados

### 1. Health Check Sem Rollback Automático ❌

**Situação Atual**:
```yaml
# .github/workflows/deploy-production.yml (linhas 232-269)
- name: Health Check
  run: |
    # Verifica saúde do backend
    # Se falhar: exit 1 → workflow falha
    # Código fica em estado quebrado ❌
```

**Impacto**:
- Deploy falha mas código permanece na versão quebrada
- Requer intervenção manual para reverter
- Site pode ficar indisponível

---

### 2. Migrações Prisma Sem Rollback ❌

**Limitação do Prisma**:
- Prisma não tem comando nativo `prisma migrate rollback`
- Migrações são apenas "forward-only"
- Documentação oficial: [Generating down migrations | Prisma Docs](https://www.prisma.io/docs/orm/prisma-migrate/workflows/generating-down-migrations)

**Impacto**:
- Não é possível reverter schema automaticamente
- Rollback de código sem rollback de schema causa incompatibilidade
- Requer migration reversa manual

---

### 3. Sem Backup Automático do Banco ❌

**Situação Atual**:
- Deploy executa migrations diretamente no banco de produção
- Não há backup antes de mudanças críticas
- Não há "safety net" para recuperação

**Impacto**:
- Impossível reverter dados após migration
- Perda de dados em caso de migration defeituosa
- Recovery depende de backups manuais (se existirem)

---

## 💡 Soluções Propostas

### Solução 1: Rollback Automático com Git Tags "latest-stable"

**Estratégia**: Usar Git tags para marcar versões estáveis e sempre reverter para última versão conhecida como estável.

#### Problema do HEAD~1 (Evitado)

```
❌ Problema:
v1.0 (estável) → v1.1 (falha) → rollback HEAD~1 = v1.0 ✅
v1.0 (estável) → v1.2 (falha) → rollback HEAD~1 = v1.1 ❌ (que já falhou!)
v1.0 (estável) → v1.3 (falha) → rollback HEAD~1 = v1.2 ❌ (cascata de falhas!)

✅ Solução com Git Tags:
v1.0 (estável) → tag: latest-stable
v1.1 (falha) → rollback para latest-stable = v1.0 ✅
v1.2 (falha) → rollback para latest-stable = v1.0 ✅ (não v1.1!)
v1.3 (falha) → rollback para latest-stable = v1.0 ✅
v1.4 (sucesso) → atualiza tag: latest-stable = v1.4
```

#### Parte 1: Marcar Versões Estáveis

```yaml
# Adicionar APÓS o step "Health Check" (quando health check passa)

- name: Mark Deployment as Stable
  if: success()  # Só executa se health check passou
  run: |
    echo "✅ Health check passed - marking as stable version"

    # Configurar git
    git config --global user.name "github-actions[bot]"
    git config --global user.email "github-actions[bot]@users.noreply.github.com"

    # Criar tag com timestamp (para histórico)
    STABLE_TAG="stable-$(date +%Y%m%d-%H%M%S)"
    git tag -a "$STABLE_TAG" -m "Stable deployment - commit ${{ github.sha }}"

    # Mover tag 'latest-stable' para este commit
    git tag -f latest-stable -m "Latest stable version - deployed at $(date)"

    # Push tags para origin
    git push origin "$STABLE_TAG"
    git push origin latest-stable --force

    echo "📌 Tagged as: $STABLE_TAG"
    echo "📌 Moved 'latest-stable' to current commit"
```

#### Parte 2: Rollback para Última Versão Estável

```yaml
# Adicionar após o step "Health Check" (quando health check falha)

- name: Rollback to Last Stable Version
  if: failure()  # Executa se health check falhou
  run: |
    echo "❌ Health check failed - rolling back to last stable version..."

    ssh -o StrictHostKeyChecking=no \
        -o UserKnownHostsFile=/dev/null \
        -o ServerAliveInterval=60 \
        -o ServerAliveCountMax=10 \
        -i $HOME/.ssh/deploy_key \
        leandro_br_dev_gmail_com@34.66.66.202 \
        'bash -s' << 'ROLLBACK'

    APP_DIR="/mnt/stateful_partition/charhub"
    COMPOSE="/var/lib/toolbox/bin/docker-compose"
    cd "$APP_DIR"

    # Fix permissions
    sudo chown -R leandro_br_dev_gmail_com:leandro_br_dev_gmail_com "$APP_DIR" 2>/dev/null || true
    sudo chmod -R u+w "$APP_DIR" 2>/dev/null || true
    git config --global --add safe.directory "$APP_DIR" 2>/dev/null || true

    # Fetch latest tags
    git fetch --tags

    # Verificar se tag latest-stable existe
    if ! git rev-parse latest-stable >/dev/null 2>&1; then
      echo "⚠️  Tag 'latest-stable' not found!"
      echo "This is likely the first deployment with this feature."
      echo "Falling back to HEAD~1 (legacy behavior)"
      ROLLBACK_TARGET="HEAD~1"
    else
      ROLLBACK_TARGET="latest-stable"
      echo "📌 Found latest-stable tag"
    fi

    # Get commit info
    CURRENT=$(git rev-parse HEAD)
    STABLE=$(git rev-parse $ROLLBACK_TARGET)

    echo "Current commit (failed): $CURRENT"
    echo "Rolling back to: $STABLE ($ROLLBACK_TARGET)"

    # Verificar se já estamos na versão estável
    if [ "$CURRENT" = "$STABLE" ]; then
      echo "⚠️  Already at stable version but health check failed!"
      echo "This indicates the stable version is broken - CRITICAL!"
      echo "Manual intervention required - do not rollback further"
      exit 1
    fi

    # Mostrar log de commits que serão revertidos
    echo ""
    echo "📝 Commits being reverted:"
    git log --oneline $STABLE..$CURRENT
    echo ""

    # Rollback para versão estável
    git reset --hard $ROLLBACK_TARGET

    echo "✅ Code rolled back to stable version"

    # Rebuild containers
    export HOME="/home/leandro_br_dev_gmail_com"
    echo "🔨 Rebuilding containers with stable version..."
    sudo -E HOME="$HOME" $COMPOSE down --remove-orphans
    sleep 5
    sudo -E HOME="$HOME" $COMPOSE build --pull
    sudo -E HOME="$HOME" $COMPOSE up -d
    sleep 15

    # Verify rollback
    STATUS=$(sudo $COMPOSE ps backend --format='{{.Status}}' 2>/dev/null)
    echo "Backend status after rollback: $STATUS"

    if [[ "$STATUS" =~ "Up" ]] || [[ "$STATUS" =~ "healthy" ]]; then
      echo "✅ Rollback successful - stable version restored"
      exit 0
    else
      echo "❌ Rollback failed - manual intervention required"
      exit 1
    fi
    ROLLBACK

- name: Notify Rollback Details
  if: failure()
  run: |
    echo "🚨 AUTOMATIC ROLLBACK EXECUTED"
    echo ""
    echo "Failed commit: ${{ github.sha }}"
    echo "Rolled back to: latest-stable tag"
    echo ""
    echo "Action required:"
    echo "1. Check GitHub Actions logs for reverted commits"
    echo "2. Fix the issue locally"
    echo "3. Test thoroughly before pushing again"
    echo ""
    echo "View stable versions: git tag -l 'stable-*'"
    echo "View latest stable: git show latest-stable"
```

#### Fluxo de Rollback com Git Tags

```
Deploy → Health Check Passes ✅
    ↓
Mark as Stable
    ├─→ Tag: stable-20251217-143022
    └─→ Move: latest-stable → current commit
    ↓
Production stable


Deploy → Health Check Fails ❌
    ↓
Rollback Triggered (if: failure)
    ↓
1. git fetch --tags
2. git reset --hard latest-stable
3. Rebuild containers (stable code)
4. Start containers
5. Verify health
    ↓
✅ Last stable version restored
   Production stable
```

#### Comparação: Múltiplas Falhas Consecutivas

| Tentativa | HEAD~1 (Antigo) | latest-stable (Novo) |
|-----------|-----------------|----------------------|
| v1.0 (deploy OK) | Tag: latest-stable | Tag: latest-stable |
| v1.1 (falha) | Rollback → v1.0 ✅ | Rollback → v1.0 ✅ |
| v1.2 (falha) | Rollback → v1.1 ❌ | Rollback → v1.0 ✅ |
| v1.3 (falha) | Rollback → v1.2 ❌ | Rollback → v1.0 ✅ |
| v1.4 (falha) | Rollback → v1.3 ❌ | Rollback → v1.0 ✅ |
| v1.5 (deploy OK) | Rollback → v1.4 ❌ | Tag: latest-stable → v1.5 |

#### Vantagens

✅ Rollback automático em ~3-5 minutos
✅ **Sempre volta para versão estável conhecida**
✅ **Múltiplas tentativas de correção não pioram situação**
✅ Histórico de versões estáveis (tags timestampadas)
✅ Fácil debug: `git tag -l 'stable-*'`
✅ Padrão da indústria (usado por Kubernetes, Docker Hub, etc)
✅ Sem intervenção manual necessária
✅ Produção volta a funcionar rapidamente

#### Proteções Adicionais

✅ **Fallback**: Se tag `latest-stable` não existe (primeira execução), usa HEAD~1
✅ **Detecção de loop**: Se já está na versão estável mas health check falha, aborta rollback
✅ **Transparência**: Mostra commits que serão revertidos antes de rollback

---

### Solução 2: Estratégia de Rollback para Migrações Prisma

**Estratégia**: Combinação de backup do banco + down migrations opcionais.

#### Opção A: Backup/Restore (Recomendado para produção)

**Princípio**: Sempre ter backup antes de aplicar migrations.

```yaml
# Adicionar ANTES do step "Rebuild Containers"

- name: Backup Database Before Migrations
  run: |
    echo "💾 Creating database backup before deploy..."
    ssh -o StrictHostKeyChecking=no \
        -o UserKnownHostsFile=/dev/null \
        -o ServerAliveInterval=60 \
        -o ServerAliveCountMax=10 \
        -i $HOME/.ssh/deploy_key \
        leandro_br_dev_gmail_com@34.66.66.202 \
        'bash -s' << 'BACKUP'

    APP_DIR="/mnt/stateful_partition/charhub"
    BACKUP_DIR="$APP_DIR/backups/database"
    COMPOSE="/var/lib/toolbox/bin/docker-compose"

    # Create backup directory
    mkdir -p "$BACKUP_DIR"

    # Generate backup filename with timestamp
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    COMMIT_SHA="${{ github.sha }}"
    BACKUP_FILE="$BACKUP_DIR/pre-deploy_${TIMESTAMP}_${COMMIT_SHA:0:7}.sql.gz"

    echo "📝 Backup file: $BACKUP_FILE"

    # Create compressed backup using pg_dump
    cd "$APP_DIR"
    sudo $COMPOSE exec -T postgres pg_dump \
      -U ${POSTGRES_USER:-charhub} \
      -d ${POSTGRES_DB:-charhub_db} \
      --verbose \
      --no-owner \
      --no-acl \
      | gzip -9 > "$BACKUP_FILE"

    # Verify backup was created
    if [ -f "$BACKUP_FILE" ]; then
      SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
      echo "✅ Backup created successfully: $SIZE"
      echo "BACKUP_FILE=$BACKUP_FILE" >> $GITHUB_ENV
    else
      echo "❌ Backup creation failed"
      exit 1
    fi

    # Cleanup old backups (keep last 10)
    echo "🧹 Cleaning up old backups (keeping last 10)..."
    cd "$BACKUP_DIR"
    ls -t pre-deploy_*.sql.gz | tail -n +11 | xargs -r rm
    echo "✅ Cleanup complete"
    BACKUP
```

#### Script de Restore (para uso em rollback)

Criar arquivo `/root/projects/charhub-reviewer/scripts/ops/restore-database-backup.sh`:

```bash
#!/bin/bash
# Restore PostgreSQL database from backup
# Usage: ./restore-database-backup.sh <backup-file>

set -e

BACKUP_FILE="$1"
APP_DIR="/mnt/stateful_partition/charhub"
COMPOSE="/var/lib/toolbox/bin/docker-compose"

if [ -z "$BACKUP_FILE" ]; then
  echo "❌ Usage: $0 <backup-file>"
  echo "Available backups:"
  ls -lh "$APP_DIR/backups/database/"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "🔄 Restoring database from backup..."
echo "Backup: $BACKUP_FILE"
echo ""
read -p "⚠️  This will OVERWRITE the current database. Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "❌ Restore cancelled"
  exit 0
fi

echo "🚀 Starting restore..."

# Stop backend to prevent connections
cd "$APP_DIR"
sudo $COMPOSE stop backend

# Drop existing database and recreate (safer than DROP CASCADE)
echo "🗑️  Dropping existing database..."
sudo $COMPOSE exec -T postgres psql -U ${POSTGRES_USER:-charhub} -d postgres << SQL
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${POSTGRES_DB:-charhub_db}';
DROP DATABASE IF EXISTS ${POSTGRES_DB:-charhub_db};
CREATE DATABASE ${POSTGRES_DB:-charhub_db};
GRANT ALL PRIVILEGES ON DATABASE ${POSTGRES_DB:-charhub_db} TO ${POSTGRES_USER:-charhub};
SQL

# Restore from backup
echo "📥 Restoring from backup..."
gunzip -c "$BACKUP_FILE" | sudo $COMPOSE exec -T postgres psql \
  -U ${POSTGRES_USER:-charhub} \
  -d ${POSTGRES_DB:-charhub_db} \
  --set ON_ERROR_STOP=on

# Restart backend
echo "🔄 Restarting backend..."
sudo $COMPOSE start backend
sleep 10

# Verify
STATUS=$(sudo $COMPOSE ps backend --format='{{.Status}}')
if [[ "$STATUS" =~ "Up" ]] || [[ "$STATUS" =~ "healthy" ]]; then
  echo "✅ Database restored successfully!"
  echo "Backend status: $STATUS"
else
  echo "⚠️  Restore completed but backend is not healthy: $STATUS"
  echo "Check logs: sudo $COMPOSE logs backend"
fi
```

#### Integração com Rollback Automático

Modificar o step de rollback para também restaurar o banco:

```yaml
- name: Rollback Database on Failure
  if: failure()
  run: |
    echo "🔄 Rolling back database to pre-deploy state..."
    ssh -o StrictHostKeyChecking=no \
        -o UserKnownHostsFile=/dev/null \
        -o ServerAliveInterval=60 \
        -o ServerAliveCountMax=10 \
        -i $HOME/.ssh/deploy_key \
        leandro_br_dev_gmail_com@34.66.66.202 \
        "cd /mnt/stateful_partition/charhub && ./scripts/ops/restore-database-backup.sh $BACKUP_FILE"
```

---

#### Opção B: Down Migrations (Opcional, para casos avançados)

**Quando usar**: Para rollbacks cirúrgicos de schema específico sem restaurar dados.

**Processo Manual** (documentar em checklist de rollback):

```bash
# 1. Gerar down migration
npx prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-schema-datasource prisma/schema.prisma \
  --script > rollback.sql

# 2. Aplicar down migration
npx prisma db execute --file rollback.sql --schema prisma/schema.prisma

# 3. Marcar migration como rolled back
npx prisma migrate resolve --rolled-back "20251217_migration_name"
```

**Limitação**:
- Requer shadow database para comparação
- Não reverte dados, apenas schema
- Mais complexo e propenso a erros

**Referência**: [Generating down migrations | Prisma Documentation](https://www.prisma.io/docs/orm/prisma-migrate/workflows/generating-down-migrations)

---

### Solução 3: Backup Automático Antes de Todo Deploy

**Estratégia**: Sempre criar backup antes de rebuild, com política de retenção.

#### Implementação Completa

**1. Script de Backup** (`scripts/ops/backup-database.sh`):

```bash
#!/bin/bash
# Automated PostgreSQL backup for production deploys
# Creates timestamped compressed backups with retention policy

set -e

APP_DIR="${APP_DIR:-/mnt/stateful_partition/charhub}"
BACKUP_DIR="$APP_DIR/backups/database"
COMPOSE="${COMPOSE:-/var/lib/toolbox/bin/docker-compose}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
MAX_BACKUPS="${MAX_BACKUPS:-10}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate filename
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
COMMIT_SHA="${GITHUB_SHA:-manual}"
BACKUP_FILE="$BACKUP_DIR/backup_${TIMESTAMP}_${COMMIT_SHA:0:7}.sql.gz"

echo "💾 Starting database backup..."
echo "Target: $BACKUP_FILE"

# Execute backup
cd "$APP_DIR"
sudo $COMPOSE exec -T postgres pg_dump \
  -U "${POSTGRES_USER:-charhub}" \
  -d "${POSTGRES_DB:-charhub_db}" \
  --verbose \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  | gzip -9 > "$BACKUP_FILE"

# Verify backup
if [ -f "$BACKUP_FILE" ]; then
  SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "✅ Backup created: $SIZE"
else
  echo "❌ Backup failed"
  exit 1
fi

# Retention: Delete backups older than N days
echo "🧹 Applying retention policy (${RETENTION_DAYS} days)..."
find "$BACKUP_DIR" -name "backup_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete

# Also keep only last N backups
echo "🧹 Keeping last ${MAX_BACKUPS} backups..."
cd "$BACKUP_DIR"
ls -t backup_*.sql.gz | tail -n +$((MAX_BACKUPS + 1)) | xargs -r rm

echo "✅ Backup complete!"
```

**2. Integração no Workflow**:

```yaml
# Adicionar como primeiro step ANTES de "Rebuild Containers"

- name: Create Pre-Deploy Database Backup
  id: backup
  run: |
    echo "💾 Creating database backup..."
    ssh -o StrictHostKeyChecking=no \
        -o UserKnownHostsFile=/dev/null \
        -o ServerAliveInterval=60 \
        -o ServerAliveCountMax=10 \
        -i $HOME/.ssh/deploy_key \
        leandro_br_dev_gmail_com@34.66.66.202 \
        'bash -s' << 'BACKUP'

    cd /mnt/stateful_partition/charhub

    # Make backup script executable
    chmod +x scripts/ops/backup-database.sh

    # Run backup
    export GITHUB_SHA="${{ github.sha }}"
    ./scripts/ops/backup-database.sh

    # Get backup file path
    BACKUP_FILE=$(ls -t backups/database/backup_*.sql.gz | head -1)
    echo "BACKUP_FILE=$BACKUP_FILE" >> $GITHUB_OUTPUT
    BACKUP

    echo "✅ Backup saved: $BACKUP_FILE"
```

**3. Ordem dos Steps** (atualizado):

```yaml
jobs:
  deploy:
    steps:
      # ... auth, ssh setup ...

      - name: Pull Latest Code

      - name: Sync Cloudflare Credentials

      - name: Create Pre-Deploy Database Backup  # 🆕 NOVO
        id: backup

      - name: Rebuild Containers  # migrations rodam aqui

      - name: Health Check

      - name: Rollback on Failure  # 🆕 NOVO
        if: failure()
        # Reverte código + restaura backup

      - name: Verify Deployment
```

---

### Solução 4: Melhorias no Checklist de Rollback

Atualizar `docs/agents/reviewer/checklists/rollback.md` para incluir:

#### Seção: Database Rollback

```markdown
### 5. Rollback Database (Se Migrations Foram Aplicadas)

**⚠️ CRITICAL**: Se o deploy incluiu migrações do Prisma, restaure o banco.

#### Option A: Restore from Automatic Backup (Recommended)

```bash
# 1. List available backups
ssh leandro_br_dev_gmail_com@34.66.66.202
cd /mnt/stateful_partition/charhub/backups/database
ls -lh backup_*.sql.gz

# 2. Identify backup BEFORE the failed deploy
# Format: backup_YYYYMMDD_HHMMSS_<commit>.sql.gz

# 3. Restore using script
./scripts/ops/restore-database-backup.sh backups/database/backup_20251217_143022_abc1234.sql.gz
```

#### Option B: Manual Restore (If script unavailable)

```bash
cd /mnt/stateful_partition/charhub
COMPOSE="/var/lib/toolbox/bin/docker-compose"
BACKUP_FILE="backups/database/backup_20251217_143022_abc1234.sql.gz"

# Stop backend
sudo $COMPOSE stop backend

# Drop and recreate database
sudo $COMPOSE exec -T postgres psql -U charhub -d postgres << SQL
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'charhub_db';
DROP DATABASE IF EXISTS charhub_db;
CREATE DATABASE charhub_db;
GRANT ALL PRIVILEGES ON DATABASE charhub_db TO charhub;
SQL

# Restore
gunzip -c "$BACKUP_FILE" | sudo $COMPOSE exec -T postgres psql \
  -U charhub -d charhub_db --set ON_ERROR_STOP=on

# Restart backend
sudo $COMPOSE start backend
```
```

---

## 📊 Comparação: Antes vs Depois

### Antes (Situação Atual)

| Cenário | Resultado | Tempo de Recovery |
|---------|-----------|-------------------|
| Health check falha | ❌ Código quebrado em produção | 15-30 min (manual) |
| Migration quebra | ❌ Schema incompatível | 30-60 min (manual) |
| Perda de dados | ❌ Sem backup recente | Horas/Impossível |

**Intervenções manuais**: 100%
**Downtime médio**: 30-60 minutos

---

### Depois (Com Melhorias)

| Cenário | Resultado | Tempo de Recovery |
|---------|-----------|-------------------|
| Health check falha | ✅ Rollback automático | 3-5 min (automático) |
| Migration quebra | ✅ Restore do backup | 5-10 min (script) |
| Perda de dados | ✅ Backup disponível | 5-10 min (restore) |

**Intervenções manuais**: ~20% (apenas casos extremos)
**Downtime médio**: 5-10 minutos

---

## 🎯 Plano de Implementação

### Fase 1: Backup Automático (Prioridade Alta)

**Tarefas**:
1. ✅ Criar script `scripts/ops/backup-database.sh`
2. ✅ Criar script `scripts/ops/restore-database-backup.sh`
3. ✅ Adicionar step "Create Pre-Deploy Database Backup" no workflow
4. ✅ Testar backup/restore em ambiente de desenvolvimento

**Entregáveis**:
- `/scripts/ops/backup-database.sh`
- `/scripts/ops/restore-database-backup.sh`
- Workflow atualizado

**Tempo estimado**: Implementar e testar

---

### Fase 2: Rollback Automático (Prioridade Alta)

**Tarefas**:
1. ✅ Adicionar step "Rollback on Health Check Failure" no workflow
2. ✅ Integrar restore de banco no rollback
3. ✅ Adicionar notificações de rollback
4. ✅ Testar cenário de falha completo

**Entregáveis**:
- Workflow com rollback automático
- Logs e notificações de rollback

**Tempo estimado**: Implementar e testar

---

### Fase 3: Documentação e Checklists (Prioridade Média)

**Tarefas**:
1. ✅ Atualizar `checklists/rollback.md` com procedimentos de restore
2. ✅ Atualizar `checklists/pre-deploy.md` com verificação de backups
3. ✅ Documentar processo de down migrations (Prisma)
4. ✅ Criar guia de troubleshooting para rollbacks

**Entregáveis**:
- Checklists atualizados
- Documentação de procedimentos

**Tempo estimado**: Documentar

---

### Fase 4: Monitoramento e Alertas (Prioridade Baixa)

**Tarefas**:
1. Adicionar métricas de backup (tamanho, tempo, sucesso)
2. Alertas para backup failures
3. Dashboard de status de backups
4. Notificações Slack para rollbacks automáticos

**Entregáveis**:
- Sistema de monitoramento de backups
- Alertas configurados

**Tempo estimado**: Implementar

---

## ⚠️ Considerações Importantes

### Backup

✅ **Fazer**:
- Backup antes de TODA migration
- Comprimir backups (gzip -9)
- Política de retenção (últimos 10 + últimos 30 dias)
- Testar restores regularmente

❌ **Não fazer**:
- Confiar em backups não testados
- Manter backups sem limite de espaço
- Fazer backup durante alta carga (preferir janelas de menor uso)

---

### Rollback

✅ **Fazer**:
- Rollback automático primeiro, investigar depois
- Verificar health após rollback
- Notificar time sobre rollback
- Documentar causa do rollback

❌ **Não fazer**:
- Tentar "consertar" durante rollback
- Fazer rollback parcial (código sim, banco não)
- Ignorar rollback se "parecer funcionar"

---

### Prisma Migrations

✅ **Fazer**:
- Sempre ter backup antes de migration
- Testar migrations em staging primeiro
- Considerar migrations reversíveis no design
- Documentar migrations complexas

❌ **Não fazer**:
- Deploy de migrations não testadas
- Migrations que destroem dados sem backup
- Assumir que "down migrations" são triviais

---

## 📚 Referências

### PostgreSQL Backup/Restore
- [Automated PostgreSQL Backups in Docker: Complete Guide](https://serversinc.io/blog/automated-postgresql-backups-in-docker-complete-guide-with-pg-dump/)
- [Docker Postgres Backup/Restore Guide](https://simplebackups.com/blog/docker-postgres-backup-restore-guide-with-examples)
- [How to dump & restore PostgreSQL from Docker](https://davejansen.com/how-to-dump-and-restore-a-postgresql-database-from-a-docker-container/)

### Prisma Migrations
- [Generating down migrations | Prisma Documentation](https://www.prisma.io/docs/orm/prisma-migrate/workflows/generating-down-migrations)
- [Patching & hotfixing | Prisma Documentation](https://www.prisma.io/docs/orm/prisma-migrate/workflows/patching-and-hotfixing)
- [Roll back migration discussion](https://github.com/prisma/prisma/discussions/4617)

### GitHub Actions & Docker
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Docker Compose Docs](https://docs.docker.com/compose/)

---

## ✅ Próximos Passos

Aguardando aprovação do usuário para:

1. **Implementar Fase 1** (Backup Automático)
   - Criar scripts de backup/restore
   - Adicionar ao workflow
   - Testar em desenvolvimento

2. **Implementar Fase 2** (Rollback Automático)
   - Adicionar step de rollback condicional
   - Integrar restore de banco
   - Testar cenário de falha

3. **Atualizar Documentação**
   - Checklists de rollback
   - Guias de troubleshooting

**Questões para o usuário**:
- ✅ Aprovar estratégia proposta?
- ✅ Começar pela Fase 1 (Backup)?
- ✅ Políticas de retenção: 10 backups + 30 dias está adequado?
- ✅ Testar em desenvolvimento primeiro ou direto em produção?
