# Melhorias de Deploy e Infraestrutura

> **Status**: Planejamento
> **Prioridade**: Media
> **Complexidade**: Alta
> **Ultima atualizacao**: 2025-11-23

## Resumo

Melhorias incrementais para o sistema de deploy atual, organizadas em fases de complexidade crescente.

---

## Fase 1: Otimizacao do Deploy Atual (1-2 meses)

### 1.1 Health Checks Avancados

**Problema**: Health check atual apenas verifica se API responde 200.

**Solucao**:

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

**Tarefas**:
- [ ] Implementar checkDatabase() com query simples
- [ ] Implementar checkRedis() com ping
- [ ] Implementar checkR2Storage() com list operation
- [ ] Implementar checkLLMProviders() com API ping
- [ ] Atualizar endpoint /health

**Esforco**: 6-8 horas

### 1.2 Smoke Tests Pos-Deploy

**Problema**: Nenhuma validacao automatica apos deploy.

**Solucao**: Script que testa funcionalidades criticas

```powershell
# scripts/smoke-tests.ps1

# 1. Health check
$health = Invoke-WebRequest -Uri "https://charhub.app/api/v1/health"
if ($health.StatusCode -ne 200) { throw "Health check failed" }

# 2. Verificar frontend
$frontend = Invoke-WebRequest -Uri "https://charhub.app"
if ($frontend.Content -notmatch "CharHub") { throw "Frontend broken" }

# 3. Verificar OAuth redirect
$oauth = Invoke-WebRequest -Uri "https://charhub.app/api/v1/oauth/google" -MaximumRedirection 0
if ($oauth.StatusCode -ne 302) { throw "OAuth broken" }

Write-Host "All smoke tests passed!"
```

**Tarefas**:
- [ ] Criar script smoke-tests.ps1
- [ ] Adicionar ao deploy-git.ps1 apos restart
- [ ] Implementar rollback automatico se falhar

**Esforco**: 8-12 horas

### 1.3 Rollback Automatico Melhorado

**Problema**: Rollback atual requer intervencao manual.

**Tarefas**:
- [ ] Manter ultimos 5 commits em cache na VM
- [ ] Detectar falha automaticamente via smoke tests
- [ ] Rollback automatico para commit anterior
- [ ] Notificar via Slack/Discord

**Esforco**: 4-6 horas

---

## Fase 2: Infraestrutura Escalavel (4-6 meses)

> **Quando implementar**: Quando atingir >1000 usuarios ativos

### 2.1 Redis Gerenciado (Memorystore)

**Beneficios**:
- Alta disponibilidade automatica
- Backups gerenciados
- Melhor performance (rede interna GCP)

**Configuracao**:
```bash
gcloud redis instances create charhub-redis \
  --size=1 \
  --region=us-central1 \
  --redis-version=redis_7_0 \
  --tier=basic
```

**Custo**: ~$30/mes

**Tarefas**:
- [ ] Criar instancia Memorystore
- [ ] Atualizar REDIS_URL em .env.production
- [ ] Testar conexao
- [ ] Migrar dados existentes

### 2.2 CDN para Assets Estaticos

**Opcoes**:
1. Cloudflare CDN (gratis, ja disponivel)
2. Cloud CDN (Google Cloud)

**Tarefas**:
- [ ] Configurar cache rules no Cloudflare
- [ ] Habilitar minificacao automatica
- [ ] Configurar Brotli compression
- [ ] Cache de imagens R2

### 2.3 Read Replicas (PostgreSQL)

**Quando implementar**: Quando >70% das queries forem reads

**Configuracao**:
```bash
gcloud sql instances create charhub-postgres-read-1 \
  --master-instance-name=charhub-postgres \
  --tier=db-n1-standard-1 \
  --region=us-central1
```

**Codigo Prisma**:
```typescript
// backend/src/config/database.ts
const read = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_READ_URL } }
});

const write = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_WRITE_URL } }
});
```

**Custo**: +$30/mes por replica

---

## Fase 3: Kubernetes (GKE) - Futuro

> **Quando implementar**: Quando precisar de auto-scaling ou zero-downtime deploys

### Arquitetura Proposta

```yaml
# k8s/backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
spec:
  replicas: 2
  strategy:
    type: RollingUpdate
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

**Beneficios**:
- Auto-scaling horizontal
- Zero-downtime deployments
- Melhor gerenciamento de recursos

**Custo**: $150-300/mes

---

## Fase 4: Observabilidade Avancada

### 4.1 APM (Sentry)

```typescript
// backend/src/app.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());
// ... rotas
app.use(Sentry.Handlers.errorHandler());
```

**Custo**: $0-50/mes

### 4.2 Alertas Inteligentes

| Metrica | Threshold | Acao |
|---------|-----------|------|
| CPU > 80% | 5 min | Alerta + auto-scale |
| Latencia p95 > 500ms | 10 min | Alerta email |
| Error rate > 5% | 2 min | PagerDuty |
| Disk > 85% | 1 hora | Alerta Slack |

### 4.3 Dashboards

1. **Overview**: Status, requests/min, error rate
2. **Performance**: Response times, queries lentas
3. **Business**: Usuarios ativos, conversas, mensagens

---

## Resumo de Prioridades

| Melhoria | Esforco | Custo Mensal | Prioridade |
|----------|---------|--------------|------------|
| Health checks avancados | 6-8h | $0 | Alta |
| Smoke tests | 8-12h | $0 | Alta |
| Rollback automatico | 4-6h | $0 | Media |
| Redis gerenciado | 8-12h | +$30 | Media |
| CDN | 12-16h | $0-20 | Media |
| Read replicas | 20-30h | +$30 | Baixa |
| Kubernetes | 80-120h | +$150-300 | Baixa |
| APM (Sentry) | 16-24h | $0-50 | Media |

---

## Referencias

- [Google Cloud Best Practices](https://cloud.google.com/architecture/best-practices)
- [Twelve-Factor App](https://12factor.net/)
- [Site Reliability Engineering](https://sre.google/books/)

---

**Origem**: Extraido de `docs/deploy/FUTURE_IMPROVEMENTS.md`
