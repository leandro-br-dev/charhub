# Guia Rápido de Deploy - CharHub

Guia de referência rápida para deploy em produção. Para detalhes completos, consulte [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md).

## Arquitetura Escolhida

```
Cloudflare (DNS + Tunnel + R2) → Google Cloud VM → Cloud SQL PostgreSQL
```

**Custo Total**: ~$23/mês (ou ~$8/mês com free tier)

---

## Setup Inicial (One-Time)

### 1. Google Cloud - Criar Recursos

```bash
# Login e criar projeto
gcloud auth login
gcloud projects create charhub-prod --name="CharHub Production"
gcloud config set project charhub-prod

# Habilitar APIs
gcloud services enable compute.googleapis.com sqladmin.googleapis.com

# Criar Cloud SQL
gcloud sql instances create charhub-postgres \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --storage-size=10GB \
  --backup-start-time=03:00

gcloud sql databases create charhub_db --instance=charhub-postgres
gcloud sql users create charhub --instance=charhub-postgres --password=SUA_SENHA

# Criar VM
gcloud compute instances create charhub-vm \
  --zone=us-central1-a \
  --machine-type=e2-small \
  --image-family=cos-stable \
  --image-project=cos-cloud \
  --boot-disk-size=30GB \
  --tags=http-server,https-server
```

### 2. Cloudflare - Configurar Tunnel

1. Acesse: https://one.dash.cloudflare.com/
2. **Access** → **Tunnels** → **Create a tunnel**
3. Nome: `charhub-prod`
4. Copie o **Tunnel ID** e **credentials JSON**
5. Configure Public Hostname:
   - `charhub.app` → `http://nginx:80`
   - `www.charhub.app` → `http://nginx:80`

### 3. Cloudflare R2 - Criar Bucket

1. **R2** → **Create Bucket** → Nome: `charhub-media`
2. **Settings** → **Public Access**: Allowed
3. **Manage API Tokens** → Create Token → Copie:
   - Account ID
   - Access Key ID
   - Secret Access Key

---

## Deploy da Aplicação

### 1. Preparar VM

```bash
# SSH na VM
gcloud compute ssh charhub-vm --zone=us-central1-a

# Clonar repositório
cd /opt
sudo git clone https://github.com/seu-usuario/charhub.git charhub
cd charhub

# Criar diretório para Cloudflare Tunnel
sudo mkdir -p cloudflared/config/prod
```

### 2. Configurar Credenciais do Tunnel

```bash
# Criar arquivo de credenciais (copie do painel Cloudflare)
sudo nano cloudflared/config/prod/credentials.json

# Colar JSON:
{
  "AccountTag": "SEU_ACCOUNT_ID",
  "TunnelSecret": "SEU_TUNNEL_SECRET",
  "TunnelID": "SEU_TUNNEL_ID"
}

# Criar configuração do tunnel
sudo nano cloudflared/config/prod/config.yml

# Colar:
tunnel: SEU_TUNNEL_ID
credentials-file: /etc/cloudflared/config/prod/credentials.json

ingress:
  - hostname: charhub.app
    service: http://nginx:80
  - hostname: www.charhub.app
    service: http://nginx:80
  - service: http_status:404
```

### 3. Criar Arquivos .env

**Root `.env`:**
```bash
sudo nano .env
```

```env
NODE_ENV=production
BACKEND_ENABLE_HOT_RELOAD=false
ENV_SUFFIX=prod
PUBLIC_HOSTNAME=charhub.app
PUBLIC_FACING_URL=https://charhub.app
```

**`backend/.env`:**
```bash
sudo nano backend/.env
```

```env
NODE_ENV=production
DEV_TRANSLATION_MODE=skip
USE_PRETTY_LOGS=true
LOG_LEVEL=info

PORT=3000
BASE_URL=https://charhub.app
FRONTEND_URL=https://charhub.app
PUBLIC_FACING_URL=https://charhub.app
PUBLIC_HOSTNAME=charhub.app

FRONTEND_URLS=https://charhub.app,https://www.charhub.app
ALLOWED_ORIGINS=https://charhub.app,https://www.charhub.app

# Obter IP do Cloud SQL:
# gcloud sql instances describe charhub-postgres --format="get(ipAddresses[0].ipAddress)"
DATABASE_URL=postgresql://charhub:SUA_SENHA@IP_CLOUD_SQL:5432/charhub_db?schema=public&sslmode=require

QUEUES_ENABLED=true
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Cloudflare R2
R2_BUCKET_NAME=charhub-media
R2_ACCOUNT_ID=SEU_ACCOUNT_ID
R2_ACCESS_KEY_ID=SUA_ACCESS_KEY
R2_SECRET_ACCESS_KEY=SUA_SECRET_KEY
R2_ENDPOINT_URL=https://SEU_ACCOUNT_ID.r2.cloudflarestorage.com
R2_PUBLIC_URL_BASE=https://media.charhub.app

# LLM Keys
GEMINI_API_KEY=SUA_KEY
OPENAI_API_KEY=SUA_KEY
GROK_API_KEY=SUA_KEY

# OAuth
GOOGLE_CLIENT_ID=SEU_CLIENT_ID
GOOGLE_CLIENT_SECRET=SEU_SECRET
GOOGLE_CALLBACK_PATH=/api/v1/oauth/google/callback

FACEBOOK_CLIENT_ID=SEU_CLIENT_ID
FACEBOOK_CLIENT_SECRET=SEU_SECRET
FACEBOOK_CALLBACK_PATH=/api/v1/oauth/facebook/callback

# Gerar com: openssl rand -base64 32
JWT_SECRET=GERAR_CHAVE_AQUI
TOKEN_EXPIRATION=7d

# Gerar com: npx tsx src/scripts/generateEncryptionKey.ts
MESSAGE_ENCRYPTION_KEY=GERAR_CHAVE_AQUI

TRANSLATION_DEFAULT_PROVIDER=gemini
TRANSLATION_DEFAULT_MODEL=gemini-2.0-flash-exp
TRANSLATION_CACHE_TTL=3600
TRANSLATION_ENABLE_PRE_TRANSLATION=false
```

**`frontend/.env`:**
```bash
sudo nano frontend/.env
```

```env
VITE_API_BASE_URL=
VITE_API_VERSION=/api/v1
VITE_GOOGLE_AUTH_PATH=/api/v1/oauth/google
VITE_FACEBOOK_AUTH_PATH=/api/v1/oauth/facebook
VITE_GOOGLE_CALLBACK_PATH=/api/v1/oauth/google/callback
VITE_FACEBOOK_CALLBACK_PATH=/api/v1/oauth/facebook/callback

VITE_ALLOWED_HOSTS=charhub.app,www.charhub.app
VITE_CDN_PUBLIC_URL_BASE=https://media.charhub.app
VITE_USE_CHARACTER_MOCKS=false
```

### 4. Autorizar VM no Cloud SQL

```bash
# Obter IP da VM
VM_IP=$(gcloud compute instances describe charhub-vm \
  --zone=us-central1-a \
  --format="get(networkInterfaces[0].accessConfigs[0].natIP)")

# Autorizar VM
gcloud sql instances patch charhub-postgres \
  --authorized-networks=$VM_IP
```

### 5. Build e Start

```bash
# Dentro da VM (/opt/charhub)
sudo docker compose build --no-cache
sudo docker compose up -d

# Aplicar migrations
sudo docker compose exec backend npx prisma migrate deploy

# Verificar status
sudo docker compose ps
sudo docker compose logs -f
```

### 6. Testar

Acesse: https://charhub.app

---

## Comandos Úteis

### Logs

```bash
# Todos os serviços
sudo docker compose logs -f

# Serviço específico
sudo docker compose logs -f backend
sudo docker compose logs -f cloudflared
```

### Restart

```bash
# Reiniciar tudo
sudo docker compose restart

# Serviço específico
sudo docker compose restart backend
```

### Atualizar Código

```bash
cd /opt/charhub
sudo git pull
sudo docker compose build --no-cache backend frontend
sudo docker compose up -d
```

### Backup Manual

```bash
# Criar backup do banco
gcloud sql backups create --instance=charhub-postgres

# Criar snapshot da VM
gcloud compute disks snapshot charhub-vm \
  --zone=us-central1-a \
  --snapshot-names=charhub-vm-backup-$(date +%Y%m%d)
```

### Migrations

```bash
# Aplicar migrations
sudo docker compose exec backend npx prisma migrate deploy

# Verificar status
sudo docker compose exec backend npx prisma migrate status

# Abrir Prisma Studio
sudo docker compose exec backend npx prisma studio
```

---

## Troubleshooting Rápido

### Backend não conecta ao banco

```bash
# Verificar conexão
sudo docker compose exec backend sh
apk add postgresql-client
psql "$DATABASE_URL"
```

### Site inacessível

```bash
# 1. Verificar tunnel
sudo docker compose logs cloudflared

# 2. Verificar nginx
sudo docker compose ps nginx
sudo docker compose logs nginx

# 3. Verificar backend healthcheck
curl http://localhost:3000/api/v1/health
```

### Erro 502

```bash
# Restart dos serviços web
sudo docker compose restart backend nginx cloudflared
```

---

## Checklist de Deploy

- [ ] Cloud SQL criado e acessível
- [ ] VM criada
- [ ] Cloudflare Tunnel configurado
- [ ] R2 bucket criado
- [ ] Todos os `.env` preenchidos
- [ ] Credenciais OAuth válidas
- [ ] Build concluído sem erros
- [ ] Migrations aplicadas
- [ ] Site acessível via HTTPS
- [ ] Login OAuth funcionando
- [ ] Upload de imagens funcionando

---

## Custos

| Serviço | Custo/Mês |
|---------|-----------|
| VM e2-small | $15 |
| Cloud SQL db-f1-micro | $8 |
| Cloudflare (DNS + Tunnel) | $0 |
| R2 (10 GB) | $0-5 |
| **Total** | **~$23-28** |

**Opção Free Tier**: VM e2-micro (grátis) + Cloud SQL ($8) = **~$8/mês**

---

## Links Úteis

- [Documentação Completa](./PRODUCTION_DEPLOYMENT.md)
- [Cloudflare Dashboard](https://dash.cloudflare.com/)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Cloudflare Zero Trust](https://one.dash.cloudflare.com/)

---

**Última atualização**: 2025-01-09
