# Sistema de Geracao de Stories

> **Status**: Backend completo, Frontend pendente
> **Prioridade**: Media
> **Complexidade**: Media
> **Ultima atualizacao**: 2025-11-23

## Resumo

Sistema que permite usuarios criarem e jogarem stories interativas com personagens de IA.

## Status Atual

### Fase 1: Backend Foundation - COMPLETO

- [x] Modelo `Story` no Prisma com todos os campos
- [x] Migracoes de banco de dados aplicadas
- [x] Endpoints REST para CRUD de stories (`/api/v1/stories`)
- [x] storyService implementado
- [x] Validacao de input
- [x] Autenticacao nos endpoints

---

## Fase 2: Frontend - Story Creation UI

### 2.1 Pagina de Criacao

- [ ] Criar pagina `/stories/create`
- [ ] Implementar formulario completo:
  - [ ] Campo: Title (texto)
  - [ ] Campo: Synopsis (textarea)
  - [ ] Campo: Cover Image (upload ou URL)
  - [ ] Campo: Initial Text (rich text editor)
  - [ ] Campo: Objectives (lista dinamica)
  - [ ] Campo: Character Selection (multi-select)
  - [ ] Campo: Tag Selection (multi-select)

### 2.2 My Stories Page

- [ ] Criar pagina `/stories/mine`
- [ ] Listar stories do usuario
- [ ] Opcoes de editar/deletar
- [ ] Filtros e busca

### 2.3 Integracao API

- [ ] Hook `useStories()` com React Query
- [ ] Hook `useCreateStory()` mutation
- [ ] Hook `useUpdateStory()` mutation
- [ ] Service `storyService.ts` no frontend

**Esforco estimado**: 2-3 semanas

---

## Fase 3: Frontend - Story Gameplay

### 3.1 Story Browser

- [ ] Pagina `/stories` para descobrir stories publicas
- [ ] Grid de cards com preview
- [ ] Filtros por genero, tags, popularidade
- [ ] Busca por titulo/autor

### 3.2 Story Detail Page

- [ ] Pagina `/stories/:id`
- [ ] Exibir synopsis, cover, personagens
- [ ] Preview das primeiras linhas
- [ ] Botao "Start Story"

### 3.3 Character Selection

- [ ] Modal antes de iniciar
- [ ] Escolher jogar como usuario ou como personagem
- [ ] Preview do personagem escolhido

### 3.4 Chat Integration

Quando uma story e iniciada:
- [ ] Criar nova conversa automaticamente
- [ ] Carregar `initialText` como primeira mensagem
- [ ] Adicionar personagens da story como participantes
- [ ] Adicionar usuario/personagem escolhido
- [ ] Gameplay via chat normal

**Esforco estimado**: 3-4 semanas

---

## Fase 4: Melhorias e Features Avancadas

### 4.1 Objectives Tracking

- [ ] Sistema de tracking de objetivos
- [ ] UI para mostrar progresso
- [ ] Deteccao automatica de objetivos completados (via LLM)

### 4.2 Branching Narratives

- [ ] Schema para definir branching paths
- [ ] Editor visual de branches (futuro)
- [ ] Multiplos finais

### 4.3 AI Story Generation

- [ ] Usar LLM para sugerir ideias
- [ ] Gerar synopsis automatica
- [ ] Sugerir initial text

### 4.4 Social Features

- [ ] Compartilhamento de stories
- [ ] Reviews e ratings
- [ ] Collaborative storytelling (multiplos usuarios)

**Esforco estimado**: 4-6 semanas

---

## Schema do Modelo Story

```prisma
model Story {
  id            String   @id @default(uuid())
  title         String
  synopsis      String?  @db.Text
  initialText   String?  @db.Text
  coverImage    String?
  objectives    Json?    // Array de strings

  // Relations
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  characters    Character[]
  tags          Tag[]

  // Metadata
  visibility    Visibility @default(PRIVATE)
  playCount     Int      @default(0)
  rating        Float?

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

---

## API Endpoints Existentes

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| GET | `/api/v1/stories` | Listar stories publicas |
| GET | `/api/v1/stories/mine` | Listar minhas stories |
| GET | `/api/v1/stories/:id` | Detalhes de uma story |
| POST | `/api/v1/stories` | Criar story |
| PATCH | `/api/v1/stories/:id` | Atualizar story |
| DELETE | `/api/v1/stories/:id` | Deletar story |

---

## Referencias

- `backend/prisma/schema.prisma` - Modelo Story
- `backend/src/services/storyService.ts` - Service
- `backend/src/routes/v1/stories.ts` - Rotas

---

**Origem**: Extraido de `docs/STORY_GENERATION_ROADMAP.md`
