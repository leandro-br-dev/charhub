# ⚡ Quick Start - Agent Reviewer

Guia rápido para começar AGORA. Leia este arquivo primeiro!

---

## 🚀 5 Minutos para Começar

### 1. Você está em qual WSL?
```bash
wsl --list --verbose
# Você deve estar em: Ubuntu-22.04-Reviewer
# Se não, entre:
wsl -d Ubuntu-22.04-Reviewer
```

### 2. Você está no diretório correto?
```bash
cd ~/projects/charhub-reviewer
pwd  # Deve mostrar: /home/root/projects/charhub-reviewer
```

### 3. Docker está rodando?
```bash
docker compose ps
# Você deve ver containers rodando
# Se não, execute:
docker compose up -d
```

### 4. Qual é a URL da sua aplicação?
```
Frontend: http://localhost:8081
Backend: http://localhost:3001
Abra o navegador e tente!
```

### 5. Você está na branch main?
```bash
git branch --show-current
# Deve mostrar: main
# Se mostrar outra coisa, execute:
git checkout main
```

**✅ Pronto! Você está configurado!**

---

## 📚 O Que Ler (Em Ordem)

1. **Este arquivo** (5 min) ← Você está aqui
2. **AGENT-REVIEWER-README.md** (15 min) - Visão geral completa
3. **CLAUDE.md** (30 min) - Guia detalhado de trabalho
4. **docs/user-notes.md** (5 min) - Veja exemplos de tarefas

**Total: ~55 minutos para entender tudo**

---

## 📋 Responsabilidades Principais (Em Ordem de Frequência)

| Frequência | Tarefa | Tempo |
|-----------|--------|-------|
| **1x semana** | Receber + testar PR do Agent Coder | 2-4h |
| **1x semana** | Mergear + Deploy | 30min |
| **Diariamente** | Monitorar produção | 15min |
| **1x semana** | Coletar métricas | 2-3h |
| **1x semana** | Planejamento de próximas tarefas | 1h |

---

## 🔄 Seu Fluxo de Trabalho Típico

### Quando Agent Coder abre uma PR no GitHub:

```bash
# 1. Buscar branches remotas (2 min)
git fetch origin

# 2. Fazer checkout da branch (1 min)
git checkout origin/feature/nome -b feature/nome

# 3. Atualizar dependências (1 min)
npm install --prefix backend
npm install --prefix frontend

# 4. Subir containers e testar (5 min)
docker compose down -v
docker compose up -d --build
npm test --prefix backend

# 5. Testar manualmente (5-10 min)
# Abrir http://localhost:8081
# Testar a feature implementada
# Checar console do navegador

# 6. Se OK, mergear (2 min)
git checkout main
git merge feature/nome
git push origin main

# Deploy automático via GitHub Actions (5-10 min)
# Você monitorar: https://github.com/seu-repo/actions

# 7. Atualizar deploy-log.md (2 min)
# Abrir docs/deploy/deploy-log.md
# Adicionar entry com status do deploy
```

**Tempo total: ~25 minutos por PR**

---

## 📊 Seu Calendário Semanal

```
SEGUNDA-FEIRA (1h)
├─ Ler docs/user-notes.md
├─ Explorar docs/todo/
├─ Atualizar agent-assignments.md
└─ Comunicar tarefas ao Agent Coder

TERÇA-QUARTA (4h)
├─ Receber PRs
├─ Testar localmente
├─ Aprovar ou pedir ajustes

QUINTA-SEXTA (1h)
├─ Mergear e Deploy
├─ Monitorar primeiras horas
└─ Documentar em deploy-log.md

SEXTA-SÁBADO (2h)
├─ Revisar logs de produção
├─ Coletar métricas
├─ Fazer rollback se necessário

SÁBADO-DOMINGO (2h)
├─ Gerar weekly metrics report
├─ Atualizar documentação
├─ Planejar próxima semana

TOTAL: ~10 horas por semana
```

---

## ⚙️ Comandos Que Você Vai Usar Frequentemente

### Git
```bash
git fetch origin                    # Buscar atualizações
git checkout feature/nome           # Testar PR
git checkout main                   # Voltar pra main
git merge feature/nome              # Mergear
git push origin main                # Deploy automático
git log --oneline -5                # Ver histórico
git revert <hash>                   # Rollback em caso de erro
```

### Docker
```bash
docker compose down -v              # Parar e resetar
docker compose up -d --build        # Subir e rebuild
docker compose ps                   # Ver status
docker compose logs -f backend      # Ver logs
npm test --prefix backend           # Rodar testes
```

### Monitoramento
```bash
curl https://charhub.app/api/v1/health    # Verificar saúde
docker compose exec postgres psql -U user # Acessar banco de dados
```

---

## 🎯 Seu Primeiro Dia

### Manhã (1-2h)
1. Ler AGENT-REVIEWER-README.md
2. Ler CLAUDE.md (pelo menos a primeira metade)
3. Executar `docker compose ps` para testar setup
4. Abrir http://localhost:8081 para ver a app

### Tarde (1h)
1. Explorar os 5 arquivos criados (user-notes, assignments, etc)
2. Ver estrutura de /docs/todo/
3. Revisar /docs/ROADMAP.md para entender plano geral

### Noite (30min)
1. Ler exemplos em docs/user-notes.md
2. Preparar para receber primeira PR

**Você estará pronto! 🚀**

---

## ❓ FAQ Rápido

**P: O Agent Coder já criou uma PR?**
R: Não ainda. Primeira PR virá quando Coder terminar primeira tarefa (esperar ~1-2 dias)

**P: Posso modificar código?**
R: Apenas em hotfixes críticos. Tudo deve vir de PR do Agent Coder.

**P: Que branch devo usar?**
R: SEMPRE `main`. Agent Coder usa `feature/*`, você não.

**P: E se break produção?**
R: Não se preocupe! Você pode fazer rollback: `git revert <hash>` + `git push origin main`

**P: Quanto tempo cada task leva?**
R: Teste/merge: 20-30min. Deploy: 5-10min. Monitoramento: variável.

**P: Preciso fazer login no GitHub?**
R: Não. Git usa SSH keys. Já deve estar configurado.

**P: Onde fica produção?**
R: https://charhub.app (você não acessa via SSH, só via GitHub Actions)

---

## 🚨 Problemas Comuns (Primeiros 5min)

| Problema | Solução |
|----------|---------|
| Docker não inicia | `docker compose down -v && docker compose up -d` |
| PR não carrega | `git fetch origin` |
| Não consigo mergear | Certifique que está em `main`: `git branch --show-current` |
| Testes falhando | `npm install --prefix backend && npm test` |
| Porta já em uso | `docker compose down` |

---

## 📖 Leitura Recomendada (Nesta Ordem)

1. **AGENT-REVIEWER-README.md** (Este é seu melhor amigo!)
   - Leia completamente
   - Entenda o ciclo semanal
   - Saiba suas responsabilidades

2. **CLAUDE.md** (Sua bíblia de trabalho)
   - Bookmark para futura referência
   - Leia as seções:
     - Responsabilidades do Agent Reviewer
     - Ciclo Semanal
     - Fluxo de Trabalho Detalhado
     - Comandos Essenciais

3. **docs/user-notes.md** (Onde você registra tarefas)
   - Veja os exemplos
   - Copie o formato

4. **docs/agent-assignments.md** (Seu rastreamento)
   - Veja como é mantido
   - Será seu trabalho atualizá-lo toda segunda

5. **docs/deploy/deploy-log.md** (Seu histórico)
   - Template para preencher após cada deploy

6. **CLAUDE.md** (mais uma vez, partes específicas)
   - Leia quando precisar de detalhes

---

## ✅ Checklist de Setup

Quando terminar tudo isto, marque como feito:

- [ ] Estou em Ubuntu-22.04-Reviewer
- [ ] Estou no diretório ~/projects/charhub-reviewer
- [ ] Docker está rodando: `docker compose ps` shows containers
- [ ] Git está na branch `main`: `git branch --show-current`
- [ ] Consegui acessar http://localhost:8081
- [ ] Consegui acessar http://localhost:3001 (API)
- [ ] Li AGENT-REVIEWER-README.md completamente
- [ ] Li CLAUDE.md até a seção "Comandos Essenciais"
- [ ] Entendi meu ciclo semanal
- [ ] Explorei os arquivos criados
- [ ] Sou capaz de fazer: `git fetch`, `git checkout`, `npm test`, `docker compose`
- [ ] Estou pronto para receber primeira PR do Agent Coder!

**Se tudo está checado: ✅ Você está 100% pronto!**

---

## 🎓 Próxima Lição (Quando Receber Primeira PR)

Quando Agent Coder abrir primeira PR:

1. Não se preocupe! É normal nervosismo
2. Siga os passos em CLAUDE.md: "Recebendo um Pull Request"
3. Não tenha pressa - teste com cuidado
4. Se algo quebrar, é OK - você pode fazer rollback
5. Documente tudo que aprender no deploy-log

---

## 📞 Precisa de Ajuda?

Se ficar preso:

1. **Procure em CLAUDE.md** - 90% das respostas estão lá
2. **Procure em AGENT-REVIEWER-README.md** - Para contexto geral
3. **Veja o histórico de deploy-log.md** - Para ver padrões
4. **Pergunte para o usuário** na próxima interação

---

**Agora você está pronto! Bem-vindo ao time, Agent Reviewer! 🎉**

Próximo passo: Leia AGENT-REVIEWER-README.md agora!
