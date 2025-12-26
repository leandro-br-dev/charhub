# Agent Assignments - Rastreamento de Tarefas

Este arquivo mantém o histórico de **qual tarefa está sendo feita por qual agente** e seu status atual.

O **Agent Reviewer** atualiza este arquivo **a cada segunda-feira** após revisar `user-notes.md` e explorar `/docs/todo/`.

---

## 📊 Status Atual: 25 de Dezembro de 2025

### Tarefas em Progresso

| ID | Tarefa | Agente | Status | Branch | ETA | Último Update |
|---|--------|--------|--------|--------|-----|---------------|
| T006 | **Sistema de População Automática de Personagens (Civitai)** | Agent Coder | 🚀 Pronto para Iniciar | `feature/automated-character-population` (a criar) | 31/01/2026 | 25/12 - Spec criada e aprovada - **PRIORIDADE CRÍTICA** |

---

### Tarefas Planejadas (Próximas na Fila)

| Ordem | Tarefa | Prioridade | Estimado | Notas |
|-------|--------|-----------|----------|-------|
| 1️⃣ | Sistema de Notificações | ALTA | 1-2 semanas | Impacto alto em retenção |
| 2️⃣ | Fix Performance Galeria | ALTA | 3-5 dias | Investigação + otimização |
| 3️⃣ | Sugestões Inteligentes | MÉDIA | 1 semana | Recomendações por tags |
| 4️⃣ | Redesign Página Perfil | BAIXA | 3-4 dias | UI/UX improvement |

---

## 🚀 Histórico Recente de Atribuições

### Semana de 25-31 Dezembro

| Tarefa | Agente | Status | Detalhes |
|--------|--------|--------|----------|
| **Sistema de População Automática de Personagens** | Agent Coder | ✅ Atribuído | Spec completa em `active/automated-character-population.md`. **PRIORIDADE CRÍTICA** - Iniciar imediatamente. |

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
