# Agent Assignments - Rastreamento de Tarefas

Este arquivo mantém o histórico de **qual tarefa está sendo feita por qual agente** e seu status atual.

O **Agent Reviewer** atualiza este arquivo **a cada segunda-feira** após revisar `user-notes.md` e explorar `/docs/todo/`.

---

## 📊 Status Atual: 28 de Dezembro de 2025

### Tarefas em Progresso

| ID | Tarefa | Agente | Status | Branch | ETA | Último Update |
|---|--------|--------|--------|--------|-----|---------------|
| T009 | **TypeScript ESLint 8.x Migration** | Agent Coder | ✅ Concluído | `feature/typescript-eslint-8-migration` | - | 28/12 - PR merged e movido para implemented |
| T010 | **Prisma 7.x Migration** | Agent Coder | 📋 Em Revisão | `feature/prisma-7-migration` | 29/12/2025 | 28/12 - PR aberta aguardando review |

---

### Tarefas Planejadas (Próximas na Fila - ALTA PRIORIDADE)

| Ordem | Tarefa | Prioridade | Estimado | Notas | Spec |
|-------|--------|-----------|----------|-------|------|
| 1️⃣ | **Dashboard Infinite Scroll** | 🔥 ALTA | 8-10 horas | Carregamento sob demanda de personagens | `active/dashboard-infinite-scroll.md` |
| 2️⃣ | **Discovery Enhanced Filters** | 🔥 ALTA | 10 horas | Filtros de gênero e espécie | `active/discovery-enhanced-filters.md` |
| 3️⃣ | **Automated Character Generation Improvements** | 🔥 ALTA | 10-12 horas | Corrigir qualidade, diversidade e censura Civit.ai | `active/automated-character-generation-improvements.md` |
| 4️⃣ | **Character Image Generation Multi-Stage** | 🔥 ALTA | 12-16 horas* | Workflow progressivo de 4 estágios | `active/character-image-generation-multi-stage-workflow.md` |
| 5️⃣ | **UI Improvements (Sidebar + Age Tags)** | 🟡 MÉDIA | 5-6 horas | Filtro sidebar + componente age rating unificado | `active/ui-improvements-sidebar-and-age-tags.md` |

**⚠️ Nota sobre T013**: Requer verificação de capacidades da API ComfyUI (Phase 0) antes de iniciar implementação completa.

---

### Tarefas Planejadas (Backlog)

| Ordem | Tarefa | Prioridade | Estimado | Notas |
|-------|--------|-----------|----------|-------|
| 6️⃣ | Sistema de Notificações | MÉDIA | 1-2 semanas | Impacto alto em retenção |
| 7️⃣ | Fix Performance Galeria | MÉDIA | 3-5 dias | Investigação + otimização |
| 8️⃣ | Sugestões Inteligentes | BAIXA | 1 semana | Recomendações por tags |
| 9️⃣ | Redesign Página Perfil | BAIXA | 3-4 dias | UI/UX improvement |

---

## 🚀 Histórico Recente de Atribuições

### Semana de 25-31 Dezembro

| Tarefa | Agente | Status | Detalhes |
|--------|--------|--------|----------|
| **Sistema de Criação de Histórias (Manual + IA)** | Agent Coder | 📋 Em Finalização | Spec completa em `active/automated-story-generation.md`. **PRIORIDADE ALTA** - Agent Coder trabalhando nas etapas finais. |
| **Mobile Hamburger Menu (Responsive)** | Agent Coder | ✅ Concluído | Spec em `implemented/mobile-hamburger-menu.md`. **CRÍTICO** - PR #63 merged e deployed. Quick Win! |
| **TypeScript ESLint 8.x Migration** | Agent Coder | ✅ Atribuído | Spec completa em `active/typescript-eslint-8-migration.md`. **PRIORIDADE MÉDIA** - Segurança e qualidade do código. |
| **Prisma 7.x Migration** | Agent Coder | ✅ Atribuído | Spec completa em `active/prisma-7-migration.md`. **PRIORIDADE MÉDIA** - Performance e segurança. |

**Contexto da Tarefa População Automática** (T006):
- **Por que crítico**: CharHub está funcional mas não pode ser divulgado sem conteúdo (chicken-and-egg problem)
- **Objetivo Principal**: Popular catálogo com 100-200 personagens curados ANTES da divulgação pública
- **Problemas Resolvidos**:
  - ✅ Falta de personagens prontos e interessantes (problema #1 do produto)
  - ✅ Dependência 100% de UGC inicial (usuários não criam sem ver exemplos)
  - ✅ Impossibilidade de divulgar sem demonstrar valor do produto
  - ✅ Alta taxa de abandono de novos usuários (nada para explorar)
- **Features Principais**:
  1. Integração com Civitai API (captura automática de imagens)
  2. Curadoria automatizada (classificação etária, NSFW filter, quality score)
  3. Geração em lote (20 personagens/dia usando sistema existente)
  4. Scheduler diário (execução automática às 2 AM UTC)
  5. Publicação automática (personagens públicos imediatamente)
  6. Diversificação (balancear ratings, estilos, tags)
- **Estimativa**: 3-4 semanas (5 fases detalhadas na spec)
- **Custo Operacional**: ~$10/mês (muito baixo para o valor gerado)
- **Arquivo de spec**: `docs/05-business/planning/features/active/automated-character-population.md`
- **Branch sugerida**: `feature/automated-character-population`

**Aprovações do Product Owner**:
- ✅ Feature aprovada para início imediato
- ✅ Dashboard Público já implementado (pode começar agora)
- ✅ Civitai API key disponível (fornecida pelo PO)
- ✅ Quota de 20 personagens/dia aprovada
- ✅ Publicação automática sem revisão manual (não bloqueante)
- ✅ Revisão humana é feature futura (admin dashboard opcional)

**Instruções para Agent Coder**:
1. ⚠️ **PRIORIDADE CRÍTICA** - Viabiliza divulgação pública do Beta
2. Criar branch `feature/automated-character-population` a partir de `main`
3. Ler spec completa (todos os detalhes técnicos e arquitetura)
4. Seguir roadmap de implementação (5 fases):
   - Fase 1: Civitai Integration (5-7 dias)
   - Fase 2: Curadoria Automatizada (5-7 dias)
   - Fase 3: Batch Generation (3-5 dias)
   - Fase 4: Scheduler & Automação (3-5 dias)
   - Fase 5: QA & Documentação (5-7 dias)
5. **CRÍTICO**: Implementar filtros NSFW robustos (safety primeiro)
6. **IMPORTANTE**: Usar sistema de geração existente (`/api/v1/characters/generate`)
7. Fazer commits incrementais por fase
8. Abrir PRs por fase major para review gradual
9. Criar conta bot "CharHub Official" no seed

**Requisitos Técnicos Importantes**:
- ✅ Civitai API client com rate limiting
- ✅ Schema Prisma: `CuratedImage` e `BatchGenerationLog`
- ✅ Curadoria automática (age rating, NSFW, quality score)
- ✅ Batch generator com diversification algorithm
- ✅ BullMQ scheduler (cron job diário)
- ✅ Auto-publishing (PUBLIC visibility + tag "curated")
- ✅ Monitoring e alertas (Slack/email)
- ✅ Env vars configuráveis (quota, schedule, keywords)
- ✅ Testes (unit + integration, coverage >80%)

**ROI Esperado**:
- 600 personagens gerados por mês
- Custo: $10/mês
- Valor gerado: >$1,000 em UGC equivalente
- Viabiliza divulgação com catálogo robusto
- Aumento estimado de 40% em retenção D1
- Aumento estimado de 30% em signup conversion

---

**Contexto da Tarefa Sistema de Criação de Histórias** (T007):
- **Por que importante**: Com geração automática de personagens implementada, usuários têm mais conteúdo para explorar, mas precisam de contextos (histórias) para engajar
- **Objetivo Principal**: Criar sistema completo de criação de histórias com modo manual organizado + modo IA automático
- **Problemas Resolvidos**:
  - ✅ Interface atual de criação manual é desorganizada (formulário único longo)
  - ✅ Não existe opção de geração automática de histórias
  - ✅ Alta barreira de entrada para usuários testarem histórias rapidamente
  - ✅ Falta de contexto/enredo para usar personagens gerados automaticamente
- **Features Principais**:
  1. **Criação Manual Refatorada**:
     - Interface organizada em 5 abas (Story Details, Plot & Setting, Characters, Media, Visibility)
     - Layout similar ao sistema de personagens (comprovadamente eficaz)
     - Melhor UX e organização visual
  2. **Geração Automática com IA**:
     - Input: texto (descrição da história) e/ou imagem (cenário/inspiração)
     - Classificação etária e tags de conteúdo
     - Geração completa: título, sinopse, texto inicial, objetivos, imagem de capa
     - Wizard com progresso em tempo real (8 etapas via WebSocket)
     - Reveal dramático em 4 fases (similar a personagens)
  3. **Sistema de Créditos**:
     - 75 créditos (apenas texto) ou 100 créditos (com imagem)
     - Nova fonte de monetização
- **Estimativa**: 3-4 semanas (4 fases detalhadas na spec)
- **Arquivo de spec**: `docs/05-business/planning/features/active/automated-story-generation.md`
- **Branch sugerida**: `feature/automated-story-generation`

**Aprovações do Product Owner**:
- ✅ Feature aprovada para desenvolvimento
- ✅ Prioridade ALTA (após população de personagens)
- ✅ Sistema de geração de personagens já implementado (pode reutilizar padrões)
- ✅ Custos de IA aprovados (75-100 créditos por história)
- ✅ Integração com sistema de créditos existente

**Instruções para Agent Coder**:
1. ⚠️ **PRIORIDADE ALTA** - Feature crítica para engajamento pós-geração de personagens
2. **Sequência**: Iniciar APÓS conclusão da T006 (População de Personagens)
3. Criar branch `feature/automated-story-generation` a partir de `main`
4. Ler spec completa (todos os detalhes técnicos e arquitetura)
5. Seguir roadmap de implementação (4 fases):
   - Fase 1: Criação Manual Refatorada (1 semana)
   - Fase 2: Backend IA (1 semana)
   - Fase 3: Frontend IA (1-1.5 semanas)
   - Fase 4: Polish & Launch (3-4 dias)
6. **IMPORTANTE**: Reutilizar componentes e padrões de personagens
7. **CRÍTICO**: Validar conteúdo gerado (age rating, content warnings)
8. Fazer commits incrementais por fase
9. Abrir PRs por fase major para review gradual

**Requisitos Técnicos Importantes**:
- ✅ Backend:
  - Story Image Analysis Agent (Gemini Vision)
  - Story LLM Compilation (Gemini 1.5 Pro)
  - POST /api/v1/stories/generate endpoint
  - WebSocket handler para progresso em tempo real
  - Integração com ComfyUI para geração de capa
  - Sistema de créditos (deduct upfront)
- ✅ Frontend:
  - Página seleção: /stories/create (Manual vs IA)
  - Criação manual: /stories/new (5 abas)
  - Geração IA: /stories/create-ai (wizard completo)
  - Hooks: useStoryGenerationSocket, useStoryForm
  - Componentes: LoadingAnimation, RevealScreen, FinalRevealScreen
- ✅ Internacionalização:
  - 11 idiomas (reutilizar estrutura existente)
  - 50+ chaves de tradução novas
- ✅ Testes:
  - Unit tests (AI agents, hooks)
  - Integration tests (API endpoints, WebSocket)
  - E2E tests (fluxos completos)
  - Coverage >80%

**ROI Esperado**:
- Aumento de 60% na criação de histórias
- Redução de tempo: 15 minutos → 20 segundos (modo IA)
- Nova fonte de receita: 75-100 créditos por história
- Maior retenção de usuários (contexto para personagens gerados)
- Sinergia com T006: personagens + histórias = ecossistema completo

**Dependências**:
- ✅ Sistema de geração de personagens (implementado)
- ✅ Sistema de créditos (implementado)
- ✅ ComfyUI (configurado)
- ✅ WebSocket infrastructure (existente)
- ⚠️ T006 (População de Personagens) deve ser concluída primeiro para maximizar impacto

---

**Contexto da Tarefa Mobile Hamburger Menu** (T008):
- **Por que crítico**: Header sobrecarregado em mobile (320-375px) causa UX ruim e baixa conversão
- **Objetivo Principal**: Implementar menu hambúrguer responsivo para melhorar experiência mobile
- **Problemas Resolvidos**:
  - ✅ Header overcrowded com múltiplos botões em uma linha
  - ✅ Touch targets muito pequenos (< 44px - padrão WCAG)
  - ✅ Possível scroll horizontal em telas pequenas
  - ✅ Primeira impressão negativa em mobile (60-70% do tráfego)
- **Features Principais**:
  1. **Menu Hambúrguer**:
     - Drawer/Sheet lateral com overlay
     - Animação suave (300ms)
     - Organização em seções (Settings, Auth, Navigation futura)
  2. **Responsive Layout**:
     - Mobile (≤768px): Logo + Hambúrguer
     - Desktop (>768px): Header atual (sem mudanças)
  3. **Acessibilidade**:
     - Touch targets ≥44px (WCAG 2.1 AA)
     - Keyboard navigation (Tab, Escape)
     - Screen reader support (ARIA labels)
     - Focus management
- **Estimativa**: 1-2 dias (quick win!)
- **GitHub Issue**: [#61](https://github.com/leandro-br-dev/charhub/issues/61)
- **Arquivo de spec**: `docs/05-business/planning/features/active/mobile-hamburger-menu.md`
- **Branch sugerida**: `feature/mobile-hamburger-menu`

**Por que Quick Win**:
- ⚡ **Baixa complexidade**: Frontend only, sem backend
- ⚡ **Alto impacto**: Melhora imediata na UX mobile
- ⚡ **Tempo curto**: 1-2 dias de desenvolvimento
- ⚡ **Sem riscos**: Não afeta desktop, mudança isolada
- ⚡ **Pronto para produção**: Pode ser deployed independentemente

**Aprovações do Product Owner**:
- ✅ Feature aprovada para desenvolvimento imediato
- ✅ Prioridade CRÍTICA (UX mobile é crítico)
- ✅ Pode trabalhar em PARALELO com T006 (não há conflitos)
- ✅ Quick win = valor imediato ao usuário

**Instruções para Agent Coder**:
1. ⚠️ **QUICK WIN** - 1-2 dias, alto impacto, baixo risco
2. **Pode trabalhar em PARALELO** com T006 (População de Personagens)
3. Criar branch `feature/mobile-hamburger-menu` a partir de `main`
4. Ler spec completa (detalhes técnicos, componentes, testes)
5. Seguir roadmap de implementação (3 fases):
   - Fase 1: Implementação (1-2 dias) - componentes e funcionalidade
   - Fase 2: Polish & Acessibilidade (1 dia) - ARIA, keyboard nav
   - Fase 3: Testing & Launch (0.5 dia) - testes e deploy
6. **IMPORTANTE**: Não quebrar desktop (usar Tailwind responsive)
7. **CRÍTICO**: Touch targets ≥44px (WCAG 2.1 AA)
8. Testar em dispositivos reais (iPhone, Android)
9. Abrir PR assim que implementação estiver completa

**Requisitos Técnicos Importantes**:
- ✅ Frontend:
  - Modificar: `PublicHeader.tsx` (adicionar responsive mobile/desktop)
  - Criar: `MobileMenuContent.tsx` (conteúdo do drawer)
  - Modificar: `ThemeToggle.tsx` (variante full-width)
  - Modificar: `LanguageSelector.tsx` (variante full-width)
  - Componente: Sheet/Drawer (shadcn/ui ou custom)
  - Breakpoint: 768px (mobile ≤768px, desktop >768px)
- ✅ Acessibilidade:
  - ARIA labels e roles
  - Keyboard navigation (Tab, Escape)
  - Focus management
  - Screen reader support
  - Touch targets ≥44px
- ✅ Testing:
  - Manual: 320px, 375px, 414px, 768px viewports
  - Keyboard navigation
  - Screen reader (VoiceOver/TalkBack)
  - Cross-browser (Chrome, Safari, Firefox)
  - Dark mode
  - E2E tests (Playwright) - opcional

**ROI Esperado**:
- Redução de 40% na taxa de rejeição mobile
- Melhoria de +15% na conversão de signup mobile
- Conformidade WCAG 2.1 AA (acessibilidade)
- Preparação para futuras features de navegação mobile

**Dependências**:
- ✅ UI library existente (shadcn/ui, Headless UI, ou custom)
- ✅ Icons library (lucide-react ou similar)
- ✅ Tailwind CSS (configurado)
- ✅ React Router (navegação)
- ✅ i18next (traduções)
- ⚠️ SEM dependências com T006 ou T007 (pode trabalhar em paralelo)

---

**Contexto da Tarefa TypeScript ESLint 8.x Migration** (T009):
- **Por que importante**: TypeScript ESLint 6.x está desatualizado, com vulnerabilidades e sem novas features
- **Objetivo Principal**: Atualizar de TypeScript ESLint 6.15.0 para 8.49.0 para segurança e qualidade
- **Problemas Resolvidos**:
  - ✅ Vulnerabilidades de segurança em versões antigas
  - ✅ Missing out em novas regras de linting e best practices
  - ✅ Incompatibilidade futura com TypeScript 5.x
  - ✅ Performance de build (ESLint 8 é mais rápido)
- **Features Principais**:
  1. **Atualização de Dependências**:
     - `@typescript-eslint/eslint-plugin`: 6.15.0 → 8.49.0
     - `@typescript-eslint/parser`: 6.15.0 → 8.49.0
  2. **Configuração Atualizada**:
     - Remover regras deprecated
     - Adicionar novas regras recomendadas
     - Atualizar parser options para ESLint 8
  3. **Correção de Código**:
     - Fixar erros de linting de novas regras
     - Auto-fix onde possível
     - Manual fix para casos complexos
- **Estimativa**: 2-4 horas (migração simples, alguns ajustes de código)
- **GitHub Issue**: [#42](https://github.com/leandro-br-dev/charhub/issues/42)
- **Arquivo de spec**: `docs/05-business/planning/features/active/typescript-eslint-8-migration.md`
- **Branch sugerida**: `feature/typescript-eslint-8-migration`

**Aprovações do Product Owner**:
- ✅ Feature aprovada para desenvolvimento
- ✅ Prioridade MÉDIA (não bloqueia features, mas importante para qualidade)
- ✅ Migração deve ser testada em dev e staging antes de produção

**Instruções para Agent Coder**:
1. 🔧 **Tarefa de Manutenção** - Migração de dependências críticas
2. Criar branch `feature/typescript-eslint-8-migration` a partir de `main`
3. Ler spec completa (migration guide e breaking changes)
4. Seguir roadmap de implementação (6 fases):
   - Fase 1: Research & Planning (30 min) - ler migration guide
   - Fase 2: Update Dependencies (15 min) - npm install
   - Fase 3: Update ESLint Config (30-60 min) - .eslintrc.js
   - Fase 4: Run Lint & Fix Issues (1-3 horas) - corrigir erros
   - Fase 5: Testing (30-60 min) - rodar testes
   - Fase 6: CI/CD Verification (15 min) - verificar CI
5. **IMPORTANTE**: Ler migration guide antes de começar
6. **CRÍTICO**: Rodar todos os testes após migração
7. Fazer commits incrementais por fase
8. Abrir PR quando todos os testes passarem

**Requisitos Técnicos Importantes**:
- ✅ Atualizar `package.json` com novas versões
- ✅ Atualizar `.eslintrc.js` (ou `.eslintrc.json`)
- ✅ Remover regras deprecated
- ✅ Adicionar novas regras recomendadas
- ✅ Corrigir todos os erros de linting
- ✅ Rodar `npm run lint` sem erros
- ✅ Rodar `npm test` com 100% pass
- ✅ Verificar CI/CD pipeline

**ROI Esperado**:
- Eliminação de vulnerabilidades conhecidas
- Melhoria na qualidade do código (novas regras)
- Build mais rápido (performance ESLint 8)
- Preparação para futuras atualizações do TypeScript
- Melhor DX com mensagens de erro mais claras

**Dependências**:
- ✅ TypeScript 5.x (já instalado)
- ✅ ESLint 8.x (verificar versão)
- ⚠️ Coordenar com Agent Reviewer para deploy em produção

---

**Contexto da Tarefa Prisma 7.x Migration** (T010):
- **Por que importante**: Prisma 6.x ficará legacy em breve, com performance inferior e sem novas features
- **Objetivo Principal**: Atualizar de Prisma 6.x para 7.x para performance e segurança
- **Problemas Resolvidos**:
  - ✅ Performance de queries (até 40% mais rápidas no Prisma 7)
  - ✅ Vulnerabilidades em dependências antigas
  - ✅ Missing out em novas features (TypedSQL, improved relations)
  - ✅ Compatibilidade futura com PostgreSQL e Node.js
- **Features Principais**:
  1. **Atualização de Dependências**:
     - `@prisma/client`: 6.17.1 → 7.1.0
     - `prisma`: 6.19.0 → 7.1.0
  2. **Schema Validation**:
     - Validar schema com Prisma 7
     - Verificar migrações existentes
     - Regenerar Prisma Client
  3. **Performance Testing**:
     - Benchmark queries antes/depois
     - Verificar melhoria de performance
     - Validar que não há regressions
- **Estimativa**: 3-5 horas (backup de DB, migração, testes extensivos)
- **GitHub Issue**: [#41](https://github.com/leandro-br-dev/charhub/issues/41)
- **Arquivo de spec**: `docs/05-business/planning/features/active/prisma-7-migration.md`
- **Branch sugerida**: `feature/prisma-7-migration`

**⚠️ CRÍTICO - Backup Obrigatório**:
- **SEMPRE** fazer backup do banco de dados antes de migrar
- Testar em dev primeiro, depois staging, por último produção
- Ter plano de rollback pronto

**Aprovações do Product Owner**:
- ✅ Feature aprovada para desenvolvimento
- ✅ Prioridade MÉDIA (importante mas não urgente)
- ✅ Coordenar com Agent Reviewer para migração em produção
- ✅ Backup de banco de dados OBRIGATÓRIO

**Instruções para Agent Coder**:
1. 🔧 **Tarefa de Manutenção Crítica** - Migração de ORM e banco de dados
2. **OBRIGATÓRIO**: Backup de banco de dados antes de qualquer coisa
3. Criar branch `feature/prisma-7-migration` a partir de `main`
4. Ler spec completa (migration guide e breaking changes)
5. Seguir roadmap de implementação (10 fases):
   - Fase 1: Research & Planning (45 min) - ler migration guide
   - Fase 2: Backup & Safety (15 min) - **OBRIGATÓRIO** backup DB
   - Fase 3: Update Dependencies (15 min) - npm install
   - Fase 4: Regenerate Prisma Client (10 min) - prisma generate
   - Fase 5: Schema Validation (20 min) - prisma validate
   - Fase 6: Test Migrations (30-60 min) - prisma migrate
   - Fase 7: Test Database Operations (1-2 horas) - rodar testes
   - Fase 8: Performance Testing (30-60 min) - benchmarks
   - Fase 9: Integration Testing (1 hora) - testar API endpoints
   - Fase 10: Staging Deployment (1-2 horas) - deploy staging
6. **CRÍTICO**: NUNCA migrar produção sem backup
7. **IMPORTANTE**: Testar em dev e staging antes de produção
8. Fazer commits incrementais por fase
9. Abrir PR quando staging estiver validado

**Requisitos Técnicos Importantes**:
- ✅ Backup de banco de dados (dev, staging, produção)
- ✅ Atualizar `package.json` com Prisma 7.x
- ✅ Regenerar Prisma Client
- ✅ Validar schema: `npx prisma validate`
- ✅ Testar migrações: `npx prisma migrate deploy`
- ✅ Rodar todos os testes de banco de dados
- ✅ Benchmark de performance (antes/depois)
- ✅ Verificar que não há regressions
- ✅ Coordenar com Agent Reviewer para produção

**ROI Esperado**:
- Redução de 20-40% no tempo de resposta de queries
- Eliminação de vulnerabilidades conhecidas
- Preparação para TypedSQL e outras features
- Melhor type safety no TypeScript
- Melhoria na experiência de desenvolvimento

**Dependências**:
- ✅ PostgreSQL 12+ (verificar versão)
- ✅ Node.js 18+ (verificar versão)
- ✅ TypeScript 5.x (já instalado)
- ⚠️ Coordenar com Agent Reviewer para produção (backup + migração)

---

**Contexto da Tarefa Dashboard Infinite Scroll** (T011):
- **Por que ALTA prioridade**: Dashboard mostra apenas 8 personagens, limitando descoberta de conteúdo
- **Objetivo Principal**: Implementar scroll infinito com carregamento responsivo baseado em tamanho de tela
- **Problemas Resolvidos**:
  - ✅ Limite fixo de 8 personagens impede visualização de catálogo completo
  - ✅ Experiência ruim em telas grandes (muito espaço vazio)
  - ✅ Usuários não descobrem personagens além dos primeiros 8
  - ✅ Performance pode ser otimizada com carregamento sob demanda
- **Features Principais**:
  1. **Cálculo Dinâmico de Cards por Fileira**:
     - Mobile (< 640px): 1-2 cards
     - Tablet (640-1024px): 3-4 cards
     - Desktop (1024-1440px): 4-5 cards
     - Large Desktop (> 1440px): 6+ cards
  2. **Carregamento Inicial Inteligente**:
     - 4 fileiras completas (16-24 personagens dependendo do dispositivo)
     - Loading skeleton durante carregamento
  3. **Infinite Scroll**:
     - IntersectionObserver API
     - Trigger em 90% do viewport
     - Carrega 2 fileiras por vez
     - Loading spinner e end-of-list message
  4. **Backend API Enhancement**:
     - Response com `{ characters, total, hasMore }`
     - Support para `skip` e `limit` parameters
- **Estimativa**: 8-10 horas
- **Arquivo de spec**: `docs/05-business/planning/features/active/dashboard-infinite-scroll.md`
- **Branch sugerida**: `feature/dashboard-infinite-scroll`

**Aprovações do Product Owner**:
- ✅ Feature aprovada para desenvolvimento
- ✅ Prioridade ALTA (impacta diretamente discovery de conteúdo)
- ✅ Performance mantida (< 2s initial load, < 500ms load more)

**Instruções para Agent Coder**:
1. 🔥 **ALTA PRIORIDADE** - Melhora significativa na descoberta de conteúdo
2. Criar branch `feature/dashboard-infinite-scroll`
3. Seguir fases da spec:
   - Fase 1: Create useCardsPerRow hook (45 min)
   - Fase 2: Create useInfiniteScroll hook (1.5 hours)
   - Fase 3: Update Dashboard component (2 hours)
   - Fase 4: Update Character Service (30 min)
   - Fase 5: Backend API update if needed (30 min)
   - Fase 6: Loading states UI (45 min)
4. **IMPORTANTE**: Testar em diferentes tamanhos de tela (320px, 768px, 1440px, 2560px)
5. **CRÍTICO**: Performance mantida (60fps scroll, sem jank)

**ROI Esperado**:
- Aumento de 300-400% em personagens visíveis
- Melhora de 60% na taxa de descoberta
- Experiência moderna e fluida
- Performance otimizada

---

**Contexto da Tarefa Discovery Enhanced Filters** (T012):
- **Por que ALTA prioridade**: Aba "Descobrir" tem apenas toggle Populares/Favoritos, sem filtros avançados
- **Objetivo Principal**: Adicionar filtros de Gênero e Espécie para melhor descoberta de personagens
- **Problemas Resolvidos**:
  - ✅ Usuários não conseguem filtrar por características demográficas
  - ✅ Dificulta encontrar personagens específicos em catálogo grande
  - ✅ Rolagem infinita sem filtros pode ser frustrante
  - ✅ Diversidade de personagens não é evidenciada
- **Features Principais**:
  1. **Filtro de Gênero**:
     - Checkboxes múltiplos (Male, Female, Non-Binary, Other, Unknown)
     - Contadores dinâmicos (ex: "Female (342)")
     - Persistência em localStorage
  2. **Filtro de Espécie**:
     - Checkboxes múltiplos (Human, Elf, Robot, Furry, Demon, Angel, Vampire, Other)
     - Contadores dinâmicos
     - Persistência em localStorage
  3. **UI Responsiva**:
     - Desktop: Sidebar permanente com filtros
     - Mobile: Bottom sheet/collapsible com ícone de filtro
     - Badge mostrando número de filtros ativos
  4. **Backend Enhancements**:
     - GET /api/v1/characters/filter-options (retorna genders/species com counts)
     - Update GET /api/v1/characters (aceita gender[] e species[] parameters)
  5. **Integração com Filtros Existentes**:
     - Funciona junto com Age Rating, Populares/Favoritos
     - Botão "Limpar Filtros"
- **Estimativa**: 10 horas
- **Arquivo de spec**: `docs/05-business/planning/features/active/discovery-enhanced-filters.md`
- **Branch sugerida**: `feature/discovery-enhanced-filters`

**Aprovações do Product Owner**:
- ✅ Feature aprovada para desenvolvimento
- ✅ Prioridade ALTA (melhora significativa em content discovery)
- ✅ Dados de gender/species já existem no banco (campos opcionais)

**Instruções para Agent Coder**:
1. 🔥 **ALTA PRIORIDADE** - Critical for content discovery
2. Criar branch `feature/discovery-enhanced-filters`
3. Seguir fases da spec:
   - Backend (2 hours): filter-options endpoint + character list update
   - Frontend hooks (1.5 hours): useCharacterFilters hook
   - Frontend components (2-3 hours): GenderFilter, SpeciesFilter, FilterPanel
   - Mobile UI (1 hour): MobileFilterSheet
   - Integration (1.5 hours): Integrate into dashboard
4. **IMPORTANTE**: Testar combinações de filtros (gender + species + age rating)
5. **CRÍTICO**: Performance de queries (ensure DB indexes on gender/species)

**ROI Esperado**:
- Redução de 60-70% no tempo para encontrar personagens específicos
- Aumento de 30-40% na taxa de interação
- Melhor distribuição de visualizações

---

**Contexto da Tarefa Automated Character Generation Improvements** (T013):
- **Por que ALTA prioridade**: Geração automática do Civit.ai tem 3 problemas críticos de qualidade
- **Objetivo Principal**: Corrigir qualidade, diversidade e censura no fluxo de geração programática
- **Problemas Resolvidos**:
  - ✅ **FIX 1 - Sorting**: Imagens de baixa qualidade selecionadas (ordering parece invertido)
  - ✅ **FIX 2 - Diversidade**: Muitas imagens da mesma referência (10/20 mesmo personagem)
  - ✅ **FIX 3 - Censura**: Bloqueio excessivo de conteúdo adulto apropriado (decotes, roupas ajustadas)
- **Features Principais**:
  1. **FIX 1 - Correção de Sorting** (1-2 hours):
     - Usar sort correto: "Most Reactions" ao invés de "Newest"
     - Verificar ordem (descending - melhores primeiro)
     - Adicionar threshold mínimo (50+ reactions)
     - Quality verification
  2. **FIX 2 - Diversidade Forçada** (3-4 hours):
     - Adicionar colunas `gender` e `species` ao CuratedImage schema
     - AI extrai metadata durante curation
     - Enhanced diversification algorithm:
       - Max 2-3 mesmo gender consecutivo
       - Max 2 mesma species consecutiva
       - Target distribution (50% female, 35% male, 15% other)
     - Dashboard tracking de distribuição
  3. **FIX 3 - Censura Inteligente** (2-3 hours):
     - Civit.ai API: nsfw: 'Soft' ou 'Mature' (ao invés de 'None')
     - Enhanced content analyzer:
       - Approve: SFW, Soft NSFW (16+), Mature NSFW (18+)
       - Reject: Explicit pornography, gore, minors in suggestive content
     - Age rating classification melhorada
- **Estimativa**: 10-12 horas (3 fixes independentes)
- **Arquivo de spec**: `docs/05-business/planning/features/active/automated-character-generation-improvements.md`
- **Branch sugerida**: `feature/civitai-improvements`

**Aprovações do Product Owner**:
- ✅ Feature aprovada para desenvolvimento
- ✅ Prioridade ALTA (qualidade de personagens gerados impacta todo produto)
- ✅ Conteúdo adulto apropriado é parte do modelo de negócio

**Instruções para Agent Coder**:
1. 🔥 **ALTA PRIORIDADE** - Impacta qualidade de todo conteúdo gerado automaticamente
2. Criar branch `feature/civitai-improvements`
3. **Sequência recomendada**:
   - Começar com FIX 1 (Sorting) - quick win, alto impacto (1-2 hours)
   - Depois FIX 3 (Censura) - abre mais conteúdo (2-3 hours)
   - Por fim FIX 2 (Diversidade) - mais complexo (3-4 hours)
4. **CRÍTICO**: Testar sorting verificando reaction counts estão em ordem decrescente
5. **IMPORTANTE**: Monitor quality metrics após cada fix em produção

**ROI Esperado**:
- Qualidade de imagens: +80-90% (avg reactions 20→100+)
- Diversidade: Distribuição balanceada (50% F, 35% M, 15% Other)
- Conteúdo adulto: 30-40% do catálogo (classificado apropriadamente)
- User satisfaction: 2.5/5 → 4/5

---

**Contexto da Tarefa Character Image Generation Multi-Stage Workflow** (T014):
- **Por que ALTA prioridade**: Imagens de personagens têm inconsistência visual entre gerações
- **Objetivo Principal**: Criar dataset progressivo de 4 imagens (avatar → frente → lado → costas) usando cada como referência para próxima
- **⚠️ ATENÇÃO**: Requer **Phase 0 - ComfyUI API Assessment** ANTES de iniciar implementação
- **Problemas Resolvidos**:
  - ✅ Inconsistência visual entre imagens do mesmo personagem
  - ✅ Cada nova geração "esquece" características anteriores
  - ✅ Falta de referência visual consistente
  - ✅ Usuários precisam usar LoRAs externos ou refazer manualmente
- **Features Principais**:
  1. **Multi-Stage Generation Pipeline**:
     - Stage 1: Avatar (face focus) com referências opcionais do usuário
     - Stage 2: Front full body usando avatar como referência
     - Stage 3: Side full body usando avatar + front
     - Stage 4: Back full body usando avatar + front + side
  2. **Temporary Folder Management**:
     - Upload de imagens para pasta temporária no ComfyUI
     - Cada estágio usa imagens anteriores como referência
     - Cleanup automático após conclusão
  3. **Reference Dataset Storage**:
     - 4 imagens salvas no R2 com tipos especiais:
       - REFERENCE_AVATAR
       - REFERENCE_FRONT
       - REFERENCE_SIDE
       - REFERENCE_BACK
     - Não aparecem em galeria por padrão
     - Visíveis apenas no modo de edição
     - Usadas em gerações futuras do mesmo personagem
  4. **Progress Tracking UI**:
     - Real-time progress (1/4, 2/4, 3/4, 4/4)
     - Cada imagem aparece conforme gerada
     - Estimativa de tempo (8-12 min total)
- **⚠️ CRITICAL - Phase 0: ComfyUI API Assessment** (1-2 hours):
  - **MUST VERIFY BEFORE IMPLEMENTING**:
    1. Temporary folder creation API
    2. Upload multiple images to folder API
    3. Workflow with multiple IP-Adapter inputs
    4. Cleanup temp folder API
  - **If limitations found**: Document in `docs/technical/comfyui-api-limitations.md`
  - **Action**: Create GitHub issues for ComfyUI team if needed
- **Estimativa**: 12-16 hours (SE ComfyUI API suportar)
- **Arquivo de spec**: `docs/05-business/planning/features/active/character-image-generation-multi-stage-workflow.md`
- **Branch sugerida**: `feature/multi-stage-image-generation`

**Aprovações do Product Owner**:
- ✅ Feature aprovada APÓS confirmação de capacidades da API ComfyUI
- ✅ Prioridade ALTA (diferencial competitivo único)
- ✅ Tempo de geração longo (8-12 min) é aceitável com feedback claro

**Instruções para Agent Coder**:
1. 🔥 **START WITH PHASE 0** - Verify ComfyUI API capabilities FIRST
2. **DO NOT proceed with implementation until Phase 0 complete**
3. Se limitations encontradas:
   - Documentar em `docs/technical/comfyui-api-limitations.md`
   - Criar issues para CharhubComfyUI team
   - Aguardar API enhancements OU implementar versão simplificada
4. Se capabilities existem:
   - Criar branch `feature/multi-stage-image-generation`
   - Seguir 6 fases da spec (12-16 hours total)
5. **CRÍTICO**: Long-running job (8-12 min) - usar queue com polling
6. **IMPORTANTE**: Clear progress feedback para usuário

**ROI Esperado**:
- Consistência visual: 80-90% entre imagens do mesmo personagem
- Redução de 60% em retrabalho manual
- Feature única vs concorrentes
- Qualidade percebida aumenta significativamente

**Dependências**:
- ⚠️ **BLOCKER**: CharhubComfyUI API capabilities (Phase 0)
- ✅ BullMQ queue (já implementado)
- ✅ R2 storage (já implementado)
- ✅ WebSocket infrastructure (já implementado)

---

**Contexto da Tarefa UI Improvements (Sidebar + Age Tags)** (T015):
- **Por que MÉDIA prioridade**: Duas melhorias de qualidade de código e UX
- **Objetivo Principal**: Corrigir filtro do sidebar + unificar componente de age rating badge
- **Problemas Resolvidos**:
  - ✅ **Sidebar**: Mostra todos personagens públicos ao invés de apenas próprios + favoritos
  - ✅ **Age Rating**: Implementações duplicadas em múltiplos lugares (manutenção difícil)
- **Features Principais**:
  1. **Sidebar Characters Filter Fix** (1.5-2 hours):
     - Fetch apenas personagens próprios do usuário + favoritos
     - Ordenação: próprios primeiro, depois favoritos
     - Deduplicação (se personagem é both own and favorite)
     - Limit de 10-15 personagens
     - Empty state com CTA para criar primeiro personagem
  2. **Age Rating Component Unification** (2.5-3 hours):
     - Criar `components/ui/AgeRatingBadge.tsx`
     - Props: ageRating, size (sm/md/lg), variant (overlay/inline)
     - Color system: L=green, 16+=orange, 18+=black
     - Label formatado: "18+" ao invés de "EIGHTEEN"
     - Replace all duplicate implementations:
       - CharacterCard.tsx
       - Character/Story description pages
       - Other locations
     - Remove old helper functions
- **Estimativa**: 5-6 horas
- **Arquivo de spec**: `docs/05-business/planning/features/active/ui-improvements-sidebar-and-age-tags.md`
- **Branch sugerida**: `feature/ui-improvements-sidebar-age-tags`

**Aprovações do Product Owner**:
- ✅ Feature aprovada para desenvolvimento
- ✅ Prioridade MÉDIA (quality of life improvements)
- ✅ Pode ser agrupada em uma única PR

**Instruções para Agent Coder**:
1. 🟡 **MÉDIA PRIORIDADE** - Quality improvements
2. Criar branch `feature/ui-improvements-sidebar-age-tags`
3. **Part 1 - Sidebar** (1.5-2 hours):
   - Update CharacterListSidebar.tsx
   - Fetch own + favorites characters
   - Deduplicate and limit to 15
4. **Part 2 - Age Rating Component** (2.5-3 hours):
   - Create AgeRatingBadge.tsx component
   - Replace in CharacterCard.tsx
   - Find and replace all other implementations:
     - `grep -r "ageRating" frontend/src --include="*.tsx"`
5. **IMPORTANTE**: Visual regression testing (all badges look identical)
6. **CRÍTICO**: Maintain exact visual appearance

**ROI Esperado**:
- Sidebar: Acesso rápido a personagens relevantes (own + favorites)
- Age Rating: -100 lines de código duplicado, manutenção unificada
- Code quality e consistency improvements

---

### Semana de 23-30 Dezembro

| Tarefa | Agente | Status | Detalhes |
|--------|--------|--------|----------|
| **Dashboard Público com Login/Signup** | Agent Coder | ✅ Concluído | Feature implementada e deployed. Movida para `implemented/`. |
| **Roleplay Message Formatting** | Agent Coder | ✅ Concluído | Feature implementada e deployed. Movida para `implemented/`. |

**Contexto da Tarefa Dashboard Público** (T005):
- **Por que urgente**: Dashboard é a área mais informativa do site mas está inacessível para visitantes
- **Objetivo Principal**: Transformar dashboard em landing page pública, permitindo exploração de conteúdo "Livre" antes do signup
- **Problemas Resolvidos**:
  - ✅ Visitantes não conseguem ver funcionalidades do CharHub antes de fazer login
  - ✅ Taxa de conversão baixa (sem "try before you buy")
  - ✅ Conteúdo "Livre" não é aproveitado para atrair novos usuários
  - ✅ Falta de call-to-action claro para signup
- **Features Principais**:
  1. Dashboard acessível sem login em `charhub.app`
  2. Filtro automático: apenas conteúdo "Livre" para visitantes
  3. Sidebar oculta quando não autenticado
  4. Botão Login/Signup visível no topo
  5. Proteção de rotas: redirect para signup ao tentar acessar áreas privadas
  6. Redirect inteligente: retornar à URL original após login
- **Estimativa**: 1-2 semanas (6 fases detalhadas na spec)
- **Arquivo de spec**: `docs/05-business/planning/features/active/public-dashboard.md`
- **Branch sugerida**: `feature/public-dashboard`

**Instruções para Agent Coder**:
1. ⚠️ **PRIORIDADE MÁXIMA** - Feature crítica para aquisição de usuários
2. Criar branch `feature/public-dashboard` a partir de `main`
3. Ler spec completa (todos os detalhes técnicos e fluxos de usuário)
4. Seguir roadmap de implementação (6 fases):
   - Fase 1: Backend (se necessário) - 1 dia
   - Fase 2: Frontend - Estrutura Base - 2 dias
   - Fase 3: Proteção de Rotas - 1 dia
   - Fase 4: UI/UX - 2 dias
   - Fase 5: Testes - 2 dias
   - Fase 6: Documentação & Deploy - 1 dia
5. **CRÍTICO**: Manter segurança - não expor dados sensíveis
6. Fazer commits incrementais por fase
7. Abrir PR quando Fases 1-3 estiverem completas para review inicial
8. Agent Reviewer testará localmente após cada fase major

**Requisitos Técnicos Importantes**:
- ✅ Remover ProtectedRoute da rota `/dashboard`
- ✅ Implementar filtro de conteúdo por `accessLevel: "Livre"`
- ✅ Criar componente PublicHeader com botões Login/Signup
- ✅ Ocultar Sidebar para usuários não autenticados
- ✅ Salvar URL original para redirect após login
- ✅ Proteger todas as outras rotas (chat, profile, settings, etc.)
- ✅ Testes de integração (coverage > 80%)
- ✅ Responsividade mobile

### Semana de 20-27 Dezembro

| Tarefa | Agente | Status | Detalhes |
|--------|--------|--------|----------|
| **Welcome Flow + Content Restrictions** | Agent Coder | ✅ Concluído | PR merged e deployed em produção. |
| **Fix Subscription Credits Logic** | Agent Coder | ✅ Concluído | PR merged e deployed em produção. |

**Contexto da Tarefa Welcome Flow + Content Restrictions** (T004):
- **Status**: ✅ **CONCLUÍDO E DEPLOYED**
- **Objetivo**: Implementar onboarding guiado + sistema robusto de restrições de conteúdo por idade
- **Resultado**: Sistema de welcome flow ativo em produção com validação de idade
- **Arquivo de spec**: `docs/05-business/planning/features/implemented/welcome-flow-and-content-restrictions.md` (movido para implemented)

### Semana de 14-20 Dezembro

| Tarefa | Agente | Status | Detalhes |
|--------|--------|--------|----------|
| **Integração Stripe** | Agent Coder | ✅ Concluído | PR merged e deployed em produção. |

**Contexto da Tarefa Stripe** (T003):
- **Status**: ✅ **CONCLUÍDO E DEPLOYED**
- **Objetivo**: Habilitar pagamentos reais em produção com Stripe
- **Abordagem**: Payment Provider Adapter Pattern implementado
- **Resultado**: Sistema de pagamentos ativo em produção
- **Arquivo de spec**: `docs/05-business/planning/features/implemented/stripe-payment-integration.md` (movido para implemented)

### Semana de 23-29 Novembro

| Tarefa | Agente | Status | PR | Merge |
|--------|--------|--------|----|----|
| Feature ABC | Agent Coder | ✅ Concluído | #42 | 28/11 |
| Bug XYZ | Agent Coder | ✅ Concluído | #43 | 29/11 |

---

## 📋 Template para Novas Atribuições

Quando o Agent Reviewer identifica uma nova tarefa, ela segue este ciclo:

### 1. **Análise** (Segunda-feira)
```
Tarefa: [Nome]
Prioridade: [Alta/Média/Baixa]
Complexidade: [Baixa/Média/Alta]
Agente Designado: Agent Coder (padrão) ou outro
Arquivo TODO: /docs/todo/[nome-detalhado].md
```

### 2. **Planejamento** (Terça)
```
Arquivo de Plano: Criado em /docs/todo/
Detalhamento: Requisitos, design, testes
Estimativa: Horas/dias
Status: Pronto para Coder
```

### 3. **Desenvolvimento** (Quarta-Sexta)
```
Status: Agent Coder em desenvolvimento
Branch: feature/[nome-da-feature]
Comunicação: Via GitHub Issues se necessário
```

### 4. **Revisão & Merge** (Sexta-Segunda)
```
PR: Abre na sexta ou segunda
Teste: Agent Reviewer testa
Status: Merge → Deploy → Monitoring
```

---

## 🔄 Ciclo de Vida de uma Tarefa

```
user-notes.md (anotação)
         ↓
agent-assignments.md (planejamento)
         ↓
/docs/todo/[tarefa].md (plano detalhado)
         ↓
Agent Coder (feature branch)
         ↓
GitHub PR
         ↓
Agent Reviewer (teste + merge)
         ↓
Deploy em Produção
         ↓
Monitoramento & Métricas
```

---

## 📈 Métricas de Produtividade

### Novembro 2025
- **Tarefas Concluídas:** 2
- **Tempo Médio por Tarefa:** 4 dias
- **Taxa de Sucesso (1º deploy):** 100%
- **Bugs Encontrados em Teste:** 0

### Próximo Mês (Dezembro)
- **Meta:** 4-5 tarefas concluídas
- **Foco:** Notificações + Performance + UX

---

## 🤖 Comunicação Inter-Agentes

### Agent Reviewer → Agent Coder
- **Método:** GitHub Issues / Project
- **Frequência:** Às segundas-feiras
- **Conteúdo:** Tarefas priorizadas para semana

### Agent Coder → Agent Reviewer
- **Método:** Pull Requests
- **Frequência:** Ao concluir tarefa
- **Conteúdo:** Feature implementada, documentação, testes

### Feedback Loop
- **Agent Reviewer:** Testa PR
- **Se OK:** Mergeia e Deploy
- **Se Erro:** Retorna para Agent Coder com detalhes

---

## 📝 Atualizações Necessárias Regularmente

Estas seções devem ser atualizadas:

- **Toda Segunda-feira:** Adicionar novas tarefas planejadas
- **Toda Sexta-feira:** Atualizar status de PRs
- **Após Merge:** Adicionar ao "Histórico Recente"
- **Mensalmente:** Revisar métricas e ajustar estimativas

---

## 🔗 Referências

- Tarefas detalhadas: `/docs/todo/`
- Anotações do usuário: `/docs/user-notes.md`
- Roadmap estratégico: `/docs/ROADMAP.md`
- Deploy logs: `/docs/deploy/deploy-log.md`
