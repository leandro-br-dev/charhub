# Decisões de Arquitetura - CharHub

Análise completa sobre estruturação de repositórios, decisões arquiteturais e estratégias de CI/CD para o CharHub.

**Nota**: Partes sobre CI/CD automatizado são **implementações futuras**. Para o processo de deploy atual, consulte [`docs/deploy/CURRENT_DEPLOYMENT.md`](./deploy/CURRENT_DEPLOYMENT.md).

## Índice

1. [Análise: Monorepo vs Multi-Repo](#análise-monorepo-vs-multi-repo)
2. [Estratégia Recomendada](#estratégia-recomendada)
3. [Estrutura de Repositório](#estrutura-de-repositório)
4. [CI/CD com GitHub Actions](#cicd-com-github-actions)
5. [Deploy Automático](#deploy-automático)
6. [Custos e Limites](#custos-e-limites)
7. [Roadmap de Implementação](#roadmap-de-implementação)

---

## Análise: Monorepo vs Multi-Repo

### Situação Atual

```
charhub/ (Monorepo)
├── backend/          # Express API
├── frontend/         # React SPA
├── nginx/            # Configuração proxy
├── cloudflared/      # Configuração tunnel
├── docs/             # Documentação
└── docker-compose.yml
```

### Opção 1: Monorepo (Atual) ✅ **RECOMENDADO**

**Estrutura:**
```
charhub/
├── backend/
├── frontend/
├── nginx/
├── cloudflared/
├── .github/workflows/
│   ├── backend-ci.yml
│   ├── frontend-ci.yml
│   └── deploy-production.yml
└── docs/
```

#### Vantagens

✅ **Desenvolvimento mais fácil**
- Alterações cross-service em um único PR
- Refactoring que afeta backend+frontend é atômico
- Sincronização de versões garantida
- Commits refletem mudanças completas de features

✅ **CI/CD simplificado**
- Workflows centralizados
- Secrets compartilhados (DB_URL, API_KEYS)
- Deploy coordenado de versões compatíveis
- Rollback atômico de toda a stack

✅ **Documentação coesa**
- README central com visão geral
- Docs na mesma estrutura
- Changelog unificado

✅ **Melhor para times pequenos/solo**
- Você está trabalhando sozinho
- Menor overhead de gerenciamento
- Setup único para desenvolvedores

✅ **Compatibilidade de versões**
- Backend v1.2 sempre compatível com Frontend v1.2
- Sem risco de versão mismatch em produção

#### Desvantagens

⚠️ **CI mais demorado**
- Precisa rodar testes de backend E frontend mesmo se mexeu só em um
- Solução: Usar conditional workflows (detectar mudanças)

⚠️ **Build único grande**
- Docker build pode demorar mais
- Solução: Build paralelo, cache agressivo

⚠️ **Permissões granulares**
- Difícil dar acesso apenas a frontend/backend
- Solução: Não é problema para projeto solo

### Opção 2: Multi-Repo (Separado)

**Estrutura:**
```
charhub-backend/          # Repositório 1
├── src/
├── Dockerfile
└── .github/workflows/

charhub-frontend/         # Repositório 2
├── src/
├── Dockerfile
└── .github/workflows/

charhub-infra/            # Repositório 3
├── nginx/
├── cloudflared/
├── docker-compose.yml
└── docs/
```

#### Vantagens

✅ **CI independente**
- Deploy backend sem afetar frontend
- Build mais rápido de cada parte

✅ **Permissões granulares**
- Dev frontend não vê backend
- Útil para times grandes

✅ **Escalabilidade organizacional**
- Times separados para cada repo
- Ownership claro

#### Desvantagens

❌ **Sincronização complexa**
- Versões de API vs Frontend podem desalinhar
- Precisa sistema de versionamento semântico rigoroso
- Deploy coordenado requer orchestração

❌ **Refactoring cross-service difícil**
- Mudanças em API + Frontend = 2 PRs separados
- Dificulta code review completo
- Risco de deploy parcial quebrar produção

❌ **Duplicação**
- GitHub Actions config duplicado
- Secrets duplicados (mais pontos de falha)
- Documentação fragmentada

❌ **Overhead para dev solo**
- Você precisaria gerenciar 3 repositórios
- 3x mais setup, 3x mais contexto switching

---

## Estratégia Recomendada

### Para o CharHub: **MONOREPO** ✅

**Justificativa:**

1. **Você está sozinho**: Overhead de multi-repo não vale a pena
2. **Projeto full-stack integrado**: Backend e frontend são fortemente acoplados
3. **Compatibilidade crítica**: API e frontend precisam estar sincronizados
4. **Deploys coordenados**: Sempre deploya tudo junto em produção
5. **Refactorings frequentes**: Mudanças cruzadas são comuns

### Quando migrar para Multi-Repo?

Considere separar **apenas se**:

- Time crescer para > 5 pessoas
- Backend e frontend tiverem release cycles diferentes
- Múltiplos clientes consumindo o backend (mobile app, CLI, etc.)
- Necessidade de permissões granulares

**Estimativa**: Não antes de 2026 (6-12 meses)

---

## Estrutura de Repositório

### Estrutura Recomendada (Monorepo Otimizado)

```
charhub/
├── .github/
│   ├── workflows/
│   │   ├── backend-ci.yml              # CI do backend (tests, lint)
│   │   ├── frontend-ci.yml             # CI do frontend (tests, lint, build)
│   │   ├── deploy-staging.yml          # Deploy automático para staging
│   │   └── deploy-production.yml       # Deploy manual para produção
│   └── dependabot.yml                  # Atualizações automáticas
│
├── backend/
│   ├── src/
│   ├── tests/                          # Testes unitários e integração
│   ├── prisma/
│   ├── Dockerfile
│   ├── package.json
│   └── .dockerignore
│
├── frontend/
│   ├── src/
│   ├── tests/                          # Testes E2E com Playwright
│   ├── Dockerfile
│   ├── package.json
│   └── .dockerignore
│
├── nginx/
│   └── conf.d/
│
├── cloudflared/
│   └── config/
│       ├── dev/
│       ├── staging/                    # NOVO: ambiente staging
│       └── prod/
│
├── scripts/                            # NOVO: Scripts de deploy
│   ├── deploy-staging.sh
│   ├── deploy-production.sh
│   └── health-check.sh
│
├── docs/
│   ├── PRODUCTION_DEPLOYMENT.md
│   ├── QUICK_DEPLOY_GUIDE.md
│   ├── REPOSITORY_STRATEGY.md         # Este arquivo
│   └── CI_CD_SETUP.md                 # NOVO
│
├── docker-compose.yml                  # Desenvolvimento local
├── docker-compose.staging.yml          # NOVO: Staging
├── docker-compose.prod.yml             # NOVO: Produção
├── .env.example
├── .gitignore
└── README.md
```

### Manter Desenvolvimento Coeso

**Sim, você pode continuar com tudo junto!** Não há necessidade de separar durante desenvolvimento.

**Benefícios:**
- Clone único: `git clone https://github.com/seu-user/charhub.git`
- Workspace único no VS Code
- Hot reload funciona normalmente
- Commit atômico de features completas

**Estrutura de branches:**
```
main                    # Produção estável
├── develop             # Branch de desenvolvimento principal
├── staging             # Branch de staging (optional)
└── feature/*           # Features individuais
```

---

## CI/CD com GitHub Actions

### Visão Geral dos Workflows

```
┌─────────────────────────────────────────────────────────────┐
│                    GITHUB REPOSITORY                        │
│                                                             │
│  Push/PR → main                                             │
│       │                                                     │
│       ├─→ Backend CI (tests, lint)    ──┐                   │
│       ├─→ Frontend CI (tests, build)  ──┤                   │
│       │                                 │                   │
│       └─→ [Both Pass] ──→ Deploy Staging (auto)             │
│                                ↓                            │
│                    Staging Environment                      │
│                    (dev.charhub.app)                        │
│                                                             │
│  Manual Trigger → Deploy Production                         │
│                         ↓                                   │
│                Production Environment                       │
│                  (charhub.app)                              │
└─────────────────────────────────────────────────────────────┘
```

### Workflow 1: Backend CI

**Arquivo:** `.github/workflows/backend-ci.yml`

**Triggers:**
- Push em `backend/**`
- Pull requests modificando `backend/**`

**Jobs:**
1. **Lint** - ESLint + Prettier
2. **Type Check** - TypeScript compilation
3. **Unit Tests** - Jest/Vitest
4. **Build** - Docker build test
5. **Security Scan** - npm audit, Snyk (opcional)

**Duração estimada:** 3-5 minutos

### Workflow 2: Frontend CI

**Arquivo:** `.github/workflows/frontend-ci.yml`

**Triggers:**
- Push em `frontend/**`
- Pull requests modificando `frontend/**`

**Jobs:**
1. **Lint** - ESLint + Prettier
2. **Type Check** - TypeScript compilation
3. **Build** - Vite build
4. **Unit Tests** - Vitest
5. **E2E Tests** - Playwright (em staging)

**Duração estimada:** 5-7 minutos

### Workflow 3: Deploy Staging (Automático)

**Arquivo:** `.github/workflows/deploy-staging.yml`

**Triggers:**
- Push em branch `main` (após CI passar)
- Manual trigger (workflow_dispatch)

**Jobs:**
1. Build imagens Docker (backend + frontend)
2. Push para Google Container Registry (GCR)
3. SSH na VM staging
4. Pull imagens e restart containers
5. Health check
6. Notificar no Slack/Discord (opcional)

**Duração estimada:** 8-10 minutos

### Workflow 4: Deploy Production (Manual)

**Arquivo:** `.github/workflows/deploy-production.yml`

**Triggers:**
- **Manual apenas** (workflow_dispatch com aprovação)

**Jobs:**
1. Confirmação manual (approval)
2. Build imagens Docker com tag de versão
3. Push para GCR
4. Backup automático do banco (Cloud SQL)
5. Deploy em produção
6. Health check
7. Rollback automático se falhar

**Duração estimada:** 10-15 minutos

---

## Deploy Automático

### Estratégia de Deploy

#### Ambientes

| Ambiente | Branch | Deploy | URL | Propósito |
|----------|--------|--------|-----|-----------|
| **Development** | `*` | Manual local | `http://localhost` | Desenvolvimento ativo |
| **Staging** | `main` | **Automático** | `https://dev.charhub.app` | Testes e validação |
| **Production** | `main` (tag) | **Manual aprovado** | `https://charhub.app` | Usuários finais |

#### Fluxo de Deploy Automático

```
1. Developer faz commit em feature branch
   ↓
2. Abre PR para main
   ↓
3. CI roda automaticamente (backend-ci + frontend-ci)
   ↓
4. Code review + Aprovação
   ↓
5. Merge para main
   ↓
6. 🤖 DEPLOY AUTOMÁTICO PARA STAGING
   ↓
7. Testes manuais em dev.charhub.app
   ↓
8. Se tudo OK → DEPLOY MANUAL PARA PRODUÇÃO
   (com aprovação manual no GitHub)
```

### Implementação do Deploy Automático

#### 1. Setup da VM de Staging

```bash
# Criar VM de staging (menor que produção)
gcloud compute instances create charhub-staging \
  --zone=us-central1-a \
  --machine-type=e2-micro \
  --image-family=cos-stable \
  --image-project=cos-cloud \
  --boot-disk-size=20GB \
  --tags=staging-server

# Configurar Cloudflare Tunnel staging
# Tunnel apontando para: dev.charhub.app → staging VM
```

#### 2. Configurar GitHub Secrets

No repositório GitHub, adicionar secrets:

```
Settings → Secrets and variables → Actions

Required Secrets:
├── GCP_PROJECT_ID               # ID do projeto Google Cloud
├── GCP_SA_KEY                   # Service Account JSON (deploy)
├── STAGING_VM_IP                # IP da VM staging
├── STAGING_SSH_KEY              # Chave SSH para acessar VM staging
├── PROD_VM_IP                   # IP da VM produção
├── PROD_SSH_KEY                 # Chave SSH para acessar VM produção
├── DOCKER_REGISTRY              # gcr.io/charhub-prod
├── DATABASE_URL_STAGING         # Connection string staging DB
├── DATABASE_URL_PROD            # Connection string prod DB
└── ... (todas as env vars sensíveis)
```

#### 3. Workflow de Deploy Staging (Automático)

**`.github/workflows/deploy-staging.yml`:**

```yaml
name: Deploy to Staging

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: staging

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v2
        with:
          service_account_key: ${{ secrets.GCP_SA_KEY }}
          project_id: ${{ secrets.GCP_PROJECT_ID }}

      - name: Configure Docker for GCR
        run: gcloud auth configure-docker

      - name: Build and Push Backend
        run: |
          docker build -t gcr.io/${{ secrets.GCP_PROJECT_ID }}/charhub-backend:staging ./backend
          docker push gcr.io/${{ secrets.GCP_PROJECT_ID }}/charhub-backend:staging

      - name: Build and Push Frontend
        run: |
          docker build -t gcr.io/${{ secrets.GCP_PROJECT_ID }}/charhub-frontend:staging ./frontend
          docker push gcr.io/${{ secrets.GCP_PROJECT_ID }}/charhub-frontend:staging

      - name: Deploy to Staging VM
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.STAGING_VM_IP }}
          username: deploy
          key: ${{ secrets.STAGING_SSH_KEY }}
          script: |
            cd /opt/charhub
            gcloud auth configure-docker --quiet
            docker compose -f docker-compose.staging.yml pull
            docker compose -f docker-compose.staging.yml up -d
            docker compose -f docker-compose.staging.yml exec -T backend npx prisma migrate deploy

      - name: Health Check
        run: |
          sleep 10
          curl --fail https://dev.charhub.app/api/v1/health || exit 1

      - name: Notify Success
        run: echo "✅ Staging deploy successful!"
```

**Duração:** 8-10 minutos
**Custo:** $0 (GitHub Actions Free Tier: 2000 min/mês)

#### 4. Workflow de Deploy Production (Manual)

**`.github/workflows/deploy-production.yml`:**

```yaml
name: Deploy to Production

on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Version tag (e.g., v1.0.0)'
        required: true
        type: string

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://charhub.app

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Create backup
        run: |
          gcloud sql backups create --instance=charhub-postgres

      - name: Build and Push
        run: |
          VERSION=${{ github.event.inputs.version }}
          docker build -t gcr.io/${{ secrets.GCP_PROJECT_ID }}/charhub-backend:${VERSION} ./backend
          docker build -t gcr.io/${{ secrets.GCP_PROJECT_ID }}/charhub-frontend:${VERSION} ./frontend
          docker push gcr.io/${{ secrets.GCP_PROJECT_ID }}/charhub-backend:${VERSION}
          docker push gcr.io/${{ secrets.GCP_PROJECT_ID }}/charhub-frontend:${VERSION}

      - name: Deploy to Production
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.PROD_VM_IP }}
          username: deploy
          key: ${{ secrets.PROD_SSH_KEY }}
          script: |
            cd /opt/charhub
            export VERSION=${{ github.event.inputs.version }}
            docker compose -f docker-compose.prod.yml pull
            docker compose -f docker-compose.prod.yml up -d
            docker compose -f docker-compose.prod.yml exec -T backend npx prisma migrate deploy

      - name: Health Check & Rollback
        run: |
          sleep 10
          if ! curl --fail https://charhub.app/api/v1/health; then
            echo "❌ Health check failed, rolling back"
            # SSH e fazer rollback para versão anterior
            exit 1
          fi

      - name: Tag Release
        run: |
          git tag ${{ github.event.inputs.version }}
          git push origin ${{ github.event.inputs.version }}
```

---

## Custos e Limites

### GitHub Actions - Free Tier

**Para repositórios públicos:**
- ✅ **Minutos ilimitados** em runners Linux
- ✅ **Armazenamento**: 500 MB

**Para repositórios privados:**
- ✅ **2000 minutos/mês** grátis
- ✅ **500 MB** de armazenamento

**Estimativa de uso mensal (CharHub):**

| Workflow | Frequência | Minutos/Run | Total/Mês |
|----------|------------|-------------|-----------|
| Backend CI | 30 PRs | 5 min | 150 min |
| Frontend CI | 30 PRs | 7 min | 210 min |
| Deploy Staging | 60 commits | 10 min | 600 min |
| Deploy Production | 4 releases | 15 min | 60 min |
| **Total** | | | **~1020 min** |

**Resultado:** ✅ Bem dentro do free tier (2000 min)

### Custos Adicionais

| Item | Custo |
|------|-------|
| GitHub Actions | $0 (free tier) |
| Container Registry (GCR) | $0.02/GB/mês (~$1) |
| VM Staging (e2-micro) | $0 (free tier) |
| Network Egress | $0.12/GB (~$2-5) |
| **Total CI/CD** | **~$3-6/mês** |

---

## Roadmap de Implementação

### Fase 1: Setup Básico (Semana 1) ✅ Pode começar agora

#### Dia 1-2: Estruturar Repositório

- [ ] Criar pasta `.github/workflows/`
- [ ] Adicionar `dependabot.yml`
- [ ] Criar `docker-compose.staging.yml`
- [ ] Criar `docker-compose.prod.yml`
- [ ] Adicionar scripts de deploy em `scripts/`

#### Dia 3-4: CI Workflows

- [ ] Implementar `backend-ci.yml`
- [ ] Implementar `frontend-ci.yml`
- [ ] Testar workflows em PRs

#### Dia 5-7: Deploy Manual

- [ ] Configurar VM staging no GCP
- [ ] Configurar secrets no GitHub
- [ ] Criar workflow `deploy-staging.yml` (trigger manual)
- [ ] Testar deploy manual para staging

### Fase 2: Automação (Semana 2)

#### Dia 1-3: Deploy Automático Staging

- [ ] Alterar trigger de manual para automático (push to main)
- [ ] Implementar health checks
- [ ] Configurar notificações (Slack/Discord)
- [ ] Testar fluxo completo: PR → Merge → Auto-deploy

#### Dia 4-7: Deploy Production

- [ ] Implementar `deploy-production.yml`
- [ ] Configurar approvals
- [ ] Implementar rollback automático
- [ ] Criar documentação de runbook

### Fase 3: Observabilidade (Semana 3-4)

- [ ] Integrar Google Cloud Monitoring
- [ ] Configurar alertas de falha de deploy
- [ ] Implementar testes E2E com Playwright
- [ ] Configurar métricas de performance

---

## Recomendação Final

### Para o CharHub (Situação Atual)

✅ **MANTER MONOREPO**

**Razões:**
1. Você está sozinho - não há ganho em separar
2. Backend e frontend são fortemente acoplados
3. CI/CD mais simples de configurar e manter
4. Refactorings cross-service são frequentes
5. Deploy coordenado é critical

### Implementar CI/CD Gradualmente

**Prioridade 1 (Esta semana):**
- Setup básico de workflows CI (backend + frontend)
- Deploy manual para staging

**Prioridade 2 (Próxima semana):**
- Deploy automático para staging
- Health checks

**Prioridade 3 (Depois):**
- Deploy production com approval
- Testes E2E automatizados
- Monitoramento avançado

### Não fazer agora

❌ Separar em multi-repo
❌ Kubernetes/GKE (over-engineering)
❌ Complex orchestration (não precisa)

---

## Próximos Passos Imediatos

1. **Criar branch `develop`**
   ```bash
   git checkout -b develop
   git push -u origin develop
   ```

2. **Criar `.github/workflows/` folder**
   ```bash
   mkdir -p .github/workflows
   ```

3. **Implementar primeiro workflow (backend-ci.yml)**
   - Começar simples: apenas lint + type check
   - Expandir depois com tests

4. **Testar localmente com `act`** (opcional)
   ```bash
   # Instalar act: https://github.com/nektos/act
   brew install act  # Mac
   choco install act # Windows

   # Testar workflow localmente
   act pull_request -W .github/workflows/backend-ci.yml
   ```

5. **Documentar processo**
   - Criar `docs/CI_CD_SETUP.md` com guia de uso
   - Atualizar README com badges de CI

---

## Referências

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Monorepo Best Practices](https://monorepo.tools/)
- [Google Cloud Build vs GitHub Actions](https://cloud.google.com/build/docs/deploying-builds/deploy-github)
- [Docker Multi-Stage Builds](https://docs.docker.com/build/building/multi-stage/)

---

**Última atualização**: 2025-01-09
**Versão**: 1.0
**Autor**: Time CharHub
