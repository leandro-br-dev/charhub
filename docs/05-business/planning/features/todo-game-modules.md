# Sistema Modular de Jogos 2D

> **Status**: Planejamento Inicial
> **Prioridade**: Baixa
> **Complexidade**: Muito Alta
> **Ultima atualizacao**: 2025-11-23

## Resumo

Sistema modular baseado em web que permite criacao e execucao de jogos 2D atraves de modulos isolados. Este e um projeto de longo prazo que expande o CharHub para uma plataforma de jogos narrativos.

---

## Stack Proposto

### Frontend & Host Runtime
- React 18+ com TypeScript 5+ (strict mode)
- Vite como bundler
- Zustand para estado global
- TanStack Query para cache

### Motor 2D
- **Phaser 3.80+** - Ecosistema maduro, WebGL/Canvas2D

### Isolamento de Modulos
- Web Workers + OffscreenCanvas
- Fallback: iframes com postMessage
- Comlink para comunicacao Worker/Main

### Build & Deploy
- Turborepo (monorepo)
- SWC para transpilacao
- Cloudflare Workers para edge runtime

---

## Estrutura do Monorepo

```
/projeto-root
├── /packages
│   ├── /sdk              # API publica para modulos
│   ├── /runtime          # Motor do host
│   ├── /ui-components    # Componentes React compartilhados
│   └── /shared-types     # Tipos TypeScript globais
├── /apps
│   ├── /web-platform     # Site principal (React)
│   ├── /studio           # Editor de modulos
│   └── /docs             # Documentacao (Docusaurus)
├── /services
│   ├── /ai-gateway       # Proxy LLM/SD com cache
│   ├── /module-registry  # NPM registry privado
│   └── /asset-pipeline   # Processamento de assets
└── /examples
    ├── /visual-novel
    ├── /rpg-combat
    └── /platformer
```

---

## Plano de Desenvolvimento

### FASE 1: Fundacao (4-5 semanas)

#### 1.1 Setup do Monorepo (Semana 1)
- [ ] Configurar Turborepo com pnpm
- [ ] Scripts de build/dev/lint compartilhados
- [ ] ESLint + Prettier
- [ ] CI/CD Pipeline (GitHub Actions)

#### 1.2 SDK Core (Semana 2)
- [ ] Definicao de tipos base (ModuleManifest, HostAPI)
- [ ] Interface de lifecycle (mount, start, pause, resume, dispose)
- [ ] Validacao com Zod

#### 1.3 Runtime Host (Semanas 3-4)
- [ ] Module Loader (fetch + validacao)
- [ ] Sandbox Manager (Worker pool)
- [ ] Bridge de Comunicacao (Comlink)
- [ ] Input Manager Universal
- [ ] Resource Manager

#### 1.4 Sistema de Handoff (Semana 5)
- [ ] Contrato de Handoff (PlayerState, Inventory, PlotFlags)
- [ ] Transition Manager
- [ ] State Serialization

### FASE 2: Servicos de IA e Assets (3-4 semanas)

#### 2.1 AI Gateway Service (Semana 6)
- [ ] API Abstraction Layer (multi-provider)
- [ ] Cache System (Redis)
- [ ] Prompt Templates
- [ ] Context Management

#### 2.2 Image Generation Pipeline (Semana 7)
- [ ] SD Wrapper Service (BullMQ)
- [ ] Post-Processing (background removal, sprite extraction)
- [ ] Asset CDN (Cloudflare R2)

#### 2.3 Integracao com CharHub (Semanas 8-9)
- [ ] Character API
- [ ] Story API
- [ ] Asset API
- [ ] Webhook System

### FASE 3: Studio de Desenvolvimento (4 semanas)

#### 3.1 Editor de Codigo (Semana 10)
- [ ] Monaco Editor integrado
- [ ] IntelliSense customizado
- [ ] Multi-file Editor

#### 3.2 Preview e Hot Reload (Semana 11)
- [ ] Live Preview (iframe)
- [ ] Debug Console
- [ ] Device Simulator

#### 3.3 Asset Manager (Semana 12)
- [ ] Upload & Organization
- [ ] Image Processing
- [ ] AI Asset Integration

#### 3.4 Testing & Validation (Semana 13)
- [ ] Handoff Tester
- [ ] Performance Profiler
- [ ] Compatibility Checker

### FASE 4: Modulos de Referencia (3 semanas)

#### 4.1 Visual Novel Module (Semana 14)
- [ ] Dialog engine
- [ ] Choice system
- [ ] Save/Load points

#### 4.2 RPG Combat Module (Semana 15)
- [ ] Combat Engine (turn-based)
- [ ] Skill/Item system
- [ ] Integration Points

#### 4.3 Platformer Module (Semana 16)
- [ ] Physics & Movement
- [ ] Level System (Tiled)
- [ ] Mobile Controls

### FASE 5: Marketplace & Comunidade (4 semanas)

#### 5.1 Module Registry (Semana 17)
- [ ] Verdaccio customizado
- [ ] CLI Tool (npx create-game-module)
- [ ] Versionamento Semantico

#### 5.2 Revisao e Moderacao (Semana 18)
- [ ] Automated Checks
- [ ] Manual Review
- [ ] Content Moderation

#### 5.3 Descoberta e Distribuicao (Semana 19)
- [ ] Storefront
- [ ] Instalacao & Updates
- [ ] Analytics para Criadores

#### 5.4 Comunidade (Semana 20)
- [ ] Documentacao (Docusaurus)
- [ ] Exemplos e Templates
- [ ] Suporte (Discord/Forum)

### FASE 6: Otimizacao & Escala (3 semanas)

- [ ] Code splitting agressivo
- [ ] Asset preloading inteligente
- [ ] Capacitor wrapper (mobile native)
- [ ] Analytics avancado

---

## Metricas de Sucesso

### Tecnicas
- Tempo de load < 3s (inicial)
- 60 FPS em 90% dos devices
- < 100ms latency no handoff
- Bundle medio < 500kb por modulo

### Negocio
- 100+ modulos publicados (6 meses)
- 70% retention (criadores)
- < 5% crash rate

---

## Integracao com CharHub Atual

O sistema atual serve como **fundacao de autenticacao**:

- **Backend OAuth**: Gerencia autenticacao de criadores
- **Frontend React**: Evoluira para hospedar runtime e studio
- **Novas APIs**: Serao adicionadas ao backend existente

---

## Estimativa Total

- **Duracao**: ~20 semanas (5 meses)
- **Equipe recomendada**: 2-3 desenvolvedores
- **Custo de infraestrutura**: A definir

---

## Proximos Passos Imediatos

Se decidir comecar:
1. **Semana 1**: Setup monorepo + CI/CD
2. **Semana 2**: Prototipo SDK + Runtime basico
3. **Semana 3**: Primeiro modulo de teste (VN simplificado)
4. **Semana 4**: Integracao com servicos de IA existentes

---

**Origem**: Extraido de `docs/ROADMAP.md`
**Nota**: Este e um projeto ambicioso de longo prazo. Priorize features do CharHub atual antes de iniciar.
