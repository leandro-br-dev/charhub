# Sistema de Tradução Automática de Conteúdo

Sistema de tradução automática de conteúdo gerado por usuários (UGC) com cache multinível e integração com LLM.

## Como Funciona

### Fluxo de Tradução

1. **Usuário faz requisição** para uma API (ex: `GET /api/v1/characters/:id`)
2. **Backend detecta idioma** do usuário através de:
   - Header `X-User-Language` (enviado automaticamente pelo frontend)
   - `Accept-Language` header do navegador
   - Campo `preferredLanguage` do usuário no banco
3. **Middleware intercepta resposta** antes de enviar ao cliente
4. **Sistema verifica** se conteúdo precisa ser traduzido:
   - Compara `content.originalLanguageCode` com idioma do usuário
   - Se forem diferentes, inicia tradução
5. **Cache multinível**:
   - **Redis (L1)**: Verifica cache rápido (TTL: 1 hora)
   - **Database (L2)**: Busca tradução armazenada permanentemente
   - **LLM (L3)**: Chama Gemini 2.5 Flash Lite para traduzir
6. **Resposta traduzida** é enviada ao cliente com metadata de tradução

### Cache Multinível

```
┌─────────────┐
│   Request   │
└──────┬──────┘
       │
       ▼
┌─────────────┐    HIT     ┌──────────┐
│   Redis     │───────────▶│ Response │
│   (L1)      │            └──────────┘
└──────┬──────┘
       │ MISS
       ▼
┌─────────────┐    HIT     ┌──────────┐
│  Database   │───────────▶│ Response │
│   (L2)      │            └──────────┘
└──────┬──────┘
       │ MISS
       ▼
┌─────────────┐   GENERATE ┌──────────┐
│     LLM     │───────────▶│ Response │
│   (L3)      │            └──────────┘
└─────────────┘
```

## Integração em Novas APIs

### Passo 1: Adicionar Campos ao Schema

```prisma
model YourModel {
  id                   String  @id @default(uuid())
  name                 String
  description          String?
  originalLanguageCode String?  // Idioma original do conteúdo
  contentVersion       Int @default(1) // Versão para invalidação de cache
  // ... outros campos
}
```

### Passo 2: Configurar Campos Traduzíveis

Edite `backend/src/middleware/translationMiddleware.ts`:

```typescript
const TRANSLATABLE_FIELDS: Record<string, string[]> = {
  Character: ['personality', 'history', 'physicalCharacteristics'],
  Story: ['title', 'synopsis', 'initialText'],
  Attire: ['name', 'description'],
  Tag: ['name', 'description'],
  YourModel: ['name', 'description'], // ← Adicione aqui
};
```

### Passo 3: Adicionar Detecção de Tipo

Na mesma arquivo, adicione lógica para inferir o tipo do conteúdo:

```typescript
function inferContentType(data: any): string | null {
  // ... código existente ...

  // Adicione verificação para seu modelo
  if ('yourUniqueField' in data && 'anotherField' in data) {
    return 'YourModel';
  }

  return null;
}
```

### Passo 4: Aplicar Middleware na Rota

```typescript
import { translationMiddleware } from '../../middleware/translationMiddleware';

// Aplique o middleware apenas em rotas GET que retornam conteúdo
router.get('/:id',
  optionalAuth,              // Detecta usuário (opcional)
  translationMiddleware(),   // ← Adicione esta linha
  async (req, res) => {
    // Seu código normal aqui
    const item = await yourService.getById(id);
    res.json({ success: true, data: item });
  }
);

router.get('/',
  optionalAuth,
  translationMiddleware(),   // ← Para listagens também
  async (req, res) => {
    const items = await yourService.getAll();
    res.json({ success: true, data: items });
  }
);
```

### Passo 5: Invalidar Cache ao Atualizar

No seu service de atualização:

```typescript
import { translationService } from '../services/translation/translationService';

export async function updateYourModel(id: string, data: any) {
  // Campos que, se mudarem, invalidam traduções
  const translatableFields = ['name', 'description'];
  const hasTranslatableChanges = translatableFields.some(field => field in data);

  // Incrementa contentVersion se campos traduzíveis mudaram
  if (hasTranslatableChanges) {
    data.contentVersion = { increment: 1 };
  }

  const updated = await prisma.yourModel.update({
    where: { id },
    data,
  });

  // Invalida cache de traduções
  if (hasTranslatableChanges) {
    await translationService.invalidateTranslations('YourModel', id);
  }

  return updated;
}
```

## Checklist de Integração

- [ ] Schema Prisma atualizado com `originalLanguageCode` e `contentVersion`
- [ ] Campos traduzíveis adicionados em `TRANSLATABLE_FIELDS`
- [ ] Detecção de tipo implementada em `inferContentType()`
- [ ] Middleware aplicado nas rotas GET
- [ ] Invalidação de cache implementada no service de update
- [ ] Migration do Prisma criada e aplicada

## Arquivos Importantes

```
backend/
├── src/
│   ├── middleware/
│   │   └── translationMiddleware.ts    # Middleware principal
│   ├── services/
│   │   ├── translation/
│   │   │   ├── translationService.ts   # Lógica de tradução e cache
│   │   │   └── translationMetrics.ts   # Métricas e analytics
│   └── routes/v1/
│       └── admin/
│           └── translations.ts          # Endpoints de admin

frontend/
└── src/
    └── lib/
        └── api.ts                        # Envia X-User-Language header
```

## Métricas e Monitoramento

### Endpoint Admin

```bash
GET /api/v1/admin/translations/metrics
```

Retorna:
- Total de traduções (ativas, desatualizadas, falhas)
- Taxa de acerto do cache
- Tempo médio de tradução
- Pares de idiomas mais traduzidos
- Traduções por tipo de conteúdo

### Popular Content

```bash
GET /api/v1/admin/translations/popular/:contentType?limit=10
```

Retorna os conteúdos mais traduzidos de um tipo específico.

## Configuração

### Variáveis de Ambiente

```bash
# Redis (necessário para cache)
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Tradução
TRANSLATION_DEFAULT_PROVIDER=gemini
TRANSLATION_DEFAULT_MODEL=gemini-2.5-flash-lite
TRANSLATION_CACHE_TTL=3600  # 1 hora em segundos
```

## Exemplo Completo

### 1. Criar Model

```prisma
model Product {
  id                   String  @id @default(uuid())
  name                 String
  description          String? @db.Text
  price                Float
  originalLanguageCode String? @default("en-US")
  contentVersion       Int @default(1)
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
}
```

### 2. Configurar Middleware

```typescript
// translationMiddleware.ts
const TRANSLATABLE_FIELDS: Record<string, string[]> = {
  // ... outros ...
  Product: ['name', 'description'],
};

function inferContentType(data: any): string | null {
  // ... outros ...
  if ('price' in data && 'name' in data && 'id' in data) {
    return 'Product';
  }
  return null;
}
```

### 3. Aplicar na Rota

```typescript
// routes/v1/products.ts
router.get('/:id', optionalAuth, translationMiddleware(), async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
  });

  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  res.json({ success: true, data: product });
});
```

### 4. Invalidar ao Atualizar

```typescript
// services/productService.ts
export async function updateProduct(id: string, data: UpdateProductInput) {
  const translatableFields = ['name', 'description'];
  const hasChanges = translatableFields.some(f => f in data);

  if (hasChanges) {
    data.contentVersion = { increment: 1 };
  }

  const product = await prisma.product.update({
    where: { id },
    data,
  });

  if (hasChanges) {
    await translationService.invalidateTranslations('Product', id);
  }

  return product;
}
```

## Frontend

O frontend **não precisa de alterações** para novos modelos. O axios interceptor em `frontend/src/lib/api.ts` já envia automaticamente o header `X-User-Language` com o idioma do usuário.

A tradução é completamente transparente para o frontend - ele simplesmente recebe o conteúdo já traduzido.

## Performance

- **Cache Hit (Redis)**: ~1-5ms
- **Cache Hit (Database)**: ~10-50ms
- **LLM Translation**: ~500-2000ms (apenas na primeira vez)
- **TTL Redis**: 1 hora (configurável)
- **Database**: Permanente (até invalidação)

## Custos

- **Redis Cache**: Grátis (cache local)
- **Database Storage**: ~500 bytes por tradução
- **LLM**: ~$0.00001 por tradução (Gemini 2.5 Flash Lite)

Com cache eficiente, o custo de LLM é mínimo após a primeira tradução.
