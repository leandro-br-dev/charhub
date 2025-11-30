# ⚡ Quick Start - Agent Coder

> **Nota:** Este arquivo é um placeholder. A documentação completa para Agent Coder será criada em seu workspace específico (Ubuntu-24.04-Coder) em `~/projects/charhub-coder/docs/coder/`

---

## 📍 Você Está no Lugar Certo?

Este é o repositório do **Agent Reviewer** (`charhub-reviewer`).

Se você é o **Agent Coder**, você deve:
- Trabalhar em `~/projects/charhub-coder` (WSL: Ubuntu-24.04-Coder)
- Consultar a documentação em seu workspace: `~/projects/charhub-coder/docs/coder/CLAUDE.md`
- Desenvolver features em branches `feature/*`

---

## 🔄 Comunicação Entre Agentes

### Agent Coder (você) → Agent Reviewer
1. Lê tarefas priorizadas em: `docs/reviewer/user-notes.md`
2. Lê atribuições em: `docs/reviewer/agent-assignments.md`
3. Desenvolve feature em branch `feature/xxx`
4. Abre PR no GitHub para Agent Reviewer revisar

### Agent Reviewer → Agent Coder (você)
1. Testa sua PR
2. Aprova ou pede ajustes via GitHub
3. Mergea para `main` quando OK
4. GitHub Actions dispara deploy automático

---

## 📂 Arquivos Importantes do Reviewer (para você ler)

| Arquivo | Propósito |
|---------|-----------|
| `docs/reviewer/user-notes.md` | **LEIA ISSO** - Tarefas priorizadas para você fazer |
| `docs/reviewer/agent-assignments.md` | Seu status e ETA de entrega |
| `docs/reviewer/QUICK-START-REVIEWER.md` | Entender o que o Reviewer faz |
| `docs/reviewer/AGENT-REVIEWER-README.md` | Visão geral completa do Reviewer |

---

## 🚀 Próximos Passos

1. **Se é sua primeira tarefa:**
   - Abra: `docs/reviewer/user-notes.md`
   - Procure por sua tarefa atribuída
   - Leia o plano detalhado em `docs/todo/`

2. **Quando terminar a tarefa:**
   - Crie uma branch: `git checkout -b feature/nome-da-tarefa`
   - Desenvolva sua feature
   - Teste localmente
   - Abra PR no GitHub

3. **Aguarde Agent Reviewer:**
   - Ele vai testar sua PR
   - Pode pedir ajustes
   - Quando aprovado, mergea e faz deploy

---

## 💡 Dica

Leia o arquivo de documentação completa do seu workspace (em `~/projects/charhub-coder`):
```bash
cat ~/projects/charhub-coder/docs/coder/CLAUDE.md
```

Aquele sim terá TODA a documentação detalhada para sua atuação.

---

**Status:** ✅ Você está pronto para trabalhar!
