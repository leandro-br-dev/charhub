# Agent Assignments - Rastreamento de Tarefas

Este arquivo mantém o histórico de **qual tarefa está sendo feita por qual agente** e seu status atual.

O **Agent Reviewer** atualiza este arquivo **a cada segunda-feira** após revisar `user-notes.md` e explorar `/docs/todo/`.

---

## 📊 Status Atual: 20 de Dezembro de 2025

### Tarefas em Progresso

| ID | Tarefa | Agente | Status | Branch | ETA | Último Update |
|---|--------|--------|--------|--------|-----|---------------|
| T004 | **Welcome Flow + Content Restrictions** | Agent Coder | 🚀 Pronto para Iniciar | `feature/welcome-flow-content-restrictions` (a criar) | 10/01/2026 | 20/12 - Spec criada e aprovada |

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

### Semana de 20-27 Dezembro

| Tarefa | Agente | Status | Detalhes |
|--------|--------|--------|----------|
| **Welcome Flow + Content Restrictions** | Agent Coder | ✅ Atribuído | Spec completa em `active/welcome-flow-and-content-restrictions.md`. **PRIORIDADE MÁXIMA** - Iniciar imediatamente. |

**Contexto da Tarefa Welcome Flow + Content Restrictions** (T004):
- **Por que urgente**: Sistema atual permite menores acessarem conteúdo 18+, risco legal de compliance
- **Objetivo Principal**: Implementar onboarding guiado + sistema robusto de restrições de conteúdo por idade
- **Problemas Resolvidos**:
  - ✅ Usuários novos não preenchem dados essenciais (displayName, birthdate, etc)
  - ✅ languagePreference não é capturado no OAuth signup
  - ✅ Age rating sem validação de idade real
  - ✅ Menores podem selecionar conteúdo 18+
- **Features Principais**:
  1. Welcome Modal multi-step (7 steps) com salvamento progressivo
  2. Auto-captura de idioma no OAuth (i18nextLng → languagePreference)
  3. Age Rating Dropdown com validação inteligente
  4. Auto-ativação de classificações inferiores
  5. Bloqueio baseado em idade real do usuário
- **Estimativa**: 2-3 semanas (8 fases detalhadas na spec)
- **Arquivo de spec**: `docs/05-business/planning/features/active/welcome-flow-and-content-restrictions.md`
- **Branch sugerida**: `feature/welcome-flow-content-restrictions`

**Instruções para Agent Coder**:
1. ⚠️ **PRIORIDADE MÁXIMA** - Iniciar antes do Stripe (compliance legal)
2. Criar branch `feature/welcome-flow-content-restrictions` a partir de `main`
3. Ler spec completa (1000+ linhas com todos os detalhes técnicos)
4. Seguir roadmap de implementação (8 fases):
   - Fase 1: Backend Foundation (dias 1-3)
   - Fase 2: Frontend Welcome Modal (dias 4-7)
   - Fase 3: Age Rating Dropdown (dias 8-9)
   - Fase 4: OAuth Language Capture (dia 10)
   - Fase 5: Content Filtering API (dias 11-12)
   - Fase 6: Refatoração (dia 13)
   - Fase 7: Testing & QA (dia 14)
   - Fase 8: Documentation (dia 15)
5. **CRÍTICO**: Reutilizar componentes existentes do Profile (zero duplicação)
6. Fazer commits incrementais por fase
7. Abrir PR quando Fase 1-2 estiverem completas para review inicial
8. Agent Reviewer testará localmente após cada fase major

**Requisitos Técnicos Importantes**:
- ✅ Migration Prisma com novos campos no User model
- ✅ Validação de idade no backend (calculateAge, getMaxAllowedAgeRating)
- ✅ 3 novos endpoints: welcome-progress, complete-welcome, age-rating-info
- ✅ Modal não-bloqueante (usuário pode pular, mas dados são salvos)
- ✅ Testes unitários + integração + E2E (coverage > 80%)
- ✅ Componentes compartilhados entre WelcomeModal e Profile

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
