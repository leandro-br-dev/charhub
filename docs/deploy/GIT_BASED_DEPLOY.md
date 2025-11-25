# Deploy Baseado em Git

> **Status: IMPLEMENTADO E TESTADO** - Sistema de deploy em produção desde novembro 2025.

**Última atualização**: 2025-11-23

## Visão Geral

Sistema de deploy Git-based onde:
- O código é sincronizado via `git pull` (apenas diferenças)
- Os secrets são sincronizados separadamente via `sync-secrets.ps1`
- O deploy é executado via `deploy-git.ps1`

### Arquitetura de Arquivos

```
# DESENVOLVIMENTO LOCAL
├── .env                     # Configuração de desenvolvimento (usado localmente)
├── .env.production          # Secrets de produção (enviado para VM como .env)
├── frontend/.env.production # Vars do frontend produção (enviado para VM)
├── cloudflared/config/prod/
│   ├── *.json              # Credenciais do tunnel Cloudflare
│   └── cert.pem            # Certificado do tunnel (NÃO versionado)
└── secrets/
    └── production-secrets.txt  # Backup automático de todos os secrets

# VM DE PRODUÇÃO (/mnt/stateful_partition/charhub/)
├── .git/                    # Repositório clonado
├── .env                     # ← Vem de .env.production local
├── frontend/.env            # ← Vem de frontend/.env.production local
├── cloudflared/config/prod/
│   ├── *.json              # ← Sincronizado do local
│   └── cert.pem            # ← Sincronizado do local
├── backend/
├── frontend/
└── docker-compose.yml
```

### Fluxo de Deploy

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEPLOY COMPLETO                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. sync-secrets.ps1 (automático via deploy-git.ps1)            │
│     ├── .env.production → VM:.env                               │
│     ├── frontend/.env.production → VM:frontend/.env             │
│     ├── cloudflared/config/prod/*.json → VM (mesmo path)        │
│     └── cloudflared/config/prod/cert.pem → VM (mesmo path)      │
│                                                                  │
│  2. deploy-git.ps1                                              │
│     ├── git pull origin main (na VM)                            │
│     ├── docker compose build                                     │
│     ├── docker compose up -d                                     │
│     └── prisma migrate deploy                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Scripts Implementados

### 1. `deploy-git.ps1` - Deploy Principal

```powershell
# Deploy normal (automático: sync-secrets + pull + rebuild + migrations)
.\scripts\deploy-git.ps1

# Pular sincronização de secrets
.\scripts\deploy-git.ps1 -SkipSecrets

# Pular migrations
.\scripts\deploy-git.ps1 -SkipMigrations

# Apenas restart (sem rebuild)
.\scripts\deploy-git.ps1 -NoBuild
```

**O que faz:**
1. Executa `sync-secrets.ps1 -NoRestart` automaticamente
2. Cria script bash temporário e envia para VM (`/tmp/deploy-git.sh`)
3. Executa na VM: `git pull origin main`
4. Rebuild: `docker compose build --no-cache`
5. Restart: `docker compose down && docker compose up -d`
6. Migrations: `npx prisma migrate deploy` (se não pulado)
7. Health check: aguarda containers subirem

### 2. `sync-secrets.ps1` - Sincronização de Secrets

```powershell
# Sincronizar todos os arquivos de produção + reiniciar containers
.\scripts\sync-secrets.ps1

# Sem reiniciar containers (usado pelo deploy-git.ps1)
.\scripts\sync-secrets.ps1 -NoRestart

# Ver o que seria enviado (não envia)
.\scripts\sync-secrets.ps1 -DryRun

# Forçar mesmo com arquivos faltando
.\scripts\sync-secrets.ps1 -Force
```

**Arquivos sincronizados:**
| Arquivo Local | Destino na VM | Obrigatório |
|---------------|---------------|-------------|
| `.env.production` | `.env` | ✅ |
| `frontend/.env.production` | `frontend/.env` | ✅ |
| `cloudflared/config/prod/*.json` | mesmo path | ✅ |
| `cloudflared/config/prod/cert.pem` | mesmo path | ✅ |

**Funcionalidades:**
- Cria backup na VM antes de sobrescrever (`/.env_backups/TIMESTAMP/`)
- Valida variáveis críticas (DATABASE_URL, JWT_SECRET, GOOGLE_CLIENT_*)
- Atualiza `secrets/production-secrets.txt` como backup local
- Ajusta permissões para Docker (644)

### 3. `rollback.ps1` - Rollback Rápido

```powershell
# Listar commits e escolher interativamente
.\scripts\rollback.ps1

# Voltar N commits
.\scripts\rollback.ps1 -Steps 1

# Voltar para commit específico
.\scripts\rollback.ps1 -Commit abc1234
```

### 4. `vm-status.ps1` - Status da VM

```powershell
# Status básico
.\scripts\vm-status.ps1

# Com logs
.\scripts\vm-status.ps1 -Logs

# Com mais linhas de log
.\scripts\vm-status.ps1 -Logs -LogLines 50
```

---

## Fluxo de Trabalho do Desenvolvedor

### Desenvolvimento Normal

```bash
# 1. Criar branch para feature
git checkout -b feature/nova-funcionalidade

# 2. Desenvolver e testar localmente (usa .env para dev)
npm run dev

# 3. Commit e push
git add .
git commit -m "feat: nova funcionalidade"
git push origin feature/nova-funcionalidade

# 4. Criar PR no GitHub
# 5. Code review + testes
# 6. Merge na main
```

### Deploy para Produção

```powershell
# Apenas quando quiser atualizar produção:
.\scripts\deploy-git.ps1

# O script vai:
# 1. Sincronizar secrets automaticamente (sync-secrets.ps1)
# 2. Criar backup dos arquivos anteriores na VM
# 3. Conectar na VM
# 4. Fazer git pull origin main
# 5. Rebuild + restart containers
# 6. Executar migrations pendentes
```

### Atualização Apenas de Secrets (sem código)

```powershell
# Quando mudar APENAS variáveis de ambiente:
.\scripts\sync-secrets.ps1

# Isso sincroniza e reinicia os containers
```

---

## Configuração da VM

A VM de produção está configurada com:
- **VM Name**: `charhub-vm`
- **Zone**: `us-central1-a`
- **Repositório**: `/mnt/stateful_partition/charhub`
- **Branch**: `main` (sempre)
- **Deploy Key**: Configurada para acesso read-only ao GitHub
- **Docker Compose**: `/var/lib/toolbox/bin/docker-compose`

---

## Configuração de Ambiente

### Arquivos de Ambiente Locais

| Arquivo | Propósito | Versionado |
|---------|-----------|------------|
| `.env` | Desenvolvimento local | ❌ .gitignore |
| `.env.production` | Secrets de produção | ❌ .gitignore |
| `.env.example` | Template para novos devs | ✅ |
| `frontend/.env.production` | Frontend produção | ❌ .gitignore |
| `cloudflared/config/prod/cert.pem` | Tunnel cert | ❌ .gitignore |
| `cloudflared/config/prod/*.json` | Tunnel credentials | ❌ .gitignore |

### Variáveis Críticas Validadas

O `sync-secrets.ps1` valida que estas variáveis existem:
- `DATABASE_URL`
- `JWT_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

---

## Checklist de Migração ✅ COMPLETO

- [x] Criar Deploy Key no GitHub para a VM
- [x] Clonar repositório na VM
- [x] Configurar .env na VM
- [x] Criar script `deploy-git.ps1`
- [x] Criar script `sync-secrets.ps1` (com backup automático)
- [x] Criar script `rollback.ps1`
- [x] Criar script `vm-status.ps1`
- [x] Remover scripts antigos (switch-env.ps1, etc.)
- [x] Testar deploy completo ✅ (2025-11-23)
- [x] Site em produção: https://charhub.app

---

## Troubleshooting

### Erro: `$'\r': command not found`

**Causa**: Scripts bash com line endings CRLF (Windows) em vez de LF (Linux).

**Solução**: Os scripts já convertem automaticamente:
```powershell
$deployScriptLF = $deployScript -replace "`r`n", "`n" -replace "`r", "`n"
```

### Erro: Cloudflare Tunnel 1033

**Causa**: Permissões incorretas nos arquivos de credenciais.

**Solução**: O `sync-secrets.ps1` aplica `chmod 644` automaticamente. Se persistir:
```bash
gcloud compute ssh charhub-vm --zone=us-central1-a --command="chmod 644 /mnt/stateful_partition/charhub/cloudflared/config/prod/*"
```

### Erro: Container não encontra .env

**Causa**: Arquivo .env não foi sincronizado.

**Solução**:
```powershell
.\scripts\sync-secrets.ps1
```

---

## Evolução Futura

Para melhorias planejadas (CI/CD, Blue-Green Deploy, etc.), consulte:
- `docs/todo/CI_CD.md` - GitHub Actions workflow
- `docs/todo/DEPLOY_IMPROVEMENTS.md` - Melhorias de infraestrutura

---

**Documento mantido pelo time CharHub**
**Última revisão**: 2025-11-23
