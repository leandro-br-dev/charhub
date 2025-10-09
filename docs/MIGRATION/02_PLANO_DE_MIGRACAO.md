# Plano de Migração Detalhado e Checklist

Este documento é o guia de execução e acompanhamento da migração. Marque os itens conforme são concluídos. Siga as fases em ordem sequencial.

---

### 📋 Preparação Inicial
- [ ] Ler `01_RESUMO_EXECUTIVO.md` para entender o escopo.

---

### 🏗️ FASE 0: Infraestrutura (1-2 semanas)
**Objetivo**: Criar a fundação técnica para os módulos seguintes.
- [ ] **Etapa 0.1: Jobs Assíncronos (BullMQ)**
  - [ ] Instalar e configurar o BullMQ.
  - [ ] Adicionar o serviço Redis ao `docker-compose.yml`.
  - [ ] Criar a estrutura de pastas para filas e processadores (`/queues`).
  - [ ] Implementar um job de teste (ex: log no console) para validar o fluxo.
- [ ] **Etapa 0.2: Storage de Arquivos (Cloudflare R2)**
  - [ ] Criar o `r2Service.ts` utilizando o AWS SDK v3.
  - [ ] Implementar a função de upload de arquivos.
  - [ ] Implementar a função para gerar URLs de acesso.
  - [ ] Criar um endpoint de teste para validar o upload.
- [ ] **Etapa 0.3: Classificação de Conteúdo**
  - [ ] Definir os `Enums` `AgeRating` e `ContentTag` no `schema.prisma`.
  - [ ] Adicionar as preferências de conteúdo ao `model User` no Prisma.
  - [ ] Executar a migração do banco de dados.
  - [ ] Criar o `contentClassificationService.ts` com a lógica de filtro inicial.

**Critério de Sucesso**: Jobs são processados via BullMQ e arquivos podem ser enviados ao R2.

---

### 👤 FASE 1: Sistema de Personagens (2-3 semanas)
**Objetivo**: Permitir a criação, visualização e gerenciamento completo de personagens.
- [ ] **Etapa 1.1: Modelos de Dados (Prisma)**
  - [ ] Criar schemas Prisma para: `Character`, `CharacterSticker`, `Lora`, `Attire`, e `Tag`.
  - [ ] Definir todos os relacionamentos entre os modelos.
  - [ ] Executar a migração e validar a estrutura no Prisma Studio.
- [ ] **Etapa 1.2: CRUD Backend**
  - [ ] Criar validadores Zod para as entidades de personagem.
  - [ ] Implementar os `services`: `characterService`, `loraService`, `attireService`.
  - [ ] Criar as rotas Express para o CRUD completo de Personagens, LoRAs e Vestimentas.
  - [ ] Implementar middleware de permissão para garantir que apenas o dono possa editar/deletar.
  - [ ] Testar todos os endpoints via Postman/Insomnia.
- [ ] **Etapa 1.3: Interface Frontend**
  - [ ] Criar a camada de serviço (`characterService.ts`) no frontend.
  - [ ] Implementar os hooks customizados (ex: `useCharacters`).
  - [ ] Desenvolver os componentes da UI: `CharacterCard`, `CharacterForm`, `LoraSelector`.
  - [ ] Criar as páginas: Hub de Personagens, Formulário de Criação/Edição e Visualização.

**Critério de Sucesso**: Um usuário pode criar um personagem com LoRA e vestimentas, e visualizá-lo na plataforma.

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