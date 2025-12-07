# CharHub - Planos de Desenvolvimento Futuro

Esta pasta contém todos os planos de desenvolvimento que ainda nao foram implementados. Use estes arquivos para:

1. **Planejar novas features** - Adicione ideias e especificacoes aqui
2. **Multi-agentes** - Cada agente pode escolher um arquivo para trabalhar
3. **Tracking de progresso** - Marque items como concluidos conforme implementa

## Arquivos Disponiveis

| Arquivo | Descricao | Prioridade | Complexidade |
|---------|-----------|------------|--------------|
| `CI_CD.md` | GitHub Actions para CI/CD automatico | Alta | Media |
| `DEPLOY_IMPROVEMENTS.md` | Melhorias de infraestrutura e deploy | Media | Alta |
| `CHAT_IMPROVEMENTS.md` | Sistema de chat - fases 3-5 | Alta | Alta |
| `IMAGE_GENERATION.md` | Geracao de imagens com ComfyUI/SD | Alta | Alta |
| `STORY_GENERATION.md` | Sistema de stories - fases 2-4 | Media | Media |
| `GAME_MODULES_SYSTEM.md` | Sistema modular de jogos 2D | Baixa | Muito Alta |
| `CREDITS_SYSTEM.md` | Sistema de creditos e monetizacao | Media | Media |

## Como Usar

### Para Desenvolvedores/Agentes

1. Escolha um arquivo que queira trabalhar
2. Leia o arquivo completo para entender o escopo
3. Crie um branch: `git checkout -b feature/nome-da-feature`
4. Implemente as tarefas marcadas como pendentes
5. Marque como concluido conforme implementa
6. Abra PR quando terminar

### Para Adicionar Novas Ideias

1. Crie um novo arquivo `.md` nesta pasta
2. Use o template abaixo
3. Adicione na tabela do README

### Template para Novos Arquivos

```markdown
# Nome da Feature

> **Status**: Planejamento
> **Prioridade**: Alta/Media/Baixa
> **Complexidade**: Baixa/Media/Alta/Muito Alta
> **Ultima atualizacao**: YYYY-MM-DD

## Resumo

Descricao breve do que sera implementado.

## Requisitos

- [ ] Requisito 1
- [ ] Requisito 2

## Tarefas

### Fase 1: Nome da Fase

- [ ] Tarefa 1
- [ ] Tarefa 2

### Fase 2: Nome da Fase

- [ ] Tarefa 1
- [ ] Tarefa 2

## Notas Tecnicas

Detalhes de implementacao, decisoes arquiteturais, etc.

## Referencias

- Links para docs externos
- Issues relacionadas
```

## Regras

1. **Nao mover para cá features implementadas** - Use `/docs/features/` para docs de features prontas
2. **Manter atualizado** - Remova/mova arquivos quando features forem implementadas
3. **Um arquivo por feature** - Evite misturar features diferentes no mesmo arquivo
4. **Incluir estimativas** - Ajude outros desenvolvedores a entender o esforco

---

**Ultima atualizacao**: 2025-11-23
