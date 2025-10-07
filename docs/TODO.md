# TODO & Status Tracker

Consolidated view of the current technology stack, delivered functionality, and upcoming development efforts. Checked items were validated against the codebase as of this revision.

## Tecnologias Centrais

- [x] **Node.js 20 + Express** (`backend/src/index.ts`) para o serviço API.
- [x] **Passport.js (Google/Facebook)** (`backend/src/config/passport.ts`, `routes/oauth.ts`) com state e JWT.
- [x] **Prisma ORM + PostgreSQL 16** (`backend/prisma`, Docker `postgres` service).
- [x] **React 18 + TypeScript + Vite** (`frontend/src/`), com Tailwind CSS e React Router.
- [x] **i18next + build de traduções** (`frontend/src/i18n.ts`, `backend/src/services/translationService.ts`, `scripts/buildTranslations.ts`).
- [x] **LLM providers Gemini/OpenAI/Grok** (`backend/src/services/llm/`).
- [x] **Docker Compose + Nginx proxy + Cloudflared tunnel** (`docker-compose.yml`, `nginx/conf.d/app.conf`, `cloudflared/config/*`).
- [ ] **Cloudflare R2 storage integration** – variáveis de ambiente definidas, mas consumo em código ainda não implementado.

## Funcionalidades Entregues

- [x] **Fluxo OAuth completo**: redirecionamento, callback, geração de JWT e hidratação do frontend (`useAuth.tsx`, `pages/Callback.tsx`).
- [x] **Proteção de rotas e sessão**: middleware `requireAuth`/`requirePremium`, `ProtectedRoute` no frontend.
- [x] **Catálogo e proxy LLM**: listagem de modelos e endpoint `/api/v1/llm/chat` chamando adaptadores específicos.
- [x] **Serviço de traduções file-based**: fallback por locale prefix e idioma base; volume Docker garante persistência.
- [x] **UI utilitária**: alternância de idioma (dropdown com bandeiras), troca de tema, menu do usuário e layout público autenticado.
- [x] **Pipelines Docker**: ambos os aplicativos compilam via multi-stage Dockerfiles; Compose monta volumes relevantes.
- [x] **Integração Cloudflared**: serviço no compose seleciona configs `config/<ENV_SUFFIX>/config.yml` e expõe `nginx`.

## Desenvolvimento Futuro (priorizar)

- [ ] **Implementar funcionalidades premium reais**: endpoints e UI existem apenas como placeholders; definir regras/benefícios concretos.
- [ ] **Persistir e consumir dados reais de usuários**: revisar `userService`/Prisma para armazenar perfis além do token OAuth.
- [ ] **Integrar Cloudflare R2/CDN**: consumir `R2_*` no backend para uploads e expor `VITE_CDN_PUBLIC_URL_BASE` na UI.
- [ ] **Observabilidade e testes**: adicionar testes unitários/integrados (especialmente para tradução, OAuth) e configurar monitoramento (Sentry/metrics).
- [ ] **Planejamento de jogos modulares (ROADMAP)**: iniciar fase 1 do roadmap (Turborepo, SDK Core, Runtime Host, Handoff system) – ainda não iniciado.
- [ ] **Automação CI/CD**: pipelines para lint/test/build/deploy ainda ausentes.
- [ ] **UX adicional**: construir dashboard real, formulários de perfil, telas premium, melhorias responsivas.

Consulte `docs/ROADMAP.md` para metas de longo prazo (engine 2D modular, editor, workers) e alinhe qualquer novo trabalho com os itens pendentes acima.