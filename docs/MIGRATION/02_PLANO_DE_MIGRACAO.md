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

### 👤 FASE 1: Sistema de Personagens (2-3 semanas) 🚧 EM ANDAMENTO
**Objetivo**: Permitir a criação, visualização e gerenciamento completo de personagens.
**Duração**: 2-3 semanas
**Status**: 🚧 **PRÓXIMA FASE**

#### Sequência de Execução:

**Passo 1** (Sequencial - Fundação):
- [ ] **Etapa 1.1: Modelos de Dados (Prisma)**
  - [ ] Criar schemas Prisma para: `Character`, `CharacterSticker`, `Lora`, `Attire`, e `Tag`.
  - [ ] Definir todos os relacionamentos entre os modelos.
  - [ ] Executar a migração e validar a estrutura no Prisma Studio.
  - **Arquivos tocados**: `prisma/schema.prisma`, nova migração
  - **Dependência**: Nenhuma (pode iniciar imediatamente)

**Passos 2 e 3** (Executar em PARALELO após Passo 1):

**👤 AGENTE 1: Etapa 1.2 - CRUD Backend**
- [ ] Criar validadores Zod para as entidades de personagem.
- [ ] Implementar os `services`: `characterService`, `loraService`, `attireService`.
- [ ] Criar as rotas Express para o CRUD completo de Personagens, LoRAs e Vestimentas.
- [ ] Implementar middleware de permissão para garantir que apenas o dono possa editar/deletar.
- [ ] Testar todos os endpoints via Postman/Insomnia.
- **Arquivos tocados**: `services/characterService.ts`, `services/loraService.ts`, `services/attireService.ts`, `routes/v1/characters.ts`, `routes/v1/loras.ts`, `routes/v1/attires.ts`
- **Dependência**: Etapa 1.1 (schemas Prisma devem existir)
- **Referência**: `E:\Projects\charhub_dev_old_version\backend\app\api\endpoints\characters.py`

**👤 AGENTE 2: Etapa 1.3 - Interface Frontend**
- [ ] Criar a camada de serviço (`characterService.ts`) no frontend.
- [ ] Implementar os hooks customizados (ex: `useCharacters`, `useCharacterForm`).
- [ ] Desenvolver os componentes da UI: `CharacterCard`, `CharacterForm`, `LoraSelector`, `AttireSelector`.
- [ ] Criar as páginas: Hub de Personagens, Formulário de Criação/Edição e Visualização.
- [ ] Implementar upload de imagens usando o sistema R2.
- [ ] Integrar sistema de classificação de conteúdo nos formulários.
- **Arquivos tocados**: `frontend/src/services/characterService.ts`, `frontend/src/hooks/useCharacters.tsx`, `frontend/src/components/characters/*`, `frontend/src/pages/characters/*`
- **Dependência**: Etapa 1.1 (tipos devem ser conhecidos) - pode começar com tipos mock
- **Referência**: `E:\Projects\charhub_dev_old_version\frontend\src\components\characters\`

**Por que Passos 2 e 3 podem rodar em paralelo?**
- ✅ Backend e Frontend trabalham em arquivos completamente diferentes
- ✅ Frontend pode usar tipos TypeScript mock enquanto backend é desenvolvido
- ✅ Ambos dependem apenas da Etapa 1.1 (schemas)
- ✅ Integração final será feita quando ambos estiverem prontos

**Critério de Sucesso**:
- ✅ Um usuário pode criar um personagem com LoRA e vestimentas
- ✅ Personagens aparecem no hub com imagens do R2
- ✅ Sistema de classificação aplicado aos personagens
- ✅ Apenas o dono pode editar/deletar seus personagens

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
