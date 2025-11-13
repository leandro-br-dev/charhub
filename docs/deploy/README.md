# CharHub - Documentação de Deploy

Esta pasta contém toda a documentação relacionada ao processo de deploy do CharHub.

---

## Documentos Disponíveis

### 📘 [CURRENT_DEPLOYMENT.md](./CURRENT_DEPLOYMENT.md)

**Guia principal de deploy em produção**

Contém:
- ✅ Arquitetura atual em produção
- ✅ Pré-requisitos e ferramentas necessárias
- ✅ Processo de deploy passo a passo
- ✅ Troubleshooting comum
- ✅ Comandos de monitoramento
- ✅ Informações de custos

**Quando usar**: Sempre que precisar fazer deploy em produção ou resolver problemas.

---

### 🚀 [FUTURE_IMPROVEMENTS.md](./FUTURE_IMPROVEMENTS.md)

**Roadmap de melhorias para o processo de deploy**

Contém:
- 📋 Fase 1: Otimização do deploy atual (rsync, rollback, health checks)
- 📋 Fase 2: CI/CD com GitHub Actions
- 📋 Fase 3: Infraestrutura escalável (Kubernetes, Redis gerenciado)
- 📋 Fase 4: Observabilidade avançada (APM, distributed tracing)

**Quando usar**: Para planejar melhorias futuras ou entender o roadmap técnico.

---

## Quick Start

### Deploy em Produção

```powershell
# 1. No diretório raiz do projeto
cd E:\Projects\charhub

# 2. Executar script de deploy automatizado
.\scripts\deploy-via-gcs-public.ps1

# 3. Verificar deploy
.\scripts\monitor-production.ps1 -Command status
```

### Monitorar Produção

```powershell
# Ver logs em tempo real
.\scripts\monitor-production.ps1 -Command logs

# Ver status dos containers
.\scripts\monitor-production.ps1 -Command status

# Acessar shell da VM
.\scripts\monitor-production.ps1 -Command shell
```

---

## Scripts Disponíveis

| Script | Descrição | Documentação |
|--------|-----------|--------------|
| `scripts/deploy-via-gcs-public.ps1` | Deploy completo em produção | [CURRENT_DEPLOYMENT.md](./CURRENT_DEPLOYMENT.md#deploy-rápido) |
| `scripts/monitor-production.ps1` | Monitoramento remoto | [CURRENT_DEPLOYMENT.md](./CURRENT_DEPLOYMENT.md#monitoramento) |
| `scripts/switch-env.ps1` | Alternar entre dev/prod | Usado internamente pelo deploy |

---

## Ambientes

### Produção

- **URL**: https://charhub.app
- **VM**: `charhub-vm` (us-central1-a)
- **Cloud SQL**: `charhub-postgres`
- **Tunnel**: Produção (config em `cloudflared/config/prod/`)

### Desenvolvimento

- **URL**: https://dev.charhub.app
- **Infraestrutura**: Docker Compose local
- **Database**: PostgreSQL local em container
- **Tunnel**: Desenvolvimento (config em `cloudflared/config/dev/`)

---

## Links Úteis

- [Google Cloud Console](https://console.cloud.google.com/)
- [Cloudflare Dashboard](https://dash.cloudflare.com/)
- [Cloudflare Zero Trust](https://one.dash.cloudflare.com/)
- [Site Produção](https://charhub.app)
- [Site Desenvolvimento](https://dev.charhub.app)

---

## Histórico de Mudanças

### 2025-11-13
- ✅ Consolidação de toda documentação de deploy em pasta dedicada
- ✅ Criação de `CURRENT_DEPLOYMENT.md` com guia completo atual
- ✅ Criação de `FUTURE_IMPROVEMENTS.md` com roadmap de melhorias
- ✅ Remoção de documentos obsoletos e duplicados
- ✅ Melhoria do script de deploy com troca automática de ambiente

### Anteriores
- Deploy manual via SSH e gcloud
- Múltiplos documentos espalhados (QUICK_DEPLOY_GUIDE, PRODUCTION_DEPLOYMENT, etc.)

---

**Documentação mantida pelo time CharHub**
