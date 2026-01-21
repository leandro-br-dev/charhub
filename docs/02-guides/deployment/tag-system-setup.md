# Tag System Setup Guide

Este guia explica como configurar e usar o novo sistema de tags do CharHub.

## 📋 O que foi criado

### 1. Schema do Banco de Dados

O modelo `Tag` no Prisma foi atualizado com os seguintes campos:

- `name` - Nome da tag em inglês (usado para pesquisa)
- `type` - Tipo de tag (CHARACTER, STORY, ASSET, GAME, MEDIA, GENERAL)
- `ageRating` - Classificação etária mínima (L, TEN, TWELVE, FOURTEEN, SIXTEEN, EIGHTEEN)
- `contentTags` - Avisos de conteúdo opcionais (VIOLENCE, NUDITY, SEXUAL, GORE, etc.)
- `searchable` - Se a tag aparece em buscas
- `weight` - Peso/importância da tag

Localização: `backend/prisma/schema.prisma`

### 2. Arquivos JSON de Tags

Três arquivos fonte com definições de tags:

- `backend/translations/_source/tags-character.json` - Tags de personagens (83 tags)
- `backend/translations/_source/tags-story.json` - Tags de histórias (64 tags)
- `backend/translations/_source/tags-asset.json` - Tags de assets/visuais (79 tags)

Total: **226 tags** cobrindo diversas categorias, incluindo:
- Ocupações e roles (Warrior, Maid, Teacher, etc.)
- Tipos de personagens (Elf, Vampire, Robot, etc.)
- Personalidades (Tsundere, Yandere, Kuudere, etc.)
- Gêneros de histórias (Fantasy, Sci-Fi, Horror, etc.)
- Roupas e acessórios (School Uniform, Armor, Bikini, etc.)
- Conteúdo adulto (BDSM, Ecchi, Hentai, etc.)

### 3. Sistema de Tradução Inteligente

Script especializado que:
- Mantém termos em inglês quando não há tradução adequada
- Traduz descrições para todos os idiomas
- Documenta por que cada termo foi mantido em inglês
- Suporta 11 idiomas (pt-BR, es-ES, fr-FR, de-DE, zh-CN, hi-IN, ar-SA, ru-RU, ja-JP, ko-KR, it-IT)

Localização: `backend/src/scripts/buildTagTranslations.ts`

### 4. Script de Seed do Banco

Script que importa tags do JSON para o banco de dados:
- Cria novas tags
- Atualiza tags existentes quando modificadas
- Suporta dry-run para preview
- Exibe estatísticas de criação/atualização

Localização: `backend/src/scripts/seedTags.ts`

### 5. Tipos TypeScript

Definições de tipos para todo o sistema de tags:

- `TagSourceDefinition` - Definição de tag no JSON fonte
- `TagSourceFile` - Estrutura do arquivo JSON fonte
- `TranslatedTag` - Tag traduzida
- `TranslatedTagsFile` - Arquivo de tradução
- `TagForDatabase` - Tag para inserção no banco

Localização: `backend/src/types/tags.ts`

### 6. Documentação

Documentação completa do sistema:
- Filosofia de tradução
- Formato dos arquivos
- Comandos disponíveis
- Exemplos de uso
- Melhores práticas

Localização: `backend/translations/TAGS_README.md`

## 🚀 Próximos Passos

### Passo 1: Criar a Migration do Prisma

Como o schema do Tag foi modificado, você precisa criar uma migration:

```bash
# No container do backend ou localmente
cd backend

# Gerar o Prisma Client com as novas alterações
npm run prisma:generate

# Criar a migration
npx prisma migrate dev --name update_tag_model_with_content_classification
```

**Importante:** Execute isso dentro do container Docker:

```bash
# Se estiver usando Docker
docker compose exec backend npx prisma generate
docker compose exec backend npx prisma migrate dev --name update_tag_model_with_content_classification

# Reinicie o backend para aplicar as mudanças
docker compose restart backend
```

### Passo 2: Build das Traduções (Opcional - só se quiser traduzir)

Se você quiser gerar as traduções das tags para todos os idiomas:

```bash
cd backend

# Build das traduções de tags
npm run build:tags

# Ou com verbose para ver o progresso
npm run build:tags -- -v
```

**Nota:** Isso consumirá tokens da API do Gemini/OpenAI. Se preferir pular este passo, você pode usar as tags em inglês por enquanto.

### Passo 3: Seed das Tags no Banco de Dados

Importe as tags para o banco de dados:

```bash
cd backend

# Preview das mudanças (dry run)
npm run db:seed:tags:dry

# Se tudo estiver OK, faça o seed real
npm run db:seed:tags
```

**Via Docker:**

```bash
# Preview
docker compose exec backend npm run db:seed:tags:dry

# Seed real
docker compose exec backend npm run db:seed:tags
```

## 🎯 Uso no Frontend

### Buscando Tags

```typescript
// GET /api/v1/tags?type=CHARACTER&ageRating=L
// Retorna tags de personagens com classificação livre

// GET /api/v1/tags?type=STORY
// Retorna todas as tags de histórias
```

### Filtrando por Tags

```typescript
// GET /api/v1/characters?tags=Anime,VTuber
// Busca personagens com as tags especificadas

// GET /api/v1/characters?excludeTags=BDSM,Gore
// Busca personagens SEM as tags especificadas
```

### Criando Personagem com Tags

```typescript
// POST /api/v1/characters
{
  "firstName": "Sakura",
  "tags": ["Anime", "VTuber", "Idol"],
  // ... outros campos
}
```

## 📝 Adicionando Novas Tags

### 1. Edite o arquivo fonte apropriado

```bash
# Para tags de personagens
backend/translations/_source/tags-character.json

# Para tags de histórias
backend/translations/_source/tags-story.json

# Para tags de assets/visuais
backend/translations/_source/tags-asset.json
```

### 2. Adicione a tag

```json
{
  "name": "MinhaNovaTag",
  "type": "CHARACTER",
  "ageRating": "L",
  "contentTags": [],
  "description": "Descrição da tag"
}
```

### 3. Build e seed

```bash
# Gerar traduções (opcional)
npm run build:tags

# Importar para o banco
npm run db:seed:tags
```

## 🔍 Comandos Disponíveis

### Tradução de Tags

```bash
# Build incremental (só atualiza arquivos modificados)
npm run build:tags

# Force rebuild (reconstrói tudo)
npm run build:tags:force

# Verbose (mostra progresso detalhado)
npm run build:tags -- -v

# Offline (copia inglês sem traduzir)
npm run build:tags -- --offline

# Usar provider específico
npm run build:tags -- --provider=openai
npm run build:tags -- --gemini
npm run build:tags -- --grok
```

### Seed de Tags

```bash
# Seed normal
npm run db:seed:tags

# Dry run (preview sem modificar banco)
npm run db:seed:tags:dry

# Verbose
npm run db:seed:tags -- -v
```

### Build Completo

```bash
# Build tudo (traduções normais + tags + TypeScript)
npm run build:all
```

## 🎨 Exemplos de Tags

### Tag Segura (Livre para todos)

```json
{
  "name": "Maid",
  "type": "CHARACTER",
  "ageRating": "L",
  "contentTags": [],
  "description": "Maid occupation or outfit"
}
```

### Tag com Violência (12+)

```json
{
  "name": "Warrior",
  "type": "CHARACTER",
  "ageRating": "TWELVE",
  "contentTags": ["VIOLENCE"],
  "description": "Combat-oriented character"
}
```

### Tag Adulta (18+)

```json
{
  "name": "BDSM",
  "type": "CHARACTER",
  "ageRating": "EIGHTEEN",
  "contentTags": ["SEXUAL", "NUDITY"],
  "description": "Bondage, discipline, dominance/submission themes"
}
```

## 🔒 Classificações Etárias

- **L** (Livre) - Conteúdo geral para todas as idades
- **TEN** (10+) - Temas leves
- **TWELVE** (12+) - Temas moderados, violência leve
- **FOURTEEN** (14+) - Temas mais maduros, referências sexuais leves
- **SIXTEEN** (16+) - Temas fortes, linguagem explícita, violência moderada
- **EIGHTEEN** (18+) - Conteúdo adulto, violência/conteúdo sexual explícito

## ⚠️ Content Tags Disponíveis

- `VIOLENCE` - Violência física, lutas
- `GORE` - Violência explícita, sangue, ferimentos
- `SEXUAL` - Conteúdo sexual, insinuações
- `NUDITY` - Nudez ou nudez parcial
- `LANGUAGE` - Linguagem forte, palavrões
- `DRUGS` - Uso de drogas ou referências
- `ALCOHOL` - Consumo de álcool
- `HORROR` - Temas de terror, conteúdo perturbador
- `PSYCHOLOGICAL` - Temas psicológicos, saúde mental
- `DISCRIMINATION` - Conteúdo discriminatório, discurso de ódio
- `CRIME` - Atividades criminosas
- `GAMBLING` - Temas de jogos de azar

## 🌍 Filosofia de Tradução

### Manter em Inglês

Mantemos em inglês quando:
- Termos técnicos: "VTuber", "LitRPG", "NTR"
- Palavras amplamente reconhecidas: "Anime", "Manga", "Cosplay"
- Acrônimos: "BDSM", "MILF", "RPG"
- Termos sem tradução clara: "Tsundere", "Yandere"

### Traduzir

Traduzimos quando:
- Palavras comuns: "Warrior" → "Guerreiro"
- Gêneros gerais: "Fantasy" → "Fantasia"
- Termos descritivos: "School Uniform" → "Uniforme Escolar"
- Existe equivalente claro e amplamente usado

### Sempre Traduzir Descrições

Mesmo que o nome seja mantido em inglês, a descrição SEMPRE é traduzida para ajudar na compreensão.

## 📚 Documentação Completa

Para documentação completa, veja:
- `backend/translations/TAGS_README.md` - Documentação detalhada do sistema de tags

## ❓ Troubleshooting

### Migration falha

Se a migration falhar:
```bash
# Verifique o estado do banco
docker compose exec backend npx prisma migrate status

# Force reset (ATENÇÃO: apaga dados)
docker compose exec backend npx prisma migrate reset
```

### Traduções não gerando

Verifique se as chaves de API estão configuradas:
```bash
# No arquivo backend/.env
GEMINI_API_KEY=sua_chave_aqui
# ou
OPENAI_API_KEY=sua_chave_aqui
```

### Tags não aparecem no seed

Verifique se os arquivos JSON estão corretos:
```bash
# Valide o JSON
cat backend/translations/_source/tags-character.json | jq .
```

## 🎉 Próximas Melhorias

Sugestões para evolução futura:
1. API endpoints para buscar tags traduzidas
2. Interface admin para gerenciar tags
3. Sistema de sugestão de tags baseado em IA
4. Tags personalizadas por usuário
5. Estatísticas de uso de tags
6. Sistema de moderação de tags

---

**Dúvidas?** Consulte a documentação completa em `backend/translations/TAGS_README.md`
