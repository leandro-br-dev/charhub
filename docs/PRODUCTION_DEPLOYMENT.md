# Guia de Deploy em Produção - CharHub

Este documento detalha o processo completo para colocar o CharHub em produção, com foco em **minimização de custos** e uso de infraestrutura já contratada (Cloudflare e Google Cloud).

## Índice

1. [Visão Geral da Arquitetura](#visão-geral-da-arquitetura)
2. [Análise de Custos](#análise-de-custos)
3. [Escolha de Infraestrutura](#escolha-de-infraestrutura)
4. [Pré-requisitos](#pré-requisitos)
5. [Configuração do Ambiente](#configuração-do-ambiente)
6. [Deploy Passo a Passo](#deploy-passo-a-passo)
7. [Monitoramento e Logs](#monitoramento-e-logs)
8. [Backup e Recuperação](#backup-e-recuperação)
9. [Segurança](#segurança)
10. [Escalabilidade](#escalabilidade)
11. [Troubleshooting](#troubleshooting)

---

## Visão Geral da Arquitetura

### Componentes da Aplicação

```
┌─────────────────────────────────────────────────────────────┐
│                         CLOUDFLARE                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │     DNS      │  │  Cloudflare  │  │  R2 Storage  │       │
│  │   (Grátis)   │  │    Tunnel    │  │   (Mídia)    │       │
│  └──────────────┘  └──────┬───────┘  └──────────────┘       │
└───────────────────────────┼─────────────────────────────────┘
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      GOOGLE CLOUD                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              VM / Cloud Run Instance                 │   │
│  │                                                      │   │
│  │  ┌──────────┐  ┌──────────┐   ┌──────────┐           │   │
│  │  │  Nginx   │──│ Frontend │   │ Backend  │           │   │
│  │  │  (80)    │  │  (5173)  │   │  (3000)  │           │   │
│  │  └──────────┘  └──────────┘   └────┬─────┘           │   │
│  │                                    │                 │   │
│  │                            ┌───────┴───────┐         │   │
│  │                            │     Redis     │         │   │
│  │                            │    (6379)     │         │   │
│  │                            └───────────────┘         │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Cloud SQL (PostgreSQL)                 │    │
│  │              - Backups automáticos                  │    │
│  │              - Alta disponibilidade (opcional)      │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Fluxo de Requisições

1. **Usuário** → `https://charhub.app`
2. **Cloudflare DNS** → Resolve para Cloudflare Tunnel
3. **Cloudflare Tunnel** → Túnel seguro até VM no Google Cloud
4. **Nginx** → Proxy reverso:
   - `/` → Frontend (SPA estático)
   - `/api/v1/*` → Backend (Express API)
5. **Backend** → Conecta a:
   - PostgreSQL (Cloud SQL)
   - Redis (container local)
   - Cloudflare R2 (upload de mídia)
   - LLM APIs (Gemini, OpenAI, Grok)

---

## Análise de Custos

### Opção Recomendada: Google Cloud + Cloudflare

| Serviço | Especificação | Custo Mensal (USD) | Notas |
|---------|---------------|-------------------|-------|
| **Cloudflare DNS** | Domínio registrado | $0 | Já contratado |
| **Cloudflare Tunnel** | Tráfego ilimitado | $0 | Grátis no plano Free |
| **Cloudflare R2** | 10 GB armazenamento + 100k req/mês | $0 - $5 | Primeira faixa gratuita |
| **Google Cloud VM** | e2-micro (2 vCPU, 1 GB RAM) | $7.11 | Suficiente para início |
| \
| **Total** | - | **~$15-20/mês** | Escala conforme uso |

### Alternativas Consideradas

#### 1. Google Cloud Run (Serverless)
- ✅ **Prós**: Auto-scaling, paga pelo uso
- ❌ **Contras**: Cold start, limite de 60s por request (problema para LLM), custo pode variar muito
- 💰 **Custo estimado**: $10-50/mês (variável)
- **Veredicto**: Não recomendado para este projeto (backend tem operações longas de LLM)

#### 2. VM Própria (VPS tradicional)
- Alternativas: Hetzner ($4/mês), DigitalOcean ($6/mês), Linode ($5/mês)
- ✅ **Prós**: Custo fixo baixo, controle total
- ❌ **Contras**: Menos integrado com Google Cloud, fora do contrato existente
- **Veredicto**: Válido se precisar reduzir custos drasticamente

#### 3. Google Cloud Free Tier
- VM e2-micro em regiões específicas (us-west1, us-central1, us-east1)
- ✅ **Prós**: VM grátis permanentemente
- ❌ **Contras**: 1 vCPU, 614 MB RAM (muito limitado), região fixa
- **Veredicto**: Viável para MVP inicial, mas upgrade será necessário

---

## Escolha de Infraestrutura

### Arquitetura Recomendada (Fase 1 - MVP)

**Google Cloud + Cloudflare (Custo: ~$15/mês)**

1. **Compute Engine VM** (e2-small: 2 vCPU, 2 GB RAM - $15/mês)
   - Docker + Docker Compose
   - Nginx, Frontend, Backend, Redis (tudo em containers)
   - Custo: ~$15/mês

2. **Cloud SQL PostgreSQL** (db-f1-micro)
   - Managed database com backups automáticos
   - 10 GB SSD
   - Custo: ~$7.67/mês

3. **Cloudflare**
   - DNS (grátis)
   - Tunnel (grátis)
   - R2 Storage para mídia (grátis até 10 GB)

**Total: ~$23/mês** (pode começar com VM gratuita e pagar só o Cloud SQL: ~$8/mês)

### Arquitetura Escalável (Fase 2 - Crescimento)

Quando ultrapassar 1000 usuários ativos:

1. **Google Kubernetes Engine (GKE)** ou **Cloud Run**
   - Auto-scaling de backend
   - Load balancing automático

2. **Cloud SQL (tier superior)**
   - db-n1-standard-1 (1 vCPU, 3.75 GB RAM)
   - Réplicas de leitura para performance

3. **Memorystore for Redis**
   - Redis gerenciado (atualmente está em container)

4. **Cloud CDN**
   - Cache de assets estáticos do frontend

**Custo estimado Fase 2: $100-200/mês** (dependendo do tráfego)

---

## Pré-requisitos

### 1. Contas e Acessos

- [x] Conta Google Cloud ativa
- [x] Conta Cloudflare com domínio configurado
- [x] Acesso ao painel de DNS
- [x] Credenciais OAuth (Google, Facebook)
- [x] API Keys dos LLMs (Gemini, OpenAI, Grok)

### 2. Ferramentas Locais

```bash
# Instalar gcloud CLI
# Windows: https://cloud.google.com/sdk/docs/install
# Linux/Mac: curl https://sdk.cloud.google.com | bash

# Instalar cloudflared
# Windows: choco install cloudflared
# Linux: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/

# Docker (para testar localmente antes do deploy)
# https://docs.docker.com/get-docker/
```

### 3. Domínio Configurado

- Domínio principal: `charhub.app` (exemplo)
- Ambiente de produção: `charhub.app` ou `www.charhub.app`
- DNS gerenciado pela Cloudflare

---

## Configuração do Ambiente

### 1. Google Cloud - Criar Projeto

```bash
# Fazer login no gcloud
gcloud auth login

# Criar novo projeto
gcloud projects create charhub-prod --name="CharHub Production"

# Configurar projeto como padrão
gcloud config set project charhub-prod

# Habilitar APIs necessárias
gcloud services enable compute.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable cloudresourcemanager.googleapis.com
```

### 2. Cloud SQL - Criar Banco de Dados PostgreSQL

```bash
# Criar instância Cloud SQL PostgreSQL
 gcloud sql instances create charhub-postgres \
    --database-version=POSTGRES_16 \
    --tier=db-g1-small \
    --region=us-central1 \
    --storage-type=SSD \
    --storage-size=10GB \
    --storage-auto-increase \
    --backup-start-time=03:00 \
    --maintenance-window-day=SUN \
    --maintenance-window-hour=04 \
    --edition=ENTERPRISE

# Criar banco de dados
gcloud sql databases create charhub_db \
  --instance=charhub-postgres

# Criar usuário
gcloud sql users create charhub \
  --instance=charhub-postgres \
  --password=SENHA_SEGURA_AQUI

# Obter IP da instância (para configurar no .env)
gcloud sql instances describe charhub-postgres \
  --format="get(ipAddresses[0].ipAddress)"
```

**Importante**: Guarde o IP retornado para usar no `DATABASE_URL`.

### 3. Compute Engine - Criar VM

```bash
# Criar VM otimizada para containers
gcloud compute instances create charhub-vm \
  --zone=us-central1-a \
  --machine-type=e2-small \
  --image-family=cos-stable \
  --image-project=cos-cloud \
  --boot-disk-size=30GB \
  --boot-disk-type=pd-standard \
  --tags=http-server,https-server \
  --metadata=google-logging-enabled=true

# Criar regra de firewall para HTTP/HTTPS (se necessário)
gcloud compute firewall-rules create allow-http \
  --allow=tcp:80 \
  --target-tags=http-server \
  --description="Allow HTTP traffic"

gcloud compute firewall-rules create allow-https \
  --allow=tcp:443 \
  --target-tags=https-server \
  --description="Allow HTTPS traffic"
```

**Nota**: Container-Optimized OS (COS) vem com Docker pré-instalado.

### 4. Cloudflare Tunnel - Configurar

#### 4.1. Criar Túnel

1. Acesse [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/)
2. Vá em **Access** → **Tunnels**
3. Clique em **Create a tunnel**
4. Nome: `charhub-prod`
5. Clique em **Save tunnel**
6. **Copie o token** gerado (necessário para o próximo passo)

#### 4.2. Configurar Credenciais na VM

```bash
# SSH na VM
gcloud compute ssh charhub-vm --zone=us-central1-a

# Criar diretórios de configuração
sudo mkdir -p /opt/charhub/cloudflared/config/prod
cd /opt/charhub

# Criar arquivo de credenciais (substitua TUNNEL_TOKEN)
sudo tee cloudflared/config/prod/credentials.json > /dev/null <<EOF
{
  "AccountTag": "SEU_ACCOUNT_ID",
  "TunnelSecret": "SEU_TUNNEL_SECRET",
  "TunnelID": "SEU_TUNNEL_ID"
}
EOF

# Criar arquivo de configuração
sudo tee cloudflared/config/prod/config.yml > /dev/null <<EOF
tunnel: SEU_TUNNEL_ID
credentials-file: /etc/cloudflared/config/prod/credentials.json

ingress:
  - hostname: charhub.app
    service: http://nginx:80
  - hostname: www.charhub.app
    service: http://nginx:80
  - service: http_status:404
EOF
```

**Atenção**: Substitua `SEU_TUNNEL_ID`, `SEU_ACCOUNT_ID` e `SEU_TUNNEL_SECRET` pelos valores reais do painel Cloudflare.

#### 4.3. Configurar DNS na Cloudflare

1. No painel do Tunnel, clique em **Public Hostname**
2. Adicione:
   - **Subdomain**: (vazio) → **Domain**: `charhub.app` → **Service**: `http://nginx:80`
   - **Subdomain**: `www` → **Domain**: `charhub.app` → **Service**: `http://nginx:80`

### 5. Cloudflare R2 - Configurar Storage

```bash
# No painel Cloudflare, vá em R2 Object Storage
# 1. Criar bucket: charhub-media
# 2. Gerar API Token com permissões de leitura/escrita
# 3. Copiar:
#    - Account ID
#    - Access Key ID
#    - Secret Access Key
#    - Endpoint URL (formato: https://<account-id>.r2.cloudflarestorage.com)
#    - Public URL (se configurar domínio customizado: https://media.charhub.app)
```

---

## Deploy Passo a Passo

### Passo 1: Preparar Arquivos de Configuração

#### 1.1. Clonar Repositório na VM

```bash
# SSH na VM
gcloud compute ssh charhub-vm --zone=us-central1-a

# Instalar Git (se necessário no COS)
sudo apt-get update && sudo apt-get install -y git

# Clonar repositório (ajuste a URL)
cd /opt
sudo git clone https://github.com/seu-usuario/charhub.git charhub
cd charhub
```

#### 1.2. Criar Arquivo `.env` (Root)

```bash
sudo tee .env > /dev/null <<'EOF'
# Environment mode
NODE_ENV=production

# Backend docker hot reload (disabled in production)
BACKEND_ENABLE_HOT_RELOAD=false

# Cloudflare tunnel environment
ENV_SUFFIX=prod

# Public hostname and URL
PUBLIC_HOSTNAME=charhub.app
PUBLIC_FACING_URL=https://charhub.app
EOF
```

#### 1.3. Criar `backend/.env`

```bash
sudo tee backend/.env > /dev/null <<'EOF'
# Environment
NODE_ENV=production
DEV_TRANSLATION_MODE=skip
USE_PRETTY_LOGS=true
LOG_LEVEL=info

# HTTP configuration
PORT=3000
BASE_URL=https://charhub.app
FRONTEND_URL=https://charhub.app
PUBLIC_FACING_URL=https://charhub.app
PUBLIC_HOSTNAME=charhub.app

# OAuth Redirect URLs
FRONTEND_URLS=https://charhub.app,https://www.charhub.app
ALLOWED_ORIGINS=https://charhub.app,https://www.charhub.app

# Database (Cloud SQL - Substitua pelo IP real e senha)
DATABASE_URL=postgresql://charhub:SENHA_SEGURA@IP_CLOUD_SQL:5432/charhub_db?schema=public&sslmode=require

# Redis (local container)
QUEUES_ENABLED=true
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Cloudflare R2 (Substitua pelos valores reais)
R2_BUCKET_NAME=charhub-media
R2_ACCOUNT_ID=SEU_ACCOUNT_ID
R2_ACCESS_KEY_ID=SUA_ACCESS_KEY
R2_SECRET_ACCESS_KEY=SUA_SECRET_KEY
R2_ENDPOINT_URL=https://SEU_ACCOUNT_ID.r2.cloudflarestorage.com
R2_PUBLIC_URL_BASE=https://media.charhub.app

# LLM API Keys (Substitua pelos valores reais)
GEMINI_API_KEY=SUA_GEMINI_KEY
OPENAI_API_KEY=SUA_OPENAI_KEY
GROK_API_KEY=SUA_GROK_KEY

# Google OAuth (Substitua pelos valores reais)
GOOGLE_CLIENT_ID=SEU_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=SEU_GOOGLE_CLIENT_SECRET
GOOGLE_CALLBACK_PATH=/api/v1/oauth/google/callback

# Facebook OAuth (Substitua pelos valores reais)
FACEBOOK_CLIENT_ID=SEU_FACEBOOK_CLIENT_ID
FACEBOOK_CLIENT_SECRET=SEU_FACEBOOK_CLIENT_SECRET
FACEBOOK_CALLBACK_PATH=/api/v1/oauth/facebook/callback

# Sessions (Gere uma chave segura: openssl rand -base64 32)
JWT_SECRET=GERAR_CHAVE_SEGURA_AQUI
TOKEN_EXPIRATION=7d

# Message Encryption (Gerar com: npx tsx src/scripts/generateEncryptionKey.ts)
MESSAGE_ENCRYPTION_KEY=GERAR_CHAVE_SEGURA_AQUI

# Translation System
TRANSLATION_DEFAULT_PROVIDER=gemini
TRANSLATION_DEFAULT_MODEL=gemini-2.0-flash-exp
TRANSLATION_CACHE_TTL=3600
TRANSLATION_ENABLE_PRE_TRANSLATION=false
EOF
```

**IMPORTANTE**: Substitua TODOS os placeholders (`SENHA_SEGURA`, `SEU_*`, `GERAR_*`) por valores reais.

#### 1.4. Criar `frontend/.env`

```bash
sudo tee frontend/.env > /dev/null <<'EOF'
# API endpoints (empty for same-origin requests)
VITE_API_BASE_URL=
VITE_API_VERSION=/api/v1
VITE_GOOGLE_AUTH_PATH=/api/v1/oauth/google
VITE_FACEBOOK_AUTH_PATH=/api/v1/oauth/facebook
VITE_GOOGLE_CALLBACK_PATH=/api/v1/oauth/google/callback
VITE_FACEBOOK_CALLBACK_PATH=/api/v1/oauth/facebook/callback

# Frontend hostname allowlist
VITE_ALLOWED_HOSTS=charhub.app,www.charhub.app

# CDN / Assets
VITE_CDN_PUBLIC_URL_BASE=https://media.charhub.app

# Feature flags
VITE_USE_CHARACTER_MOCKS=false
EOF
```

### Passo 2: Configurar Permissões de Rede (Cloud SQL)

```bash
# Obter IP externo da VM
VM_IP=$(gcloud compute instances describe charhub-vm \
  --zone=us-central1-a \
  --format="get(networkInterfaces[0].accessConfigs[0].natIP)")

# Autorizar VM a acessar Cloud SQL
gcloud sql instances patch charhub-postgres \
  --authorized-networks=$VM_IP
```

**Alternativa mais segura**: Usar Cloud SQL Proxy (recomendado para produção).

### Passo 3: Build e Deploy dos Containers

```bash
# Ainda na VM, no diretório /opt/charhub
cd /opt/charhub

# Build das imagens
sudo docker compose build --no-cache

# Iniciar serviços
sudo docker compose up -d

# Verificar status
sudo docker compose ps
```

### Passo 4: Aplicar Migrations do Banco

```bash
# Executar migrations do Prisma
sudo docker compose exec backend npx prisma migrate deploy

# Verificar se aplicou corretamente
sudo docker compose exec backend npx prisma migrate status
```

### Passo 5: Verificar Logs e Saúde

```bash
# Ver logs de todos os serviços
sudo docker compose logs -f

# Verificar log específico do backend
sudo docker compose logs -f backend

# Testar healthcheck do backend
curl http://localhost:3000/api/v1/health

# Testar se nginx está servindo
curl http://localhost
```

### Passo 6: Configurar Domínio Customizado no R2 (Opcional)

1. **Cloudflare Dashboard** → **R2** → Seu bucket `charhub-media`
2. Clique em **Connect Custom Domain**
3. Digite: `media.charhub.app`
4. Cloudflare criará automaticamente o registro DNS
5. Aguarde propagação (~5 minutos)

Agora suas imagens estarão acessíveis em `https://media.charhub.app/path/to/image.jpg`

### Passo 7: Testar Aplicação via Túnel

```bash
# Acesse no navegador
https://charhub.app

# Você deve ver o frontend carregando
# Tente fazer login via OAuth para testar integração completa
```

---

## Monitoramento e Logs

### 1. Google Cloud Logging

```bash
# Habilitar logging na VM
gcloud compute instances add-metadata charhub-vm \
  --zone=us-central1-a \
  --metadata=google-logging-enabled=true

# Visualizar logs no Cloud Console
# https://console.cloud.google.com/logs
```

### 2. Logs dos Containers

```bash
# Ver logs em tempo real
sudo docker compose logs -f

# Ver logs de um serviço específico
sudo docker compose logs -f backend

# Ver últimas 100 linhas
sudo docker compose logs --tail=100
```

### 3. Métricas de Performance

**Google Cloud Monitoring** (gratuito para limites básicos):

```bash
# Instalar agente de monitoramento (opcional)
curl -sSO https://dl.google.com/cloudagents/add-monitoring-agent-repo.sh
sudo bash add-monitoring-agent-repo.sh
sudo apt-get update
sudo apt-get install -y stackdriver-agent
sudo service stackdriver-agent start
```

### 4. Uptime Monitoring

Configure no **Cloudflare** ou **Google Cloud Monitoring**:

- Endpoint: `https://charhub.app/api/v1/health`
- Intervalo: 1 minuto
- Alerta: Email se ficar offline por > 5 minutos

---

## Backup e Recuperação

### 1. Backup Automático do Cloud SQL

Backups diários já estão configurados (definido na criação da instância):

```bash
# Verificar backups existentes
gcloud sql backups list --instance=charhub-postgres

# Criar backup manual
gcloud sql backups create --instance=charhub-postgres

# Restaurar de backup (CUIDADO!)
gcloud sql backups restore BACKUP_ID \
  --backup-instance=charhub-postgres \
  --backup-id=BACKUP_ID
```

### 2. Backup dos Volumes Docker

```bash
# Criar snapshot dos volumes
sudo docker run --rm \
  -v charhub_postgres_data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/postgres-$(date +%Y%m%d).tar.gz /data

sudo docker run --rm \
  -v charhub_redis_data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/redis-$(date +%Y%m%d).tar.gz /data
```

### 3. Backup do R2 (Cloudflare)

R2 tem durabilidade de 11 noves (99.999999999%). Não precisa de backup adicional, mas você pode:

```bash
# Usar rclone para backup local periódico
# https://rclone.org/s3/#cloudflare-r2
```

### 4. Snapshot da VM (Disaster Recovery)

```bash
# Criar snapshot do disco da VM
gcloud compute disks snapshot charhub-vm \
  --zone=us-central1-a \
  --snapshot-names=charhub-vm-snapshot-$(date +%Y%m%d)

# Agendar snapshots automáticos
gcloud compute resource-policies create snapshot-schedule charhub-daily \
  --region=us-central1 \
  --max-retention-days=7 \
  --start-time=03:00 \
  --daily-schedule

gcloud compute disks add-resource-policies charhub-vm \
  --zone=us-central1-a \
  --resource-policies=charhub-daily
```

---

## Segurança

### 1. Firewall e Rede

```bash
# Restringir acesso SSH apenas ao seu IP
gcloud compute firewall-rules create allow-ssh-from-my-ip \
  --allow=tcp:22 \
  --source-ranges=SEU_IP/32 \
  --target-tags=charhub-vm

# Bloquear acesso direto às portas de serviço (só permite via tunnel)
# Cloudflare Tunnel já faz isso por padrão (sem portas abertas na VM)
```

### 2. Secrets Management

**Recomendação**: Migrar para Google Secret Manager

```bash
# Habilitar API
gcloud services enable secretmanager.googleapis.com

# Exemplo: criar secret
echo -n "minha-senha-super-secreta" | \
  gcloud secrets create db-password --data-file=-

# Dar acesso ao Compute Engine
gcloud secrets add-iam-policy-binding db-password \
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

Depois ajustar `backend/.env` para ler secrets:

```bash
DATABASE_URL=postgresql://charhub:$(gcloud secrets versions access latest --secret=db-password)@...
```

### 3. SSL/TLS

Cloudflare Tunnel já fornece HTTPS automaticamente. Certifique-se de:

- **SSL/TLS Mode**: Full (Strict) no painel Cloudflare
- **Always Use HTTPS**: Habilitado
- **HSTS**: Habilitado (após testar que tudo funciona)

### 4. Rate Limiting

Configure no **Cloudflare**:

- Rate limit: 100 requests/min por IP
- Challenge após 5 tentativas de login falhadas

### 5. Atualizações de Segurança

```bash
# Agendar atualizações automáticas da VM (COS faz isso automaticamente)
# Verificar versão do COS
gcloud compute images list --project=cos-cloud --no-standard-images

# Atualizar imagens Docker regularmente
sudo docker compose pull
sudo docker compose up -d
```

---

## Escalabilidade

### Quando Escalar?

Monitore estas métricas:

1. **CPU > 70%** sustentado por > 10 minutos → Aumentar vCPUs da VM
2. **RAM > 80%** → Aumentar memória da VM
3. **Latência > 500ms** (p95) → Considerar load balancer + múltiplas VMs
4. **Conexões DB > 80%** do limite → Upgrade do Cloud SQL ou connection pooling

### Estratégias de Escalabilidade

#### Curto Prazo (< 10k usuários)

1. **Vertical Scaling (VM)**:
   ```bash
   # Parar VM
   gcloud compute instances stop charhub-vm --zone=us-central1-a

   # Mudar tipo de máquina
   gcloud compute instances set-machine-type charhub-vm \
     --zone=us-central1-a \
     --machine-type=e2-medium  # 2 vCPU, 4 GB RAM

   # Iniciar VM
   gcloud compute instances start charhub-vm --zone=us-central1-a
   ```

2. **Upgrade do Cloud SQL**:
   ```bash
   gcloud sql instances patch charhub-postgres \
     --tier=db-n1-standard-1  # 1 vCPU, 3.75 GB RAM
   ```

#### Longo Prazo (> 10k usuários)

1. **Migrar para GKE (Kubernetes)**:
   - Auto-scaling horizontal de backend pods
   - Load balancing entre múltiplas réplicas
   - Rolling updates sem downtime

2. **Separar Redis (Memorystore)**:
   ```bash
   gcloud redis instances create charhub-redis \
     --size=1 \
     --region=us-central1 \
     --redis-version=redis_7_0
   ```

3. **CDN para Frontend**:
   - Habilitar Cloudflare CDN
   - Servir assets estáticos do R2 com TTL longo

4. **Read Replicas (PostgreSQL)**:
   ```bash
   gcloud sql instances create charhub-postgres-read \
     --master-instance-name=charhub-postgres \
     --tier=db-n1-standard-1 \
     --region=us-central1
   ```

---

## Troubleshooting

### Problema 1: Backend não conecta ao PostgreSQL

**Sintomas**: Erro `ECONNREFUSED` nos logs do backend

**Soluções**:

```bash
# 1. Verificar se Cloud SQL está rodando
gcloud sql instances describe charhub-postgres

# 2. Verificar se IP da VM está autorizado
gcloud sql instances describe charhub-postgres \
  --format="get(settings.ipConfiguration.authorizedNetworks)"

# 3. Testar conexão manual
sudo docker compose exec backend sh
apk add postgresql-client
psql "postgresql://charhub:SENHA@IP_CLOUD_SQL:5432/charhub_db"
```

### Problema 2: Cloudflare Tunnel não conecta

**Sintomas**: Site inacessível via `https://charhub.app`

**Soluções**:

```bash
# 1. Verificar logs do cloudflared
sudo docker compose logs cloudflared

# 2. Verificar se credenciais estão corretas
sudo cat cloudflared/config/prod/credentials.json

# 3. Testar túnel manualmente
sudo docker run --rm -v $(pwd)/cloudflared/config:/etc/cloudflared/config \
  cloudflare/cloudflared:latest tunnel --config /etc/cloudflared/config/prod/config.yml run

# 4. Verificar DNS na Cloudflare
# Deve ter registro CNAME: charhub.app -> <tunnel-id>.cfargotunnel.com
```

### Problema 3: Frontend retorna 502 Bad Gateway

**Sintomas**: Nginx retorna erro 502

**Soluções**:

```bash
# 1. Verificar se backend está rodando
sudo docker compose ps backend

# 2. Verificar logs do nginx
sudo docker compose logs nginx

# 3. Verificar healthcheck do backend
sudo docker compose exec backend wget -O- http://localhost:3000/api/v1/health

# 4. Reiniciar serviços
sudo docker compose restart backend nginx
```

### Problema 4: Imagens não carregam (R2)

**Sintomas**: Erro 403 ou 404 ao acessar imagens

**Soluções**:

1. Verificar se bucket é público:
   - Cloudflare Dashboard → R2 → `charhub-media` → Settings
   - **Public Access**: Allowed

2. Verificar CORS do bucket:
   ```json
   [
     {
       "AllowedOrigins": ["https://charhub.app"],
       "AllowedMethods": ["GET", "HEAD"],
       "AllowedHeaders": ["*"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

3. Testar upload manual:
   ```bash
   sudo docker compose exec backend sh
   npm run test:r2-upload  # Se tiver script de teste
   ```

### Problema 5: OAuth não funciona

**Sintomas**: Erro ao fazer login com Google/Facebook

**Soluções**:

1. Verificar URLs de callback nos consoles OAuth:
   - Google: `https://charhub.app/api/v1/oauth/google/callback`
   - Facebook: `https://charhub.app/api/v1/oauth/facebook/callback`

2. Verificar variáveis de ambiente:
   ```bash
   sudo docker compose exec backend env | grep GOOGLE
   sudo docker compose exec backend env | grep FACEBOOK
   sudo docker compose exec backend env | grep FRONTEND_URLS
   ```

3. Verificar CORS:
   ```bash
   # Deve incluir https://charhub.app
   sudo docker compose exec backend env | grep ALLOWED_ORIGINS
   ```

---

## Checklist de Deploy

### Pré-Deploy

- [ ] Todas as variáveis de ambiente configuradas (`.env`, `backend/.env`, `frontend/.env`)
- [ ] Cloudflare Tunnel configurado e testado
- [ ] Cloud SQL criado e acessível
- [ ] Credenciais OAuth válidas
- [ ] API keys dos LLMs válidas
- [ ] R2 bucket criado e configurado
- [ ] Domínio DNS apontando para o tunnel

### Deploy

- [ ] Repositório clonado na VM
- [ ] Permissões de rede configuradas (Cloud SQL)
- [ ] Build das imagens Docker concluído
- [ ] Containers iniciados e rodando
- [ ] Migrations aplicadas com sucesso
- [ ] Healthcheck do backend retornando 200
- [ ] Frontend acessível via HTTPS

### Pós-Deploy

- [ ] Login OAuth funcionando
- [ ] Upload de imagens para R2 funcionando
- [ ] Tradução de conteúdo funcionando (LLM)
- [ ] Backups automáticos configurados
- [ ] Monitoramento e alertas configurados
- [ ] Documentação de runbook atualizada
- [ ] Plano de rollback definido

---

## Custos Mensais Estimados (Resumo)

| Componente | Especificação | Custo/Mês (USD) |
|------------|---------------|-----------------|
| **VM Compute** | e2-small (2 vCPU, 2 GB) | $15.00 |
| **Cloud SQL** | db-f1-micro (10 GB) | $7.67 |
| **Cloudflare DNS** | Gerenciamento de DNS | $0.00 |
| **Cloudflare Tunnel** | Tráfego ilimitado | $0.00 |
| **Cloudflare R2** | 10 GB + 100k req/mês | $0.00 - $5.00 |
| **Bandwidth** | Primeiros 1 TB grátis | $0.00 |
| **Total Mínimo** | | **~$23/mês** |
| **Total com R2** | | **~$28/mês** |

**Alternativa Free Tier**: VM e2-micro grátis + Cloud SQL ($8) = **~$8/mês** (limitado)

---

## Próximos Passos

1. **Configurar CI/CD** (GitHub Actions para deploy automático)
2. **Implementar testes automatizados** (E2E com Playwright)
3. **Configurar alertas** (PagerDuty, Slack, Email)
4. **Otimizar imagens Docker** (multi-stage builds mais agressivos)
5. **Implementar cache** (Redis para queries frequentes, Cloudflare CDN)
6. **Documentar runbooks** (procedimentos de incidentes)

---

## Referências

- [Google Cloud Documentation](https://cloud.google.com/docs)
- [Cloudflare Tunnel Documentation](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Prisma Production Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management)

---

**Última atualização**: 2025-01-09
**Versão**: 1.0
**Autor**: Time CharHub
