# CI/CD com GitHub Actions

> **Status**: Planejamento
> **Prioridade**: Alta
> **Complexidade**: Media
> **Ultima atualizacao**: 2025-11-23

## Resumo

Implementar CI/CD automatizado com GitHub Actions para:
- Rodar testes automaticamente em cada PR
- Deploy automatico para staging
- Deploy manual com aprovacao para producao

## Beneficios

- Previne bugs de chegar em producao
- Valida code quality automaticamente
- Documentacao viva via testes
- Deploys mais rapidos e confiaveis

## Pre-requisitos

Antes de implementar CI/CD:
- [ ] Implementar testes unitarios no backend
- [ ] Implementar testes unitarios no frontend
- [ ] Configurar banco de dados de teste
- [ ] Implementar integration tests

---

## Fase 1: CI Basico

### Workflow Backend CI

Arquivo: `.github/workflows/backend-ci.yml`

```yaml
name: Backend CI

on:
  pull_request:
    branches: [main, develop]
    paths:
      - 'backend/**'
  push:
    branches: [main, develop]
    paths:
      - 'backend/**'

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Install dependencies
        working-directory: backend
        run: npm ci

      - name: Run linter
        working-directory: backend
        run: npm run lint

      - name: Run type check
        working-directory: backend
        run: npm run typecheck

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: charhub_test
        ports:
          - 5432:5432
      redis:
        image: redis:7
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Install dependencies
        working-directory: backend
        run: npm ci

      - name: Run migrations
        working-directory: backend
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/charhub_test

      - name: Run tests
        working-directory: backend
        run: npm test
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/charhub_test
          REDIS_URL: redis://localhost:6379

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build Docker image
        run: docker build -t charhub-backend ./backend

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run npm audit
        working-directory: backend
        run: npm audit --audit-level=high
```

### Workflow Frontend CI

Arquivo: `.github/workflows/frontend-ci.yml`

```yaml
name: Frontend CI

on:
  pull_request:
    branches: [main, develop]
    paths:
      - 'frontend/**'
  push:
    branches: [main, develop]
    paths:
      - 'frontend/**'

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        working-directory: frontend
        run: npm ci

      - name: Run linter
        working-directory: frontend
        run: npm run lint

      - name: Run type check
        working-directory: frontend
        run: npm run typecheck

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        working-directory: frontend
        run: npm ci

      - name: Run tests
        working-directory: frontend
        run: npm test

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        working-directory: frontend
        run: npm ci

      - name: Build
        working-directory: frontend
        run: npm run build
        env:
          VITE_API_URL: https://charhub.app/api

      - name: Check bundle size
        working-directory: frontend
        run: |
          SIZE=$(du -sb dist | cut -f1)
          if [ $SIZE -gt 10485760 ]; then
            echo "Bundle too large: $SIZE bytes (max 10MB)"
            exit 1
          fi
```

### Tarefas Fase 1

- [ ] Criar `.github/workflows/backend-ci.yml`
- [ ] Criar `.github/workflows/frontend-ci.yml`
- [ ] Adicionar scripts `lint` e `typecheck` em package.json
- [ ] Configurar ESLint em ambos projetos
- [ ] Testar workflows em PR de teste

---

## Fase 2: Deploy Staging Automatico

### Infraestrutura Necessaria

```bash
# Criar VM staging
gcloud compute instances create charhub-vm-staging \
  --zone=us-central1-a \
  --machine-type=e2-micro \
  --image-family=cos-stable \
  --image-project=cos-cloud

# Criar Cloud SQL staging (opcional - pode usar mesma instancia)
# URL: https://staging.charhub.app
```

### Workflow Deploy Staging

Arquivo: `.github/workflows/deploy-staging.yml`

```yaml
name: Deploy Staging

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: https://staging.charhub.app

    steps:
      - uses: actions/checkout@v4

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Setup gcloud
        uses: google-github-actions/setup-gcloud@v2

      - name: Deploy to Staging
        run: |
          gcloud compute ssh charhub-vm-staging --zone=us-central1-a --command="
            cd /mnt/stateful_partition/charhub &&
            git pull origin main &&
            docker compose build &&
            docker compose up -d
          "

      - name: Run smoke tests
        run: |
          sleep 30
          curl -f https://staging.charhub.app/api/v1/health || exit 1

      - name: Notify on failure
        if: failure()
        run: echo "Deploy staging failed!"
```

### Tarefas Fase 2

- [ ] Criar VM staging no GCP
- [ ] Configurar Cloudflare tunnel para staging.charhub.app
- [ ] Criar service account com permissoes SSH
- [ ] Adicionar `GCP_SA_KEY` nos secrets do GitHub
- [ ] Criar workflow `deploy-staging.yml`
- [ ] Testar deploy automatico

---

## Fase 3: Deploy Production com Aprovacao

### Workflow Deploy Production

Arquivo: `.github/workflows/deploy-production.yml`

```yaml
name: Deploy Production

on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Git ref to deploy (tag, branch, or commit)'
        required: true
        default: 'main'

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://charhub.app

    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.inputs.version }}

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY_PROD }}

      - name: Setup gcloud
        uses: google-github-actions/setup-gcloud@v2

      - name: Create backup
        run: |
          gcloud compute ssh charhub-vm --zone=us-central1-a --command="
            cd /mnt/stateful_partition/charhub &&
            mkdir -p backups &&
            cp .env backups/.env.$(date +%Y%m%d_%H%M%S)
          "

      - name: Deploy to Production
        run: |
          gcloud compute ssh charhub-vm --zone=us-central1-a --command="
            cd /mnt/stateful_partition/charhub &&
            git fetch origin &&
            git checkout ${{ github.event.inputs.version }} &&
            docker compose build &&
            docker compose up -d &&
            docker compose exec -T backend npx prisma migrate deploy
          "

      - name: Health check
        run: |
          sleep 60
          curl -f https://charhub.app/api/v1/health || exit 1

      - name: Rollback on failure
        if: failure()
        run: |
          gcloud compute ssh charhub-vm --zone=us-central1-a --command="
            cd /mnt/stateful_partition/charhub &&
            git checkout HEAD~1 &&
            docker compose build &&
            docker compose up -d
          "
```

### Configuracao GitHub

1. Settings → Environments → Production
2. Required reviewers: adicionar aprovadores
3. Deployment protection rules: exigir aprovacao

### Tarefas Fase 3

- [ ] Criar workflow `deploy-production.yml`
- [ ] Configurar environment "production" no GitHub
- [ ] Adicionar required reviewers
- [ ] Criar service account separada para producao
- [ ] Testar fluxo de aprovacao

---

## Fase 4: Dependabot e Notificacoes

### Dependabot

Arquivo: `.github/dependabot.yml`

```yaml
version: 2
updates:
  - package-ecosystem: 'npm'
    directory: '/backend'
    schedule:
      interval: 'weekly'
    reviewers:
      - 'seu-usuario-github'
    labels:
      - 'dependencies'
      - 'backend'

  - package-ecosystem: 'npm'
    directory: '/frontend'
    schedule:
      interval: 'weekly'
    reviewers:
      - 'seu-usuario-github'
    labels:
      - 'dependencies'
      - 'frontend'
```

### Notificacoes Slack/Discord

```yaml
# Adicionar ao final de cada workflow
- name: Notify Slack
  if: always()
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      {
        "text": "${{ job.status == 'success' && '✅' || '❌' }} ${{ github.workflow }} - ${{ job.status }}"
      }
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

### Tarefas Fase 4

- [ ] Criar `.github/dependabot.yml`
- [ ] Configurar webhook Slack/Discord
- [ ] Adicionar notificacoes aos workflows
- [ ] Adicionar badges no README

---

## Estimativas

| Fase | Esforco | Pre-requisitos |
|------|---------|----------------|
| Fase 1: CI Basico | 40-60h | Testes implementados |
| Fase 2: Deploy Staging | 30-40h | VM staging criada |
| Fase 3: Deploy Production | 20-30h | Fase 2 completa |
| Fase 4: Extras | 15-20h | Fases anteriores |
| **Total** | **105-150h** | |

## Custos

- **GitHub Actions Free Tier**: 2000 min/mes (repos privados)
- **VM Staging (e2-micro)**: ~$8/mes
- **Estimativa de uso**: ~1440 min/mes (dentro do free tier)

---

## Referencias

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [google-github-actions/auth](https://github.com/google-github-actions/auth)
- [Dependabot Configuration](https://docs.github.com/en/code-security/dependabot)

---

**Origem**: Extraido de `docs/FUTURE_CI_CD_GUIDE.md`
