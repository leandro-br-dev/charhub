# 🚀 Deployment Guide

> **Status**: ✅ Automático via GitHub Actions
> **Última atualização**: 2025-11-30

## Overview

CharHub usa **GitHub Actions** para deploy automático em produção. Quando você mergea uma PR para `main`, o GitHub Actions automaticamente:

1. ✅ Valida código (lint, testes, build)
2. ✅ Faz deploy para produção
3. ✅ Verifica saúde da aplicação
4. ✅ Faz rollback automático se falhar
5. ✅ Notifica o resultado

## 📋 Infrastructure Setup

> **Note**: These guides cover initial infrastructure setup and configuration.

### Database Setup
- **[Database Connection Guide](./database-connection.md)** - Configure database connections, SSL certificates, and connection pooling
- **[Database Operations Guide](./database-operations.md)** - Database maintenance, backups, migrations, and troubleshooting

### Infrastructure Configuration
- **[SSH Key Setup](./ssh-key-setup.md)** - Configure SSH keys for secure server access
- **[Tag System Setup](./tag-system-setup.md)** - Configure the content tagging system infrastructure

### Deployment Guides
- **[CD Deploy Guide](./cd-deploy-guide.md)** - Continuous Deployment pipeline configuration
- **[CD Status Monitoring](./cd-status.md)** - Monitor deployment status and health checks
- **[VM Setup Recovery](./vm-setup-recovery.md)** - VM recovery and reconfiguration procedures

## Fluxo de Deployment

```
1. Feature Branch Development
   └─ Agent Coder: desenvolvimento em feature/xxx

2. Pull Request
   └─ Agent Coder: abre PR contra main

3. CI Checks (automático)
   ├─ Lint & Type Check
   ├─ Testes
   ├─ Build Docker Images
   └─ ✅ Se passar, mostra "All checks passed"

4. Code Review
   └─ Agent Reviewer: testa localmente em localhost:8081
      ├─ Aprova PR
      └─ Mergea para main

5. CD Deploy (automático)
   ├─ GitHub Actions detecta novo commit em main
   ├─ Cria backup da versão anterior
   ├─ SSH na VM de produção
   ├─ Git pull origin main
   ├─ Docker rebuild
   ├─ Prisma migrations
   ├─ Health check
   ├─ Se falhar: Rollback automático
   └─ Notifica resultado

6. Produção ✅
   └─ https://charhub.app atualizado
```

## Deploy Manual (Força)

Se você precisar fazer deploy de uma versão específica (não main), pode disparar manualmente:

### Via GitHub UI

1. Acesse: https://github.com/leandro-br-dev/charhub/actions
2. Selecione workflow: **Deploy to Production**
3. Clique: **Run workflow**
4. Digite o Git ref desejado (branch, tag, ou commit SHA)
5. Clique: **Run workflow**

### Exemplo

```
Versão: feature/hotfix-payment
# Faz deploy direto da feature branch (útil para hotfixes)
```

## Como Funciona

### Pré-Deploy

```bash
✅ Verifica que está em main branch
✅ Lista commits que serão deployados
✅ Cria backup da versão anterior
```

### Deploy

```bash
1. Autentica no GCP
2. Conecta na VM charhub-vm
3. Git pull origin main
4. Docker compose down (para containers)
5. Docker compose build (rebuild das imagens)
6. Docker compose up -d (inicia containers)
7. Aguarda 30 segundos para serviços iniciarem
8. Executa prisma migrate deploy (se houver migrations)
```

### Validação

```bash
1. Health check: GET /api/v1/health
2. Tenta até 30 vezes (com 5s de intervalo)
3. Timeout: 5 minutos
```

### Se Falhar

```bash
❌ Se saúde da app falhar:
   ├─ Para containers
   ├─ Reverte para commit anterior
   ├─ Faz rebuild com versão anterior
   ├─ Reinicia containers
   └─ ✅ Produção volta à versão anterior
```

## GitHub Secrets Necessários

O workflow requer esses secrets configurados em:
**Settings → Secrets and variables → Actions**

### `GCP_SERVICE_ACCOUNT_KEY_PROD` (OBRIGATÓRIO)

- **Tipo**: JSON Service Account key
- **Permissões necessárias**:
  - `compute.instances.osLogin`
  - `compute.sshKeys.create`
  - `iam.serviceAccountUsers`
- **Como obter**:
  ```bash
  gcloud iam service-accounts create github-deployer
  gcloud projects add-iam-policy-binding <PROJECT_ID> \
    --member serviceAccount:github-deployer@<PROJECT_ID>.iam.gserviceaccount.com \
    --role roles/compute.osLogin
  gcloud iam service-accounts keys create key.json \
    --iam-account=github-deployer@<PROJECT_ID>.iam.gserviceaccount.com
  # Copiar conteúdo de key.json para GitHub Secret
  ```

### `SLACK_WEBHOOK_URL` (OPCIONAL)

- **Tipo**: URL webhook do Slack
- **Usado para**: Notificações de deploy
- **Como obter**:
  1. Acesse workspace Slack
  2. Settings → Apps & Integrations → Incoming Webhooks
  3. Crie novo webhook para #deployments channel
  4. Copie URL para GitHub Secret

## Monitorar Deploy

### Via GitHub Actions

1. Acesse: https://github.com/leandro-br-dev/charhub/actions
2. Selecione workflow: **Deploy to Production**
3. Clique no run mais recente
4. Veja logs em tempo real

### Logs Detalhados

Cada etapa do deployment gera logs:

```
✅ Pre-Deploy Checks
   └─ Verifica branch, lista commits

✅ Deploy
   ├─ Autentica GCP
   ├─ Testa SSH
   ├─ Cria backup
   ├─ Faz git pull
   ├─ Rebuild Docker
   ├─ Inicia containers
   ├─ Executa migrations
   ├─ Health check
   └─ Verifica deployment

✅ Notificações
   └─ Envia para Slack (se configurado)
```

## Troubleshooting

### Deploy Falha por Timeout

**Sintoma**: Health check falha após 30 tentativas

**Causas possíveis**:
- Backend não iniciou (erro no código)
- Migrations com erro
- Banco de dados indisponível

**Solução**:
```bash
# Acesse a VM manualmente
gcloud compute ssh charhub-vm --zone=us-central1-a

# Verifique logs
cd /mnt/stateful_partition/charhub
docker-compose logs backend | tail -50
docker-compose logs postgres
```

### Deploy Falha por SSH

**Sintoma**: "Permission denied" ou "Connection refused"

**Causas possíveis**:
- Service Account sem permissões SSH
- Key expirada no GCP
- VM indisponível
- OS Login não habilitado na VM

**Solução**:

#### 1. Habilitar OS Login na VM

Para que gcloud possa fazer SSH sem tentar adicionar keys ao metadata, a VM precisa ter OS Login habilitado:

```bash
# Habilitar osLogin na VM
gcloud compute instances add-metadata charhub-vm \
  --zone=us-central1-a \
  --metadata enable-oslogin=TRUE

# Verificar se foi habilitado
gcloud compute instances describe charhub-vm \
  --zone=us-central1-a \
  --format="get(metadata.items[name='enable-oslogin'].value)"
# Esperado: TRUE
```

#### 2. Verificar Permissões da Service Account
```bash
# Verificar se compute.osLogin role está atribuída
gcloud projects get-iam-policy charhub-prod \
  --flatten="bindings[].members" \
  --filter="bindings.members:github-deployer@charhub-prod.iam.gserviceaccount.com"

# Esperado: roles/compute.osLogin deve estar na lista
```

#### 3. Testar SSH Manualmente
```bash
# Se funciona localmente, GitHub Actions deveria funcionar também
gcloud compute ssh charhub-vm --zone=us-central1-a --command="echo 'SSH works!'"
```

#### 4. Se Ainda Falhar
```bash
# Regenerar key do Service Account
gcloud iam service-accounts keys create /tmp/new-key.json \
  --iam-account=github-deployer@charhub-prod.iam.gserviceaccount.com

# Atualizar secret GCP_SERVICE_ACCOUNT_KEY_PROD no GitHub:
# 1. Copiar conteúdo de /tmp/new-key.json
# 2. Ir para GitHub > Settings > Secrets > GCP_SERVICE_ACCOUNT_KEY_PROD
# 3. Substituir valor antigo pelo novo
```

### Deploy Parcial (algumas partes atualizam, outras não)

**Sintoma**: Frontend atualiza mas backend não, ou vice-versa

**Causa**: Docker cache interferindo

**Solução**: O workflow já usa `--no-cache` no build
```bash
docker-compose build --no-cache
```

## Rollback Manual

Se precisar reverter para a versão anterior após deploy:

### Via GitHub Actions

1. Vá para a etapa anterior que funcionava
2. Anote o commit SHA
3. Execute workflow manual com esse SHA

### Via SSH Direto

```bash
gcloud compute ssh charhub-vm --zone=us-central1-a --command="
  cd /mnt/stateful_partition/charhub
  git log --oneline | head -5  # Ver últimos commits
  git reset --hard <COMMIT_SHA>  # Reverter
  docker-compose down
  docker-compose build
  docker-compose up -d
"
```

## Migração de Scripts PowerShell

> **DEPRECATED**: Scripts antigos `scripts/deploy-git.ps1` não são mais necessários.

Se você tinha scripts PowerShell anteriormente:

```bash
# ❌ NÃO use mais
.\scripts\deploy-git.ps1

# ✅ Use GitHub Actions
# Vá para: https://github.com/leandro-br-dev/charhub/actions
# Workflow: Deploy to Production
# Clique: Run workflow
```

## Futuro: Ambiente de Staging

Quando receitas aumentarem, será adicionado:

```
develop/feature → (CI) → main → (CD) → staging → (Aprovação) → (CD) → production
```

Veja: [`docs/todo/CI_CD.md`](../todo/CI_CD.md#fase-15-adicionar-staging-futuro---quando-receitas-aumentarem)

## Operações Diárias

### Antes de Mergear uma PR

```bash
✅ Todos os checks passaram?
✅ Código foi testado localmente?
✅ Migrations foram testadas?
✅ Secrets não foram commitados?
```

### Após Mergear

```bash
✅ Esperar GitHub Actions completar (5-10 min)
✅ Verificar https://charhub.app funciona
✅ Se falhar: Rollback automático ocorre
```

### Monitorar Produção

```bash
# Health check manual
curl https://charhub.app/api/v1/health

# Ver último deployment
git log -1 --oneline

# SSH para debug
gcloud compute ssh charhub-vm --zone=us-central1-a
```

## Perguntas Frequentes

### P: Posso fazer deploy de uma branch que não é main?

**R**: Sim, através de workflow_dispatch manual. Vá para **Run workflow** e especifique a branch/tag desejada.

### P: Como saber se o deploy foi bem-sucedido?

**R**:
1. Verifique GitHub Actions (status verde ✅)
2. Acesse https://charhub.app/api/v1/health
3. Receba notificação no Slack (se configurado)

### P: O que acontece se o código quebra a produção?

**R**: Rollback automático acontece:
1. Health check falha
2. Workflow para containers
3. Reverte para commit anterior
4. Reinicia aplicação
5. Notifica do failure

### P: Consigo desabilitar deploy automático?

**R**: Não recomendado, mas possível:
1. Desabilitar workflow em `.github/workflows/deploy-production.yml`
2. Voltar a usar scripts PowerShell (não recomendado)
3. Deploy manual via SSH (não rastreável)

### P: Quanto tempo demora um deployment?

**R**: ~5-10 minutos total:
- Validação: ~1 min
- Build Docker: ~3 min
- Start containers: ~1 min
- Health checks: ~2 min
- Notificações: ~30s

---

## Referências

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Google Cloud Compute SSH](https://cloud.google.com/compute/docs/instances/ssh-from-gha)
- [Docker Compose](https://docs.docker.com/compose/)
- [Prisma Migrations](https://www.prisma.io/docs/concepts/components/prisma-migrate)

---

**Última atualização**: 30 de Novembro de 2025
**Mantido por**: Agent Reviewer
