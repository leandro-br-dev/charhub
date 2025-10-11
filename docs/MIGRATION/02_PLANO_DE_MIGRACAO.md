# Plano de Migração Detalhado e Checklist

Este documento é o guia de execução e acompanhamento da migração. Marque os itens conforme são concluídos. Siga as fases em ordem sequencial.

---

### 📋 Preparação Inicial
- [ ] Ler `01_RESUMO_EXECUTIVO.md` para entender o escopo.

---

### 🏗️ FASE 0: Infraestrutura ✅ COMPLETA
**Objetivo**: Criar a fundação técnica para os módulos seguintes.
**Duração**: 1-2 semanas
**Status**: ✅ **CONCLUÍDA**

- [x] **Etapa 0.1: Jobs Assíncronos (BullMQ)** ✅
  - [x] Instalar e configurar o BullMQ.
  - [x] Adicionar o serviço Redis ao `docker-compose.yml`.
  - [x] Criar a estrutura de pastas para filas e processadores (`/queues`).
  - [x] Implementar um job de teste (ex: log no console) para validar o fluxo.
  - [x] Criar API endpoints de monitoramento (`/api/v1/queues/*`).
  - **Commit**: `feat(phase-0.1): implement BullMQ job queue system`

- [x] **Etapa 0.2: Storage de Arquivos (Cloudflare R2)** ✅
  - [x] Criar o `r2Service.ts` utilizando o AWS SDK v3.
  - [x] Implementar a função de upload de arquivos.
  - [x] Implementar a função para gerar URLs de acesso.
  - [x] Criar um endpoint de teste para validar o upload.
  - [x] Validação robusta de base64 e sanitização de nomes.
  - **Commit**: `feat(phase-0.2): implement Cloudflare R2 storage integration`

- [x] **Etapa 0.3: Classificação de Conteúdo** ✅
  - [x] Definir os `Enums` `AgeRating` e `ContentTag` no `schema.prisma`.
  - [x] Adicionar as preferências de conteúdo ao `model User` no Prisma.
  - [x] Executar a migração do banco de dados.
  - [x] Criar o `contentClassificationService.ts` com a lógica de filtro inicial.
  - [x] Implementar 9 endpoints de API (`/api/v1/classification/*`).
  - [x] Sistema de duas dimensões: Age Rating + Content Tags.
  - **Commit**: `feat(phase-0.3): implement content classification system`

**Critério de Sucesso**: ✅ **ATINGIDO**
- ✅ Jobs são processados via BullMQ
- ✅ Arquivos podem ser enviados ao R2 e URLs geradas
- ✅ Sistema de classificação definido no banco e com lógica de filtro inicial

---

### 👤 FASE 1: Sistema de Personagens ✅ COMPLETA
**Objetivo**: Permitir a criação, visualização e gerenciamento completo de personagens.
**Duração**: 2-3 semanas
**Status**: ✅ **CONCLUÍDA** (3/3 etapas concluídas)

#### Sequência de Execução:

**Passo 1** (Sequencial - Fundação): ✅ **COMPLETO**
- [x] **Etapa 1.1: Modelos de Dados (Prisma)** ✅
  - [x] Criar schemas Prisma para: `Character`, `CharacterSticker`, `Lora`, `Attire`, e `Tag`.
  - [x] Definir todos os relacionamentos entre os modelos.
  - [x] Executar a migração e validar a estrutura no Prisma Studio.
  - [x] Documentar comandos de migração bem-sucedidos em `docs/DEV_OPERATIONS.md`.
  - **Arquivos tocados**: `prisma/schema.prisma`, `docs/DEV_OPERATIONS.md`, `docs/TODO.md`
  - **Dependência**: Nenhuma (pode iniciar imediatamente)
  - **Commit**: `feat(phase-1.1): implement Character system Prisma schemas`

**Passos 2 e 3** (Executados em PARALELO após Passo 1):

**👤 AGENTE 1: Etapa 1.2 - CRUD Backend** ✅ **COMPLETO**
- [x] Criar validadores Zod para as entidades de personagem.
- [x] Implementar os `services`: `characterService`, `loraService`, `attireService`.
- [x] Criar as rotas Express para o CRUD completo de Personagens, LoRAs e Vestimentas.
- [x] Implementar middleware de permissão para garantir que apenas o dono possa editar/deletar.
- [x] Testar todos os endpoints via interface de criação.
- [x] Adicionar suporte a filtros (search, ageRatings, contentTags, gender, isPublic).
- [x] Implementar paginação e ordenação.
- **Arquivos criados**: `services/characterService.ts`, `services/loraService.ts`, `services/attireService.ts`, `routes/v1/characters.ts`, `routes/v1/loras.ts`, `routes/v1/attires.ts`, `validators/character.ts`, `validators/lora.ts`, `validators/attire.ts`
- **Dependência**: Etapa 1.1 (schemas Prisma devem existir)
- **Commits**: `feat(characters): implement backend CRUD`, `fix(characters): add filters and pagination`

**👤 AGENTE 2: Etapa 1.3 - Interface Frontend** ✅ **COMPLETO**
- [x] Criar a camada de serviço (`characterService.ts`) no frontend.
- [x] Implementar os hooks customizados: `useCharacterListQuery`, `useCharacterQuery`, `useCharacterMutations`, `useCharacterForm`.
- [x] Desenvolver os componentes da UI: `CharacterCard`, `CharacterForm`.
- [x] Criar as páginas usando padrão de colocation:
  - [x] `/characters/hub` - Hub de personagens com filtros
  - [x] `/characters/create` - Formulário de criação
  - [x] `/characters/edit/:id` - Formulário de edição
  - [x] `/characters/view/:id` - Visualização detalhada
- [x] Implementar sistema de mock/real API (removido posteriormente).
- [x] Integrar sistema de classificação de conteúdo nos formulários.
- [x] Adicionar traduções para namespace 'characters'.
- [x] Implementar filtros: busca, age rating, gender, público/privado.
- [x] Criar shared components e hooks seguindo padrão de colocation.
- **Arquivos criados**: `frontend/src/services/characterService.ts`, `frontend/src/pages/(characters)/*`, `frontend/src/types/characters.ts`, diversos hooks e componentes
- **Dependência**: Etapa 1.1 (tipos devem ser conhecidos)
- **Commits**: `feat(characters): implement frontend interface`, `refactor(characters): remove mock data`, `fix(characters): improve filtering and UX`

**Melhorias Implementadas Além do Planejado**:
- ✅ Sistema de tradução para gêneros (male, female, non-binary)
- ✅ Indicadores visuais de campos obrigatórios
- ✅ Integração JWT automática via axios interceptor
- ✅ Navegação com NavigationRail e Sidebar contextuais
- ✅ Layout autenticado com AuthenticatedLayout
- ✅ Traduções completas para namespaces: characters, navigation, profile
- ✅ Tema claro modernizado inspirado em GitHub/Linear/Notion
- ✅ Remoção completa de código mock para produção limpa

**Critério de Sucesso**: ✅ **ATINGIDO**
- ✅ Um usuário pode criar um personagem completo
- ✅ Personagens aparecem no hub com filtros funcionais
- ✅ Sistema de classificação (age rating, content tags) aplicado aos personagens
- ✅ Apenas o dono pode editar/deletar seus personagens
- ✅ Personagens privados aparecem apenas em "Meus Personagens"
- ✅ Interface multilíngue com 11 idiomas suportados

---

### 💬 FASE 2: Sistema de Chat (3-4 semanas)
**Objetivo**: Implementar conversas funcionais em tempo real entre o usuário e personagens de IA.
- [ ] **Etapa 2.1: Infraestrutura WebSocket**
  - [ ] Instalar e configurar o Socket.IO no servidor Express.
  - [ ] Implementar um middleware de autenticação JWT para conexões WebSocket.
  - [ ] Criar um gerenciador de `rooms` para isolar as conversas.
- [ ] **Etapa 2.2: Modelos de Conversa**
  - [ ] Criar schemas Prisma para: `Conversation`, `ConversationParticipant`, `Message`, `Assistant`.
  - [ ] Executar a migração do banco.
- [ ] **Etapa 2.3: Agentes de IA e Lógica de Chat**
  - [ ] Migrar os prompts do Python para arquivos TypeScript.
  - [ ] Implementar os agentes de IA (`ResponseGeneration`, `ParticipantSelection`, etc.).
  - [ ] Criar a estratégia de orquestração que determina o fluxo de resposta da IA.
  - [ ] Integrar a lógica com o WebSocket para salvar e transmitir mensagens.
- [ ] **Etapa 2.4: Interface do Chat**
  - [ ] Criar o `useChatWebSocket` hook para gerenciar a conexão no frontend.
  - [ ] Desenvolver os componentes da UI: `ChatContainer`, `MessageList`, `MessageInput`.
  - [ ] Implementar o scroll infinito para carregar histórico de mensagens.

**Critério de Sucesso**: O usuário pode iniciar uma conversa com um personagem e receber respostas contextuais em tempo real.

---

### 📖 FASE 3: Sistema de Histórias (3-4 semanas)
**Objetivo**: Migrar o módulo de geração e reprodução de histórias interativas (Visual Novels).
- [ ] **Etapa 3.1: Modelos de Dados**
  - [ ] Criar schemas Prisma para: `Story`, `StoryAct`, `Scenario`, `StoryProgress`, `StoryMessage`.
  - [ ] Executar a migração.
- [ ] **Etapa 3.2: Agentes de Geração de História**
  - [ ] Migrar os prompts dos agentes de história (`StoryArchitect`, `ScenarioExtraction`, etc.).
  - [ ] Implementar o pipeline de geração de histórias, orquestrando os agentes via BullMQ.
- [ ] **Etapa 3.3: Player de História**
  - [ ] Criar as rotas de API para iniciar e progredir em uma história.
  - [ ] Desenvolver os componentes do player no frontend: `DialogueBox`, `CharacterSprite`, `ChoiceMenu`.
  - [ ] Implementar a lógica de estado do player para gerenciar o progresso do usuário.

**Critério de Sucesso**: Um usuário pode gerar uma história a partir de um prompt e jogá-la no player interativo.

---

### 💰 FASE 4: Sistema de Créditos e Monetização (2 semanas)
**Objetivo**: Implementar o sistema freemium, planos e pagamentos.
- [ ] **Etapa 4.1: Modelos de Dados**
  - [ ] Criar schemas Prisma para: `Plan`, `CreditTransaction`, `UsageLog`, `ServiceCreditCost`, etc.
  - [ ] Popular o banco com dados iniciais (planos, custos dos serviços).
- [ ] **Etapa 4.2: Lógica de Negócio e Pagamentos**
  - [ ] Implementar o `creditService` para adicionar/deduzir créditos.
  - [ ] Criar o `usageService` para registrar todas as ações que consomem IA.
  - [ ] Desenvolver um job no BullMQ que processa os `UsageLog` e debita os créditos.
  - [ ] Integrar a API do PayPal para a compra de planos.
  - [ ] Criar as páginas de Planos e Histórico de Transações no frontend.

**Critério de Sucesso**: Uma ação de IA consome créditos do usuário, e o usuário pode comprar um plano para recarregá-los.

---

### 🔗 FASE 5: Sistema de Indicação (1 semana)
**Objetivo**: Implementar o programa de indicação com recompensas.
- [ ] **Etapa 5.1: Modelos e Lógica Backend**
  - [ ] Criar o `model ReferralToken` no Prisma e adicionar campos de referência ao `User`.
  - [ ] Implementar a lógica para gerar links de indicação.
  - [ ] Ajustar o fluxo de cadastro para aceitar um código de indicação.
  - [ ] Criar um job que recompensa o indicador quando o indicado se cadastra.
- [ ] **Etapa 5.2: Interface Frontend**
  - [ ] Criar uma página no perfil do usuário para ele copiar seu link de indicação.

**Critério de Sucesso**: Um novo usuário se cadastra com um link de indicação, e tanto ele quanto o indicador recebem seus bônus.

### ✨ FASE 6: Polimento e Testes (2-3 semanas)
**Objetivo**: Garantir a qualidade, performance e robustez da plataforma migrada.
- [ ] **Etapa 6.1: Testes Automatizados**
  - [ ] Configurar um framework de testes (ex: Vitest).
  - [ ] Escrever testes unitários para os services críticos.
  - [ ] Escrever testes de integração para os principais fluxos de API.
- [ ] **Etapa 6.2: Otimizações**
  - [ ] Analisar e otimizar queries lentas do Prisma.
  - [ ] Implementar cache com Redis para dados frequentemente acessados.
  - [ ] Otimizar o build do frontend (code splitting, lazy loading).
- [ ] **Etapa 6.3: Documentação Final**
  - [ ] Gerar a documentação da API (ex: Swagger/OpenAPI).
  - [ ] Atualizar os documentos `BACKEND.md` e `FRONTEND.md` com a arquitetura final.
  - [ ] Revisar e limpar todo o código.

**Critério de Sucesso**: A plataforma está estável, performática e bem documentada, pronta para o deploy em produção.
