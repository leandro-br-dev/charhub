# Estratégia de Deploy - CharHub

Este documento define a estratégia completa de deploy para o CharHub, incluindo ambientes, processos manuais vs automatizados, e o roadmap de evolução.

## Índice

1. [Visão Geral](#visão-geral)
2. [Ambientes](#ambientes)
3. [Deploy Manual vs Automatizado](#deploy-manual-vs-automatizado)
4. [Fase Atual: Deploy Manual](#fase-atual-deploy-manual)
5. [Fase Futura: Deploy Automatizado com GitHub Actions](#fase-futura-deploy-automatizado-com-github-actions)
6. [Gerenciamento de Variáveis de Ambiente](#gerenciamento-de-variáveis-de-ambiente)
7. [Processos de Deploy](#processos-de-deploy)

---

## Visão Geral

### Decisão Arquitetural (ADR-004)

Conforme documentado em `ARCHITECTURE_DECISIONS.md`, a estratégia de deploy do CharHub é:

- **Staging**: Deploy automático via GitHub Actions (futuro)
- **Production**: Deploy manual com aprovação (atual e futuro)

### Roadmap de Deploy

```
┌─────────────────────────────────────────────────────────────┐
│ FASE 1 (ATUAL): Deploy Manual                               │
│ - Setup inicial da infraestrutura                          │
│ - Deploy manual via gcloud/ssh                             │
│ - Aprendizado e estabilização                              │
│ - Duração: 1-2 meses                                       │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ FASE 2: Deploy Semi-Automatizado                           │
│ - Scripts de deploy automatizados                          │
│ - GitHub Actions para CI (testes)                          │
│ - Deploy production ainda manual                           │
│ - Duração: 1-2 meses                                       │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ FASE 3: Deploy Totalmente Automatizado                     │
│ - GitHub Actions para deploy staging (auto)                │
│ - GitHub Actions para deploy production (approval)         │
│ - Rollback automatizado                                    │
│ - Monitoramento e alertas                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Ambientes

### 1. Development (Local)

**URL**: `http://localhost` (ou via tunnel: `https://dev.charhub.app`)
**Propósito**: Desenvolvimento ativo local
**Infraestrutura**: Docker Compose local
**Database**: PostgreSQL em container
**Deploy**: Manual (`docker compose up`)

**Características:**
- Hot-reload ativado
- Logs detalhados
- Sem otimizações de produção
- Dados de teste/mock

### 2. Staging (Futuro)

**URL**: `https://staging.charhub.app`
**Propósito**: Testes em ambiente real antes de produção
**Infraestrutura**: VM separada no Google Cloud (e2-micro)
**Database**: Cloud SQL (instância separada)
**Deploy**: Automático via GitHub Actions (push para `main`)

**Características:**
- Cópia da produção
- Dados de teste
- Testes manuais e E2E
- Validação antes de ir para produção

**Status**: 🚧 Não implementado ainda (Fase 2)

### 3. Production

**URL**: `https://charhub.app`
**Propósito**: Usuários reais
**Infraestrutura**: VM Google Cloud (e2-small) + Cloud SQL
**Database**: Cloud SQL (PostgreSQL)
**Deploy**: Manual (Fase 1) → Manual com GitHub Actions (Fase 3)

**Características:**
- Otimizado para performance
- Backups automáticos
- Monitoramento ativo
- Zero hot-reload

---

## Deploy Manual vs Automatizado

### Por que começar com Deploy Manual?

#### Vantagens do Deploy Manual (Fase 1)

1. **Aprendizado da Infraestrutura**
   - Entender cada componente (VM, Cloud SQL, Docker, Cloudflare)
   - Debugging mais fácil quando algo quebra
   - Familiarização com ferramentas do GCP

2. **Flexibilidade**
   - Ajustar configurações rapidamente
   - Experimentar sem quebrar automações
   - Iterar rápido na arquitetura

3. **Menor Complexidade Inicial**
   - Sem necessidade de configurar GitHub Secrets
   - Sem workflow complexo de CI/CD
   - Foco em fazer funcionar primeiro

4. **Controle Total**
   - Cada passo é consciente
   - Validação manual antes de deploy
   - Evita deploys acidentais

#### Quando Migrar para Deploy Automatizado?

**Triggers para migração (Fase 2/3):**

- ✅ Infraestrutura estável (sem mudanças frequentes)
- ✅ Processo de deploy documentado e repetível
- ✅ Testes automatizados com boa cobertura
- ✅ Múltiplos deploys por semana (overhead manual alto)
- ✅ Necessidade de staging environment

**Estimativa**: 1-2 meses após primeiro deploy em produção

---

## Fase Atual: Deploy Manual

### Estrutura de Arquivos de Ambiente

```
E:\Projects\charhub\
├── .env                      # ← Ambiente ATIVO (não commitar)
├── .env.development          # ← Template de desenvolvimento (commitar)
├── .env.production           # ← Template de produção (commitar)
├── backend/
│   ├── .env                  # ← Ambiente ATIVO (não commitar)
│   ├── .env.development      # ← Template de desenvolvimento (commitar)
│   └── .env.production       # ← Template de produção (commitar)
├── frontend/
│   ├── .env                  # ← Ambiente ATIVO (não commitar)
│   ├── .env.development      # ← Template de desenvolvimento (commitar)
│   └── .env.production       # ← Template de produção (commitar)
└── secrets/
    └── production-secrets.txt # ← Todas as senhas reais (não commitar)
```

### Scripts de Alternância de Ambiente

#### PowerShell (Windows)

```powershell
# Alternar para produção (antes de fazer deploy)
.\scripts\switch-env.ps1 -Environment production

# Voltar para desenvolvimento (depois do deploy)
.\scripts\switch-env.ps1 -Environment development
```

#### Bash (Linux/Mac/VM)

```bash
# Alternar para produção
./scripts/switch-env.sh production

# Voltar para desenvolvimento
./scripts/switch-env.sh development
```

### Processo de Deploy Manual (Fase 1)

#### Passo 1: Preparar Ambiente Local

```powershell
# 1. Garantir que está em desenvolvimento
.\scripts\switch-env.ps1 -Environment development

# 2. Testar localmente
docker compose down
docker compose up -d
docker compose logs -f

# 3. Validar que tudo funciona
# - Acessar http://localhost
# - Testar login OAuth
# - Testar features críticas
```

#### Passo 2: Preparar para Deploy

```powershell
# 1. Alternar para produção
.\scripts\switch-env.ps1 -Environment production

# 2. Verificar arquivos .env
Get-Content .env
Get-Content backend\.env
Get-Content frontend\.env

# 3. Fazer upload para VM
gcloud compute scp --recurse --zone=us-central1-a `
  E:\Projects\charhub charhub-vm:/tmp/charhub
```

#### Passo 3: Deploy na VM

```bash
# SSH na VM
gcloud compute ssh charhub-vm --zone=us-central1-a

# Mover para /opt
sudo rm -rf /opt/charhub
sudo mv /tmp/charhub /opt/
cd /opt/charhub

# Build e deploy
sudo docker compose down
sudo docker compose build --no-cache
sudo docker compose up -d

# Aplicar migrations
sudo docker compose exec backend npx prisma migrate deploy

# Verificar logs
sudo docker compose logs -f
```

#### Passo 4: Restaurar Ambiente Local

```powershell
# Voltar para desenvolvimento
.\scripts\switch-env.ps1 -Environment development

# Verificar que voltou
Get-Content .env | Select-String "NODE_ENV"
# Deve mostrar: NODE_ENV=development
```

### Fluxo Completo (Diagrama)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Desenvolvimento Local                                    │
│    - Trabalho normal em .env development                    │
│    - Testes locais                                          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Preparar Deploy                                          │
│    - switch-env.ps1 production                              │
│    - Verificar .env de produção                             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Upload para VM                                           │
│    - gcloud compute scp (projeto completo)                  │
│    - Envia código + .env de produção                        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Deploy na VM                                             │
│    - SSH na VM                                              │
│    - docker compose build & up                              │
│    - prisma migrate deploy                                  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Restaurar Desenvolvimento                                │
│    - switch-env.ps1 development                             │
│    - Continuar trabalho normal                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Fase Futura: Deploy Automatizado com GitHub Actions

### Quando Implementar?

Conforme ADR-002 e ADR-004, GitHub Actions será implementado em 2 fases:

**Fase 2 (1-2 meses após primeiro deploy):**
- CI/CD para testes (backend + frontend)
- Build automático de imagens Docker
- Deploy staging automático (quando criado)

**Fase 3 (2-3 meses após primeiro deploy):**
- Deploy production com aprovação manual
- Rollback automatizado
- Health checks e smoke tests

### Arquitetura de CI/CD (Futuro)

```yaml
# .github/workflows/deploy-production.yml (FUTURO)

name: Deploy Production

on:
  workflow_dispatch:  # Manual trigger only
    inputs:
      confirm:
        description: 'Type "deploy" to confirm'
        required: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production  # Requer approval no GitHub

    steps:
      - name: Validate confirmation
        if: github.event.inputs.confirm != 'deploy'
        run: exit 1

      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup gcloud
        uses: google-github-action/setup-gcloud@v2
        with:
          service_account_key: ${{ secrets.GCP_SA_KEY }}

      - name: Deploy to VM
        run: |
          # Upload código
          gcloud compute scp --recurse . charhub-vm:/tmp/charhub

          # SSH e deploy
          gcloud compute ssh charhub-vm --command "
            cd /opt/charhub
            sudo docker compose down
            sudo docker compose up -d
          "

      - name: Run migrations
        run: |
          gcloud compute ssh charhub-vm --command "
            cd /opt/charhub
            sudo docker compose exec backend npx prisma migrate deploy
          "

      - name: Health check
        run: curl https://charhub.app/api/v1/health
```

### Secrets Necessários (GitHub)

Quando implementar GitHub Actions, configurar:

```
GCP_SA_KEY                 # Service Account JSON
DATABASE_URL               # PostgreSQL connection string
JWT_SECRET                 # JWT secret key
MESSAGE_ENCRYPTION_KEY     # Message encryption key
GOOGLE_CLIENT_SECRET       # OAuth secret
FACEBOOK_CLIENT_SECRET     # OAuth secret
GEMINI_API_KEY            # LLM API key
OPENAI_API_KEY            # LLM API key
GROK_API_KEY              # LLM API key
R2_ACCESS_KEY_ID          # Cloudflare R2
R2_SECRET_ACCESS_KEY      # Cloudflare R2
```

---

## Gerenciamento de Variáveis de Ambiente

### Princípios

1. **Nunca commitar `.env` ativos**
   - `.env`, `backend/.env`, `frontend/.env` estão no `.gitignore`

2. **Commitar templates**
   - `.env.development` e `.env.production` podem ser commitados
   - Não contêm senhas reais (só placeholders)

3. **Senhas reais em `secrets/`**
   - `secrets/production-secrets.txt` contém todas as senhas
   - Este arquivo NUNCA é commitado
   - Backup em local seguro (gerenciador de senhas)

4. **Scripts para alternar**
   - `switch-env.ps1` / `switch-env.sh` copiam templates para `.env`
   - Impossível esquecer de voltar para desenvolvimento

### Matriz de Arquivos

| Arquivo | Commitar? | Contém Senhas? | Propósito |
|---------|-----------|----------------|-----------|
| `.env` | ❌ Não | ✅ Sim | Ambiente ativo (copiado de .development ou .production) |
| `.env.development` | ✅ Sim | ❌ Não | Template de desenvolvimento |
| `.env.production` | ✅ Sim | ❌ Não | Template de produção (placeholders) |
| `secrets/production-secrets.txt` | ❌ NUNCA | ✅ Sim | Todas as senhas reais |

---

## Processos de Deploy

### Deploy de Emergência (Hotfix)

```powershell
# 1. Criar branch de hotfix
git checkout -b hotfix/critical-bug
# Fix the bug
git add .
git commit -m "fix: critical bug"
git push

# 2. Merge para main
git checkout main
git merge hotfix/critical-bug

# 3. Deploy manual imediato
.\scripts\switch-env.ps1 -Environment production
gcloud compute scp --recurse . charhub-vm:/tmp/charhub
# SSH e deploy (comandos anteriores)
.\scripts\switch-env.ps1 -Environment development
```

### Rollback

```bash
# SSH na VM
gcloud compute ssh charhub-vm --zone=us-central1-a

# Opção 1: Rollback de código (Git)
cd /opt/charhub
sudo git log --oneline -10  # Ver últimos commits
sudo git reset --hard COMMIT_ANTERIOR
sudo docker compose down
sudo docker compose up -d

# Opção 2: Rollback de database (Prisma)
sudo docker compose exec backend npx prisma migrate resolve --rolled-back MIGRATION_NAME

# Opção 3: Restore de snapshot (Disaster)
# Ver docs/PRODUCTION_DEPLOYMENT.md seção "Backup e Recuperação"
```

### Checklist de Deploy

**Antes do Deploy:**
- [ ] Código testado localmente
- [ ] Alternar para ambiente de produção (`switch-env.ps1 production`)
- [ ] Verificar `.env` de produção
- [ ] Commit e push do código
- [ ] Backup do banco (se mudanças críticas)

**Durante o Deploy:**
- [ ] Upload do código para VM
- [ ] Build das imagens Docker
- [ ] Subir containers
- [ ] Aplicar migrations
- [ ] Verificar logs (sem erros)
- [ ] Testar healthcheck

**Depois do Deploy:**
- [ ] Restaurar ambiente de desenvolvimento (`switch-env.ps1 development`)
- [ ] Testar aplicação em produção
- [ ] Verificar login OAuth
- [ ] Monitorar logs por 15 minutos

---

## Métricas e Quando Automatizar

### Métricas para Decisão

Migrar para deploy automatizado quando:

| Métrica | Threshold | Status Atual |
|---------|-----------|--------------|
| Deploys por semana | > 3 | 🚧 0 (não iniciado) |
| Tempo de deploy manual | > 30 min | 🚧 N/A |
| Erros de deploy manual | > 1 em 10 | 🚧 N/A |
| Cobertura de testes | > 60% | 🚧 ~0% |
| Ambientes ativos | > 2 | ✅ 2 (local + prod) |

**Recomendação**: Aguardar 1-2 meses de operação manual antes de automatizar.

---

## Referências

- `docs/ARCHITECTURE_DECISIONS.md` - ADR-002 (CI/CD) e ADR-004 (Deploy Strategy)
- `docs/CI_CD_SETUP.md` - Setup futuro de GitHub Actions
- `docs/PRODUCTION_DEPLOYMENT.md` - Guia completo de deploy manual
- `docs/QUICK_DEPLOY_GUIDE.md` - Guia rápido para deploy

---

**Última atualização**: 2025-01-10
**Versão**: 1.0
**Fase Atual**: Fase 1 - Deploy Manual
