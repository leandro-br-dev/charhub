# TODO & Status Tracker

Consolidated view of the current technology stack, delivered functionality, and upcoming development efforts. Checked items were validated against the codebase as of this revision.

## Tecnologias Centrais

- [x] **Node.js 20 + Express** (`backend/src/index.ts`) para o serviço API.
- [x] **Passport.js (Google/Facebook)** (`backend/src/config/passport.ts`, `routes/oauth.ts`) com state e JWT.
- [x] **Prisma ORM + PostgreSQL 16** (`backend/prisma`, Docker `postgres` service).
- [x] **React 18 + TypeScript + Vite** (`frontend/src/`), com Tailwind CSS e React Router.
- [x] **i18next + build de traduções** (`frontend/src/i18n.ts`, `backend/src/services/translationService.ts`, `scripts/buildTranslations.ts`).
- [x] **LLM providers Gemini/OpenAI/Grok** (`backend/src/services/llm/`).
- [x] **Docker Compose + Nginx proxy + Cloudflared tunnel** (`docker-compose.yml`, `nginx/conf.d/app.conf`, `cloudflared/config/*`).
- [x] **Redis + BullMQ** (`backend/src/queues/`, Docker `redis` service) - Sistema de filas assíncronas implementado.
- [ ] **Cloudflare R2 storage integration** – variáveis de ambiente definidas, mas consumo em código ainda não implementado.

## Funcionalidades Entregues

- [x] **Fluxo OAuth completo**: redirecionamento, callback, geração de JWT e hidratação do frontend (`useAuth.tsx`, `pages/Callback.tsx`).
- [x] **Proteção de rotas e sessão**: middleware `requireAuth`/`requirePremium`, `ProtectedRoute` no frontend.
- [x] **Catálogo e proxy LLM**: listagem de modelos e endpoint `/api/v1/llm/chat` chamando adaptadores específicos.
- [x] **Serviço de traduções file-based**: fallback por locale prefix e idioma base; volume Docker garante persistência.
- [x] **UI utilitária**: alternância de idioma (dropdown com bandeiras), troca de tema, menu do usuário e layout público autenticado.
- [x] **Pipelines Docker**: ambos os aplicativos compilam via multi-stage Dockerfiles; Compose monta volumes relevantes.
- [x] **Integração Cloudflared**: serviço no compose seleciona configs `config/<ENV_SUFFIX>/config.yml` e expõe `nginx`.
- [x] **Sistema de Filas (BullMQ)**: infraestrutura completa com Redis, QueueManager, workers e API de testes (`/api/v1/queues/*`).

## Plano de Migração (EM ANDAMENTO)

**Status**: Fase 0 - Iniciando Desenvolvimento
**Tempo Estimado**: 3-5 meses (14-19 semanas)

Foi criado um plano detalhado para migrar funcionalidades do projeto antigo (Python/FastAPI) para este projeto (Node.js/Express).

**Documentos de Referência**:
- [x] **`docs/MIGRATION/01_RESUMO_EXECUTIVO.md`** - Visão geral e estratégia
- [x] **`docs/MIGRATION/02_PLANO_DE_MIGRACAO.md`** - Checklist detalhado fase por fase
- [x] **`docs/MIGRATION/03_GUIA_TECNICO_E_REFERENCIA.md`** - Inventário do projeto antigo e decisões técnicas
- [x] **`docs/MIGRATION/README.md`** - Índice e fluxo de trabalho

**Funcionalidades a Migrar** (7 fases):
0. Infraestrutura (BullMQ, R2, Classificação)
1. Sistema de Personagens (Characters, LoRAs, Attires, Stickers)
2. Sistema de Chat em Tempo Real (WebSocket, Agentes de IA, Conversas)
3. Sistema de Histórias/Visual Novels (Geração automática, Player)
4. Sistema de Créditos e Monetização (Planos, PayPal, Usage Logs)
5. Sistema de Indicação (Referrals)
6. Polimento e Testes

---

### 🚀 FASE 0: Infraestrutura (EM ANDAMENTO)

**Objetivo**: Criar fundação técnica para os módulos seguintes
**Duração**: 1-2 semanas

#### Sequência de Execução:

**Passo 1** (✅ COMPLETO):
- [x] **Etapa 0.1: Jobs Assíncronos (BullMQ)**
  - [x] Instalar BullMQ e dependências (bullmq, ioredis)
  - [x] Adicionar Redis ao docker-compose.yml
  - [x] Criar estrutura de pastas /queues (config, jobs, workers)
  - [x] Implementar job de teste funcional
  - [x] Criar API endpoints de teste e monitoramento
  - [x] Logger centralizado (`config/logger.ts`)
  - [x] Sistema testado e validado em produção
  - **Documentação**: `docs/MIGRATION/PHASE_0_1_BULLMQ_COMPLETE.md`

**Passos 2 e 3** (Executar em PARALELO - SEM CONFLITOS):

**👤 AGENTE 1: Etapa 0.2 - Storage de Arquivos (Cloudflare R2)**
- [ ] Criar `backend/src/services/r2Service.ts` usando AWS SDK v3
- [ ] Implementar função de upload
- [ ] Implementar função de geração de URLs
- [ ] Criar endpoint de teste para validar upload
- **Arquivos tocados**: `services/r2Service.ts`, novas rotas em `routes/`
- **Referência**: `E:\Projects\charhub_dev_old_version\backend\app\services\r2_service.py`

**👤 AGENTE 2: Etapa 0.3 - Classificação de Conteúdo**
- [ ] Definir Enums `AgeRating` e `ContentTag` em `schema.prisma`
- [ ] Adicionar campos de preferências ao model User
- [ ] Executar migração Prisma
- [ ] Criar `backend/src/services/contentClassificationService.ts`
- **Arquivos tocados**: `prisma/schema.prisma`, `services/contentClassificationService.ts`
- **Referência**: `E:\Projects\charhub_dev_old_version\backend\app\models\` (procurar por enums de classificação)

**Por que essas duas podem rodar em paralelo?**
- ✅ Trabalham em arquivos completamente diferentes
- ✅ Não compartilham dependências diretas
- ✅ Podem ser testadas independentemente
- ✅ Não modificam estruturas compartilhadas (além do Prisma que é isolado)

**Critério de Sucesso da Fase 0**:
- Jobs são processados via BullMQ
- Arquivos podem ser enviados ao R2 e URLs geradas
- Sistema de classificação definido no banco e com lógica de filtro inicial

---

## Desenvolvimento Futuro (priorizar - ANTES DA MIGRAÇÃO)

- [ ] **Implementar funcionalidades premium reais**: endpoints e UI existem apenas como placeholders; definir regras/benefícios concretos.
- [ ] **Persistir e consumir dados reais de usuários**: revisar `userService`/Prisma para armazenar perfis além do token OAuth.
- [ ] **Integrar Cloudflare R2/CDN**: consumir `R2_*` no backend para uploads e expor `VITE_CDN_PUBLIC_URL_BASE` na UI. (SERÁ FEITO NA FASE 0.2)
- [ ] **Observabilidade e testes**: adicionar testes unitários/integrados (especialmente para tradução, OAuth) e configurar monitoramento (Sentry/metrics).
- [ ] **Automação CI/CD**: pipelines para lint/test/build/deploy ainda ausentes.
- [ ] **UX adicional**: construir dashboard real, formulários de perfil, telas premium, melhorias responsivas.

---

## Roadmap de Longo Prazo (APÓS MIGRAÇÃO)

- [ ] **Planejamento de jogos modulares (ROADMAP)**: iniciar fase 1 do roadmap (Turborepo, SDK Core, Runtime Host, Handoff system) – planejado para após migração das funcionalidades core.

Consulte:
- `docs/MIGRATION_PLAN.md` para o plano de migração detalhado
- `docs/ROADMAP.md` para metas de longo prazo (engine 2D modular, editor, workers)