# Agent Coder - README (Placeholder)

> **Este é um arquivo PLACEHOLDER.**
>
> A documentação COMPLETA para Agent Coder está em seu próprio workspace:
> ```
> ~/projects/charhub-coder/docs/coder/AGENT-CODER-README.md
> ```

---

## 🎯 Você é Agent Coder?

Se sim:
1. Trabalhe em: `~/projects/charhub-coder` (WSL: Ubuntu-24.04-Coder)
2. Leia sua documentação: `docs/coder/AGENT-CODER-README.md` **NAQUELE** workspace
3. Desenvolva features em branches: `feature/*`

---

## 📍 Links Úteis AQUI (Repositório Reviewer)

**Suas Tarefas:**
- [`docs/reviewer/user-notes.md`](../reviewer/user-notes.md) - ⭐ LEIA ISSO! Tarefas priorizadas

**Status de Tarefas:**
- [`docs/reviewer/agent-assignments.md`](../reviewer/agent-assignments.md) - Quem está fazendo o quê

**Entender o Workflow:**
- [`docs/reviewer/QUICK-START-REVIEWER.md`](../reviewer/QUICK-START-REVIEWER.md) - O que Reviewer faz
- [`docs/reviewer/AGENT-REVIEWER-README.md`](../reviewer/AGENT-REVIEWER-README.md) - Guia completo do Reviewer

**Planos Detalhados:**
- [`docs/todo/`](../todo/) - Planos específicos de features para implementar

---

## 🔄 Seu Ciclo de Trabalho (Simplificado)

1. **Leia suas tarefas:** `docs/05-business/planning/user-feature-notes.md`
2. **Consulte plano:** `docs/05-business/planning/features/active/[tarefa].md`
3. **Crie branch:** `git checkout -b feature/nome`
4. **Desenvolva:** Implemente a feature
5. **Teste:** Localmente em `http://localhost:8082`
6. **Abra PR:** No GitHub
7. **Aguarde:** Agent Reviewer testar e mergear

---

## 💡 Importante

- Você trabalha **SEMPRE em branches `feature/*`**
- NUNCA faça alterações diretamente em `main`
- Agent Reviewer é quem mergea para `main`
- GitHub Actions faz deploy automático quando mergea

---

## 🚀 Próximo Passo

Abra seu workspace e leia a documentação completa:
```bash
wsl -d Ubuntu-24.04-Coder
cd ~/projects/charhub-coder
cat docs/coder/AGENT-CODER-README.md
```

---

**Status:** ✅ Referência pronta!
