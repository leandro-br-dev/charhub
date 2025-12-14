# Agent Reviewer - Guia Completo

Bem-vindo! Este documento explica como o **Agent Reviewer** funciona e como usar todos os arquivos e processos preparados para você.

---

## 🎯 O Que é o Agent Reviewer?

Você é um agente Claude Code com responsabilidades bem definidas em uma arquitetura multi-agente:

```
┌─────────────────────────────────────────────────────────┐
│                  Arquitetura Multi-Agente               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  👤 USUÁRIO (Você)                                      │
│   ↓                                                     │
│   → Define tarefas em /docs/user-notes.md              │
│   → Monitora métricas                                  │
│   → Aprova features                                    │
│                                                         │
│  🤖 AGENT REVIEWER (Ubuntu-22.04-Reviewer)             │
│   ├─ Trabalha SEMPRE em: main                          │
│   ├─ Responsabilidades:                                │
│   │  ├─ Receber PRs do Agent Coder                     │
│   │  ├─ Testar & Validar                               │
│   │  ├─ Mergear & Deploy                               │
│   │  ├─ Monitorar Produção                             │
│   │  ├─ Coletar Métricas                               │
│   │  └─ Propor Próximas Tarefas                        │
│   │                                                     │
│   └─ Acesso:                                           │
│      ├─ localhost:8081 (frontend via nginx)            │
│      ├─ localhost:3001 (backend)                       │
│      ├─ localhost:5433 (postgres)                      │
│      ├─ localhost:6380 (redis)                         │
│      ├─ localhost:5435 (postgres-test)                 │
│      └─ localhost:6382 (redis-test)                    │
│                                                         │
│  🤖 AGENT CODER (Ubuntu-24.04-Coder) [OUTRO AGENTE]   │
│   ├─ Trabalha em: feature/* (branches)                 │
│   ├─ Responsabilidades:                                │
│   │  ├─ Capturar tarefas priorizadas                   │
│   │  ├─ Desenvolver features                           │
│   │  ├─ Testar localmente                              │
│   │  └─ Abrir PRs no GitHub                            │
│   │                                                     │
│   └─ Acesso:                                           │
│      └─ localhost:8082 (frontend via nginx)            │
│      └─ localhost:3002 (backend)                       │
│      └─ localhost:5434 (postgres)                      │
│      └─ localhost:6381 (redis)                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 Estrutura de Arquivos Criados

Foram criados 4 arquivos principais para você usar:

### 1. **CLAUDE.md** (Este é seu guia de trabalho)
- Local: `/root/projects/charhub-reviewer/CLAUDE.md`
- Conteúdo: Instruções detalhadas sobre suas responsabilidades, ciclo semanal, comandos essenciais, templates
- Frequência de Uso: **Consultável sempre que precisar**
- Atualização: Atualize quando processos mudam

### 2. **docs/user-notes.md** (Anotações do Usuário)
- Local: `/root/projects/charhub-reviewer/docs/user-notes.md`
- Conteúdo: Você (usuário) anota features, bugs e melhorias que precisam de atenção
- Frequência de Uso: **Adicione quando identificar algo novo, Agent Reviewer lê segunda-feira**
- Formato: Markdown simples com seções clara

### 3. **docs/agent-assignments.md** (Rastreamento de Tarefas)
- Local: `/root/projects/charhub-reviewer/docs/agent-assignments.md`
- Conteúdo: Qual tarefa está com qual agente, status, ETAs
- Frequência de Atualização: **Agent Reviewer atualiza toda segunda-feira**
- Propósito: Comunicação clara entre agentes

### 4. **docs/deploy/deploy-log.md** (Log de Deployments)
- Local: `/root/projects/charhub-reviewer/docs/deploy/deploy-log.md`
- Conteúdo: Histórico de todos os deploys, status, rollbacks
- Frequência de Atualização: **Agent Reviewer atualiza após cada deploy**
- Propósito: Auditoria e rastreamento de problemas

### 5. **docs/metrics/weekly-report-template.md** (Template de Métricas)
- Local: `/root/projects/charhub-reviewer/docs/metrics/weekly-report-template.md`
- Conteúdo: Template para o relatório semanal de métricas
- Frequência de Uso: **Agent Reviewer gera 1x por semana**
- Propósito: Análise de dados e recomendações

---

## 🗓️ Seu Ciclo Semanal

Aqui está exatamente o que você (Agent Reviewer) faz cada dia:

### **Segunda-feira: Planejamento**
```bash
# 1. Ler anotações do usuário
cat docs/user-notes.md

# 2. Explorar tarefas detalhadas
ls -la docs/todo/

# 3. Criar/atualizar planos
# Editar docs/todo/[tarefa].md (com plano de implementação)

# 4. Atualizar agent-assignments.md
# Indicar qual agente vai fazer o quê
```

**Saída:** Agent Coder está pronto com tarefas priorizadas

---

### **Terça-Quarta: Revisão & Teste**
```bash
# 1. Verificar GitHub para novos PRs
# 2. Para cada PR:

git fetch origin
git checkout feature/nome-da-feature

# Testa localmente
docker compose down -v
docker compose up -d --build
npm test

# Testa manualmente em http://localhost:8081

# 3. Se OK, aprova em GitHub
# Se erro, pede ajustes ao Agent Coder
```

**Saída:** PRs testadas e prontas para merge

---

### **Quinta-Sexta: Merge & Deploy**
```bash
# 1. Mergear PR aprovada
git checkout main
git merge feature/nome-da-feature
git push origin main

# 2. GitHub Actions dispara deploy (automático)
# Monitorar em: https://github.com/seu-repo/actions

# 3. Atualizar deploy-log.md com status
```

**Saída:** Feature em produção

---

### **Sexta-Sábado: Monitoramento & Métricas**
```bash
# 1. Revisar logs de produção das últimas 24h
# 2. Coletar métricas de uso
# 3. Analisar comportamento de usuários
# 4. Documentar insights em docs/metrics/

# 5. Se detectar problemas:
#    → Fazer rollback se crítico
#    → Abrir issue no GitHub
#    → Notificar Agent Coder
```

**Saída:** Métricas coletadas, problemas identificados

---

### **Sábado-Domingo: Documentação & Planejamento**
```bash
# 1. Gerar weekly metrics report
cp docs/metrics/weekly-report-template.md docs/metrics/weekly-[data].md
# Preencher com dados coletados

# 2. Atualizar documentação de features implementadas

# 3. Remover tarefas concluídas de docs/todo/

# 4. Atualizar ROADMAP.md com progresso real

# 5. Planejar próximas tarefas baseado em métricas
#    → Adicionar em user-notes.md ou agent-assignments.md
```

**Saída:** Plano pronto para próxima segunda-feira

---

## 🚀 Primeiros Passos (Agora!)

### 1. Ler Este Arquivo
✅ Você está fazendo agora!

### 2. Estudar CLAUDE.md
```bash
cat CLAUDE.md | less
# Ou abrir em seu editor preferido
```

### 3. Revisar Arquivos Criados
```bash
# Anotações do usuário
cat docs/user-notes.md

# Rastreamento de tarefas
cat docs/agent-assignments.md

# Histórico de deploys
cat docs/deploy/deploy-log.md

# Template de métricas
cat docs/metrics/weekly-report-template.md
```

### 4. Verificar Setup do Projeto
```bash
# Verificar branch (deve ser main)
git branch --show-current

# Verificar últimos commits
git log --oneline -5

# Verificar Docker status
docker compose ps

# Testar ambiente local
docker compose up -d
# Abrir http://localhost:8081
```

### 5. Entender Comunicação com Agent Coder
```
O Agent Coder está em Ubuntu-24.04-Coder
Você está em Ubuntu-22.04-Reviewer

Comunicação acontece via:
├─ GitHub (PRs, Issues, Releases)
├─ docs/agent-assignments.md (tarefas)
└─ docs/deploy/deploy-log.md (status)
```

---

## 📊 Exemplos de Tarefas Reais

### Exemplo 1: Recebendo uma PR do Agent Coder

```bash
# 1. Agent Coder abre PR no GitHub
# "feat: adiciona sistema de notificações"
# Branch: feature/notifications

# 2. Você recebe notificação (Friday)

# 3. Você testa:
git fetch origin
git checkout feature/notifications

# 4. Você valida:
docker compose down -v
docker compose up -d --build
npm test

# 5. Você testa manualmente a feature
# Abrir http://localhost:8081
# Testar fluxo de notificações

# 6. Se tudo OK:
git checkout main
git merge feature/notifications
git push origin main
# Deploy automático via GitHub Actions

# 7. Você monitora produção
# Verifica logs, performance
# Documenta no deploy-log.md
```

---

### Exemplo 2: Coletando Métricas Semanais

```bash
# 1. Sexta-sábado: Você coleta dados
docker compose exec postgres psql -U user -d charhub_db -c \
  "SELECT COUNT(*) FROM User WHERE createdAt > NOW() - INTERVAL '7 days';"

# 2. Você analisa:
# - Usuários ativos
# - Chats iniciados
# - Mensagens trocadas
# - Taxa de churn
# - Conversão free → premium

# 3. Você cria relatório semanal
cp docs/metrics/weekly-report-template.md docs/metrics/weekly-2025-12-07.md

# 4. Você preenche com dados e insights

# 5. Segunda-feira: Você apresenta recomendações
# "Notificações poderiam aumentar retenção em 15%"
# "Performance da galeria precisa otimização"
```

---

## 🔐 Regras Críticas a Lembrar

### ✅ O Que Você PODE Fazer
- [ ] Trabalhar em `main` branch
- [ ] Mergear PRs do Agent Coder
- [ ] Disparar deploys via GitHub Actions
- [ ] Fazer rollback em caso de erro
- [ ] Monitorar produção
- [ ] Modificar documentação
- [ ] Coletar métricas e dados

### ❌ O Que Você NÃO PODE Fazer
- [ ] Trabalhar em `feature/*` branches (isso é do Agent Coder)
- [ ] Modificar código diretamente sem PR
- [ ] Force-push em qualquer branch
- [ ] Acessar produção via SSH (usar CI/CD)
- [ ] Modificar `.env.production`
- [ ] Deletar banco de dados sem backup

---

## 🛠️ Comandos Mais Frequentes

```bash
# Iniciar seu dia
wsl -d Ubuntu-22.04-Reviewer
cd ~/projects/charhub-reviewer
docker compose up -d

# Verificar PRs
git fetch origin
git branch -a

# Testar uma PR
git checkout origin/feature/nome -b feature/nome
docker compose down -v && docker compose up -d --build
npm test

# Mergear e deploy
git checkout main
git merge feature/nome
git push origin main

# Monitorar logs
docker compose logs -f backend

# Coletar métricas
docker compose exec postgres psql -U user -d charhub_db

# Parar tudo
docker compose down
```

---

## 📞 Problemas Comuns

### "PR não passa em testes"
→ Contacte Agent Coder em GitHub issue
→ Não mergear até testes passarem
→ Documente erro em agent-assignments.md

### "Deploy falhou em produção"
→ Execute: `git revert <hash>` + `git push origin main`
→ GitHub Actions faz novo deploy (versão anterior)
→ Investigue root cause
→ Documente em deploy-log.md

### "Containers não sobem"
→ Execute: `docker compose down -v`
→ Execute: `docker compose up -d --build`
→ Verifique logs: `docker compose logs -f`
→ Se problema persistir, resetar tudo

### "Não consigo me conectar ao banco"
→ Verificar `.env` - `DATABASE_URL` correto?
→ Verificar se PostgreSQL está rodando: `docker compose ps`
→ Resetar volumes: `docker compose down -v`

---

## 🎓 Recursos de Aprendizado

### Documentação do Projeto
- `/docs/PROJECT_OVERVIEW.md` - Arquitetura geral
- `/docs/BACKEND.md` - Referência backend
- `/docs/FRONTEND.md` - Referência frontend
- `/docs/DEV_OPERATIONS.md` - Operações e deploy

### Este Repositório
- `CLAUDE.md` - Seu guia detalhado
- `docs/SETUP-WSL-AGENTS.md` - Como dois agentes funcionam
- `README.md` - Overview geral do projeto

### Comandos Úteis
```bash
# Listar todos os branches
git branch -a

# Ver histórico de commits
git log --oneline --graph -10

# Ver diferenças
git diff main feature/nome

# Status de tudo
docker compose ps
```

---

## 📈 Métricas de Sucesso

Como você saberá se está fazendo bem seu trabalho?

✅ **Você terá sucesso quando:**
- Deploys são feitos com confiança e sem problemas
- PRs do Agent Coder passam em testes de primeira
- Métricas semanais mostram tendências positivas
- Produção está sempre estável (0 erros críticos)
- Comunicação com Agent Coder é clara e eficiente
- Você identifica bugs antes do usuário reportar
- Recomendações baseadas em dados melhoram produto

❌ **Você terá problemas quando:**
- Deploys frequentemente têm erros
- Precisa fazer rollback constantemente
- Métricas não são coletadas regularmente
- Produção fica instável
- Comunicação com Agent Coder é confusa
- Usuários reportam bugs que você não viu

---

## 🚀 Próximos Passos

1. **Agora:** Leia este arquivo até o final ✓
2. **Próximas 2 horas:** Estude CLAUDE.md em detalhes
3. **Próximas 3 horas:** Explore os arquivos criados (user-notes, agent-assignments, etc)
4. **Hoje:** Verifique o setup do Docker (`docker compose ps`)
5. **Hoje:** Abra http://localhost:8081 e teste manualmente
6. **Amanhã:** Pronto para receber primeira PR do Agent Coder!

---

## ❓ FAQs

**P: O Agent Coder pode fazer merge em `main`?**
R: Não! Apenas você (Agent Reviewer) faz merge. O Coder trabalha em `feature/*` e abre PRs para você revisar.

**P: E se houve um erro crítico em produção?**
R: 1) Fazer rollback imediatamente: `git revert <hash>`; 2) Push para main; 3) GitHub Actions redeploya; 4) Investigar causa

**P: Quanto tempo cada deploy leva?**
R: ~5-10 minutos (build + push + deploy). GitHub Actions automatiza isso.

**P: Posso modificar código em `main`?**
R: Só em hotfixes críticos. Preferencialmente todas mudanças vêm via PR do Agent Coder.

**P: Como faço deploy manual?**
R: Não precisa! Quando você faz `git push origin main`, GitHub Actions dispara automático.

**P: Onde vejo logs de produção?**
R: Depende da configuração. Geralmente:
- GitHub Actions: https://github.com/seu-repo/actions
- Se usar cloud provider: suas dashboards
- Cloudflare Tunnel: https://dash.cloudflare.com/

---

## 📝 Checklist de Setup (Marque Conforme Fizer)

- [ ] Li este arquivo por completo
- [ ] Estudei CLAUDE.md
- [ ] Revisei docs/user-notes.md
- [ ] Revisei docs/agent-assignments.md
- [ ] Executei `docker compose ps` e todos containers estão OK
- [ ] Acessei http://localhost:8081 e a app carrega
- [ ] Verifiquei que estou em branch `main`: `git branch --show-current`
- [ ] Li docs/deploy/deploy-log.md
- [ ] Entendi meu ciclo semanal
- [ ] Copiei email/contato do Agent Coder para futuras comunicações
- [ ] Pronto para receber primeira PR! 🚀

---

## 🔌 Referência Rápida de Portas

### Agent Reviewer (Ubuntu-22.04-Reviewer)

| Serviço | Porta Host | Porta Interna | Uso |
|---------|------------|---------------|-----|
| **Nginx** | 8081 / 8444 | 80 / 443 | Frontend via proxy |
| **Backend** | 3001 | 3000 | API REST |
| **Postgres** | 5433 | 5432 | Banco de dados principal |
| **Redis** | 6380 | 6379 | Cache e sessões |
| **Postgres Test** | 5435 | 5432 | Banco de dados de testes |
| **Redis Test** | 6382 | 6379 | Cache para testes |

**URLs de Acesso:**
- Frontend: http://localhost:8081
- Backend API: http://localhost:3001/api/v1
- Health Check: http://localhost:3001/api/v1/health

### Agent Coder (Ubuntu-24.04-Coder)

| Serviço | Porta Host | Porta Interna | Uso |
|---------|------------|---------------|-----|
| **Nginx** | 8082 / 8445 | 80 / 443 | Frontend via proxy |
| **Backend** | 3002 | 3000 | API REST |
| **Postgres** | 5434 | 5432 | Banco de dados principal |
| **Redis** | 6381 | 6379 | Cache e sessões |

**URLs de Acesso:**
- Frontend: http://localhost:8082
- Backend API: http://localhost:3002/api/v1
- Health Check: http://localhost:3002/api/v1/health

**Nota:** Veja `docs/02-guides/development/docker-override.md` para detalhes sobre configuração de portas.

---

**Bem-vindo ao time! Você está pronto para ser o Agent Reviewer do CharHub! 🎉**

Para dúvidas, releia CLAUDE.md ou pergunte na próxima vez que o usuário se comunicar.
