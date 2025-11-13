# CharHub - Guia de Deploy em Produção

**Última atualização**: 2025-11-13
**Versão**: 2.0
**Status**: ✅ Em produção (charhub.app)

---

## Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura Atual](#arquitetura-atual)
3. [Pré-requisitos](#pré-requisitos)
4. [Deploy Rápido](#deploy-rápido)
5. [Deploy Detalhado](#deploy-detalhado)
6. [Troubleshooting](#troubleshooting)
7. [Monitoramento](#monitoramento)
8. [Custos](#custos)

---

## Visão Geral

### Informações da Infraestrutura

| Componente | Detalhes |
|------------|----------|
| **URL Produção** | https://charhub.app |
| **URL Desenvolvimento** | https://dev.charhub.app |
| **Cloud Provider** | Google Cloud Platform |
| **CDN/Tunnel** | Cloudflare |
| **Projeto GCP** | charhub-prod |
| **VM** | charhub-vm (us-central1-a) |
| **Database** | Cloud SQL PostgreSQL (charhub-postgres) |
| **Storage** | Cloudflare R2 (charhub-media) |

### Arquitetura Simplificada

```
Internet → Cloudflare DNS → Cloudflare Tunnel → VM (Docker Compose) → Cloud SQL
                                                      ↓
                                          [Nginx + Frontend + Backend + Redis]
                                                      ↓
                                          Cloudflare R2 (imagens)
```

---

## Arquitetura Atual

### Componentes

#### Google Cloud Platform

1. **Compute Engine VM**
   - Nome: `charhub-vm`
   - Tipo: `e2-small` (2 vCPU, 2 GB RAM)
   - SO: Container-Optimized OS
   - Zona: `us-central1-a`
   - Disco: 30 GB SSD
   - IP Externo: `136.116.66.192`

2. **Cloud SQL PostgreSQL**
   - Nome: `charhub-postgres`
   - Versão: PostgreSQL 16
   - Tier: `db-g1-small`
   - Armazenamento: 10 GB SSD
   - IP: `136.112.54.4`
   - Backup: Diário às 03:00 UTC

#### Cloudflare

1. **DNS & CDN**
   - Domínio: `charhub.app`
   - DNS gerenciado pela Cloudflare
   - SSL/TLS: Full (Strict)

2. **Cloudflare Tunnel**
   - Produção: `64dc6dc0-b430-4d84-bc47-e2ac1838064f`
   - Desenvolvimento: `28d1c2b3-ebf7-479f-b8de-18c29a0f3de2`
   - Config: `cloudflared/config/prod/`

3. **Cloudflare R2**
   - Bucket: `charhub-media`
   - URL Pública: `https://media.charhub.app`
   - Uso: Avatares de personagens e usuários

#### Containers Docker

```yaml
services:
  - nginx:80,443        # Proxy reverso
  - frontend:80         # React SPA
  - backend:3000        # Express API
  - redis:6379          # Cache e filas
  - cloudflared         # Tunnel para Cloudflare
```

---

## Pré-requisitos

### Ferramentas Necessárias

```powershell
# Verificar instalações
gcloud --version         # Google Cloud SDK
docker --version         # Docker Desktop
```

### Credenciais e Acessos

- [x] Conta Google Cloud com acesso ao projeto `charhub-prod`
- [x] Conta Cloudflare com acesso ao domínio `charhub.app`
- [x] SSH configurado para GCP (`gcloud auth login`)
- [x] Variáveis de ambiente configuradas (`.env.production`)

---

## Deploy Rápido

### Método Automatizado (Recomendado)

```powershell
# No diretório raiz do projeto (E:\Projects\charhub)
.\scripts\deploy-via-gcs-public.ps1
```

**O que o script faz automaticamente:**

1. ✅ Detecta ambiente atual (development/production)
2. ✅ Alterna para modo production
3. ✅ Comprime o projeto
4. ✅ Faz upload para Google Cloud Storage (bucket temporário público)
5. ✅ SSH na VM e executa o deploy
6. ✅ Aplica migrations do banco de dados
7. ✅ Retorna ao modo development automaticamente

**Tempo estimado**: 8-12 minutos

### Verificação Pós-Deploy

```powershell
# Ver logs em tempo real
.\scripts\monitor-production.ps1 -Command logs

# Ver status dos containers
.\scripts\monitor-production.ps1 -Command status

# Testar no navegador
https://charhub.app
```

---

## Deploy Detalhado

### Passo 1: Preparar Ambiente Local

```powershell
# Garantir que mudanças locais estão commitadas
git status

# Testar localmente antes do deploy (opcional mas recomendado)
.\scripts\switch-env.ps1 -Environment development
docker compose up -d
# Testar: http://localhost
docker compose down
```

### Passo 2: Executar Deploy

```powershell
# Deploy completo com troca automática de ambiente
.\scripts\deploy-via-gcs-public.ps1
```

**Saída esperada:**

```
[0/6] Verificando ambiente atual...
  [i] Ambiente atual: DEVELOPMENT

[*] Alternando para modo PRODUCTION...
  [OK] Modo PRODUCTION ativado

[1/6] Comprimindo projeto...
  [OK] Arquivo comprimido: 45.32 MB

[2/6] Fazendo upload para Cloud Storage...
  [OK] Upload concluído em 23.4s

[3/6] Tornando arquivo público temporariamente...
  [OK] Bucket configurado como publico

[4/6] Baixando na VM e fazendo deploy...
  [i] Executando deploy na VM...
  [OK] Deploy concluído

[5/6] Limpando Cloud Storage...
  [OK] Arquivo removido do Cloud Storage

[6/6] Retornando ao modo desenvolvimento...
  [OK] Modo DEVELOPMENT restaurado

========================================
[OK] DEPLOY CONCLUIDO COM SUCESSO!
========================================
```

### Passo 3: Verificar Saúde da Aplicação

```powershell
# Status dos containers
.\scripts\monitor-production.ps1 -Command status

# Logs do backend
.\scripts\monitor-production.ps1 -Command logs-backend

# Testar API
curl https://charhub.app/api/v1/health
```

---

## Troubleshooting

### Problema 1: Erro 1033 do Cloudflare Tunnel

**Sintoma**: Site inacessível, erro "Cloudflare is unable to resolve tunnel"

**Diagnóstico**:

```powershell
# Ver logs do tunnel
.\scripts\monitor-production.ps1 -Command logs-tunnel

# Verificar se container está rodando
.\scripts\monitor-production.ps1 -Command status
```

**Solução**:

```powershell
# Reiniciar containers
gcloud compute ssh charhub-vm --zone=us-central1-a --command="cd /mnt/stateful_partition/charhub && sudo /var/lib/toolbox/bin/docker-compose restart cloudflared"
```

### Problema 2: Backend retorna 502

**Sintoma**: Nginx retorna "502 Bad Gateway"

**Diagnóstico**:

```powershell
# Ver logs do backend
.\scripts\monitor-production.ps1 -Command logs-backend

# Verificar healthcheck
gcloud compute ssh charhub-vm --zone=us-central1-a --command="curl http://localhost:3000/api/v1/health"
```

**Solução**:

```powershell
# Reiniciar backend
gcloud compute ssh charhub-vm --zone=us-central1-a --command="cd /mnt/stateful_partition/charhub && sudo /var/lib/toolbox/bin/docker-compose restart backend"
```

### Problema 3: Erro de conexão com banco de dados

**Sintoma**: Backend logs mostram "Error connecting to database"

**Diagnóstico**:

```powershell
# Verificar se Cloud SQL está rodando
gcloud sql instances list --project=charhub-prod

# Verificar conectividade
gcloud compute ssh charhub-vm --zone=us-central1-a --command="ping -c 3 136.112.54.4"
```

**Solução**:

```powershell
# Verificar se IP da VM está autorizado
gcloud sql instances describe charhub-postgres --format="get(settings.ipConfiguration.authorizedNetworks)"

# Adicionar autorização se necessário
gcloud sql instances patch charhub-postgres --authorized-networks=136.116.66.192
```

### Problema 4: Imagens não carregam (R2)

**Sintoma**: Erro 403 ou 404 ao acessar imagens em `media.charhub.app`

**Diagnóstico**:

1. Verificar se bucket existe no painel Cloudflare R2
2. Verificar CORS do bucket
3. Verificar se custom domain está configurado

**Solução**:

```powershell
# Testar acesso direto
curl -I https://media.charhub.app

# Verificar variáveis de ambiente
gcloud compute ssh charhub-vm --zone=us-central1-a --command="cd /mnt/stateful_partition/charhub && sudo /var/lib/toolbox/bin/docker-compose exec -T backend printenv | grep R2"
```

### Problema 5: Deploy falha durante build

**Sintoma**: Erro durante `docker compose build`

**Solução**:

```powershell
# SSH na VM e fazer deploy manual
gcloud compute ssh charhub-vm --zone=us-central1-a

# Dentro da VM:
cd /mnt/stateful_partition/charhub
sudo /var/lib/toolbox/bin/docker-compose down
sudo /var/lib/toolbox/bin/docker-compose build --no-cache backend frontend
sudo /var/lib/toolbox/bin/docker-compose up -d
```

### Rollback de Emergência

```powershell
# SSH na VM
gcloud compute ssh charhub-vm --zone=us-central1-a

# Listar backups
ls -la /home/charhub.backup.*

# Restaurar backup
cd /mnt/stateful_partition/charhub
sudo /var/lib/toolbox/bin/docker-compose down
sudo rm -rf /mnt/stateful_partition/charhub
sudo cp -r /home/charhub.backup.YYYYMMDD_HHMMSS /mnt/stateful_partition/charhub
cd /mnt/stateful_partition/charhub
sudo /var/lib/toolbox/bin/docker-compose up -d
```

---

## Monitoramento

### Comandos de Monitoramento

```powershell
# Ver logs em tempo real
.\scripts\monitor-production.ps1 -Command logs

# Ver logs específicos
.\scripts\monitor-production.ps1 -Command logs-backend
.\scripts\monitor-production.ps1 -Command logs-tunnel
.\scripts\monitor-production.ps1 -Command logs-nginx

# Ver status dos containers
.\scripts\monitor-production.ps1 -Command status

# Acessar shell da VM
.\scripts\monitor-production.ps1 -Command shell
```

### Endpoints de Health Check

```bash
# Backend API
curl https://charhub.app/api/v1/health

# Resposta esperada:
{
  "status": "healthy",
  "uptime": 12345,
  "timestamp": "2025-11-13T..."
}
```

### Métricas Google Cloud

Acesse: https://console.cloud.google.com/monitoring

- CPU e Memória da VM
- Conexões Cloud SQL
- Logs estruturados

---

## Custos

### Custos Mensais Atuais

| Serviço | Especificação | Custo (USD/mês) |
|---------|---------------|-----------------|
| VM Compute Engine | e2-small (2 vCPU, 2 GB) | ~$15 |
| Cloud SQL PostgreSQL | db-g1-small (10 GB SSD) | ~$8 |
| Cloudflare DNS | - | $0 (Free) |
| Cloudflare Tunnel | - | $0 (Free) |
| Cloudflare R2 | <10 GB, <100k requests | $0 (Free Tier) |
| **Total Estimado** | | **~$23/mês** |

### Otimização de Custos

- ✅ Cloudflare Tunnel elimina necessidade de IP estático ($5/mês economizados)
- ✅ R2 gratuito até 10 GB (vs S3 que cobraria ~$2/mês)
- ⚠️ Considerar Free Tier do GCP: e2-micro grátis (limitações de performance)

---

## Próximos Passos

Para melhorias futuras, consulte: [`docs/deploy/FUTURE_IMPROVEMENTS.md`](./FUTURE_IMPROVEMENTS.md)

---

## Links Úteis

- **Google Cloud Console**: https://console.cloud.google.com/
- **Cloudflare Dashboard**: https://dash.cloudflare.com/
- **Cloudflare Zero Trust**: https://one.dash.cloudflare.com/
- **Site Produção**: https://charhub.app
- **Site Desenvolvimento**: https://dev.charhub.app

---

## Contato e Suporte

- **Projeto GCP**: `charhub-prod`
- **VM**: `charhub-vm` (us-central1-a)
- **Cloud SQL**: `charhub-postgres`
- **Bucket Deploy**: `gs://charhub-deploy-temp/`
- **R2 Bucket**: `charhub-media`

---

**Documentação criada e mantida pelo time CharHub**
