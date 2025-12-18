# Guia de Implementação: Rollback Automático e Backup

**Data**: 2025-12-17
**Status**: 🟢 Pronto para Implementação
**Relacionado**: `deploy-rollback-backup-improvements.md`

---

## 📋 O Que Foi Criado

### ✅ Documentação

1. **Proposta Completa**: `deploy-rollback-backup-improvements.md`
   - Análise de problemas
   - Soluções com Git Tags
   - Estratégias de backup/restore
   - Plano de implementação

2. **Checklist Atualizado**: `docs/agents/reviewer/checklists/rollback.md`
   - Adicionada seção "Database Rollback"
   - Três opções de restore
   - Decision matrix

### ✅ Scripts Operacionais

1. **`scripts/ops/backup-database.sh`**
   - Backup automático do PostgreSQL
   - Compressão gzip
   - Política de retenção (10 backups + 30 dias)
   - Validação de integridade

2. **`scripts/ops/restore-database-backup.sh`**
   - Restore de backups
   - Validação automática
   - Reinício seguro de containers
   - Verificação de saúde

---

## 🚀 Próximos Passos para Implementação

### Fase 1: Testar Scripts Localmente (RECOMENDADO)

Antes de aplicar no workflow de produção, teste os scripts localmente.

#### Teste 1: Backup Local

```bash
# Subir ambiente local
cd /root/projects/charhub-reviewer
docker compose up -d

# Aguardar containers estarem saudáveis
docker compose ps

# Executar backup
export APP_DIR=$(pwd)
export COMPOSE="docker compose"
export POSTGRES_USER="charhub"
export POSTGRES_DB="charhub_db"
export GITHUB_SHA="test123"

./scripts/ops/backup-database.sh

# Verificar backup criado
ls -lh backups/database/
```

**Checklist:**
- [ ] Script executou sem erros
- [ ] Backup criado em `backups/database/`
- [ ] Tamanho do backup razoável (>1KB)
- [ ] Script mostra informações corretas

#### Teste 2: Restore Local

```bash
# Identificar backup recente
BACKUP_FILE=$(ls -t backups/database/backup_*.sql.gz | head -1)
echo "Testing restore of: $BACKUP_FILE"

# Executar restore
./scripts/ops/restore-database-backup.sh "$BACKUP_FILE"

# Verificar saúde após restore
docker compose ps backend
docker compose logs backend --tail=50
```

**Checklist:**
- [ ] Script executou sem erros
- [ ] Backend reiniciou corretamente
- [ ] Banco contém dados esperados
- [ ] Aplicação está funcional

---

### Fase 2: Atualizar Workflow de Deploy

Agora que os scripts estão testados, vamos integrá-los no workflow de produção.

#### Mudanças Necessárias em `.github/workflows/deploy-production.yml`

**Arquivo a editar**: `.github/workflows/deploy-production.yml`

#### Mudança 1: Adicionar Backup Antes do Deploy

**Localização**: Após "Sync Cloudflare Credentials", ANTES de "Rebuild Containers"

```yaml
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
    export APP_DIR="/mnt/stateful_partition/charhub"
    export COMPOSE="/var/lib/toolbox/bin/docker-compose"
    export POSTGRES_USER="${POSTGRES_USER:-charhub}"
    export POSTGRES_DB="${POSTGRES_DB:-charhub_db}"
    ./scripts/ops/backup-database.sh

    # Get backup file path for potential rollback
    BACKUP_FILE=$(ls -t backups/database/backup_*.sql.gz | head -1)
    echo "Latest backup: $BACKUP_FILE"
    BACKUP

    echo "✅ Pre-deploy backup completed"
```

#### Mudança 2: Marcar Versão Estável Após Health Check

**Localização**: Após "Health Check" (quando sucesso)

```yaml
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

#### Mudança 3: Rollback Automático em Caso de Falha

**Localização**: Após "Health Check" (quando falha)

```yaml
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

    # Restore database backup
    echo "🔄 Restoring database from backup..."
    BACKUP_FILE=$(ls -t backups/database/backup_*.sql.gz | head -1)
    if [ -f "$BACKUP_FILE" ]; then
      echo "Restoring from: $BACKUP_FILE"
      chmod +x scripts/ops/restore-database-backup.sh
      export SKIP_CONFIRMATION="true"
      ./scripts/ops/restore-database-backup.sh "$BACKUP_FILE" || echo "⚠️  Database restore failed"
    else
      echo "⚠️  No backup found, skipping database restore"
    fi

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

---

### Ordem dos Steps no Workflow (Atualizada)

```yaml
jobs:
  deploy:
    steps:
      # ... (auth, ssh setup, pull code, sync cloudflare)

      - name: Create Pre-Deploy Database Backup  # 🆕 NOVO
        id: backup

      - name: Rebuild Containers  # Existente

      - name: Health Check  # Existente

      - name: Mark Deployment as Stable  # 🆕 NOVO
        if: success()

      - name: Rollback to Last Stable Version  # 🆕 NOVO
        if: failure()

      - name: Notify Rollback Details  # 🆕 NOVO
        if: failure()

      - name: Verify Deployment  # Existente

      # ... (resto do workflow)
```

---

## 🧪 Testando a Implementação

### Teste 1: Deploy Bem-Sucedido

**Objetivo**: Verificar que backup e tagging funcionam corretamente.

```bash
# Fazer um pequeno commit de teste
echo "# Test" >> README.md
git add README.md
git commit -m "test: verify backup and tagging workflow"
git push origin main

# Monitorar deploy
gh run watch

# Verificar após sucesso
git fetch --tags
git tag -l 'stable-*'
# Deve mostrar nova tag stable-YYYYMMDD-HHMMSS

git show latest-stable
# Deve apontar para o commit de teste
```

**Checklist:**
- [ ] Deploy completou com sucesso
- [ ] Backup foi criado (verificar logs do workflow)
- [ ] Tag `stable-YYYYMMDD-HHMMSS` foi criada
- [ ] Tag `latest-stable` aponta para commit atual
- [ ] Produção está saudável

### Teste 2: Deploy com Falha (Rollback Automático)

**⚠️ CUIDADO**: Este teste vai quebrar produção temporariamente!

**Opção A: Testar em Staging (Recomendado)**
- Configure ambiente de staging primeiro
- Teste rollback lá antes de produção

**Opção B: Criar Falha Intencional**

```bash
# Criar branch de teste com código que falhará health check
git checkout -b test/intentional-failure

# Modificar algo que quebrará health check
# Exemplo: comentar endpoint de health

git add .
git commit -m "test: intentional failure for rollback testing"
git push origin main

# IMEDIATAMENTE monitorar
gh run watch

# O que deve acontecer:
# 1. Deploy inicia
# 2. Backup é criado
# 3. Containers são reconstruídos
# 4. Health check FALHA (proposital)
# 5. Rollback automático é acionado
# 6. Código volta para latest-stable
# 7. Database é restaurado
# 8. Containers são reconstruídos com versão estável
# 9. Health check PASSA
# 10. Produção está estável novamente
```

**Checklist:**
- [ ] Deploy detectou falha no health check
- [ ] Rollback automático foi acionado
- [ ] Código foi revertido para latest-stable
- [ ] Backup do banco foi restaurado
- [ ] Containers foram reconstruídos
- [ ] Produção voltou a funcionar
- [ ] Tempo total de recovery < 10 minutos

---

## 📊 Métricas de Sucesso

Após implementação, você deve observar:

| Métrica | Antes | Meta | Como Medir |
|---------|-------|------|------------|
| Recovery Time (falha) | 30-60 min | 5-10 min | Tempo entre falha e produção estável |
| Intervenção Manual | 100% | 20% | % de rollbacks que requerem SSH manual |
| Perda de Dados | Possível | 0% | Backups disponíveis para restore |
| Downtime | 30-60 min | 5-10 min | Tempo de indisponibilidade |

---

## 🔧 Manutenção

### Monitoramento de Backups

```bash
# SSH para produção
gcloud compute ssh charhub-vm --zone=us-central1-a

# Ver backups recentes
ls -lht /mnt/stateful_partition/charhub/backups/database/ | head -10

# Verificar espaço em disco
du -sh /mnt/stateful_partition/charhub/backups/database/
df -h /mnt/stateful_partition
```

### Limpeza Manual (Se Necessário)

```bash
# Remover backups antigos manualmente
find /mnt/stateful_partition/charhub/backups/database/ \
  -name "backup_*.sql.gz" \
  -type f \
  -mtime +60 \
  -delete
```

### Ver Tags Estáveis

```bash
# Listar todas as versões estáveis
git tag -l 'stable-*' --sort=-creatordate | head -10

# Ver qual commit é latest-stable
git show latest-stable --oneline -1

# Ver histórico de estabilidade
git log --oneline --decorate --graph --tags='stable-*'
```

---

## ⚠️ Troubleshooting

### Problema: Backup Falha

**Sintomas**: Step "Create Pre-Deploy Database Backup" falha

**Diagnóstico**:
```bash
# SSH para VM
gcloud compute ssh charhub-vm --zone=us-central1-a

# Verificar PostgreSQL está rodando
docker compose ps postgres

# Testar backup manualmente
cd /mnt/stateful_partition/charhub
./scripts/ops/backup-database.sh
```

**Soluções**:
- Verificar PostgreSQL container está saudável
- Verificar espaço em disco disponível
- Verificar permissões de escrita em `backups/database/`

### Problema: Rollback Falha

**Sintomas**: Rollback executa mas produção ainda quebrada

**Diagnóstico**:
```bash
# Ver se rollback foi executado
git log --oneline -5

# Ver qual commit é latest-stable
git show latest-stable

# Verificar containers
docker compose ps
docker compose logs backend --tail=100
```

**Soluções**:
- Verificar se latest-stable aponta para commit realmente estável
- Executar rollback manual: `docs/agents/reviewer/checklists/rollback.md`
- Considerar revert de múltiplos commits

### Problema: Tag latest-stable Não Existe

**Sintomas**: Primeira execução após implementação

**Solução**: É esperado! O sistema fará fallback para HEAD~1 automaticamente.

Para criar tag inicial manualmente:
```bash
git tag -a latest-stable -m "Initial stable version"
git push origin latest-stable
```

---

## 📚 Referências

- **Proposta Completa**: `deploy-rollback-backup-improvements.md`
- **Checklist de Rollback**: `docs/agents/reviewer/checklists/rollback.md`
- **Script de Backup**: `scripts/ops/backup-database.sh`
- **Script de Restore**: `scripts/ops/restore-database-backup.sh`

---

## ✅ Checklist Final de Implementação

### Preparação

- [ ] Scripts testados localmente
- [ ] Backup e restore funcionam
- [ ] Documentação lida e compreendida

### Implementação

- [ ] Workflow `.github/workflows/deploy-production.yml` atualizado
- [ ] Três novos steps adicionados (backup, mark stable, rollback)
- [ ] Commit criado com mudanças
- [ ] Push para main

### Validação

- [ ] Primeiro deploy bem-sucedido
- [ ] Tag `latest-stable` criada
- [ ] Backup criado em produção
- [ ] Segundo deploy bem-sucedido (verifica tag funciona)

### Teste de Rollback (Opcional mas Recomendado)

- [ ] Ambiente de staging configurado
- [ ] Falha intencional criada
- [ ] Rollback automático funcionou
- [ ] Recovery time < 10 minutos

---

**Pronto para implementar!** 🚀

Próximo passo: Editar `.github/workflows/deploy-production.yml` e adicionar os steps conforme documentado acima.
