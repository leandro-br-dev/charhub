# Inventário do Projeto Antigo (Python/FastAPI)

> Referência rápida para localizar arquivos durante a migração

**Localização**: `E:\Projects\charhub_dev_old_version\`

---

## 📂 Estrutura por Funcionalidade

### 🧑 1. SISTEMA DE USUÁRIOS E AUTENTICAÇÃO

#### Models
```
backend/app/models/
├── user.py                           # Model User principal
├── oauth_account.py                  # Contas OAuth (Google/Facebook)
├── token.py                          # Refresh tokens
└── referral_token.py                 # Tokens de indicação
```

#### CRUD
```
backend/app/crud/
├── user.py
├── oauth_account.py
└── token.py
```

#### Schemas (Validação)
```
backend/app/schemas/
├── user.py
├── oauth.py
└── auth.py
```

#### Endpoints
```
backend/app/api/v1/endpoints/
├── auth.py                           # Login/Signup local
├── oauth.py                          # OAuth flows
└── user.py                           # Profile, preferences
```

#### Services
```
backend/app/services/
├── user_service.py
├── oauth_service.py
└── email_service.py                  # Envio de emails (SendGrid)
```

---

### 👤 2. SISTEMA DE PERSONAGENS

#### Models
```
backend/app/models/
├── character.py                      # Model Character
├── character_sticker.py              # Stickers (emoções)
├── lora.py                           # Modelos LoRA do Civitai
├── attire.py                         # Vestimentas reutilizáveis
└── content_classification.py         # Enums AgeRating, ContentTag
```

#### CRUD
```
backend/app/crud/
├── character.py
├── character_sticker.py
├── lora.py
└── attire.py
```

#### Schemas
```
backend/app/schemas/
├── character.py
├── character_sticker.py
├── lora.py
└── attire.py
```

#### Endpoints
```
backend/app/api/v1/endpoints/
└── character/
    ├── core.py                       # CRUD de personagens
    ├── assets.py                     # Stickers, amostras, avatar
    └── lora.py                       # Importar LoRA do Civitai
```

#### Agents
```
backend/app/agents/character/
├── character_autocomplete_agent/     # Autocompletar campos
│   ├── handler.py
│   └── prompt.py
└── attire_generation_agent/          # Gerar sugestões de roupas
    ├── handler.py
    └── prompt.py
```

#### Tasks (Celery)
```
backend/app/tasks/
├── character_tasks.py                # Criação assíncrona
└── character_asset_tasks.py          # Geração de avatar/stickers
```

---

### 💬 3. SISTEMA DE CHAT

#### Models
```
backend/app/models/
├── conversation.py                   # Conversas
├── conversation_participant.py       # Participantes (user + characters)
├── message.py                        # Mensagens do chat
├── assistant.py                      # Assistentes de IA
└── relationship_memory.py            # Memória de relacionamento (MongoDB)
```

#### CRUD
```
backend/app/crud/
├── conversation.py
├── conversation_participant.py
├── message.py
├── assistant.py
└── relationship_memory.py
```

#### Schemas
```
backend/app/schemas/
├── conversation.py
├── conversation_participant.py
├── message.py
├── assistant.py
└── chat.py                           # Payloads de chat
```

#### Endpoints
```
backend/app/api/v1/endpoints/
├── chat.py                           # Criar conversa, gerar imagem
├── conversation.py                   # CRUD conversas
├── conversation_participant.py       # Adicionar/remover participantes
├── message.py                        # Histórico de mensagens
├── assistant.py                      # CRUD assistentes
└── ws.py                             # WebSocket handler
```

#### Agents
```
backend/app/agents/chat/
├── response_generation_agent/        # Gera resposta da IA
│   ├── handler.py
│   └── prompts/
│       ├── persona.py
│       ├── guidelines.py
│       └── conversation_settings.py
├── participant_selection_agent/      # Escolhe quem responde
│   ├── handler.py
│   └── prompt.py
├── topic_generation_agent/           # Gera título da conversa
│   ├── handler.py
│   └── prompt.py
└── memory_update_agent/              # Atualiza memória de relacionamento
    ├── handler.py
    └── prompt.py
```

#### Tasks
```
backend/app/tasks/
├── chat_generation_tasks.py          # Response async
├── conversation_tasks.py             # Topic generation
└── memory_processing.py              # Update memory
```

#### Core
```
backend/app/core/
├── websocket_manager.py              # Gerenciador WebSocket
└── chat_response_strategy.py         # Orquestração de agentes
```

---

### 📖 4. SISTEMA DE HISTÓRIAS (VISUAL NOVEL)

#### Models
```
backend/app/models/
├── story.py                          # História principal
├── story_act.py                      # Atos da história
├── story_progress.py                 # Progresso do jogador
├── story_message.py                  # Mensagens/diálogos
└── scenario.py                       # Cenários (backgrounds)
```

#### CRUD
```
backend/app/crud/
├── story.py
├── story_progress.py
├── story_message.py
└── scenario.py
```

#### Schemas
```
backend/app/schemas/
├── story.py
├── story_act.py
├── story_progress.py
├── story_message.py
├── story_interaction.py
└── scenario.py
```

#### Endpoints
```
backend/app/api/v1/endpoints/
└── story.py                          # CRUD, play, progress
```

#### Agents
```
backend/app/agents/story/
├── story_architect_agent/            # Cria estrutura da história
│   ├── handler.py
│   └── prompt.py
├── scenario_extraction_agent/        # Extrai cenários necessários
│   ├── handler.py
│   └── prompt.py
├── character_scripter_agent/         # Atribui papéis a personagens
│   ├── handler.py
│   └── prompt.py
├── story_progression_agent/          # Avança narrativa
│   ├── handler.py
│   └── prompt.py
├── story_intro_writer_agent/         # Escreve primeira cena
│   ├── handler.py
│   └── prompt.py
├── story_autocomplete_agent/         # Autocomplete campos
│   ├── handler.py
│   └── prompt.py
└── story_review_agent/               # Revisa história gerada
    ├── handler.py
    └── prompt.py
```

#### Tasks
```
backend/app/tasks/
└── story_tasks.py                    # Geração assíncrona de histórias
```

---

### 💰 5. SISTEMA DE CRÉDITOS E MONETIZAÇÃO

#### Models
```
backend/app/models/
├── credit_transaction.py             # Transações de crédito
├── usage_log.py                      # Log de uso de serviços
├── plan.py                           # Planos (Free, Plus)
├── user_plan.py                      # Plano ativo do usuário
├── user_monthly_balance.py           # Saldo mensal
├── user_plus_access.py               # Acesso Plus temporário
├── service_credit_cost.py            # Custos por serviço
└── ai_model_registry.py              # Custos de modelos LLM
```

#### CRUD
```
backend/app/crud/
├── credit_transaction.py
├── usage_log.py
├── plan.py
├── user_plan.py
├── user_monthly_balance.py
├── service_credit_cost.py
└── ai_model_registry.py
```

#### Schemas
```
backend/app/schemas/
├── credit_transaction.py
├── usage_log.py
├── plan.py
└── costs.py
```

#### Endpoints
```
backend/app/api/v1/endpoints/
├── plan.py                           # Comprar plano, listar
├── credit_transaction.py             # Histórico
├── costs.py                          # Custos de serviços
└── dashboard.py                      # Dashboard com saldos
```

#### Services
```
backend/app/services/
├── credit_service.py                 # Lógica de créditos
└── payment_service.py                # PayPal integration
```

#### Tasks
```
backend/app/tasks/
├── usage_log_processing.py           # Processar logs pendentes
└── monthly_credit_reset.py           # Reset mensal
```

---

### 🔗 6. SISTEMA DE INDICAÇÃO (REFERRAL)

#### Models
```
backend/app/models/
└── referral_token.py                 # Tokens temporários
```

#### CRUD
```
backend/app/crud/
└── referral_token.py
```

#### Schemas
```
backend/app/schemas/
└── referral_token.py
```

#### Tasks
```
backend/app/tasks/
└── referral_tasks.py                 # Recompensar indicador
```

---

### 🏷️ 7. SISTEMA DE TAGS

#### Models
```
backend/app/models/
├── tag.py                            # Tags reutilizáveis
└── tag_translation.py                # Traduções de tags
```

#### CRUD
```
backend/app/crud/
├── tag.py
└── tag_translation.py
```

#### Schemas
```
backend/app/schemas/
└── tag.py
```

#### Endpoints
```
backend/app/api/v1/endpoints/
└── tag.py                            # CRUD, busca, popular
```

---

### 🖼️ 8. GERAÇÃO DE ASSETS (IMAGENS, ÁUDIO)

#### Services
```
backend/app/services/
├── image_generation_service.py       # ComfyUI integration
├── prompt_service.py                 # Geração de prompts
├── tts_service.py                    # Text-to-Speech
└── r2_service.py                     # Cloudflare R2 upload
```

#### Prompts
```
backend/app/prompts/
├── image_generation.py               # Prompts para SD
└── character_prompts.py              # Prompts específicos de personagem
```

#### Tasks
```
backend/app/tasks/
├── asset_tasks.py                    # Geração de assets genéricos
└── comfyui_tasks.py                  # ComfyUI específico
```

#### Endpoints
```
backend/app/api/v1/endpoints/
└── audio.py                          # TTS, STT
```

---

### 🛠️ 9. SISTEMA DE DESENVOLVIMENTO ASSISTIDO POR IA

#### Models
```
backend/app/models/
├── project.py                        # Projetos de código
├── project_analysis.py               # Análises salvas
├── project_file_versioning.py        # Versões de arquivos
└── terminal.py                       # Terminais conectados
```

#### CRUD
```
backend/app/crud/
├── project.py
├── project_analysis.py
├── project_file_versioning.py
└── terminal.py
```

#### Schemas
```
backend/app/schemas/
├── project.py
├── project_analysis.py
└── terminal.py
```

#### Endpoints
```
backend/app/api/v1/endpoints/
├── project.py                        # CRUD projetos
├── terminal.py                       # Parear terminal
├── terminal_ws.py                    # WebSocket para terminal
└── development_ws.py                 # WebSocket para dev
```

#### Agents
```
backend/app/agents/development/
├── planner_agent/                    # Planeja modificações
│   ├── handler.py
│   └── prompt.py
├── coding_agent/                     # Gera código
│   ├── handler.py
│   └── prompt.py
├── review_agent/                     # Revisa código
│   ├── handler.py
│   └── prompt.py
├── dev_response_agent/               # Respostas gerais
│   ├── handler.py
│   └── prompt.py
└── syntax_notes_agent/               # Gera notas de sintaxe
    ├── handler.py
    └── prompt.py
```

#### Tasks
```
backend/app/tasks/
└── development_tasks.py              # Análise de código assíncrona
```

#### Services
```
backend/app/services/
└── terminal_service.py               # Comunicação com connector
```

#### Core
```
backend/app/core/
├── terminal_ws_manager.py            # Gerenciador de terminais
└── task_manager.py                   # Execução de tarefas de código
```

---

### 🌐 10. INTERNACIONALIZAÇÃO

#### Models
```
backend/app/models/
└── translation.py                    # Traduções dinâmicas
```

#### CRUD
```
backend/app/crud/
└── translation.py
```

#### Schemas
```
backend/app/schemas/
└── translation.py
```

#### Endpoints
```
backend/app/api/v1/endpoints/
└── translation.py                    # Buscar traduções
```

#### Services
```
backend/app/services/
└── translation_service.py            # Lógica de tradução
```

---

### 🐛 11. SISTEMA DE REPORTS

#### Models
```
backend/app/models/
└── bug_report.py                     # Reports de bugs
```

#### Schemas
```
backend/app/schemas/
└── bug_report.py
```

#### Endpoints
```
backend/app/api/v1/endpoints/
└── report.py                         # Enviar report
```

---

### 📊 12. ANÁLISE E CLASSIFICAÇÃO DE CONTEÚDO

#### Agents
```
backend/app/agents/analysis/
└── content_classifier_agent/         # Classifica AgeRating
    ├── handler.py
    └── prompt.py
```

#### Endpoints
```
backend/app/api/v1/endpoints/
└── classification.py                 # Classificar conteúdo manualmente
```

#### Tasks
```
backend/app/tasks/
└── content_classification_tasks.py   # Classificação assíncrona
```

#### Core
```
backend/app/core/
└── content_classification.py         # Lógica de filtros
```

---

### ⚙️ 13. INFRAESTRUTURA E CORE

#### Config
```
backend/app/core/
├── config.py                         # Variáveis de ambiente
├── database.py                       # Setup SQLAlchemy + Prisma
├── security.py                       # Hashing, JWT
├── encryption.py                     # Encriptação de dados sensíveis
├── permissions.py                    # Decorators de permissão
├── logging_config.py                 # Setup de logging
└── scheduler.py                      # APScheduler
```

#### Middleware
```
backend/app/deps/
├── auth.py                           # Dependency injection de auth
└── files.py                          # Validação de arquivos
```

#### Tasks Base
```
backend/app/tasks/
├── message_processing.py             # Processamento de mensagens
└── email_tasks.py                    # Envio de emails assíncrono
```

#### Utilities
```
backend/app/utils/
├── conversation_data_formatter.py    # Formatar dados para LLM
└── validators/
    ├── base.py
    ├── json_validator.py
    └── python_validator.py
```

#### Callbacks
```
backend/app/callbacks/
└── llm_usage_callback.py             # Callback para logar uso de LLM
```

---

### 🎨 14. FRONTEND (React)

#### Páginas
```
frontend/src/pages/
├── HomePage.jsx
├── Login.jsx
├── Signup.jsx
├── CallbackPage.jsx
├── Dashboard.jsx
├── SearchPage.jsx
├── OnboardingPage.jsx
├── NotFoundPage.jsx
├── chat/
│   └── ChatPage.jsx
├── characters/
│   ├── CharacterHubPage.jsx
│   ├── CharacterFormPage.jsx
│   └── CharacterViewPage.jsx
├── story/
│   ├── StoryHubPage.jsx
│   ├── StoryFormPage.jsx
│   └── StoryPlayerPage.jsx
├── assets/
│   └── AssetsHubPage.jsx
└── development/
    ├── ProjectListPage.jsx
    └── DevelopmentPage.jsx
```

#### Componentes
```
frontend/src/components/
├── Avatar.jsx
├── Button.jsx
├── ChatContainer.jsx
├── ChatView.jsx
├── ConversationList.jsx
├── MessageInput.jsx
├── NavigationRail.jsx
├── Sidebar.jsx
├── SmartDropdown.jsx
├── TagInput.jsx
├── ThemeSwitcher.jsx
├── TreeView.jsx
├── TypingIndicator.jsx
├── UserProfileButton.jsx
└── ... (50+ componentes)
```

#### Contexts
```
frontend/src/context/
├── AuthContext.jsx
├── ThemeContext.jsx
├── ContentFilterContext.jsx
├── CreditsContext.jsx
└── ViewContext.jsx
```

#### Hooks
```
frontend/src/hooks/
├── useAuth.jsx
├── useChatWebSocket.js
├── useChatActions.js
├── useConversation.js
├── useTerminalWebSocket.js
└── ... (15+ hooks)
```

#### Services
```
frontend/src/services/
├── api.js                            # Axios setup
├── authService.js
├── characterService.js
├── conversationService.js
├── messageService.js
├── storyService.js
├── classificationService.js
├── creditService.js
├── dashboardService.js
└── ... (20+ services)
```

---

## 🗂️ Arquivos de Configuração Importantes

### Backend
```
backend/
├── main.py                           # Entrypoint FastAPI
├── celery_app.py                     # Setup Celery
├── requirements.txt                  # Dependências Python
├── alembic.ini                       # Config Alembic
├── .env                              # Variáveis de ambiente
└── Dockerfile
```

### Frontend
```
frontend/
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   └── i18n.js                       # Setup i18next
├── package.json
├── vite.config.js
├── tailwind.config.js
└── Dockerfile
```

### Docker
```
docker-compose.yml                    # Orquestração completa
```

### Docs
```
docs/
├── 00_PROJECT_OVERVIEW.md
├── 01_ARCHITECTURE.md
├── 02_DEVELOPMENT_WORKFLOW.md
├── 03_KEY_CONCEPTS.md
├── 04_DEVELOPMENT_ROADMAP.md
├── 05_CODE_GENERATION_STANDARDS.md
├── backend/
│   ├── 01_DIRECTORY_STRUCTURE.md
│   ├── 02_CODING_STANDARDS.md
│   └── 03_AGENTS_ARCHITECTURE.md
└── frontend/
    ├── 01_DIRECTORY_STRUCTURE.md
    └── 02_CODING_STANDARDS.md
```

---

## 📋 Migrations (Alembic)

**Localização**: `backend/alembic/versions/`

**Total**: ~80 migrations

**Migrations Importantes**:
```
add_favorite_characters_table.py
add_tags_table_and_migrate_data.py
add_age_rating_to_stories_and_tags.py
add_content_filter_preferences_to_user.py
add_monthly_balance_and_remove_user_balance.py
add_original_language_code_to_*.py
b5e4c3d2a1f0_add_referral_token_table.py
```

---

## 🔍 Como Usar Este Inventário

### Durante Análise de uma Etapa

**Exemplo**: Migrando Sistema de Personagens (Fase 1)

1. **Ler Models**: `backend/app/models/character.py`
2. **Entender CRUD**: `backend/app/crud/character.py`
3. **Ver Validações**: `backend/app/schemas/character.py`
4. **Endpoints de Referência**: `backend/app/api/v1/endpoints/character/core.py`
5. **Tasks Assíncronas**: `backend/app/tasks/character_tasks.py`
6. **Agentes de IA**: `backend/app/agents/character/`
7. **Frontend**: `frontend/src/pages/characters/`

### Busca Rápida

Use Ctrl+F neste documento:
- "WebSocket" → Encontra todos os arquivos WS
- "translation" → Encontra sistema de i18n
- "credit" → Encontra sistema de monetização

---

## ⚠️ Observações Importantes

### Arquivos Não Migrar

- ❌ `backend/alembic/` (migrations antigas - criar novas com Prisma)
- ❌ `backend/.venv/` (ambiente virtual Python)
- ❌ `backend/__pycache__/` (cache Python)
- ❌ Configurações específicas de Python (requirements.txt, etc.)

### Arquivos Copiar Literalmente

- ✅ Prompts de agentes (`backend/app/agents/*/prompt.py`)
- ✅ Documentação (`docs/*.md`)
- ✅ Dados iniciais (`backend/scripts/data/*.json`)

### Arquivos Adaptar

- 🔄 Models → Prisma schemas
- 🔄 Schemas (Pydantic) → Zod validators
- 🔄 Services → TypeScript services
- 🔄 Endpoints (FastAPI) → Express routes
- 🔄 Components (JSX) → TSX

---

## 📊 Estatísticas do Projeto Antigo

- **Total de Models**: ~30
- **Total de Endpoints**: ~100+
- **Total de Agentes de IA**: 15
- **Total de Tasks Celery**: ~20
- **Total de Componentes React**: ~50+
- **Total de Hooks**: ~15
- **Total de Services Frontend**: ~20
- **Linhas de Código (estimado)**: 50,000+

---

**Última atualização**: 2025-10-08
**Versão**: 1.0
