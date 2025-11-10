# Guia de Setup CI/CD - CharHub

Guia prático para configurar e usar CI/CD com GitHub Actions no CharHub.

## Status Atual

✅ **Workflows Criados:**
- `.github/workflows/backend-ci.yml` - CI do backend
- `.github/workflows/frontend-ci.yml` - CI do frontend
- `.github/dependabot.yml` - Atualizações automáticas de dependências

🚧 **Próximos Passos:**
- Deploy automático para staging
- Deploy manual para produção

---

## Quick Start

### 1. Configurar Repositório GitHub

```bash
# Se ainda não tem repositório remoto
git remote add origin https://github.com/seu-usuario/charhub.git

# Fazer push dos workflows
git add .github/
git commit -m "ci: add GitHub Actions workflows"
git push -u origin main
```

### 2. Testar CI em Pull Request

```bash
# Criar branch de feature
git checkout -b feature/minha-feature

# Fazer alterações no backend
echo "// test" >> backend/src/index.ts

# Commit e push
git add .
git commit -m "feat: minha feature"
git push -u origin feature/minha-feature
```

Agora:
1. Abra um PR no GitHub
2. Os workflows `backend-ci` e `frontend-ci` rodarão automaticamente
3. Veja o status no PR

### 3. Visualizar Resultados

Acesse: `https://github.com/seu-usuario/charhub/actions`

Você verá:
- ✅ **Backend CI** - Lint, type check, tests, build
- ✅ **Frontend CI** - Lint, type check, tests, build
- Status em tempo real

---

## Workflows Disponíveis

### Backend CI

**Arquivo:** `.github/workflows/backend-ci.yml`

**Triggers:**
- Push em `main` ou `develop` com mudanças em `backend/**`
- Pull requests para `main` ou `develop` com mudanças em `backend/**`

**Jobs:**
1. **Lint & Type Check** (~2 min)
   - ESLint
   - TypeScript compilation

2. **Tests** (~3 min)
   - Sobe PostgreSQL e Redis em containers
   - Roda migrations
   - Executa testes (quando implementados)

3. **Build** (~2 min)
   - Build Docker image
   - Valida Dockerfile

4. **Security Scan** (~1 min)
   - npm audit
   - Detecta vulnerabilidades

**Duração total:** ~8 minutos

### Frontend CI

**Arquivo:** `.github/workflows/frontend-ci.yml`

**Triggers:**
- Push em `main` ou `develop` com mudanças em `frontend/**`
- Pull requests para `main` ou `develop` com mudanças em `frontend/**`

**Jobs:**
1. **Lint & Type Check** (~2 min)
   - ESLint
   - TypeScript compilation

2. **Tests** (~1 min)
   - Unit tests (Vitest - quando implementados)

3. **Build** (~3 min)
   - Vite build production
   - Verifica bundle size

4. **Docker Build** (~2 min)
   - Build Docker image (stage production)
   - Valida Dockerfile

**Duração total:** ~8 minutos

---

## Detecção Inteligente de Mudanças

Os workflows **só rodam quando necessário**:

```yaml
paths:
  - 'backend/**'              # Só roda se backend mudou
  - 'frontend/**'             # Só roda se frontend mudou
```

**Exemplos:**

| Mudança | Backend CI | Frontend CI |
|---------|-----------|-------------|
| `backend/src/index.ts` | ✅ Roda | ❌ Pula |
| `frontend/src/App.tsx` | ❌ Pula | ✅ Roda |
| `docs/README.md` | ❌ Pula | ❌ Pula |
| `backend/` + `frontend/` | ✅ Roda | ✅ Roda |

---

## Configurações Avançadas

### 1. Adicionar Testes

**Backend (`backend/package.json`):**
```json
{
  "scripts": {
    "test": "jest --coverage",
    "test:watch": "jest --watch"
  }
}
```

**Frontend (`frontend/package.json`):**
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

Os workflows já estão configurados para rodar `npm test`.

### 2. Adicionar Lint Script

Se ainda não tem:

```json
{
  "scripts": {
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix"
  }
}
```

### 3. Configurar Dependabot

Edite `.github/dependabot.yml`:

```yaml
updates:
  - package-ecosystem: 'npm'
    directory: '/backend'
    reviewers:
      - 'seu-usuario-github'  # ← MUDE ISSO!
```

Substitua `seu-usuario-github` pelo seu username no GitHub.

---

## Troubleshooting

### Problema 1: CI falha com "npm ci" error

**Causa:** `package-lock.json` desatualizado

**Solução:**
```bash
cd backend  # ou frontend
npm install
git add package-lock.json
git commit -m "chore: update package-lock"
git push
```

### Problema 2: Tests falham no CI mas passam localmente

**Causa:** Variáveis de ambiente diferentes

**Solução:**
- Verificar se o workflow define as env vars necessárias
- Adicionar no workflow:
  ```yaml
  env:
    DATABASE_URL: postgresql://test:test@localhost:5432/charhub_test
  ```

### Problema 3: Docker build falha

**Causa:** Dockerfile assume contexto local

**Solução:**
- Testar build localmente:
  ```bash
  docker build -t test ./backend
  ```
- Verificar se `.dockerignore` não está bloqueando arquivos essenciais

### Problema 4: Workflow não roda

**Causa:** Path pattern não bate com mudanças

**Solução:**
- Verificar se mudou arquivos dentro de `backend/**` ou `frontend/**`
- Ou modificar pattern no workflow:
  ```yaml
  paths:
    - 'backend/**'
    - 'shared/**'  # adicionar outros paths
  ```

---

## Integrações Úteis

### 1. Status Badges no README

Adicione ao `README.md`:

```markdown
# CharHub

![Backend CI](https://github.com/seu-usuario/charhub/workflows/Backend%20CI/badge.svg)
![Frontend CI](https://github.com/seu-usuario/charhub/workflows/Frontend%20CI/badge.svg)
```

### 2. Slack Notifications (Opcional)

Adicione ao final de cada workflow:

```yaml
- name: Notify Slack
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      {
        "text": "❌ CI failed on ${{ github.repository }}"
      }
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

### 3. Discord Notifications (Opcional)

```yaml
- name: Notify Discord
  if: failure()
  uses: sarisia/actions-status-discord@v1
  with:
    webhook: ${{ secrets.DISCORD_WEBHOOK }}
    status: ${{ job.status }}
```

---

## Custos e Limites

### GitHub Actions Free Tier

**Repositório Público:**
- ✅ **Minutos ilimitados** (Linux runners)
- ✅ 500 MB storage

**Repositório Privado:**
- ✅ **2000 minutos/mês** grátis
- ✅ 500 MB storage

### Estimativa de Uso do CharHub

| Atividade | Minutos/Mês |
|-----------|-------------|
| 30 PRs × 16 min (backend + frontend) | 480 min |
| 60 commits diretos em main × 16 min | 960 min |
| **Total** | **~1440 min** |

**Resultado:** ✅ Dentro do free tier (2000 min)

### Otimizações para Economizar Minutos

1. **Cache de dependencies:**
   ```yaml
   - uses: actions/setup-node@v4
     with:
       cache: 'npm'  # ← Economiza ~1 min por run
   ```

2. **Path filters:**
   ```yaml
   paths:
     - 'backend/**'  # ← Só roda quando necessário
   ```

3. **Docker layer caching:**
   ```yaml
   - uses: docker/build-push-action@v5
     with:
       cache-from: type=gha  # ← Economiza ~2 min
   ```

**Com otimizações:** ~60% mais rápido = ~576 min/mês economizados

---

## Próximos Passos

### Fase 1: Adicionar Testes (Esta Semana)

1. **Backend:**
   ```bash
   cd backend
   npm install --save-dev jest @types/jest ts-jest
   npx ts-jest config:init
   ```

2. **Frontend:**
   ```bash
   cd frontend
   npm install --save-dev vitest @testing-library/react
   ```

3. Criar testes básicos e rodar no CI

### Fase 2: Deploy Staging Automático (Próxima Semana)

1. Criar VM staging no Google Cloud
2. Configurar secrets no GitHub
3. Criar workflow `deploy-staging.yml`
4. Testar deploy automático

### Fase 3: Deploy Production Manual

1. Implementar workflow com approval
2. Adicionar health checks
3. Implementar rollback automático

---

## Comandos Úteis

### Testar Workflows Localmente

Instale [act](https://github.com/nektos/act):

```bash
# Windows (Chocolatey)
choco install act-cli

# Mac
brew install act

# Linux
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash
```

Testar workflows:

```bash
# Simular push event
act push

# Simular pull_request event
act pull_request

# Testar workflow específico
act -W .github/workflows/backend-ci.yml
```

### Ver Logs de Run Anterior

```bash
# Listar runs recentes
gh run list

# Ver logs de um run específico
gh run view RUN_ID --log

# Re-rodar um workflow falhado
gh run rerun RUN_ID
```

### Cancelar Run em Progresso

```bash
# Via UI: GitHub Actions → Click no run → "Cancel workflow"

# Via CLI:
gh run cancel RUN_ID
```

---

## Checklist de Setup

- [ ] Push dos workflows para o repositório
- [ ] Configurar `dependabot.yml` com seu username
- [ ] Adicionar status badges no README
- [ ] Testar CI em um PR de teste
- [ ] Verificar se todos os jobs passam
- [ ] Adicionar scripts de test nos package.json
- [ ] Configurar notificações (opcional)
- [ ] Documentar processo no README

---

## Referências

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow Syntax](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions)
- [Dependabot Configuration](https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file)
- [Act - Run GitHub Actions Locally](https://github.com/nektos/act)

---

**Última atualização**: 2025-01-09
**Versão**: 1.0
**Autor**: Time CharHub
