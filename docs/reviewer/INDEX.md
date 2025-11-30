# 📑 Índice de Documentação - Agent Reviewer

Guia de navegação para encontrar o que você precisa rapidamente.

---

## 🚀 **COMECE AQUI** (Ordem Recomendada)

1. **[QUICK-START-REVIEWER.md](./QUICK-START-REVIEWER.md)** ← Leia primeiro! (5 min)
   - Setup de 5 minutos
   - Primeiros passos
   - Problemas comuns

2. **[AGENT-REVIEWER-README.md](./AGENT-REVIEWER-README.md)** ← Depois leia isto (20 min)
   - Visão geral completa
   - Ciclo semanal
   - Exemplos de tarefas reais

3. **[CLAUDE.md](./CLAUDE.md)** ← Seu guia de referência (consulte quando precisar)
   - Responsabilidades detalhadas
   - Comandos essenciais
   - Troubleshooting

---

## 📋 Arquivos de Operação (Seu Dia a Dia)

### **Entrada de Tarefas**
- **[docs/user-notes.md](./docs/user-notes.md)**
  - Onde VOCÊ anota features/bugs
  - Agent Reviewer lê toda segunda-feira
  - Exemplos inclusos

### **Rastreamento de Tarefas**
- **[docs/agent-assignments.md](./docs/agent-assignments.md)**
  - Quem está fazendo o quê
  - Status e ETAs
  - Histórico mensal
  - ATUALIZAR toda segunda-feira

### **Histórico de Deploys**
- **[docs/deploy/deploy-log.md](./docs/deploy/deploy-log.md)**
  - Todos os deploys registrados
  - Status e problemas
  - Checklists pré/pós-deploy
  - ATUALIZAR após cada deploy

### **Relatórios de Métricas**
- **[docs/metrics/weekly-report-template.md](./docs/metrics/weekly-report-template.md)**
  - Template para relatório semanal
  - Estatísticas, receita, bugs, recomendações
  - CRIAR 1x por semana

---

## 🎯 Por Que Você Veio Aqui? (Encontre a Resposta)

### "Quero começar AGORA"
→ Leia: **[QUICK-START-REVIEWER.md](./QUICK-START-REVIEWER.md)**

### "Quero entender meu papel completamente"
→ Leia: **[AGENT-REVIEWER-README.md](./AGENT-REVIEWER-README.md)**

### "Preciso de um comando específico"
→ Vá para: **[CLAUDE.md](./CLAUDE.md)** → Seção "Comandos Essenciais"

### "Como recebo um PR do Agent Coder?"
→ Vá para: **[CLAUDE.md](./CLAUDE.md)** → "Recebendo um Pull Request"

### "Como faço deploy?"
→ Vá para: **[CLAUDE.md](./CLAUDE.md)** → "Merge & Deploy"

### "Como monitoro produção?"
→ Vá para: **[CLAUDE.md](./CLAUDE.md)** → "Monitoramento de Produção"

### "Como faço um relatório semanal?"
→ Copie e preencha: **[docs/metrics/weekly-report-template.md](./docs/metrics/weekly-report-template.md)**

### "O que fazer se quebrar produção?"
→ Vá para: **[CLAUDE.md](./CLAUDE.md)** → "Detectando e Fazendo Rollback"

### "Como registrar uma nova tarefa?"
→ Edite: **[docs/user-notes.md](./docs/user-notes.md)**

### "Como ver status de todas as tarefas?"
→ Consulte: **[docs/agent-assignments.md](./docs/agent-assignments.md)**

### "Como ver histórico de deploys?"
→ Consulte: **[docs/deploy/deploy-log.md](./docs/deploy/deploy-log.md)**

---

## 📊 Estrutura de Pastas (Visual)

```
~/projects/charhub-reviewer/
│
├── 📄 CLAUDE.md                          ← Seu guia de trabalho (consulta)
├── 📄 QUICK-START-REVIEWER.md            ← LEIA PRIMEIRO (5 min)
├── 📄 AGENT-REVIEWER-README.md           ← Leia segundo (20 min)
├── 📄 INDEX.md                           ← Este arquivo
│
├── 📂 docs/
│   ├── 📄 user-notes.md                  ← Você anota tarefas aqui
│   ├── 📄 agent-assignments.md           ← Agent Reviewer atualiza segunda-feira
│   ├── 📄 ROADMAP.md                     ← Plano estratégico
│   ├── 📄 TODO.md                        ← Resumo de tarefas
│   │
│   ├── 📂 deploy/
│   │   └── 📄 deploy-log.md              ← Agent Reviewer atualiza pós-deploy
│   │
│   ├── 📂 metrics/
│   │   ├── 📄 weekly-report-template.md  ← Template (copie e preencha)
│   │   └── 📄 weekly-[data].md           ← Seus relatórios (gerados 1x/semana)
│   │
│   └── 📂 todo/
│       ├── 📄 STORY_GENERATION.md        ← Planos detalhados
│       ├── 📄 CREDITS_SYSTEM.md
│       ├── 📄 CHAT_IMPROVEMENTS.md
│       └── ... (outras features)
│
├── 📂 backend/
│   ├── package.json
│   ├── tsconfig.json
│   └── ... (código)
│
└── 📂 frontend/
    ├── package.json
    ├── tsconfig.json
    └── ... (código)
```

---

## 🗓️ Seu Calendário Semanal (Onde Ir Cada Dia)

### **Segunda-feira: Planejamento**
1. Leia: [docs/user-notes.md](./docs/user-notes.md)
2. Consulte: [docs/todo/](./docs/todo/) para planos detalhados
3. Atualize: [docs/agent-assignments.md](./docs/agent-assignments.md)
4. Referência: [CLAUDE.md](./CLAUDE.md) se precisar de detalhes

### **Terça-Quarta: Revisão & Teste**
1. Receba PR do Agent Coder (GitHub)
2. Siga: [CLAUDE.md](./CLAUDE.md) → "Recebendo um Pull Request"
3. Teste localmente
4. Aprove ou pida ajustes

### **Quinta-Sexta: Merge & Deploy**
1. Mergear quando PR aprovada
2. Siga: [CLAUDE.md](./CLAUDE.md) → "Executando Testes Antes de Deploy"
3. Monitore GitHub Actions
4. Atualize: [docs/deploy/deploy-log.md](./docs/deploy/deploy-log.md)

### **Sexta-Sábado: Monitoramento**
1. Revise: logs de produção
2. Consulte: [CLAUDE.md](./CLAUDE.md) → "Monitoramento de Produção"
3. Se problema: [CLAUDE.md](./CLAUDE.md) → "Rollback"

### **Sábado-Domingo: Documentação**
1. Copie: [docs/metrics/weekly-report-template.md](./docs/metrics/weekly-report-template.md)
2. Crie: `docs/metrics/weekly-[data].md` e preencha
3. Atualize: documentação de features
4. Limpe: tarefas concluídas de [docs/todo/](./docs/todo/)

---

## 🔗 Links Rápidos Por Tópico

### **Começar**
- [QUICK-START-REVIEWER.md](./QUICK-START-REVIEWER.md) - Setup 5 min
- [AGENT-REVIEWER-README.md](./AGENT-REVIEWER-README.md) - Onboarding 20 min

### **Referência de Comando**
- [CLAUDE.md](./CLAUDE.md) - Comandos Git, Docker, Monitoramento

### **Tarefas & Planejamento**
- [docs/user-notes.md](./docs/user-notes.md) - Onde você anota
- [docs/agent-assignments.md](./docs/agent-assignments.md) - Tracking
- [docs/todo/](./docs/todo/) - Planos detalhados

### **Deploy & Produção**
- [docs/deploy/deploy-log.md](./docs/deploy/deploy-log.md) - Histórico
- [CLAUDE.md](./CLAUDE.md) - Guia detalhado de deploy

### **Métricas & Business**
- [docs/metrics/weekly-report-template.md](./docs/metrics/weekly-report-template.md) - Template
- [docs/metrics/](./docs/metrics/) - Seus relatórios anteriores

### **Arquitetura Geral**
- [README.md](./README.md) - Overview do projeto
- [docs/PROJECT_OVERVIEW.md](./docs/PROJECT_OVERVIEW.md) - Arquitetura geral
- [docs/ROADMAP.md](./docs/ROADMAP.md) - Plano estratégico

### **Referências Técnicas**
- [docs/BACKEND.md](./docs/BACKEND.md) - Backend reference
- [docs/FRONTEND.md](./docs/FRONTEND.md) - Frontend reference
- [docs/DEV_OPERATIONS.md](./docs/DEV_OPERATIONS.md) - Operações

---

## ⚡ Atalhos por Situação

| Situação | Vá Para |
|----------|---------|
| Preciso começar agora | [QUICK-START-REVIEWER.md](./QUICK-START-REVIEWER.md) |
| Tenho uma nova feature/bug | Edite [docs/user-notes.md](./docs/user-notes.md) |
| Recebi uma PR para testar | [CLAUDE.md](./CLAUDE.md) - "Recebendo PR" |
| Preciso fazer deploy | [CLAUDE.md](./CLAUDE.md) - "Deploy" |
| Algo quebrou em produção | [CLAUDE.md](./CLAUDE.md) - "Rollback" |
| Preciso de um comando | [CLAUDE.md](./CLAUDE.md) - "Comandos Essenciais" |
| Preciso coletar métricas | [docs/metrics/weekly-report-template.md](./docs/metrics/weekly-report-template.md) |
| Quero ver histórico de deploys | [docs/deploy/deploy-log.md](./docs/deploy/deploy-log.md) |
| Não sei qual é minha próxima tarefa | [docs/agent-assignments.md](./docs/agent-assignments.md) |
| Preciso entender a arquitetura | [AGENT-REVIEWER-README.md](./AGENT-REVIEWER-README.md) |

---

## 📞 Se Ficar Preso

1. **Procure neste Índice** - Temos a resposta para 90% das perguntas
2. **Leia CLAUDE.md** - É seu melhor amigo
3. **Leia AGENT-REVIEWER-README.md** - Para contexto geral
4. **Consulte histórico** - Veja o que foi feito antes em deploy-log.md

---

## ✅ Checklist de Leitura

- [ ] Ler QUICK-START-REVIEWER.md (5 min)
- [ ] Ler AGENT-REVIEWER-README.md (20 min)
- [ ] Ler CLAUDE.md primeira metade (15 min)
- [ ] Ver exemplos em docs/user-notes.md (5 min)
- [ ] Explorar docs/agent-assignments.md (5 min)
- [ ] Entender docs/deploy/deploy-log.md (5 min)
- [ ] Copiar template de metrics (2 min)
- [ ] Executar docker compose ps (2 min)
- [ ] Abrir http://localhost:8081 (2 min)

**Total: ~61 minutos para estar 100% preparado**

---

## 🎯 Próximo Passo

👉 **Abra agora:** [QUICK-START-REVIEWER.md](./QUICK-START-REVIEWER.md)

---

**Última Atualização:** 30 de Novembro de 2025
**Status:** ✅ Completo e Pronto
