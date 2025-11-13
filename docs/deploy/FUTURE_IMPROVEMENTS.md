# CharHub - Melhorias Futuras de Deploy

**Última atualização**: 2025-11-13
**Status**: 📋 Planejamento

Este documento descreve melhorias planejadas para o processo de deploy do CharHub, organizadas por fases e prioridades.

---

## Índice

1. [Visão Geral](#visão-geral)
2. [Fase 1: Otimização do Deploy Atual](#fase-1-otimização-do-deploy-atual)
3. [Fase 2: CI/CD com GitHub Actions](#fase-2-cicd-com-github-actions)
4. [Fase 3: Infraestrutura Escalável](#fase-3-infraestrutura-escalável)
5. [Fase 4: Observabilidade Avançada](#fase-4-observabilidade-avançada)

---

## Visão Geral

### Roadmap de Deploy

```
┌──────────────────────────────────────────────────────┐
│ FASE 1 (1-2 meses): Otimização do Deploy Atual      │
│ ✅ Deploy automatizado com script                    │
│ 🔲 Deploy incremental (rsync)                        │
│ 🔲 Rollback automático                               │
│ 🔲 Health checks mais robustos                       │
└──────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────┐
│ FASE 2 (2-3 meses): CI/CD com GitHub Actions        │
│ 🔲 Testes automatizados (CI)                         │
│ 🔲 Deploy staging automático                         │
│ 🔲 Deploy production com aprovação                   │
│ 🔲 Notificações Slack/Discord                        │
└──────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────┐
│ FASE 3 (4-6 meses): Infraestrutura Escalável        │
│ 🔲 Kubernetes (GKE)                                  │
│ 🔲 Auto-scaling horizontal                           │
│ 🔲 Redis gerenciado (Memorystore)                    │
│ 🔲 CDN para assets estáticos                         │
└──────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────┐
│ FASE 4 (6+ meses): Observabilidade Avançada         │
│ 🔲 APM (Application Performance Monitoring)          │
│ 🔲 Distributed tracing                               │
│ 🔲 Alertas inteligentes                              │
│ 🔲 Dashboards customizados                           │
└──────────────────────────────────────────────────────┘
```

**Legenda:**
- ✅ Implementado
- 🔲 Planejado

---

## Fase 1: Otimização do Deploy Atual

**Duração estimada**: 1-2 meses
**Prioridade**: Alta
**Esforço**: Baixo-Médio

### 1.1. Deploy Incremental com Rsync

**Problema atual**: Script faz upload completo (~50 MB) a cada deploy, levando 3-5 minutos.

**Solução proposta**:

```powershell
# scripts/deploy-incremental.ps1
rsync -avz --delete `
  --exclude 'node_modules' `
  --exclude '.git' `
  --exclude 'backend/dist' `
  --exclude 'frontend/dist' `
  -e "ssh -o StrictHostKeyChecking=no" `
  E:\Projects\charhub/ `
  charhub-vm:/mnt/stateful_partition/charhub/
```

**Benefícios**:
- Reduz tempo de upload de ~5 min para ~30 seg
- Apenas arquivos modificados são transferidos
- Mantém histórico de versões anteriores

**Estimativa de esforço**: 2-4 horas

### 1.2. Rollback Automático

**Problema atual**: Rollback manual requer SSH e comandos complexos.

**Solução proposta**:

```powershell
# scripts/rollback-production.ps1
param(
    [int]$StepsBack = 1  # Quantos deploys voltar
)

# Listar backups disponíveis
$backups = gcloud compute ssh charhub-vm --command="ls -1 /home/charhub.backup.*"

# Selecionar backup
# Parar containers
# Restaurar código
# Iniciar containers
# Verificar health
```

**Benefícios**:
- Rollback em <2 minutos
- Reduz downtime em caso de problemas
- Menos suscetível a erro humano

**Estimativa de esforço**: 4-6 horas

### 1.3. Health Checks Avançados

**Problema atual**: Health check apenas verifica se API responde 200.

**Solução proposta**:

```typescript
// backend/src/routes/health.ts
router.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      r2: await checkR2Storage(),
      llm: await checkLLMProviders(),
    }
  };

  const isHealthy = Object.values(health.checks).every(c => c.status === 'ok');
  res.status(isHealthy ? 200 : 503).json(health);
});
```

**Benefícios**:
- Detecta problemas antes de afetar usuários
- Permite monitoramento granular
- Facilita diagnóstico de problemas

**Estimativa de esforço**: 6-8 horas

### 1.4. Smoke Tests Pós-Deploy

**Problema atual**: Nenhuma validação automática após deploy.

**Solução proposta**:

```powershell
# scripts/smoke-tests.ps1

# 1. Verificar se API está respondendo
curl https://charhub.app/api/v1/health

# 2. Testar OAuth (mock)
# 3. Testar upload de imagem (mock)
# 4. Verificar se frontend carrega
# 5. Verificar logs por erros

# Se algum teste falhar → rollback automático
```

**Benefícios**:
- Detecta problemas imediatamente após deploy
- Previne deploys quebrados em produção
- Aumenta confiança no processo

**Estimativa de esforço**: 8-12 horas

---

## Fase 2: CI/CD com GitHub Actions

**Duração estimada**: 2-3 meses
**Prioridade**: Alta
**Esforço**: Médio-Alto

### 2.1. Configurar GitHub Actions para CI

**Objetivo**: Rodar testes automaticamente em cada PR.

**Workflow proposto**:

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        working-directory: backend
        run: npm ci

      - name: Run linter
        working-directory: backend
        run: npm run lint

      - name: Run type check
        working-directory: backend
        run: npm run typecheck

      - name: Run unit tests
        working-directory: backend
        run: npm run test

      - name: Run integration tests
        working-directory: backend
        run: npm run test:integration

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        working-directory: frontend
        run: npm ci

      - name: Run linter
        working-directory: frontend
        run: npm run lint

      - name: Run type check
        working-directory: frontend
        run: npm run typecheck

      - name: Build
        working-directory: frontend
        run: npm run build
```

**Benefícios**:
- Previne bugs de chegar em produção
- Valida code quality automaticamente
- Documentação viva via testes

**Pré-requisitos**:
- Implementar testes unitários (backend e frontend)
- Configurar banco de dados de teste
- Implementar integration tests

**Estimativa de esforço**: 40-60 horas

### 2.2. Deploy Automático para Staging

**Objetivo**: Criar ambiente de staging que recebe deploys automáticos.

**Infraestrutura necessária**:

```bash
# Criar VM staging (e2-micro para economizar)
gcloud compute instances create charhub-vm-staging \
  --zone=us-central1-a \
  --machine-type=e2-micro \
  --image-family=cos-stable \
  --image-project=cos-cloud

# Criar Cloud SQL staging
gcloud sql instances create charhub-postgres-staging \
  --tier=db-f1-micro \
  --region=us-central1

# Configurar Cloudflare Tunnel staging
# URL: https://staging.charhub.app
```

**Workflow proposto**:

```yaml
# .github/workflows/deploy-staging.yml
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

      - name: Deploy to Staging
        run: |
          ./scripts/deploy-to-gcp.sh staging

      - name: Run smoke tests
        run: |
          ./scripts/smoke-tests.sh https://staging.charhub.app

      - name: Notify Slack
        if: always()
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "Deploy staging ${{ job.status }}"
            }
```

**Benefícios**:
- Testes em ambiente similar a produção
- Detecta problemas antes de deploy final
- Permite testes manuais pré-produção

**Custo adicional**: ~$8-10/mês (VM + Cloud SQL staging)

**Estimativa de esforço**: 30-40 horas

### 2.3. Deploy Production com Aprovação Manual

**Objetivo**: Automatizar deploy production, mas exigir aprovação humana.

**Workflow proposto**:

```yaml
# .github/workflows/deploy-production.yml
name: Deploy Production

on:
  workflow_dispatch:  # Manual trigger only
    inputs:
      version:
        description: 'Version to deploy'
        required: true

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

      - name: Create backup
        run: |
          ./scripts/backup-production.sh

      - name: Deploy to Production
        run: |
          ./scripts/deploy-to-gcp.sh production

      - name: Run smoke tests
        run: |
          ./scripts/smoke-tests.sh https://charhub.app

      - name: Rollback if tests fail
        if: failure()
        run: |
          ./scripts/rollback-production.sh

      - name: Notify team
        if: always()
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "Production deploy ${{ job.status }}: v${{ github.event.inputs.version }}"
            }
```

**Configuração GitHub**:
- Settings → Environments → Production
- Required reviewers: adicionar time de desenvolvimento
- Deployment protection rules: exigir aprovação

**Benefícios**:
- Mantém controle humano sobre produção
- Automatiza tarefas repetitivas
- Registro completo de quem deployou e quando

**Estimativa de esforço**: 20-30 horas

### 2.4. Notificações e Integrações

**Integrações propostas**:

1. **Slack/Discord**
   - Notificar deploys (staging e production)
   - Alertas de falhas em CI
   - Alertas de downtime

2. **GitHub Releases**
   - Gerar release notes automaticamente
   - Changelog baseado em commits convencionais
   - Tags semânticas (v1.2.3)

3. **Sentry/Error Tracking**
   - Associar deploys a erros
   - Rastrear performance regressions

**Estimativa de esforço**: 15-20 horas

---

## Fase 3: Infraestrutura Escalável

**Duração estimada**: 4-6 meses
**Prioridade**: Média
**Esforço**: Alto
**Quando implementar**: Quando atingir >1000 usuários ativos ou problemas de performance

### 3.1. Migração para Kubernetes (GKE)

**Por quê?**
- Auto-scaling horizontal de pods
- Zero-downtime deployments
- Melhor gerenciamento de recursos
- Preparação para múltiplas regiões

**Arquitetura proposta**:

```yaml
# k8s/backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
spec:
  replicas: 2  # Auto-scale entre 2-10
  strategy:
    type: RollingUpdate
  selector:
    matchLabels:
      app: backend
  template:
    spec:
      containers:
      - name: backend
        image: gcr.io/charhub-prod/backend:latest
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /api/v1/health
            port: 3000
        readinessProbe:
          httpGet:
            path: /api/v1/ready
            port: 3000
```

**Custo estimado**: $150-300/mês (GKE cluster + nodes)

**Estimativa de esforço**: 80-120 horas

### 3.2. Redis Gerenciado (Memorystore)

**Por quê?**
- Alta disponibilidade automática
- Backups e replicação gerenciados
- Melhor performance (rede interna GCP)

**Configuração**:

```bash
gcloud redis instances create charhub-redis \
  --size=1 \
  --region=us-central1 \
  --redis-version=redis_7_0 \
  --tier=basic
```

**Custo**: ~$30/mês

**Estimativa de esforço**: 8-12 horas

### 3.3. CDN para Assets Estáticos

**Configurações**:

1. **Cloudflare CDN** (grátis, já disponível)
   - Cache de HTML, CSS, JS
   - Minificação automática
   - Brotli compression

2. **Cloud CDN** (Google Cloud)
   - Cache de imagens R2
   - Melhor performance global
   - Integração com Load Balancer

**Estimativa de esforço**: 12-16 horas

### 3.4. Read Replicas (PostgreSQL)

**Quando implementar**: Quando >70% das queries forem reads

**Configuração**:

```bash
gcloud sql instances create charhub-postgres-read-1 \
  --master-instance-name=charhub-postgres \
  --tier=db-n1-standard-1 \
  --region=us-central1
```

**Código backend** (Prisma):

```typescript
// backend/src/config/database.ts
const read = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_READ_URL }
  }
});

const write = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_WRITE_URL }
  }
});

// Usar read para queries, write para mutations
```

**Custo**: +$30/mês por réplica

**Estimativa de esforço**: 20-30 horas

---

## Fase 4: Observabilidade Avançada

**Duração estimada**: 6+ meses
**Prioridade**: Baixa-Média
**Esforço**: Alto

### 4.1. APM (Application Performance Monitoring)

**Ferramentas sugeridas**:

1. **Google Cloud Monitoring** (já disponível)
   - Métricas básicas de infra
   - Logs estruturados
   - Alertas customizados

2. **New Relic / Datadog** (pago)
   - APM completo
   - Distributed tracing
   - Real User Monitoring (RUM)
   - Custo: ~$100-200/mês

3. **Sentry** (freemium)
   - Error tracking
   - Performance monitoring
   - Release tracking
   - Custo: $0-50/mês

**Implementação**:

```typescript
// backend/src/app.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,  // 10% das requests
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());
// ... rotas
app.use(Sentry.Handlers.errorHandler());
```

**Estimativa de esforço**: 16-24 horas

### 4.2. Distributed Tracing

**Objetivo**: Rastrear requests através de múltiplos serviços.

**Ferramentas**:
- OpenTelemetry (padrão aberto)
- Google Cloud Trace
- Jaeger (self-hosted)

**Exemplo**:

```typescript
// backend/src/middleware/tracing.ts
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('charhub-backend');

export function traceMiddleware(req, res, next) {
  const span = tracer.startSpan(`${req.method} ${req.path}`);

  span.setAttribute('http.method', req.method);
  span.setAttribute('http.url', req.url);

  res.on('finish', () => {
    span.setAttribute('http.status_code', res.statusCode);
    span.end();
  });

  next();
}
```

**Benefícios**:
- Identificar gargalos de performance
- Debug de problemas intermitentes
- Otimização de queries N+1

**Estimativa de esforço**: 30-40 horas

### 4.3. Alertas Inteligentes

**Alertas propostos**:

| Métrica | Threshold | Ação |
|---------|-----------|------|
| CPU > 80% | 5 minutos | Alerta Slack + auto-scale |
| Latência p95 > 500ms | 10 minutos | Alerta email |
| Error rate > 5% | 2 minutos | PagerDuty (oncall) |
| Disk > 85% | 1 hora | Alerta Slack |
| Memory > 90% | 5 minutos | Restart automático |

**Configuração** (Google Cloud Monitoring):

```yaml
# alerting-policy.yaml
displayName: "High Error Rate"
conditions:
  - displayName: "Error rate > 5%"
    conditionThreshold:
      filter: 'metric.type="logging.googleapis.com/user/errors"'
      comparison: COMPARISON_GT
      thresholdValue: 0.05
      duration: 120s
notificationChannels:
  - projects/charhub-prod/notificationChannels/slack-alerts
```

**Estimativa de esforço**: 12-16 horas

### 4.4. Dashboards Customizados

**Dashboards propostos**:

1. **Overview Dashboard**
   - Status de todos serviços
   - Requests/min
   - Error rate
   - Latência média

2. **Performance Dashboard**
   - Response times por endpoint
   - Queries lentas (top 10)
   - Cache hit rate
   - Queue lag

3. **Business Metrics Dashboard**
   - Usuários ativos
   - Conversas criadas
   - Mensagens enviadas
   - Upload de imagens

**Ferramentas**:
- Google Cloud Monitoring Dashboards
- Grafana (self-hosted)
- Datadog Dashboards

**Estimativa de esforço**: 20-30 horas

---

## Resumo de Esforço e Prioridades

### Fase 1: Otimização (Alta Prioridade)

| Melhoria | Esforço | Impacto | Prioridade |
|----------|---------|---------|------------|
| Deploy incremental | 2-4h | Alto | 1 |
| Health checks avançados | 6-8h | Alto | 2 |
| Rollback automático | 4-6h | Médio | 3 |
| Smoke tests | 8-12h | Alto | 4 |
| **Total Fase 1** | **20-30h** | | |

### Fase 2: CI/CD (Alta Prioridade)

| Melhoria | Esforço | Impacto | Prioridade |
|----------|---------|---------|------------|
| GitHub Actions CI | 40-60h | Alto | 1 |
| Deploy staging | 30-40h | Alto | 2 |
| Deploy production | 20-30h | Alto | 3 |
| Notificações | 15-20h | Médio | 4 |
| **Total Fase 2** | **105-150h** | | |

### Fase 3: Escalabilidade (Média Prioridade)

| Melhoria | Esforço | Impacto | Custo Mensal |
|----------|---------|---------|--------------|
| Kubernetes (GKE) | 80-120h | Alto | +$150-300 |
| Redis gerenciado | 8-12h | Médio | +$30 |
| CDN | 12-16h | Médio | $0-20 |
| Read replicas | 20-30h | Alto | +$30/réplica |
| **Total Fase 3** | **120-178h** | | **+$210-380/mês** |

### Fase 4: Observabilidade (Baixa-Média Prioridade)

| Melhoria | Esforço | Impacto | Custo Mensal |
|----------|---------|---------|--------------|
| APM (Sentry) | 16-24h | Alto | $0-50 |
| Distributed tracing | 30-40h | Médio | $0 |
| Alertas inteligentes | 12-16h | Alto | $0 |
| Dashboards | 20-30h | Médio | $0 |
| **Total Fase 4** | **78-110h** | | **$0-50/mês** |

---

## Próximos Passos Imediatos

### Próximas 2 semanas

1. ✅ Implementar deploy incremental (rsync)
2. ✅ Adicionar health checks avançados
3. ✅ Criar script de rollback automático

### Próximo mês

1. Implementar testes unitários (backend e frontend)
2. Configurar GitHub Actions para CI
3. Implementar smoke tests pós-deploy

### Próximos 3 meses

1. Criar ambiente staging
2. Configurar deploy automático staging
3. Implementar deploy production com aprovação

---

## Referências

- [Google Kubernetes Engine Best Practices](https://cloud.google.com/kubernetes-engine/docs/best-practices)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Twelve-Factor App](https://12factor.net/)
- [OpenTelemetry](https://opentelemetry.io/)
- [Site Reliability Engineering (Google)](https://sre.google/books/)

---

**Documento mantido pelo time CharHub**
**Última revisão**: 2025-11-13
