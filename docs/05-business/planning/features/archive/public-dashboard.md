# Dashboard Público com Login/Signup

**Data**: 2025-12-23
**Status**: 📋 Active
**Prioridade**: Alta
**Estimativa**: 1-2 semanas
**Assigned to**: Agent Coder

---

## 📊 Status de Implementação

### Progresso Geral
- [x] Planning complete
- [x] Backend implementation (não necessário - API já suporta)
- [x] Frontend implementation
- [x] Testing
- [x] Documentation
- [x] Ready for PR

### Implementação Concluída ✅

#### Planejamento e Preparação
- [x] Leitura da especificação da feature
- [x] Leitura de documentação crítica (arquitetura, backend, frontend)
- [x] Exploração do código frontend existente
- [x] Criação do branch `feature/public-dashboard`

#### Componentes Criados
- [x] Criação do componente `PublicHeader` (`frontend/src/components/layout/PublicHeader.tsx`)
  - Theme toggle integrado
  - Language switcher integrado
  - Botões de Login e Signup com ícones
  - i18n configurado (namespaces: home, common)
  - Altura consistente para todos os botões (h-12)

#### Modificações nos Componentes Existentes
- [x] Modificação do `App.tsx`
  - Rota "/" redireciona para "/dashboard"
  - Rota "/dashboard" removida de ProtectedRoute (agora pública)
- [x] Modificação do `Dashboard/index.tsx`
  - Refatorado em 3 componentes: DashboardContent, AuthenticatedDashboard, Dashboard
  - Lógica condicional para autenticação
  - Filtro para mostrar apenas `ageRating: 'L'` para não autenticados
  - Renderização do PublicHeader quando não autenticado
  - Uso de AuthenticatedLayout quando autenticado
  - Chamadas de API condicionais (favorites e user stories apenas para autenticados)
  - Esconder aba "Chat" para visitantes
  - Esconder toggles "Favorites" e "My Stories" para visitantes
- [x] Modificação do `ProtectedRoute.tsx`
  - Redirecionar para /signup ao invés de /
  - Salvar URL completa (pathname + search + hash) para redirect pós-login
- [x] Modificação do `useAuthRedirect.tsx`
  - Suporte para formato string e objeto (backward compatibility)
  - Redireciona para URL original ou /dashboard por padrão

#### Testes
- [x] Testes locais completos e aprovados pelo usuário
  - ✅ Dashboard público acessível sem login
  - ✅ Conteúdo filtrado corretamente (apenas 'L' para visitantes)
  - ✅ Sidebar oculta para visitantes
  - ✅ PublicHeader visível com theme/language selectors
  - ✅ Botões Login/Signup funcionais
  - ✅ Redirect "/" → "/dashboard" funcionando
  - ✅ Após login, sidebar e header aparecem corretamente
  - ✅ AuthenticatedLayout aplicado corretamente
  - ✅ Sem erros 401 para visitantes
  - ✅ Sem erros no console

#### Documentação e PR
- [x] Atualização do spec com progresso final
- [x] Pull Request #56 criado e atualizado
- [x] Commits seguindo convenções
- [x] Descrição detalhada do PR

### Bloqueios
- Nenhum

### Notas de Implementação
- Backend não requer mudanças (API já filtra por accessLevel e suporta queries sem token)
- Solução de dual-mode rendering implementada com sucesso (3-component architecture)
- PageHeaderProvider corretamente isolado para uso apenas em AuthenticatedLayout
- i18n configurado com namespaces apropriados (home:accessButton, home:signupButton)
- Todas as issues reportadas durante testes foram corrigidas

### Pull Request
- **Número**: #56
- **Branch**: `feature/public-dashboard`
- **Status**: Pronto para revisão do Agent Reviewer
- **Link**: https://github.com/leandro-br-dev/charhub/pull/56

---

## Índice

1. [Visão Geral](#visão-geral)
2. [Contexto e Motivação](#contexto-e-motivação)
3. [Objetivos](#objetivos)
4. [Arquitetura da Solução](#arquitetura-da-solução)
5. [Implementação Técnica](#implementação-técnica)
6. [Frontend](#frontend)
7. [Fluxos de Usuário](#fluxos-de-usuário)
8. [Regras de Negócio](#regras-de-negócio)
9. [Testes](#testes)
10. [Roadmap de Implementação](#roadmap-de-implementação)

---

## Visão Geral

Transformar o dashboard de área privada para área pública, tornando-o a landing page principal do CharHub. Usuários não autenticados podem visualizar conteúdo livre, e após login/signup, ganham acesso completo ao sistema.

### Características Principais

- ✅ **Dashboard como Landing Page**: Acessível em `charhub.app` sem necessidade de login
- ✅ **Conteúdo Livre para Visitantes**: Exibir apenas conteúdo com `accessLevel: "Livre"` para não autenticados
- ✅ **Barra Lateral Oculta**: Sidebar escondida quando usuário não está logado
- ✅ **Botão Login/Signup**: No topo da página para visitantes
- ✅ **Proteção de Rotas**: Redirecionar para login quando tentar acessar páginas protegidas
- ✅ **Retorno ao Dashboard**: Após login/signup, retornar automaticamente ao dashboard

---

## Contexto e Motivação

### Problemas Atuais

```
❌ Dashboard está em área privada
   └─ Requer login para ver qualquer conteúdo
   └─ Visitantes não conhecem as funcionalidades do CharHub
   └─ Primeira impressão é a tela de login (não engaja)

❌ Landing page não demonstra valor
   └─ Usuários não sabem o que é o CharHub antes de fazer login
   └─ Taxa de conversão baixa (sem "try before you buy")
   └─ Conteúdo livre não é aproveitado para atrair novos usuários

❌ Navegação confusa para visitantes
   └─ Sem direcionamento claro para signup
   └─ Sem restrição de acesso a áreas privadas
```

### Por que essa feature é importante?

1. **Aquisição de Usuários**: Demonstrar valor antes de solicitar cadastro
2. **Engajamento**: Permitir exploração de conteúdo livre sem fricção
3. **Conversão**: Dashboard é a área com mais informações sobre funcionalidades
4. **UX**: Fluxo natural de descoberta → interesse → cadastro
5. **SEO**: Conteúdo público indexável para motores de busca

---

## Objetivos

### Objetivos de Negócio

- ✅ Aumentar taxa de conversão de visitante → usuário cadastrado
- ✅ Reduzir fricção no primeiro contato com o produto
- ✅ Demonstrar valor do CharHub antes do signup
- ✅ Aproveitar conteúdo "Livre" como isca para novos usuários

### Objetivos Técnicos

- ✅ Remover proteção de autenticação da rota `/dashboard`
- ✅ Implementar filtro de conteúdo baseado em status de autenticação
- ✅ Proteger rotas secundárias (chat, profile, settings, etc.)
- ✅ Manter segurança e não expor dados sensíveis
- ✅ Implementar redirect após login para URL original

### Objetivos de Produto

- ✅ Interface clara diferenciando visitante vs. usuário logado
- ✅ Call-to-action (CTA) visível para login/signup
- ✅ Navegação intuitiva sem frustrações para visitantes
- ✅ Experiência consistente em mobile e desktop

---

## Arquitetura da Solução

### Diagrama de Fluxo

```
┌─────────────────────────────────────────────────────────┐
│                    charhub.app                          │
│                         ↓                               │
│                    DASHBOARD                            │
│                   (Público)                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Usuário Logado?                                        │
│                                                         │
│  ┌─────────────────────┬──────────────────────┐       │
│  │       NÃO           │        SIM           │       │
│  └─────────────────────┴──────────────────────┘       │
│           ↓                        ↓                    │
│  ┌──────────────────┐    ┌──────────────────┐         │
│  │ Conteúdo Livre   │    │ Todo Conteúdo    │         │
│  │ Sidebar Oculta   │    │ Sidebar Visível  │         │
│  │ Botão Login/     │    │ Navegação Plena  │         │
│  │ Signup no Topo   │    │                  │         │
│  └──────────────────┘    └──────────────────┘         │
│                                                         │
│  Tentar acessar:                                        │
│  /chat, /profile, etc?                                  │
│           ↓                                             │
│  Redirecionar para /signup                              │
│  (salvar URL original)                                  │
│           ↓                                             │
│  Após Login/Signup                                      │
│           ↓                                             │
│  Retornar para Dashboard                                │
│  ou URL original se existir                             │
└─────────────────────────────────────────────────────────┘
```

### Componentes Afetados

**Frontend**:
- `src/pages/Dashboard.tsx` - Lógica de exibição condicional
- `src/components/Sidebar.tsx` - Ocultar quando não logado
- `src/components/Header.tsx` ou equivalente - Adicionar botão Login/Signup
- `src/routes/ProtectedRoute.tsx` - Atualizar lógica de proteção
- `src/contexts/AuthContext.tsx` - Gerenciar estado de autenticação

**Backend**:
- Nenhuma mudança crítica (API já filtra por `accessLevel`)
- Endpoints públicos já existentes (não requerem token)

---

## Implementação Técnica

### 1. Remover Proteção da Rota Dashboard

**Arquivo**: `frontend/src/App.tsx` ou equivalente

```tsx
// ANTES
<ProtectedRoute>
  <Dashboard />
</ProtectedRoute>

// DEPOIS
<Route path="/dashboard" element={<Dashboard />} />
```

### 2. Lógica Condicional no Dashboard

**Arquivo**: `frontend/src/pages/Dashboard.tsx`

```tsx
import { useAuth } from '@/contexts/AuthContext'

const Dashboard = () => {
  const { isAuthenticated, user } = useAuth()

  // Filtrar conteúdo baseado em autenticação
  const filteredContent = useMemo(() => {
    if (!isAuthenticated) {
      // Mostrar apenas conteúdo "Livre"
      return content.filter(item => item.accessLevel === 'Livre')
    }

    // Usuário logado: respeitar age rating e subscription
    return content.filter(item => {
      // Lógica existente de filtragem
      return isContentAccessible(item, user)
    })
  }, [isAuthenticated, content, user])

  return (
    <div>
      {!isAuthenticated && <PublicHeader />}
      {isAuthenticated && <Sidebar />}

      <main>
        {filteredContent.map(item => (
          <ContentCard key={item.id} content={item} />
        ))}
      </main>
    </div>
  )
}
```

### 3. Componente Header Público

**Arquivo**: `frontend/src/components/PublicHeader.tsx` (novo)

```tsx
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export const PublicHeader = () => {
  const navigate = useNavigate()

  return (
    <header className="fixed top-0 right-0 p-4 z-50">
      <div className="flex gap-2">
        <Button
          variant="ghost"
          onClick={() => navigate('/login')}
        >
          Login
        </Button>
        <Button
          onClick={() => navigate('/signup')}
        >
          Sign Up
        </Button>
      </div>
    </header>
  )
}
```

### 4. Ocultar Sidebar para Não Autenticados

**Arquivo**: `frontend/src/components/Sidebar.tsx`

```tsx
import { useAuth } from '@/contexts/AuthContext'

const Sidebar = () => {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return null // Não renderizar sidebar
  }

  return (
    <aside>
      {/* Conteúdo existente da sidebar */}
    </aside>
  )
}
```

### 5. Proteger Rotas Secundárias

**Arquivo**: `frontend/src/routes/ProtectedRoute.tsx`

```tsx
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    // Salvar URL original para retornar após login
    return (
      <Navigate
        to="/signup"
        state={{ from: location.pathname }}
        replace
      />
    )
  }

  return children
}
```

### 6. Redirect após Login/Signup

**Arquivo**: `frontend/src/pages/Signup.tsx` e `Login.tsx`

```tsx
import { useNavigate, useLocation } from 'react-router-dom'

const Signup = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const handleSuccessfulSignup = async () => {
    // Após signup bem-sucedido
    const from = location.state?.from || '/dashboard'
    navigate(from, { replace: true })
  }

  // ... resto do código
}
```

---

## Frontend

### Mudanças de UI/UX

#### Dashboard - Visitante Não Autenticado

```
┌────────────────────────────────────────────────────┐
│  CharHub                    [Login]  [Sign Up]     │ ← Header fixo no topo
├────────────────────────────────────────────────────┤
│                                                    │
│  [Sidebar OCULTA]                                  │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │  📚 Conteúdo Livre Disponível                │ │
│  │                                               │ │
│  │  [Card 1 - Livre]  [Card 2 - Livre]         │ │
│  │  [Card 3 - Livre]  [Card 4 - Livre]         │ │
│  │                                               │ │
│  │  ⚠️ Faça login para acessar mais conteúdo    │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
└────────────────────────────────────────────────────┘
```

#### Dashboard - Usuário Autenticado

```
┌────────────────────────────────────────────────────┐
│  CharHub                    [Avatar] [Settings]    │
├──────┬─────────────────────────────────────────────┤
│      │                                             │
│ Side │  ┌───────────────────────────────────────┐ │
│ bar  │  │  📚 Todo o Conteúdo                    │ │
│      │  │                                         │ │
│ [🏠] │  │  [Card 1]  [Card 2]  [Card 3]         │ │
│ [💬] │  │  [Card 4]  [Card 5]  [Card 6]         │ │
│ [⚙️]  │  │                                         │ │
│      │  └───────────────────────────────────────┘ │
│      │                                             │
└──────┴─────────────────────────────────────────────┘
```

### Componentes a Criar/Modificar

| Componente | Ação | Descrição |
|------------|------|-----------|
| `PublicHeader.tsx` | **Criar** | Header com botões Login/Signup |
| `Dashboard.tsx` | **Modificar** | Adicionar lógica condicional |
| `Sidebar.tsx` | **Modificar** | Ocultar quando não autenticado |
| `ProtectedRoute.tsx` | **Modificar** | Salvar URL original |
| `Signup.tsx` | **Modificar** | Redirect para dashboard |
| `Login.tsx` | **Modificar** | Redirect para dashboard |

---

## Fluxos de Usuário

### Fluxo 1: Visitante Explora Dashboard

```
1. Usuário acessa charhub.app
   ↓
2. Carrega Dashboard (público)
   ↓
3. Vê conteúdo "Livre" disponível
   ↓
4. Sidebar está oculta
   ↓
5. Vê botões [Login] [Sign Up] no topo
   ↓
6. Explora conteúdo livre sem fricção
```

### Fluxo 2: Visitante Tenta Acessar Área Protegida

```
1. Visitante clica em link direto (ex: charhub.app/chat)
   ↓
2. ProtectedRoute detecta não autenticado
   ↓
3. Salva URL original (/chat)
   ↓
4. Redireciona para /signup
   ↓
5. Usuário completa signup
   ↓
6. Redireciona de volta para /chat (URL original)
   ↓
7. Agora autenticado, acessa /chat normalmente
```

### Fluxo 3: Visitante Faz Signup

```
1. Visitante no Dashboard público
   ↓
2. Clica em [Sign Up]
   ↓
3. Vai para /signup
   ↓
4. Preenche formulário / OAuth
   ↓
5. Signup bem-sucedido
   ↓
6. Redireciona para /dashboard
   ↓
7. Agora vê Dashboard completo com sidebar
   ↓
8. Tem acesso a todas as rotas
```

### Fluxo 4: Usuário Logado Acessa Dashboard

```
1. Usuário já autenticado acessa charhub.app
   ↓
2. Carrega Dashboard (privado)
   ↓
3. Vê sidebar visível
   ↓
4. Vê todo conteúdo (respeitando age rating e subscription)
   ↓
5. Pode navegar livremente para /chat, /profile, etc.
```

---

## Regras de Negócio

### Visibilidade de Conteúdo

| Status | Conteúdo Visível | Sidebar | Navegação |
|--------|------------------|---------|-----------|
| **Não Autenticado** | Apenas `accessLevel: "Livre"` | Oculta | Dashboard apenas |
| **Autenticado (Free)** | Livre + Conteúdo permitido por age rating | Visível | Todas as rotas |
| **Autenticado (Premium)** | Todo conteúdo permitido por age rating | Visível | Todas as rotas |

### Proteção de Rotas

**Rotas Públicas** (sem necessidade de login):
- `/` (redirect para `/dashboard`)
- `/dashboard`
- `/signup`
- `/login`
- `/forgot-password`
- `/reset-password`

**Rotas Protegidas** (requerem autenticação):
- `/chat`
- `/chat/:id`
- `/profile`
- `/settings`
- `/subscription`
- Todas as outras rotas não listadas acima

### Comportamento de Redirect

```typescript
// Se não autenticado e tentar acessar rota protegida
if (!isAuthenticated && isProtectedRoute) {
  saveOriginalUrl(currentPath)
  redirect('/signup')
}

// Após login/signup bem-sucedido
if (originalUrl) {
  redirect(originalUrl)
} else {
  redirect('/dashboard')
}
```

---

## Testes

### Testes de Integração

#### Teste 1: Dashboard Público para Visitantes

```typescript
describe('Public Dashboard', () => {
  it('should display only free content when not authenticated', async () => {
    // Arrange
    const { user } = render(<App />)

    // Act
    await user.goto('/dashboard')

    // Assert
    expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument()
    expect(screen.getByText('Login')).toBeInTheDocument()
    expect(screen.getByText('Sign Up')).toBeInTheDocument()

    const contentCards = screen.getAllByTestId('content-card')
    contentCards.forEach(card => {
      expect(card).toHaveAttribute('data-access-level', 'Livre')
    })
  })
})
```

#### Teste 2: Proteção de Rotas

```typescript
describe('Protected Routes', () => {
  it('should redirect to signup when accessing protected route without auth', async () => {
    // Arrange
    const { user } = render(<App />)

    // Act
    await user.goto('/chat')

    // Assert
    expect(window.location.pathname).toBe('/signup')
    expect(localStorage.getItem('redirectAfterLogin')).toBe('/chat')
  })
})
```

#### Teste 3: Redirect após Login

```typescript
describe('Login Redirect', () => {
  it('should redirect to original URL after successful login', async () => {
    // Arrange
    localStorage.setItem('redirectAfterLogin', '/chat')
    const { user } = render(<App />)

    // Act
    await user.goto('/login')
    await user.type(screen.getByLabelText('Email'), 'test@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Login' }))

    // Wait for login to complete
    await waitFor(() => {
      expect(window.location.pathname).toBe('/chat')
    })
  })
})
```

#### Teste 4: Dashboard Completo para Usuários Logados

```typescript
describe('Authenticated Dashboard', () => {
  it('should display full content and sidebar when authenticated', async () => {
    // Arrange
    mockAuthenticatedUser()
    const { user } = render(<App />)

    // Act
    await user.goto('/dashboard')

    // Assert
    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
    expect(screen.queryByText('Login')).not.toBeInTheDocument()

    const contentCards = screen.getAllByTestId('content-card')
    expect(contentCards.length).toBeGreaterThan(
      // Espera-se mais conteúdo que apenas "Livre"
      freeContentCount
    )
  })
})
```

### Checklist de Testes Manuais

- [ ] Acessar `charhub.app` sem estar logado exibe dashboard público
- [ ] Dashboard público mostra apenas conteúdo "Livre"
- [ ] Sidebar está oculta quando não logado
- [ ] Botões Login/Signup visíveis no topo
- [ ] Clicar em Login redireciona para `/login`
- [ ] Clicar em Sign Up redireciona para `/signup`
- [ ] Tentar acessar `/chat` sem login redireciona para `/signup`
- [ ] Após signup, retorna para `/dashboard`
- [ ] Dashboard logado mostra sidebar completa
- [ ] Dashboard logado mostra todo conteúdo permitido
- [ ] Navegação entre rotas protegidas funciona normalmente
- [ ] Logout retorna para dashboard público
- [ ] Mobile: botões Login/Signup são responsivos
- [ ] Mobile: dashboard público é navegável

---

## Roadmap de Implementação

### Fase 1: Backend (se necessário)
**Tempo estimado**: 1 dia

- [ ] Verificar se API já suporta consultas sem token
- [ ] Garantir que endpoint de dashboard filtra por `accessLevel`
- [ ] Adicionar testes de API para consultas públicas

### Fase 2: Frontend - Estrutura Base
**Tempo estimado**: 2 dias

- [ ] Remover `ProtectedRoute` da rota `/dashboard`
- [ ] Criar componente `PublicHeader`
- [ ] Modificar `Dashboard.tsx` para lógica condicional
- [ ] Modificar `Sidebar.tsx` para ocultar quando não autenticado
- [ ] Adicionar filtro de conteúdo "Livre" no Dashboard

### Fase 3: Proteção de Rotas
**Tempo estimado**: 1 dia

- [ ] Atualizar `ProtectedRoute` para salvar URL original
- [ ] Implementar redirect após login/signup
- [ ] Testar fluxo de redirect em todas as rotas protegidas

### Fase 4: UI/UX
**Tempo estimado**: 2 dias

- [ ] Estilizar `PublicHeader` com design consistente
- [ ] Ajustar layout do Dashboard para modo público
- [ ] Garantir responsividade em mobile
- [ ] Adicionar mensagem "Faça login para ver mais conteúdo"
- [ ] Polir transições e animações

### Fase 5: Testes
**Tempo estimado**: 2 dias

- [ ] Escrever testes de integração
- [ ] Executar checklist de testes manuais
- [ ] Testar em diferentes navegadores
- [ ] Testar em mobile (iOS e Android)
- [ ] Corrigir bugs encontrados

### Fase 6: Documentação & Deploy
**Tempo estimado**: 1 dia

- [ ] Atualizar documentação técnica
- [ ] Criar guia de uso para usuários
- [ ] Code review
- [ ] Merge para main
- [ ] Deploy e monitoramento

---

## Riscos e Mitigações

### Risco 1: Expor Conteúdo Sensível

**Mitigação**:
- Filtro estrito de `accessLevel: "Livre"` no frontend
- Backend já implementa autorização correta
- Testes automatizados validam filtro

### Risco 2: SEO Issues (Conteúdo Duplicado)

**Mitigação**:
- Implementar meta tags corretas
- Usar `canonical` URLs
- Considerar Server-Side Rendering (SSR) se necessário

### Risco 3: Performance com Muito Conteúdo

**Mitigação**:
- Implementar paginação
- Lazy loading de imagens
- Cache de consultas com React Query

### Risco 4: Confusão de Usuários (UX)

**Mitigação**:
- CTA claro para signup
- Mensagens explicativas ("Faça login para ver mais")
- Onboarding visual para novos usuários

---

## Métricas de Sucesso

### KPIs a Monitorar

1. **Taxa de Conversão**: Visitantes → Usuários Cadastrados
   - Target: Aumentar em 20-30% nos primeiros 30 dias

2. **Tempo Médio no Dashboard Público**
   - Target: > 2 minutos (indica engajamento)

3. **Bounce Rate no Dashboard**
   - Target: < 50% (visitantes exploram conteúdo)

4. **Taxa de Signup após Visitar Dashboard**
   - Target: > 10% dos visitantes únicos

5. **Retenção de Novos Usuários**
   - Target: > 40% retornam em 7 dias

---

## Notas Adicionais

### Considerações Futuras

1. **A/B Testing**: Testar diferentes CTAs e layouts
2. **Analytics**: Implementar tracking de eventos (visualizações, cliques em CTA)
3. **Personalization**: Recomendar conteúdo baseado em comportamento de visitante
4. **Social Proof**: Mostrar estatísticas ("10.000+ usuários", "500+ personagens")

### Compatibilidade

- ✅ Compatível com sistema de Welcome Flow existente
- ✅ Compatível com sistema de age rating
- ✅ Compatível com sistema de subscription
- ✅ Não conflita com OAuth authentication

---

**Próximos Passos**:
1. Revisar especificação com stakeholders
2. Aprovar design de UI
3. Iniciar implementação (Fase 1)
4. Criar PR para revisão
