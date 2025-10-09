# Resumo Executivo: Migração do Projeto CharHub

**Status**: Plano Definido - Aguardando Início
**Tempo Estimado**: 3-6 meses

## 1. Objetivo da Migração

Migrar a plataforma CharHub de uma stack baseada em **Python/FastAPI** para uma stack unificada em **Node.js/TypeScript**, visando otimizar a manutenção, performance e a experiência de desenvolvimento. A migração será incremental, focada em entregar módulos funcionais e testáveis a cada fase.

---

## 2. Escopo da Migração

### ➡️ De (Tecnologias Antigas)
*   **Backend**: Python, FastAPI
*   **ORM**: SQLAlchemy + Alembic
*   **Jobs Assíncronos**: Celery
*   **Validação**: Pydantic
*   **WebSocket**: FastAPI Nativo

### ✅ Para (Tecnologias Novas)
*   **Backend**: Node.js, Express.js, TypeScript
*   **ORM**: Prisma
*   **Jobs Assíncronos**: BullMQ
*   **Validação**: Zod
*   **WebSocket**: Socket.IO

### 📦 Funcionalidades a Migrar
Serão migradas todas as funcionalidades core, incluindo:
1.  **Sistema de Personagens:** Criação, gestão de assets (avatares, stickers, LoRAs) e vestimentas.
2.  **Sistema de Chat:** Conversas em tempo real via WebSocket com múltiplos participantes (usuário + IAs).
3.  **Sistema de Histórias:** Geração automática e player interativo de Visual Novels.
4.  **Sistema de Créditos:** Monetização baseada em consumo de IA, planos e pagamentos (PayPal).
5.  **Sistema de Indicação:** Programa de recompensas por indicação.
6.  **Classificação de Conteúdo:** Filtros de idade e conteúdo sensível.

---

## 3. Cronograma e Fases Principais

A migração está dividida em 7 fases sequenciais, com entregas de valor em cada uma.

| Fase | Título | Duração |
|:---:|---|---|
| **0** | Infraestrutura | 1-2 semanas |
| **1** | Sistema de Personagens | 2-3 semanas |
| **2** | Sistema de Chat | 3-4 semanas |
| **3** | Sistema de Histórias | 3-4 semanas |
| **4** | Sistema de Créditos | 2 semanas |
| **5** | Sistema de Indicação | 1 semana |
| **7** | Polimento e Testes | 2-3 semanas |

**Estimativa Total 14-19 semanas (~3-5 meses)**

---

## 4. Decisões Técnicas Chave

As seguintes decisões foram tomadas para guiar a arquitetura do novo projeto. Detalhes e justificativas estão no arquivo `03_GUIA_TECNICO_E_REFERENCIA.md`.

*   **ORM**: **Prisma** foi escolhido pela forte integração com TypeScript, segurança de tipos e ferramenta de migração integrada.
*   **Jobs Assíncronos**: **BullMQ** foi selecionado por ser robusto, baseado em Redis (que já está na stack) e ter um bom ecossistema (ex: dashboard).
*   **Validação**: **Zod** será usado para validação de schemas, permitindo inferência de tipos e garantindo a consistência de dados entre frontend e backend.
*   **WebSocket**: **Socket.IO** foi preferido por sua resiliência (fallback para HTTP polling), sistema de `rooms` e reconexão automática.
*   **Estrutura do Projeto**: Manteremos um **Monorepo** para facilitar o compartilhamento de tipos e a sincronização entre frontend e backend.

---

## 5. Próximos Passos Imediatos

1.  **Aprovação do Plano:** Validar este resumo executivo e o escopo da migração.
2.  **Setup do Ambiente:** Garantir que todos os desenvolvedores tenham o ambiente configurado, incluindo acesso ao projeto antigo como referência.
3.  **Iniciar Fase 0 - Infraestrutura:** Começar a implementação das bases técnicas:
    *   Configuração do BullMQ para tarefas assíncronas.
    *   Criação do serviço de integração com o Cloudflare R2 para storage.
    *   Definição dos schemas de classificação de conteúdo no Prisma.