# Tag Classification System

Sistema de tags para classificação de conteúdo (personagens, histórias, assets, etc.) com suporte a classificação etária, avisos de conteúdo e tradução multilíngue.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Estrutura do Banco de Dados](#estrutura-do-banco-de-dados)
- [Como Usar Tags](#como-usar-tags)
- [Adicionar Novas Tags](#adicionar-novas-tags)
- [Filtrar Conteúdo por Tags](#filtrar-conteúdo-por-tags)
- [Sistema de Tradução](#sistema-de-tradução)
- [Arquivos Importantes](#arquivos-importantes)

---

## Visão Geral

O sistema de tags permite:
- ✅ Classificar personagens, histórias e outros conteúdos
- ✅ Definir classificação etária por tag (L, 10+, 12+, 14+, 16+, 18+)
- ✅ Associar avisos de conteúdo (violência, nudez, sexual, etc.)
- ✅ Filtrar conteúdo baseado em preferências do usuário
- ✅ Suporte multilíngue automático (11 idiomas)
- ✅ Pesquisa e categorização eficiente

### Tipos de Tags Disponíveis

| Tipo | Descrição | Exemplos |
|------|-----------|----------|
| `CHARACTER` | Características de personagens | VTuber, Maid, Warrior, Tsundere |
| `STORY` | Gêneros e temas narrativos | Fantasy, Romance, Isekai, LitRPG |
| `ASSET` | Assets visuais e roupas | Kimono, Armor, Swimsuit, Crown |
| `GAME` | Tags relacionadas a games | (futuro) |
| `MEDIA` | Tipos de mídia | (futuro) |
| `GENERAL` | Classificação geral | (futuro) |

### Classificações Etárias

| Rating | Idade | Descrição |
|--------|-------|-----------|
| `L` | Livre | Todas as idades |
| `TEN` | 10+ | Temas leves |
| `TWELVE` | 12+ | Temas moderados |
| `FOURTEEN` | 14+ | Temas mais maduros, referências sexuais leves |
| `SIXTEEN` | 16+ | Temas fortes, linguagem explícita, violência moderada |
| `EIGHTEEN` | 18+ | Conteúdo adulto, violência/conteúdo sexual explícito |

### Avisos de Conteúdo (Content Tags)

- `VIOLENCE` - Violência física, lutas
- `GORE` - Violência explícita, sangue, ferimentos
- `SEXUAL` - Conteúdo sexual, insinuações
- `NUDITY` - Nudez ou nudez parcial
- `LANGUAGE` - Linguagem forte, palavrões
- `DRUGS` - Uso ou referências a drogas
- `ALCOHOL` - Consumo de álcool
- `HORROR` - Temas de terror, conteúdo perturbador
- `PSYCHOLOGICAL` - Temas psicológicos, saúde mental
- `DISCRIMINATION` - Conteúdo discriminatório, discurso de ódio
- `CRIME` - Atividades criminosas
- `GAMBLING` - Temas de jogo/apostas

---

## Estrutura do Banco de Dados

### Modelo Tag

```prisma
model Tag {
  id   String  @id @default(uuid())
  name String  // Nome em inglês (usado para busca)
  type TagType // Tipo da tag (CHARACTER, STORY, ASSET, etc.)

  // Classificação de conteúdo
  ageRating   AgeRating    @default(L)     // Classificação etária mínima
  contentTags ContentTag[]                 // Avisos de conteúdo opcionais

  // Metadados
  originalLanguageCode String?             // Código do idioma original
  weight               Int     @default(1) // Peso/prioridade
  searchable           Boolean @default(true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relações (many-to-many)
  characters Character[]
  stories    Story[]
}
```

### Exemplo de Tag no Banco

```json
{
  "id": "uuid-here",
  "name": "BDSM",
  "type": "CHARACTER",
  "ageRating": "EIGHTEEN",
  "contentTags": ["SEXUAL", "NUDITY"],
  "weight": 1,
  "searchable": true
}
```

---

## Como Usar Tags

### 1. Associar Tags a um Personagem

#### Via Prisma (Backend)

```typescript
// Criar personagem com tags
const character = await prisma.character.create({
  data: {
    firstName: "Sakura",
    age: 16,
    gender: "female",
    userId: "user-id-here",
    ageRating: "TWELVE",
    contentTags: [],
    tags: {
      connect: [
        { id: "tag-id-1" }, // Anime
        { id: "tag-id-2" }, // Schoolgirl
        { id: "tag-id-3" }, // Tsundere
      ]
    }
  },
  include: {
    tags: true // Incluir tags na resposta
  }
});
```

#### Adicionar Tags a Personagem Existente

```typescript
await prisma.character.update({
  where: { id: characterId },
  data: {
    tags: {
      connect: [
        { id: "new-tag-id" }
      ]
    }
  }
});
```

#### Remover Tags

```typescript
await prisma.character.update({
  where: { id: characterId },
  data: {
    tags: {
      disconnect: [
        { id: "tag-to-remove-id" }
      ]
    }
  }
});
```

### 2. Buscar Tags por Nome ou Tipo

```typescript
// Buscar tag específica
const tag = await prisma.tag.findUnique({
  where: {
    name_type: {
      name: "VTuber",
      type: "CHARACTER"
    }
  }
});

// Buscar todas as tags de personagens
const characterTags = await prisma.tag.findMany({
  where: {
    type: "CHARACTER",
    searchable: true
  },
  orderBy: {
    name: 'asc'
  }
});

// Buscar tags por classificação etária
const safeTags = await prisma.tag.findMany({
  where: {
    type: "CHARACTER",
    ageRating: {
      in: ["L", "TEN", "TWELVE"]
    }
  }
});
```

---

## Filtrar Conteúdo por Tags

### 1. Filtrar Personagens por Tags

```typescript
// Personagens com tags específicas
const characters = await prisma.character.findMany({
  where: {
    tags: {
      some: {
        id: {
          in: ["tag-id-1", "tag-id-2"]
        }
      }
    }
  },
  include: {
    tags: true
  }
});

// Personagens que têm TODAS as tags especificadas
const charactersWithAllTags = await prisma.character.findMany({
  where: {
    AND: tagIds.map(tagId => ({
      tags: {
        some: { id: tagId }
      }
    }))
  }
});
```

### 2. Filtrar por Classificação Etária

```typescript
// Personagens adequados para usuário
const user = await prisma.user.findUnique({
  where: { id: userId }
});

const appropriateCharacters = await prisma.character.findMany({
  where: {
    ageRating: {
      lte: user.maxAgeRating // Menor ou igual à preferência do usuário
    }
  }
});
```

### 3. Filtrar por Avisos de Conteúdo

```typescript
// Excluir personagens com tags bloqueadas pelo usuário
const filteredCharacters = await prisma.character.findMany({
  where: {
    NOT: {
      contentTags: {
        hasSome: user.blockedTags // Não tem nenhuma tag bloqueada
      }
    }
  }
});
```

### 4. Filtro Combinado (Recomendado)

```typescript
// Filtro completo respeitando preferências do usuário
const safeCharacters = await prisma.character.findMany({
  where: {
    isPublic: true,
    ageRating: {
      lte: user.maxAgeRating
    },
    NOT: {
      contentTags: {
        hasSome: user.blockedTags
      }
    },
    tags: {
      some: {
        id: {
          in: selectedTagIds // Tags selecionadas pelo usuário
        }
      }
    }
  },
  include: {
    tags: true,
    creator: {
      select: {
        displayName: true,
        avatarUrl: true
      }
    }
  },
  orderBy: {
    createdAt: 'desc'
  }
});
```

### 5. Exemplo de Endpoint API

```typescript
// backend/src/routes/characters.ts
router.get('/api/v1/characters', async (req, res) => {
  const user = req.user; // Do Passport
  const { tagIds, ageRating, excludeContentTags } = req.query;

  const characters = await prisma.character.findMany({
    where: {
      isPublic: true,
      ...(ageRating && { ageRating: { lte: ageRating } }),
      ...(excludeContentTags && {
        NOT: {
          contentTags: {
            hasSome: excludeContentTags.split(',')
          }
        }
      }),
      ...(tagIds && {
        tags: {
          some: {
            id: {
              in: tagIds.split(',')
            }
          }
        }
      })
    },
    include: {
      tags: {
        select: {
          id: true,
          name: true,
          type: true,
          ageRating: true
        }
      }
    }
  });

  res.json(characters);
});
```

---

## Adicionar Novas Tags

### Processo Completo

1. **Editar arquivo de dados** (`backend/src/data/tags/*.json`)
2. **Executar seed** (popula banco + gera tradução base)
3. **Executar build de traduções** (traduz para todos os idiomas)

### Passo a Passo

#### 1. Adicionar Tag no Arquivo de Dados

Edite o arquivo apropriado em `backend/src/data/tags/`:

- `tags-character.json` - Tags de personagens
- `tags-story.json` - Tags de histórias
- `tags-asset.json` - Tags de assets visuais

**Exemplo: Adicionar nova tag de personagem**

```json
{
  "description": "Character classification tags with age ratings...",
  "tags": [
    // ... tags existentes ...
    {
      "name": "Cyborg",
      "type": "CHARACTER",
      "ageRating": "TWELVE",
      "contentTags": ["VIOLENCE"],
      "description": "Cybernetic organism character"
    }
  ]
}
```

#### 2. Executar Seed (Popula Banco + Gera Tradução Base)

```bash
# No diretório do projeto
docker compose exec backend npm run db:seed:tags

# Ou dry-run para testar sem aplicar mudanças
docker compose exec backend npm run db:seed:tags:dry
```

O seed faz:
- ✅ Lê os arquivos de `backend/src/data/tags/`
- ✅ Cria/atualiza tags no banco de dados
- ✅ Gera arquivos de tradução base em `backend/translations/_source/tags-*.json`

**Saída esperada:**
```
🏷️  Seeding tags to database...

📄 Processing tags-character...
  📝 Generated translation source: tags-character.json
  Processing 85 tags from tags-character...
  ✅ Complete:
     Created: 1
     Updated: 0
     Unchanged: 84

🎉 Tag seeding complete!
```

#### 3. Executar Build de Traduções

```bash
# Traduz para todos os 11 idiomas
docker compose exec backend npm run build:translations

# Ou force rebuild (recria todas as traduções)
docker compose exec backend npm run build:translations:force
```

O build gera traduções em:
- `backend/translations/pt-br/tags-*.json`
- `backend/translations/es-es/tags-*.json`
- `backend/translations/fr-fr/tags-*.json`
- ... (11 idiomas no total)

**Nota:** Tags técnicas como "VTuber", "BDSM", "Anime" são mantidas em inglês automaticamente pelo LLM.

#### 4. Reiniciar Backend (se necessário)

```bash
docker compose restart backend
```

---

## Sistema de Tradução

### Como Funciona

1. **Seed** gera arquivos base em formato padrão:
```json
// backend/translations/_source/tags-character.json
{
  "description": "Character classification tags...",
  "resources": {
    "VTuber": "Virtual YouTuber or content creator",
    "Anime": "Anime-style character",
    "BDSM": "Bondage, discipline, dominance/submission themes"
  }
}
```

2. **Build de traduções** usa LLM (Gemini/OpenAI) para traduzir:
```json
// backend/translations/pt-br/tags-character.json
{
  "description": "Character classification tags...",
  "resources": {
    "VTuber": "Virtual YouTuber ou criador de conteúdo",
    "Anime": "Personagem estilo Anime",
    "BDSM": "Temas de Bondage, Disciplina, Dominância/Submissão"
  }
}
```

### Termos Mantidos em Inglês

O LLM automaticamente mantém termos técnicos em inglês:
- **Siglas internacionais**: VTuber, BDSM, NTR, LitRPG
- **Termos de anime/manga**: Tsundere, Yandere, Kuudere, Dandere, Genki
- **Termos amplamente reconhecidos**: Anime, Manga, Cosplay

### Usar Traduções no Frontend

```typescript
// frontend/src/pages/characters/filters.tsx
import { useTranslation } from 'react-i18next';

function CharacterFilters() {
  const { t } = useTranslation('tags-character');

  return (
    <div>
      <h3>{t('VTuber')}</h3>
      {/* Mostra: "Virtual YouTuber ou criador de conteúdo" (pt-BR) */}

      <h3>{t('BDSM')}</h3>
      {/* Mostra: "Temas de Bondage, Disciplina, Dominância/Submissão" (pt-BR) */}
    </div>
  );
}
```

---

## Arquivos Importantes

### Dados e Scripts

| Arquivo | Descrição |
|---------|-----------|
| `backend/src/data/tags/tags-character.json` | Dados de seed - tags de personagens (85 tags) |
| `backend/src/data/tags/tags-story.json` | Dados de seed - tags de histórias (64 tags) |
| `backend/src/data/tags/tags-asset.json` | Dados de seed - tags de assets (78 tags) |
| `backend/src/scripts/seedTags.ts` | Script de seed (popula banco + gera tradução base) |
| `backend/src/scripts/buildTranslations.ts` | Script de tradução (traduz para 11 idiomas) |

### Banco de Dados

| Arquivo | Descrição |
|---------|-----------|
| `backend/prisma/schema.prisma` | Schema do banco (modelo Tag, relações, enums) |
| `backend/src/generated/prisma/` | Cliente Prisma gerado (usar para queries) |

### Traduções

| Diretório | Descrição |
|-----------|-----------|
| `backend/translations/_source/tags-*.json` | Arquivos base gerados pelo seed |
| `backend/translations/{lang}/tags-*.json` | Traduções por idioma (11 idiomas) |

### Tipos TypeScript

| Arquivo | Descrição |
|---------|-----------|
| `backend/src/types/tags.ts` | Tipos TypeScript para o sistema de tags |
| `backend/src/generated/prisma/index.d.ts` | Tipos gerados pelo Prisma |

---

## Exemplos de Uso Completo

### Exemplo 1: Criar Personagem VTuber

```typescript
// 1. Buscar tags necessárias
const vtuberTag = await prisma.tag.findUnique({
  where: {
    name_type: {
      name: "VTuber",
      type: "CHARACTER"
    }
  }
});

const idolTag = await prisma.tag.findUnique({
  where: {
    name_type: {
      name: "Idol",
      type: "CHARACTER"
    }
  }
});

// 2. Criar personagem com as tags
const vtuber = await prisma.character.create({
  data: {
    firstName: "Kizuna",
    lastName: "AI",
    age: null,
    gender: "female",
    userId: userId,
    ageRating: "L", // Conteúdo seguro para todas as idades
    contentTags: [], // Sem avisos de conteúdo
    tags: {
      connect: [
        { id: vtuberTag.id },
        { id: idolTag.id }
      ]
    }
  },
  include: {
    tags: true
  }
});
```

### Exemplo 2: Buscar Personagens de Anime

```typescript
const animeCharacters = await prisma.character.findMany({
  where: {
    tags: {
      some: {
        name: "Anime",
        type: "CHARACTER"
      }
    },
    isPublic: true
  },
  include: {
    tags: {
      select: {
        name: true,
        type: true
      }
    },
    creator: {
      select: {
        displayName: true
      }
    }
  },
  take: 20,
  orderBy: {
    createdAt: 'desc'
  }
});
```

### Exemplo 3: Filtrar por Múltiplas Categorias

```typescript
// Buscar personagens que são guerreiros E tem armadura
const armoredWarriors = await prisma.character.findMany({
  where: {
    AND: [
      {
        tags: {
          some: {
            name: "Warrior",
            type: "CHARACTER"
          }
        }
      },
      {
        tags: {
          some: {
            name: "Armor",
            type: "ASSET"
          }
        }
      }
    ],
    ageRating: {
      lte: "FOURTEEN" // Máximo 14+
    }
  },
  include: {
    tags: true
  }
});
```

---

## Boas Práticas

### ✅ DO

- **Use tags existentes** quando possível antes de criar novas
- **Combine tipos diferentes** (CHARACTER + ASSET) para melhor categorização
- **Defina ageRating apropriado** baseado no conteúdo mais maduro da tag
- **Adicione contentTags** para avisos importantes (SEXUAL, VIOLENCE, etc.)
- **Teste com dry-run** antes de aplicar mudanças: `npm run db:seed:tags:dry`
- **Mantenha descrições claras** e concisas em inglês

### ❌ DON'T

- **Não duplique tags** - verifique se já existe antes de criar
- **Não misture idiomas** - mantenha nomes de tags sempre em inglês
- **Não subestime ageRating** - seja conservador para proteger usuários
- **Não edite traduções manualmente** - sempre regenere via build
- **Não modifique arquivos em `translations/{lang}/`** - eles são gerados automaticamente

---

## Troubleshooting

### Tags não aparecem após seed

```bash
# Verificar se foram criadas
docker compose exec backend npx prisma studio
# Acesse http://localhost:5555 e verifue a tabela Tag
```

### Traduções não foram geradas

```bash
# Verificar arquivos base
ls backend/translations/_source/tags-*.json

# Rebuild forçado
docker compose exec backend npm run build:translations:force
```

### Erro de quota do Gemini

```
Error: [429 Too Many Requests] You exceeded your current quota
```

**Solução**: Aguarde ~1 minuto (limite de 15 requisições/minuto) ou use outro provider:

```bash
# Usar OpenAI
docker compose exec backend npm run build:translations -- --provider=openai

# Usar Grok
docker compose exec backend npm run build:translations -- --provider=grok
```

### Mudanças no schema não refletem

```bash
# Regenerar Prisma Client
docker compose exec backend npx prisma generate

# Criar e aplicar migration
docker compose exec backend npx prisma migrate dev --name add_tag_changes

# Reiniciar backend
docker compose restart backend
```

---

## Referências

- **Documentação Prisma**: https://www.prisma.io/docs
- **i18next**: https://www.i18next.com/
- **Backend Overview**: `docs/BACKEND.md`
- **Translation System**: `backend/translations/README.md`
- **Database Schema**: `backend/prisma/schema.prisma`

---

**Última atualização**: 2025-10-25
