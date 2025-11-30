# Anotações do Usuário

Este arquivo é o local onde o usuário (você) registra **features**, **bugs** e **melhorias** que precisam de atenção imediata.

O **Agent Reviewer** revisa este arquivo **a cada segunda-feira** para atualizar prioridades e comunicar ao Agent Coder.

---

## 📝 Como Usar Este Arquivo

1. **Adicione uma nova entrada** no formato abaixo quando identificar uma tarefa
2. **Incluir contexto**: Por que é importante? Qual é o impacto?
3. **Incluir prioridade**: Alta, Média ou Baixa
4. **O Agent Reviewer irá**:
   - Ler todas as anotações
   - Criar planos detalhados em `/docs/todo/`
   - Atualizar `/docs/agent-assignments.md`
   - Comunicar ao Agent Coder via tarefa priorizada

---

## 📋 Formato das Entradas

```markdown
### [PRIORIDADE] - [Tipo]: Título Descritivo

**Descrição:**
[Explicação clara do que precisa ser feito]

**Por que é importante:**
[Impacto no produto, usuários ou receita]

**Contexto Adicional:**
[Links, métricas, screenshots, etc.]

**Data de Criação:** [DATA]
**Última Atualização:** [DATA]
**Status:** Novo / Em Análise / Planejado / Em Desenvolvimento / Concluído

---
```

---

## 🚀 Tarefas Ativas (Últimas Adições)

### [ALTA] - FEATURE: Sistema de Notificações em Tempo Real

**Descrição:**
Usuários estão perdendo mensagens de chat quando estão offline. Precisamos implementar um sistema de notificações (email, push) que alerte usuários sobre:
- Novas mensagens em conversas ativas
- Mencões diretas
- Respostas a mensagens antigas

**Por que é importante:**
- Aumentar engagement: 40% dos usuários relatam "perder atualizações"
- Melhorar retenção: Usuários que recebem notificações têm churn 25% menor
- Monetização: Notificações premium (customizadas) podem ser feature paga

**Contexto Adicional:**
- Usuários mencionaram isso 3 vezes nas últimas 2 semanas
- Competidores já têm esse recurso
- Estimar: 1-2 semanas de desenvolvimento

**Data de Criação:** 30/11/2025
**Última Atualização:** 30/11/2025
**Status:** Novo

---

### [ALTA] - BUG: Performance lenta ao carregar galeria de caracteres

**Descrição:**
Quando um usuário acessa a galeria de caracteres (hub), a página demora 3-5 segundos para renderizar com imagens. Parece ser um problema de cache ou de requisições simultâneas para Cloudflare R2.

**Por que é importante:**
- UX degradada: usuários abandonam página antes de carregar
- Taxa de rejeição alta na galeria
- Possível impacto em conversão (usuários não conseguem explorar caracteres)

**Contexto Adicional:**
- Ocorre mesmo com cache local
- Problema mais pronunciado em conexões 4G
- Revisor deve investigar: número de requisições, tamanho das imagens, cache headers

**Data de Criação:** 28/11/2025
**Última Atualização:** 30/11/2025
**Status:** Em Análise

---

### [MÉDIA] - FEATURE: Sugestões Inteligentes de Caracteres

**Descrição:**
Sistema de recomendações que sugira caracteres baseado no histórico de chat do usuário. Se o usuário conversa muito sobre ficção científica, mostrar mais caracteres nesse tema.

**Por que é importante:**
- Aumentar descoberta de novos caracteres
- Aumentar time spent in app
- Modelo de receita: caracteres premium podem ser destacados nas recomendações

**Contexto Adicional:**
- Dados já existem para fazer análise (histórico de chats)
- Implementação básica: filtros por tags
- Versão avançada (ML): pode ser futura

**Data de Criação:** 25/11/2025
**Última Atualização:** 30/11/2025
**Status:** Planejado

---

### [BAIXA] - MELHORIAS: UI/UX da página de perfil

**Descrição:**
Página de perfil está com design desatualizado. Usuários reportam dificuldade em encontrar configurações. Redesenhar com:
- Layout mais intuitivo
- Seções claras (Configurações, Histórico, Preferências)
- Temas de cores melhores

**Por que é importante:**
- Satisfação do usuário
- Reduzir tickets de suporte (usuários não encontram opções)

**Contexto Adicional:**
- Design já foi feito em Figma
- Implementação: ~3-4 dias

**Data de Criação:** 20/11/2025
**Última Atualização:** 30/11/2025
**Status:** Planejado

---

## 📊 Resumo de Status

| Tipo | Contagem | Status |
|------|----------|--------|
| Features Novas | 2 | Novo / Planejado |
| Bugs Críticos | 1 | Em Análise |
| Melhorias UI/UX | 1 | Planejado |
| **Total** | **4** | - |

---

## 🗂️ Notas Antigas (Arquivadas)

Tarefas concluídas ou obsoletas serão movidas para `/docs/archive/completed-tasks.md`
