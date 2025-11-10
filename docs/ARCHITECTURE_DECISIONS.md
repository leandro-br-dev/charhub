# Decisões de Arquitetura - CharHub

Documento de registro de decisões arquiteturais importantes (Architecture Decision Records - ADR).

## ADR-001: Estrutura de Repositório (Monorepo)

**Data:** 2025-01-09
**Status:** ✅ Aceito
**Decidido por:** Time CharHub

### Contexto

O projeto CharHub consiste em múltiplos componentes:
- Backend (Express + TypeScript)
- Frontend (React + TypeScript)
- Nginx (configuração)
- Cloudflared (configuração)
- Documentação

Precisamos decidir entre:
1. **Monorepo** - Tudo em um único repositório
2. **Multi-Repo** - Repositórios separados para backend, frontend e infra

### Decisão

**Adotamos MONOREPO** para o CharHub.

### Justificativa

#### Fatores Favoráveis ao Monorepo

1. **Time pequeno (1 pessoa)**
   - Overhead de gerenciar múltiplos repos não se justifica
   - Context switching entre repositórios seria prejudicial
   - Setup único para desenvolvimento

2. **Forte acoplamento entre backend e frontend**
   - API REST com contratos explícitos
   - Mudanças na API frequentemente requerem mudanças no frontend
   - Refactorings cross-service são comuns

3. **Deploy coordenado é essencial**
   - Backend v1.2 deve sempre ser compatível com Frontend v1.2
   - Risco de version mismatch em multi-repo
   - Rollback precisa ser atômico

4. **CI/CD mais simples**
   - Workflows centralizados
   - Secrets compartilhados
   - Deploy de versões compatíveis garantido

5. **Documentação coesa**
   - Docs na mesma estrutura de código
   - README central com visão geral
   - Changelog unificado

#### Fatores Desfavoráveis (Mitigados)

1. **CI mais demorado** → Mitigado com path filters
   ```yaml
   paths: ['backend/**']  # Só roda quando backend muda
   ```

2. **Build único grande** → Mitigado com Docker cache e build paralelo

3. **Permissões granulares** → Não é problema para time de 1 pessoa

### Consequências

#### Positivas

- ✅ Commits refletem features completas (backend + frontend)
- ✅ Code review holístico
- ✅ Refactoring cross-service facilitado
- ✅ Versioning simplificado (uma versão para toda a stack)
- ✅ Onboarding mais fácil (clone único)

#### Negativas

- ⚠️ Repositório cresce mais rápido
- ⚠️ CI pode ser mais lento (mitigado com path filters)
- ⚠️ Impossível deploy independente de backend/frontend

#### Mitigações

1. **Path Filters nos workflows** - Rodar CI apenas quando necessário
2. **Docker cache agressivo** - Acelerar builds
3. **Estrutura modular** - Preparar para eventual separação se necessário

### Quando Reavaliar

Considerar migração para multi-repo quando:
- Time crescer para > 5 pessoas
- Múltiplos clientes consumindo backend (mobile app, CLI)
- Backend e frontend tiverem ciclos de release independentes
- Necessidade de permissões granulares por equipe

**Estimativa:** Não antes de 2026 (6-12 meses)

### Alternativas Consideradas

#### Opção 1: Multi-Repo
- 3 repositórios: backend, frontend, infra
- **Rejeitada**: Overhead muito alto para time de 1 pessoa
- **Vantagem**: Deploy independente (não é necessário agora)

#### Opção 2: Monorepo com Workspaces (npm/yarn)
- Usar npm workspaces para gerenciar mono-repo
- **Rejeitada**: Over-engineering para escala atual
- **Reconsiderar**: Quando adicionar mais packages/libs compartilhados

---

## ADR-002: CI/CD com GitHub Actions

**Data:** 2025-01-09
**Status:** ✅ Aceito
**Decidido por:** Time CharHub

### Contexto

Precisamos de CI/CD para automatizar:
- Testes e validação de código
- Build de imagens Docker
- Deploy para staging e produção

Opções consideradas:
1. **GitHub Actions** (nativo do GitHub)
2. **Google Cloud Build** (nativo do GCP)
3. **GitLab CI** (requer migração)
4. **Jenkins** (self-hosted)

### Decisão

**Adotamos GitHub Actions** como plataforma de CI/CD.

### Justificativa

#### GitHub Actions vs Alternativas

| Critério | GitHub Actions | Cloud Build | GitLab CI | Jenkins |
|----------|---------------|-------------|-----------|---------|
| **Custo** | $0 (2000 min/mês free) | $0.003/min | Requer GitLab | Requer servidor |
| **Setup** | Zero config | Requer config GCP | Requer migração | Setup complexo |
| **Integração** | Nativo GitHub | Requer integração | Requer migração | Plugins |
| **Docs** | Excelente | Boa | Boa | Variável |
| **Maintenance** | Zero (managed) | Zero (managed) | Zero (managed) | Alto (self-hosted) |

#### Fatores Decisivos

1. **Custo Zero**
   - 2000 minutos/mês grátis (privado)
   - Ilimitado para repos públicos
   - Uso estimado: ~1440 min/mês

2. **Zero Setup**
   - Já estamos no GitHub
   - Workflows são apenas YAML no repo
   - Sem conta adicional

3. **Integração Nativa**
   - PRs mostram status automaticamente
   - Badges, checks, approvals built-in
   - GitHub CLI integrado

4. **Ecossistema Rico**
   - 20,000+ actions no marketplace
   - Docker, Node, GCP actions prontos
   - Comunidade ativa

5. **Flexibilidade**
   - Self-hosted runners se necessário
   - Multi-cloud (GCP, AWS, Azure)
   - Fácil migrar depois se necessário

### Consequências

#### Positivas

- ✅ CI/CD funcional em < 1 hora de setup
- ✅ Custo zero para volume atual
- ✅ Workflows versionados com código
- ✅ Fácil onboarding (padrão da indústria)

#### Negativas

- ⚠️ Vendor lock-in (mitigado: workflows são portáveis)
- ⚠️ Limites de minutos em repo privado (mitigado: 2000 min é suficiente)

### Workflows Implementados

1. **Backend CI** (`.github/workflows/backend-ci.yml`)
   - Lint, type check, tests, build, security scan
   - Roda em push/PR modificando `backend/**`
   - Duração: ~8 minutos

2. **Frontend CI** (`.github/workflows/frontend-ci.yml`)
   - Lint, type check, tests, build, Docker
   - Roda em push/PR modificando `frontend/**`
   - Duração: ~8 minutos

3. **Dependabot** (`.github/dependabot.yml`)
   - Atualizações automáticas de dependências
   - PRs semanais (segunda-feira)
   - Backend + Frontend + GitHub Actions

### Próximos Workflows

1. **Deploy Staging** (automático)
2. **Deploy Production** (manual com approval)
3. **E2E Tests** (Playwright)
4. **Performance Tests** (Lighthouse)

---

## ADR-003: Infraestrutura de Produção (Google Cloud + Cloudflare)

**Data:** 2025-01-09
**Status:** ✅ Aceito
**Decidido por:** Time CharHub

### Contexto

Precisamos escolher infraestrutura para produção que:
- Minimize custos (projeto em fase inicial)
- Use contratos existentes (Cloudflare, Google Cloud)
- Seja escalável quando necessário
- Simplifique deploy

### Decisão

**Stack Escolhido:**
- **Cloudflare**: DNS + Tunnel + R2 Storage
- **Google Cloud**: Compute Engine (VM) + Cloud SQL (PostgreSQL)
- **Docker Compose**: Orchestração de containers

### Justificativa

#### Componentes e Custos

| Componente | Serviço | Custo/Mês | Justificativa |
|-----------|---------|-----------|---------------|
| **DNS** | Cloudflare DNS | $0 | Já contratado, grátis |
| **HTTPS/Proxy** | Cloudflare Tunnel | $0 | Grátis, sem config SSL |
| **Storage** | Cloudflare R2 | $0-5 | Mais barato que S3 |
| **Compute** | GCE e2-small | $15 | Suficiente para início |
| **Database** | Cloud SQL f1-micro | $8 | Managed, backups automáticos |
| **Redis** | Container local | $0 | Incluído na VM |
| **Total** | | **~$23/mês** | |

#### Alternativas Rejeitadas

**AWS:**
- Custo estimado: ~$40/mês
- Razão: Mais caro, não usa contrato existente

**Heroku/Render:**
- Custo estimado: ~$30/mês
- Razão: Menos flexível, vendor lock-in

**VPS Tradicional (Hetzner, DO):**
- Custo estimado: ~$5-10/mês
- Razão: Menos integrado, sem contrato existente, perde managed services

**Cloud Run (Serverless):**
- Custo estimado: ~$10-50/mês (variável)
- Razão: Timeout de 60s é problema para LLM requests longas

#### Arquitetura Escolhida

```
Cloudflare (Grátis)
├── DNS
├── Tunnel → VM no Google Cloud
└── R2 → Storage de mídia

Google Cloud (~$23/mês)
├── Compute Engine (e2-small) → Docker Compose
│   ├── Nginx
│   ├── Backend
│   ├── Frontend
│   └── Redis
└── Cloud SQL (PostgreSQL)
```

### Consequências

#### Positivas

- ✅ Usa contratos existentes (conforme solicitado)
- ✅ Custo previsível e baixo ($23/mês)
- ✅ Cloudflare Tunnel elimina config SSL
- ✅ Cloud SQL: backups automáticos
- ✅ Escalável para GKE quando necessário

#### Negativas

- ⚠️ VM única = single point of failure (aceitável para MVP)
- ⚠️ Requer gerenciamento de VM (mitigado: COS auto-update)

### Path de Escalabilidade

**Fase 1 (MVP): $23/mês**
- VM e2-small + Cloud SQL f1-micro

**Fase 2 (< 1000 usuários): $50/mês**
- VM e2-medium + Cloud SQL db-n1-standard-1

**Fase 3 (> 1000 usuários): $100-200/mês**
- Google Kubernetes Engine (GKE)
- Cloud SQL com replicas
- Memorystore Redis
- Cloud CDN

---

## ADR-004: Deploy Strategy (Staging Automático + Production Manual)

**Data:** 2025-01-09
**Status:** ✅ Aceito
**Decidido por:** Time CharHub

### Contexto

Precisamos definir:
- Como fazer deploy de novas versões
- Qual nível de automação
- Como minimizar risco de bugs em produção

### Decisão

**Estratégia de Deploy:**

1. **Staging**: Deploy **automático** em cada push para `main`
2. **Production**: Deploy **manual** com approval obrigatório

### Fluxo de Deploy

```
Developer
  ↓ commit + push
Feature Branch
  ↓ PR
Main Branch (após merge)
  ↓ AUTOMÁTICO ✅
Staging (dev.charhub.app)
  ↓ testes manuais + approval
  ↓ MANUAL 🔐
Production (charhub.app)
```

### Justificativa

#### Por que Staging Automático?

1. **Feedback rápido** - Ver mudanças em ambiente real imediatamente
2. **Força testes** - Toda mudança vai para staging, obriga validação
3. **Ambiente sempre atualizado** - Staging reflete main
4. **Menos trabalho manual** - Não precisa lembrar de deployar staging

#### Por que Production Manual?

1. **Controle** - Evita deploy acidental de bugs críticos
2. **Timing** - Deploy em horário apropriado (não 3am)
3. **Comunicação** - Equipe sabe quando production muda
4. **Rollback deliberado** - Se algo der errado, não auto-deploya mais bugs

### Ambientes

| Ambiente | URL | Deploy | Propósito | Banco |
|----------|-----|--------|-----------|-------|
| **Development** | `localhost` | Manual local | Desenvolvimento ativo | Local |
| **Staging** | `dev.charhub.app` | **Auto (main)** | Testes e validação | Cloud SQL (staging) |
| **Production** | `charhub.app` | **Manual** | Usuários reais | Cloud SQL (prod) |

### Consequências

#### Positivas

- ✅ Bugs detectados em staging antes de ir para prod
- ✅ Time pode testar features reais antes de release
- ✅ Produção permanece estável
- ✅ Deploy production é evento consciente

#### Negativas

- ⚠️ Requer manutenção de 2 ambientes (custo +$8/mês para staging)
- ⚠️ Requer aprovação manual (adiciona latência para produção)

### Quando Reavaliar

Considerar deploy automático em produção quando:
- Coverage de testes > 80%
- Testes E2E robustos (Playwright)
- Monitoring e alertas maduros
- Rollback automático funcional

**Estimativa:** Q2-Q3 2025

---

## Template para Novos ADRs

```markdown
## ADR-XXX: [Título]

**Data:** YYYY-MM-DD
**Status:** 🚧 Proposto | ✅ Aceito | ❌ Rejeitado | 🗄️ Obsoleto
**Decidido por:** [Nome/Time]

### Contexto
[Descreva o problema e constraints]

### Decisão
[Qual decisão foi tomada]

### Justificativa
[Por que esta decisão]

### Consequências
[Impactos positivos e negativos]

### Alternativas Consideradas
[Outras opções e por que foram rejeitadas]
```

---

**Última atualização**: 2025-01-09
**Versão**: 1.0
**Autor**: Time CharHub
