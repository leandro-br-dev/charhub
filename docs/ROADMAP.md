# Plano de Desenvolvimento: Sistema Modular de Jogos 2D

> **Nota**: Este documento substitui a implementação Unity anterior. O projeto evoluiu para um sistema modular baseado em web que permite criação e execução de jogos 2D através de módulos isolados.

## 📋 Decisões Tecnológicas Fundamentais

### Stack Principal Definido

#### Frontend & Host Runtime

- **React 18+ com TypeScript 5+** (strict mode)
- **Vite** como bundler (performance superior, HMR rápido)
- **Zustand** para estado global (leve, sem boilerplate)
- **TanStack Query** para cache e sincronização de dados

#### Motor 2D

- **Phaser 3.80+** (ecosistema maduro, WebGL/Canvas2D, input cross-platform)
- **Justificativa**: comunidade ativa, documentação robusta, plugins para visual novels e RPG

#### Isolamento de Módulos

- **Web Workers + OffscreenCanvas** (performance)
- **Fallback**: iframes com postMessage (compatibilidade)
- **Comlink** para abstração de comunicação Worker/Main thread

#### Editor & Ferramentas

- **Monaco Editor** (mesmo do VSCode)
- **Zod** para validação de schemas
- **Vitest** para testes + **Playwright** para E2E

#### Build & Deploy

- **Turborepo** (monorepo com cache inteligente)
- **SWC** para transpilação
- **Cloudflare Workers** para edge runtime (CDN + compute)

---

## 🏗️ Arquitetura do Sistema

### Estrutura do Monorepo

```
/projeto-root
├── /packages
│   ├── /sdk              # API pública para módulos
│   ├── /runtime          # Motor do host
│   ├── /ui-components    # Componentes React compartilhados
│   └── /shared-types     # Tipos TypeScript globais
├── /apps
│   ├── /web-platform     # Site principal (React)
│   ├── /studio           # Editor de módulos
│   └── /docs             # Documentação (Docusaurus)
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

## 📅 Plano de Desenvolvimento Detalhado

### FASE 1: Fundação (4-5 semanas)

#### 1.1 Setup do Monorepo e Infraestrutura (Semana 1)

**Objetivo**: Ambiente de desenvolvimento completo e CI/CD

**Subetapas**:

1. **Configuração Turborepo**
   - Setup workspace com pnpm
   - Scripts de build/dev/lint compartilhados
   - Cache remoto configurado

2. **Padronização de Código**
   - ESLint + Prettier (configuração compartilhada)
   - Husky + lint-staged (pre-commit hooks)
   - Conventional Commits (changelog automático)

3. **CI/CD Pipeline**
   - GitHub Actions: build/test/deploy
   - Ambientes: dev/staging/production
   - Preview deploys automáticos

4. **Monitoramento Básico**
   - Sentry para error tracking
   - Plausible/Umami para analytics (GDPR-friendly)

#### 1.2 SDK Core (Semana 2)

**Objetivo**: API pública para módulos + tipos base

**Subetapas**:

1. **Definição de Tipos Base**

```typescript
// Estrutura de manifesto
interface ModuleManifest {
  id: string;
  version: string;
  sdkVersion: string;
  capabilities: Capability[];
  handoff: HandoffContract;
  responsive: ResponsiveConfig;
}
```

2. **HostAPI Interface**
   - Canvas/Rendering
   - Input abstraction (keyboard/touch/gamepad)
   - Storage (IndexedDB wrapper)
   - Audio (Web Audio API)
   - Services (LLM/Images/Analytics)

3. **Lifecycle Hooks**

```typescript
interface GameModule {
  mount(api: HostAPI): Promise<ModuleInstance>;
}

interface ModuleInstance {
  start(state?: HandoffPayload): Promise<void>;
  pause(): void;
  resume(): void;
  dispose(): void;
  getHandoffPayload(): HandoffPayload;
}
```

4. **Validação com Zod**
   - Schemas para manifesto
   - Schemas para handoff payloads
   - Validação em runtime

#### 1.3 Runtime Host (Semanas 3-4)

**Objetivo**: Motor que carrega e executa módulos

**Subetapas**:

1. **Module Loader**
   - Fetch + validação de módulos
   - Versionamento e compatibilidade
   - Cache strategy (service worker)

2. **Sandbox Manager**
   - Worker pool gerenciado
   - Transferência de canvas (OffscreenCanvas)
   - Limite de recursos (CPU/memory)
   - Timeout e erro handling

3. **Bridge de Comunicação**
   - Proxy bidirecional (Comlink)
   - Serialização de payloads
   - Event bus para módulos

4. **Input Manager Universal**
   - Mapeamento de ações (abstrato)
   - Detecção de dispositivo (PC/Mobile/Tablet)
   - Virtual gamepad para mobile
   - Gesture recognition

5. **Resource Manager**
   - Asset loader com progressão
   - Texture atlas automático
   - Audio sprite sheets
   - Garbage collection inteligente

#### 1.4 Sistema de Handoff (Semana 5)

**Objetivo**: Transições entre módulos

**Subetapas**:

1. **Contrato de Handoff**

```typescript
interface HandoffPayload {
  playerState: PlayerState;
  inventory: Item[];
  plotFlags: Record<string, boolean>;
  worldState: WorldState;
  metadata: HandoffMetadata;
}
```

2. **Transition Manager**
   - Validação de compatibilidade
   - Estado intermediário (loading)
   - Rollback em caso de erro
   - Histórico de transições (debug)

3. **State Serialization**
   - Deep clone seguro
   - Compressão (LZ-String)
   - Versionamento de schemas

---

### FASE 2: Serviços de IA e Assets (3-4 semanas)

#### 2.1 AI Gateway Service (Semana 6)

**Objetivo**: Proxy inteligente para LLMs

**Subetapas**:

1. **API Abstraction Layer**
   - Suporte multi-provider (OpenAI/Anthropic/local)
   - Rate limiting por usuário/módulo
   - Fallback entre providers

2. **Cache System**
   - Redis para respostas
   - Estratégia de invalidação
   - Deduplicação de requests

3. **Prompt Templates**

```typescript
interface StoryPrompt {
  template: string;
  variables: Record<string, string>;
  context: ConversationContext;
}
```

4. **Context Management**
   - Janela deslizante de contexto
   - Compressão de histórico
   - Embeddings para memória longa (Pinecone/Qdrant)

#### 2.2 Image Generation Pipeline (Semana 7)

**Objetivo**: Geração consistente de assets visuais

**Subetapas**:

1. **SD Wrapper Service**
   - Queue system (BullMQ)
   - Seed management (determinismo)
   - LoRA/Embedding customizado

2. **Post-Processing**
   - Background removal automático
   - Sprite extraction
   - Atlas generation (TexturePacker API)
   - Formato WebP/AVIF otimizado

3. **Asset CDN**
   - Cloudflare R2/S3 + CDN
   - Lazy loading inteligente
   - Versionamento de assets
   - Purge cache seletivo

4. **Consistency Engine**
   - Referência visual por personagem
   - Color palette extraction
   - Style transfer para consistência

#### 2.3 Integração com Site Existente (Semana 8-9)

**Objetivo**: APIs que o site deve fornecer

**Subetapas**:

1. **Character API**

```typescript
GET /api/characters/:id
Response: {
  id: string;
  name: string;
  description: string;
  personality: PersonalityTraits;
  visualRef: {
    spritesheet: URL;
    portraits: URL[];
    seed: number;
  };
  dialogue: {
    voice: VoiceConfig;
    examples: DialogueLine[];
  };
}
```

2. **Story API**

```typescript
POST /api/story/continue
Body: {
  context: StoryContext;
  playerChoices: Choice[];
  worldState: WorldState;
}
Response: {
  beat: StoryBeat;
  branches: Branch[];
  generatedAssets?: AssetRef[];
}
```

3. **Asset API**

```typescript
POST /api/assets/generate
Body: {
  type: 'sprite' | 'background' | 'cg';
  prompt: string;
  seed?: number;
  styleRef?: string;
}
Response: {
  url: string;
  variants: URL[];
  metadata: GenerationMetadata;
}
```

4. **Webhook System**
   - Notificações de assets prontos
   - Status de geração assíncrona
   - Retry com exponential backoff

---

### FASE 3: Studio de Desenvolvimento (4 semanas)

#### 3.1 Editor de Código (Semana 10)

**Objetivo**: Monaco integrado com inteligência

**Subetapas**:

1. **Monaco Setup**
   - TypeScript worker configurado
   - Autocomplete com SDK types
   - Error checking em tempo real

2. **IntelliSense Customizado**
   - Snippets para padrões comuns
   - JSDoc com exemplos
   - Quick fixes automáticos

3. **Multi-file Editor**
   - File tree virtual
   - Tabs gerenciados
   - Search & replace global

#### 3.2 Preview e Hot Reload (Semana 11)

**Objetivo**: Feedback instantâneo

**Subetapas**:

1. **Live Preview**
   - iframe isolado com runtime
   - Reload automático on save
   - Estado preservado (quando possível)

2. **Debug Console**
   - Logs do módulo
   - Performance metrics
   - Network inspector

3. **Device Simulator**
   - Diferentes resoluções
   - Touch simulation
   - Orientação (portrait/landscape)

#### 3.3 Asset Manager (Semana 12)

**Objetivo**: Gerenciamento visual de recursos

**Subetapas**:

1. **Upload & Organization**
   - Drag-and-drop
   - Categorização automática
   - Metadata extraction

2. **Image Processing**
   - Crop/resize visual
   - Compression automática
   - Sprite sheet builder

3. **AI Asset Integration**
   - Geração direto no Studio
   - Gallery de assets gerados
   - Favoritos e coleções

#### 3.4 Testing & Validation (Semana 13)

**Objetivo**: Qualidade garantida

**Subetapas**:

1. **Handoff Tester**
   - Mock de payloads
   - Visualização de estado
   - Testes de transição

2. **Performance Profiler**
   - FPS meter
   - Memory usage
   - Draw calls counter

3. **Compatibility Checker**
   - Validação de SDK version
   - Browser compatibility
   - Mobile performance estimate

4. **Automated Tests**
   - Unit test runner (Vitest)
   - Visual regression (Percy/Chromatic)
   - Accessibility checks (axe-core)

---

### FASE 4: Módulos de Referência (3 semanas)

#### 4.1 Visual Novel Module (Semana 14)

**Objetivo**: Exemplo completo e funcional

**Subetapas**:

1. **Core Systems**
   - Dialog engine
   - Choice system
   - Save/Load points

2. **Visual Elements**
   - Character sprites (layered)
   - Backgrounds parallax
   - CG gallery

3. **Responsive Adaptation**
   - Layout mobile-first
   - Touch gestures
   - Auto-hide UI

#### 4.2 RPG Combat Module (Semana 15)

**Objetivo**: Sistema de batalha turn-based

**Subetapas**:

1. **Combat Engine**
   - Turn queue
   - Skill/Item system
   - Status effects

2. **UI/UX**
   - Battle menu responsivo
   - Animations (Spine/DragonBones)
   - Damage numbers

3. **Integration Points**
   - Recebe party do handoff
   - Retorna rewards/XP
   - Atualiza plot flags

#### 4.3 Platformer Module (Semana 16)

**Objetivo**: Gameplay action em tempo real

**Subetapas**:

1. **Physics & Movement**
   - Arcade physics (Phaser)
   - Input buffering
   - Coyote time

2. **Level System**
   - Tilemap loader (Tiled)
   - Collisions
   - Checkpoints

3. **Mobile Controls**
   - Virtual D-pad
   - Buttons touch
   - Gesture combos

---

### FASE 5: Marketplace & Comunidade (4 semanas)

#### 5.1 Module Registry (Semana 17)

**Objetivo**: NPM privado para módulos

**Subetapas**:

1. **Registry Setup**
   - Verdaccio customizado
   - Auth via OAuth
   - Scoped packages (@user/module)

2. **CLI Tool**

```bash
npx create-game-module my-rpg
npm run dev
npm run build
npm run publish
```

3. **Versionamento Semântico**
   - Changelog automático
   - Breaking change detection
   - Deprecation warnings

#### 5.2 Revisão e Moderação (Semana 18)

**Objetivo**: Controle de qualidade

**Subetapas**:

1. **Automated Checks**
   - Code scanning (virus/malware)
   - Performance benchmarks
   - Bundle size limits

2. **Manual Review**
   - Interface de revisão
   - Checklist de qualidade
   - Feedback para desenvolvedores

3. **Content Moderation**
   - AI detection (NSFW/violence)
   - User reporting
   - Quarantine system

#### 5.3 Descoberta e Distribuição (Semana 19)

**Objetivo**: Marketplace público

**Subetapas**:

1. **Storefront**
   - Grid de módulos
   - Filtros (categoria/tag/rating)
   - Preview embarcado

2. **Instalação & Updates**
   - One-click install
   - Auto-update opcional
   - Rollback de versão

3. **Analytics para Criadores**
   - Downloads/plays
   - Retention metrics
   - Revenue sharing (futuro)

#### 5.4 Comunidade (Semana 20)

**Objetivo**: Engajamento de desenvolvedores

**Subetapas**:

1. **Documentação**
   - Docusaurus site
   - Tutoriais interativos
   - API reference completo

2. **Exemplos e Templates**
   - Starter kits
   - Design patterns
   - Best practices

3. **Suporte**
   - Discord/Forum
   - Issue tracker
   - Changelog e roadmap público

---

### FASE 6: Otimização & Escala (3 semanas)

#### 6.1 Performance (Semana 21)

**Subetapas**:
- Code splitting agressivo
- Asset preloading inteligente
- Web Workers para lógica pesada
- WASM para cálculos críticos

#### 6.2 Mobile Native (Semana 22)

**Subetapas**:
- Capacitor wrapper
- Native plugins (storage/audio)
- App store builds
- Push notifications

#### 6.3 Analytics Avançado (Semana 23)

**Subetapas**:
- Funil de criação
- Engagement heatmaps
- A/B testing framework
- Crash reporting detalhado

---

## 📊 Métricas de Sucesso

### Técnicas

- Tempo de load < 3s (inicial)
- 60 FPS em 90% dos devices
- < 100ms latency no handoff
- Bundle médio < 500kb por módulo

### Negócio

- 100+ módulos publicados (6 meses)
- 70% retention (criadores)
- < 5% crash rate
- 4.5+ rating médio de módulos

---

## 🎯 Próximos Passos Imediatos

1. **Semana 1**: Setup monorepo + CI/CD
2. **Semana 2**: Protótipo SDK + Runtime básico
3. **Semana 3**: Primeiro módulo de teste (VN simplificado)
4. **Semana 4**: Integração com serviços de IA existentes

---

## 🔗 Relação com Sistema Atual

O sistema atual (backend OAuth + frontend React) serve como **fundação de autenticação** para a nova plataforma. A integração ocorrerá através de:

- **Backend OAuth**: Gerenciará autenticação de criadores de módulos
- **Frontend React**: Evoluirá para hospedar o runtime e o studio
- **Novas APIs**: Serão adicionadas ao backend existente (Character, Story, Asset)

Este plano prioriza **entrega incremental** - cada fase produz valor utilizável. Ajuste conforme capacidade do time e feedback da comunidade.
