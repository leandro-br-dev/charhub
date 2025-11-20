# CharHub - Guia de Deploy em Produção

**Última atualização**: 2025-11-20
**Versão**: 3.0
**Status**: ✅ Em produção (charhub.app)

---

## Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura Atual](#arquitetura-atual)
3. [Pré-requisitos](#pré-requisitos)
4. [Deploy Rápido](#deploy-rápido)
5. [Deploy Detalhado](#deploy-detalhado)
6. [Gerenciamento de Banco de Dados](#gerenciamento-de-banco-de-dados)
7. [Troubleshooting](#troubleshooting)
8. [Monitoramento](#monitoramento)
9. [Custos](#custos)

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
| **VM** | charhub-vm (us-central1-a, e2-small) |
| **Database** | PostgreSQL 16 (Docker container na VM) |
| **Storage** | Cloudflare R2 (charhub-media) |

### Arquitetura Simplificada

```
Internet → Cloudflare DNS → Cloudflare Tunnel → VM (Docker Compose)
                                                      ↓
                                [Nginx + Frontend + Backend + PostgreSQL + Redis]
                                                      ↓
                                          Cloudflare R2 (imagens)
```

### Mudanças Recentes (v3.0)

**2025-11-20:**
- ✅ **Migração de Cloud SQL para PostgreSQL Docker**: Redução de custos de $30/mês para $0
- ✅ **Database seeding automático**: Dados iniciais (usuários, planos, tags) populados no startup
- ✅ **Traduções automáticas pós-seed**: Build de traduções após seed para incluir novas tags
- ✅ **Contexto .git incluído**: Comandos npm que dependem de git funcionam corretamente
- ✅ **Script de deploy otimizado**: Inclusão de arquivos `.env` e dot files no deploy
- ✅ **Documentação de acesso ao banco**: Guia completo para conectar DBeaver via SSH tunnel

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
  - postgres:5432        # PostgreSQL 16 (local na VM)
  - redis:6379          # Cache e filas
  - backend:3000        # Express API
  - frontend:80         # React SPA
  - nginx:80,443        # Proxy reverso
  - cloudflared         # Tunnel para Cloudflare
```

**Fluxo de Inicialização do Backend:**
1. Prisma Migrations (`npx prisma migrate deploy`)
2. Database Seed (`npm run db:seed`) - popula dados iniciais
3. Build Translations (`npm run build:translations`) - traduz tags geradas pelo seed
4. Start Application

---

## Pré-requisitos

### Ferramentas Necessárias

```powershell
# Verificar instalações
gcloud --version         # Google Cloud SDK
docker --version         # Docker Desktop (para testes locais)
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
3. ✅ Comprime o projeto (incluindo arquivos `.env` e dot files)
4. ✅ Verifica se `.env` foi incluído no pacote
5. ✅ Faz upload para Google Cloud Storage (bucket temporário público)
6. ✅ SSH na VM e executa o deploy
7. ✅ Copia arquivos incluindo dot files (dotglob habilitado)
8. ✅ Verifica se `.env` foi copiado corretamente
9. ✅ Builda containers Docker com todas as dependências
10. ✅ Executa migrations, seed e rebuild de traduções
11. ✅ Retorna ao modo development automaticamente
12. ✅ Remove arquivo temporário do Cloud Storage (preserva backups SQL)

**Tempo estimado**: 10-15 minutos

### Verificação Pós-Deploy

```powershell
# Ver logs em tempo real
gcloud compute ssh charhub-vm --zone=us-central1-a --project=charhub-prod --command="cd /mnt/stateful_partition/charhub && sudo docker compose logs -f backend"

# Ver status dos containers
gcloud compute ssh charhub-vm --zone=us-central1-a --project=charhub-prod --command="cd /mnt/stateful_partition/charhub && sudo docker compose ps"

# Testar no navegador
https://charhub.app
```

---

## Deploy Detalhado

### Passo 1: Preparar Ambiente Local

```powershell
# Garantir que mudanças locais estão commitadas
git status

# Gerar traduções localmente (serão incluídas no deploy)
cd backend
npm run build:translations
cd ..

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
  [i] Verificando se .env foi incluido...
  [OK] Arquivo .env incluido no pacote
  [OK] Arquivo comprimido: 140.32 MB

[2/6] Fazendo upload para Cloud Storage...
  [OK] Upload concluído em 25.4s

[3/6] Tornando arquivo público temporariamente...
  [OK] Bucket configurado como publico
  [OK] Arquivo acessível publicamente

[4/6] Baixando na VM e fazendo deploy...
  [i] Executando deploy na VM...
[*] Baixando arquivo para home...
  [OK] Download concluido
[*] Parando containers...
[*] Gerenciamento de Backup Inteligente...
  [OK] Backups antigos removidos
[*] Extraindo novo codigo...
  [OK] Arquivo extraido
[*] Instalando arquivos...
  [OK] Arquivos temporarios removidos
  [OK] Arquivo .env confirmado no diretorio da aplicacao
[*] Construindo e Iniciando...
[*] Aguardando containers...
[*] Migrations...
  [entrypoint] Running database migrations
  [entrypoint] Running database seed
  [entrypoint] Rebuilding translations after seed
[*] Deploy finalizado!
  [OK] Deploy concluído

[5/6] Limpando Cloud Storage...
  [OK] Arquivo de deploy removido (backups SQL preservados)

[6/6] Retornando ao modo desenvolvimento...
  [OK] Modo DEVELOPMENT restaurado

========================================
[OK] DEPLOY CONCLUIDO COM SUCESSO!
========================================
```

### Passo 3: Verificar Saúde da Aplicação

```powershell
# Status dos containers
gcloud compute ssh charhub-vm --zone=us-central1-a --command="cd /mnt/stateful_partition/charhub && sudo docker compose ps"

# Logs do backend
gcloud compute ssh charhub-vm --zone=us-central1-a --command="cd /mnt/stateful_partition/charhub && sudo docker compose logs -f backend"

# Testar API
curl https://charhub.app/api/v1/health

# Verificar se seed foi executado
gcloud compute ssh charhub-vm --zone=us-central1-a --command="cd /mnt/stateful_partition/charhub && sudo docker compose exec -T backend npx prisma studio"
```

---

## Gerenciamento de Banco de Dados

### Visão Geral

O CharHub utiliza PostgreSQL 16 rodando em container Docker na própria VM. Anteriormente utilizávamos Cloud SQL ($30/mês), mas migramos para container Docker para reduzir custos.

**Documento completo**: [`docs/DATABASE_OPERATIONS.md`](../DATABASE_OPERATIONS.md)

### Acesso Rápido via DBeaver

#### Método Recomendado: SSH Tunnel com Chave Pública

Configure DBeaver com SSH tunnel integrado:

**Aba Main:**
- **Host**: `localhost`
- **Port**: `5432`
- **Database**: `charhub_db`
- **Username**: `charhub`
- **Password**: `eN7-NwIXNo-z9GgIBXDW` (de `.env.production`)

**Aba SSH:**
- ✅ **Use SSH Tunnel**: Habilitado
- **Host/IP**: `136.116.66.192` (IP externo da VM)
- **Port**: `22`
- **User Name**: `Leandro` (usuário do proprietário no GCP)
- **Authentication Method**: `Public Key`
- **Private Key**: `C:\Users\Leandro\.ssh\google_compute_engine`
- **Passphrase**: (deixe em branco se a chave não tiver passphrase)

**Validação:**
1. Clique em "Test Tunnel Configuration" para verificar a conexão SSH
2. Clique em "Test Connection" para validar o acesso ao banco

#### Método Alternativo: Port Forwarding Manual

Se preferir controlar o túnel SSH manualmente:

**Passo 1**: Abra PowerShell e crie o túnel SSH:
```powershell
gcloud compute ssh charhub-vm --zone=us-central1-a --project=charhub-prod -- -L 5432:localhost:5432 -N
```
**Deixe esta janela aberta!**

**Passo 2**: Configure DBeaver (sem SSH tunnel):
- **Host**: `localhost`
- **Port**: `5432`
- **Database**: `charhub_db`
- **Username**: `charhub`
- **Password**: `eN7-NwIXNo-z9GgIBXDW` (de `.env.production`)

### Operações Comuns

```bash
# Backup do banco
gcloud compute ssh charhub-vm --zone=us-central1-a --command="sudo docker exec charhub-postgres-1 pg_dump -U charhub charhub_db" > backup.sql

# Executar seed manualmente
gcloud compute ssh charhub-vm --zone=us-central1-a --command="cd /mnt/stateful_partition/charhub && sudo docker compose exec -T backend npm run db:seed"

# Verificar logs do PostgreSQL
gcloud compute ssh charhub-vm --zone=us-central1-a --command="sudo docker logs charhub-postgres-1 --tail 100"

# Acessar psql diretamente
gcloud compute ssh charhub-vm --zone=us-central1-a --command="sudo docker exec -it charhub-postgres-1 psql -U charhub -d charhub_db"
```

### Backup do Cloud SQL (Histórico)

O backup do banco anterior (Cloud SQL) está preservado em:
- **Bucket**: `gs://charhub-deploy-temp/`
- **Arquivo**: `Cloud_SQL_Export_2025-11-20 (06:37:30).sql`

---

## Troubleshooting

### Problema 1: Erro 1033 do Cloudflare Tunnel

**Sintoma**: Site inacessível, erro "Cloudflare is unable to resolve tunnel"

**Solução**:
```powershell
# Reiniciar container do tunnel
gcloud compute ssh charhub-vm --zone=us-central1-a --command="cd /mnt/stateful_partition/charhub && sudo docker compose restart cloudflared"
```

### Problema 2: Backend retorna 502

**Sintoma**: Nginx retorna "502 Bad Gateway"

**Diagnóstico**:
```powershell
# Ver logs do backend
gcloud compute ssh charhub-vm --zone=us-central1-a --command="cd /mnt/stateful_partition/charhub && sudo docker compose logs backend --tail 100"

# Verificar healthcheck
gcloud compute ssh charhub-vm --zone=us-central1-a --command="curl http://localhost:3000/api/v1/health"
```

**Solução**:
```powershell
# Reiniciar backend
gcloud compute ssh charhub-vm --zone=us-central1-a --command="cd /mnt/stateful_partition/charhub && sudo docker compose restart backend"
```

### Problema 3: Banco de dados vazio após deploy

**Sintoma**: Aplicação funciona mas não há dados (planos, tags, usuários do sistema)

**Causa**: Seed não foi executado ou falhou

**Solução**:
```powershell
# Verificar logs de seed
gcloud compute ssh charhub-vm --zone=us-central1-a --command="cd /mnt/stateful_partition/charhub && sudo docker compose logs backend | grep seed"

# Executar seed manualmente
gcloud compute ssh charhub-vm --zone=us-central1-a --command="cd /mnt/stateful_partition/charhub && sudo docker compose exec -T backend npm run db:seed"

# Rebuild traduções após seed
gcloud compute ssh charhub-vm --zone=us-central1-a --command="cd /mnt/stateful_partition/charhub && sudo docker compose exec -T backend npm run build:translations"
```

### Problema 4: Arquivo .env não encontrado

**Sintoma**: Variáveis de ambiente não são lidas, containers falham ao iniciar

**Diagnóstico**:
```powershell
# Verificar se .env existe
gcloud compute ssh charhub-vm --zone=us-central1-a --command="ls -la /mnt/stateful_partition/charhub/.env"

# Ver conteúdo (apenas para debug)
gcloud compute ssh charhub-vm --zone=us-central1-a --command="sudo cat /mnt/stateful_partition/charhub/.env | head -5"
```

**Solução**: O script de deploy já foi corrigido para incluir dot files. Se o problema persistir:
1. Verificar que `.env.production` existe localmente
2. Executar deploy novamente
3. Script agora usa `shopt -s dotglob` para copiar arquivos ocultos

### Problema 5: Deploy falha durante build

**Sintoma**: Erro durante `docker compose build`

**Solução**:
```powershell
# SSH na VM e fazer deploy manual
gcloud compute ssh charhub-vm --zone=us-central1-a

# Dentro da VM:
cd /mnt/stateful_partition/charhub
sudo docker compose down
sudo docker system prune -af
sudo docker compose build --no-cache backend frontend
sudo docker compose up -d
```

### Rollback de Emergência

```powershell
# SSH na VM
gcloud compute ssh charhub-vm --zone=us-central1-a

# Listar backups (mantém os 3 últimos)
ls -la /mnt/stateful_partition/backups/

# Restaurar backup
cd /mnt/stateful_partition/charhub
sudo docker compose down
sudo rm -rf /mnt/stateful_partition/charhub
sudo cp -r /mnt/stateful_partition/backups/charhub.backup.YYYYMMDDHHMMSS /mnt/stateful_partition/charhub
cd /mnt/stateful_partition/charhub
sudo docker compose up -d
```

---

## Monitoramento

### Comandos de Monitoramento

```powershell
# Ver logs em tempo real (todos os serviços)
gcloud compute ssh charhub-vm --zone=us-central1-a --command="cd /mnt/stateful_partition/charhub && sudo docker compose logs -f"

# Ver logs específicos
gcloud compute ssh charhub-vm --zone=us-central1-a --command="cd /mnt/stateful_partition/charhub && sudo docker compose logs -f backend"
gcloud compute ssh charhub-vm --zone=us-central1-a --command="cd /mnt/stateful_partition/charhub && sudo docker compose logs -f cloudflared"
gcloud compute ssh charhub-vm --zone=us-central1-a --command="cd /mnt/stateful_partition/charhub && sudo docker compose logs -f nginx"
gcloud compute ssh charhub-vm --zone=us-central1-a --command="cd /mnt/stateful_partition/charhub && sudo docker compose logs -f postgres"

# Ver status dos containers
gcloud compute ssh charhub-vm --zone=us-central1-a --command="cd /mnt/stateful_partition/charhub && sudo docker compose ps"

# Acessar shell da VM
gcloud compute ssh charhub-vm --zone=us-central1-a
```

### Endpoints de Health Check

```bash
# Backend API
curl https://charhub.app/api/v1/health

# Resposta esperada:
{
  "status": "healthy",
  "uptime": 12345,
  "timestamp": "2025-11-20T..."
}
```

### Métricas Google Cloud

Acesse: https://console.cloud.google.com/monitoring

- CPU e Memória da VM
- Uso de disco
- Logs estruturados
- Alertas personalizados

---

## Custos

### Custos Mensais Atuais

| Serviço | Especificação | Custo (USD/mês) |
|---------|---------------|-----------------|
| VM Compute Engine | e2-small (2 vCPU, 2 GB) | ~$15 |
| PostgreSQL | Docker (incluído na VM) | **$0** |
| Redis | Docker (incluído na VM) | **$0** |
| Cloudflare DNS | - | $0 (Free) |
| Cloudflare Tunnel | - | $0 (Free) |
| Cloudflare R2 | <10 GB, <100k requests | $0 (Free Tier) |
| Cloud Storage | Deploy temporário | ~$0.02 |
| **Total Estimado** | | **~$15/mês** |

### Economia Recente

**Migração Cloud SQL → PostgreSQL Docker:**
- **Antes**: $30/mês (Cloud SQL)
- **Depois**: $0 (Docker na VM)
- **Economia**: $30/mês (100% de redução)

### Otimização de Custos

- ✅ Cloudflare Tunnel elimina necessidade de IP estático ($5/mês economizados)
- ✅ R2 gratuito até 10 GB (vs S3 que cobraria ~$2/mês)
- ✅ PostgreSQL Docker elimina custo de Cloud SQL ($30/mês economizados)
- ✅ Redis Docker elimina custo de Memorystore (~$20/mês economizados)
- ⚠️ Considerar Free Tier do GCP: e2-micro grátis (limitações de performance)

**Custo total reduzido de ~$70/mês para ~$15/mês (economia de 78%)**

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
- **IP Externo**: `136.116.66.192`
- **PostgreSQL**: Container Docker `charhub-postgres-1`
- **Bucket Deploy**: `gs://charhub-deploy-temp/`
- **R2 Bucket**: `charhub-media`

---

## Changelog

### v3.0 (2025-11-20)
- ✅ Migração de Cloud SQL para PostgreSQL Docker
- ✅ Database seeding automático no startup
- ✅ Build de traduções pós-seed
- ✅ Correção de inclusão de arquivos `.env` no deploy
- ✅ Documentação de acesso ao banco via DBeaver
- ✅ Otimização de custos: redução de $70/mês para $15/mês

### v2.0 (2025-11-13)
- Deploy automatizado via script PowerShell
- Troca automática de ambiente
- Backup automático antes de deploy

### v1.0
- Deploy manual via SSH
- Cloud SQL PostgreSQL
- Configuração inicial da infraestrutura

---

**Documentação criada e mantida pelo time CharHub**
