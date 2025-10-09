# Guia Técnico e Referências da Migração

Este documento é a sua "caixa de ferramentas". Consulte-o sempre que precisar de informações detalhadas sobre o projeto antigo, comandos úteis ou o porquê de decisões técnicas.

---

## 1. Inventário do Projeto Antigo (`E:\Projects\charhub_dev_old_version\`)

Use esta seção para localizar rapidamente a lógica de negócio no projeto Python/FastAPI.

### 📁 Estrutura por Funcionalidade

*   **Usuários e Autenticação:**
    *   **Models**: `backend/app/models/user.py`, `oauth_account.py`
    *   **Endpoints**: `backend/app/api/v1/endpoints/auth.py`, `oauth.py`

*   **Personagens e Assets:**
    *   **Models**: `backend/app/models/character.py`, `lora.py`, `attire.py`
    *   **Endpoints**: `backend/app/api/v1/endpoints/character/`
    *   **Agentes de IA**: `backend/app/agents/character/`
    *   **Tarefas Assíncronas**: `backend/app/tasks/character_tasks.py`

*   **Chat e Conversas:**
    *   **Models**: `backend/app/models/conversation.py`, `message.py`, `assistant.py`
    *   **Endpoints**: `backend/app/api/v1/endpoints/chat.py`, `ws.py`
    *   **Agentes de IA**: `backend/app/agents/chat/`
    *   **Core**: `backend/app/core/websocket_manager.py`

*   **Histórias (Visual Novel):**
    *   **Models**: `backend/app/models/story.py`, `story_progress.py`
    *   **Endpoints**: `backend/app/api/v1/endpoints/story.py`
    *   **Agentes de IA**: `backend/app/agents/story/`
    *   **Tarefas Assíncronas**: `backend/app/tasks/story_tasks.py`

*   **Créditos e Monetização:**
    *   **Models**: `backend/app/models/credit_transaction.py`, `plan.py`, `usage_log.py`
    *   **Endpoints**: `backend/app/api/v1/endpoints/plan.py`, `costs.py`
    *   **Services**: `backend/app/services/payment_service.py`
    *   **Tarefas Assíncronas**: `backend/app/tasks/usage_log_processing.py`

*   **Indicação (Referral):**
    *   **Models**: `backend/app/models/referral_token.py`
    *   **Lógica**: `backend/app/tasks/referral_tasks.py`

*   **Geração de Imagens e Áudio:**
    *   **Services**: `backend/app/services/image_generation_service.py`, `tts_service.py`, `r2_service.py`
    *   **Tarefas Assíncronas**: `backend/app/tasks/comfyui_tasks.py`

*   **Configurações e Core:**
    *   **Entrypoint**: `backend/main.py`
    *   **Celery**: `backend/celery_app.py`
    *   **Variáveis de Ambiente**: `backend/app/core/config.py`
    *   **Banco de Dados**: `backend/app/core/database.py`
    *   **Migrations**: `backend/alembic/versions/` (Apenas para referência, não migrar)

---