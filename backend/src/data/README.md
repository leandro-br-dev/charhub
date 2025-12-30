# CharHub Database Seed Data

Este diretório contém os dados de inicialização (seed data) para o banco de dados do CharHub.

## Estrutura de Arquivos

```
backend/src/data/
├── README.md                    # Este arquivo
├── system-users.json            # Usuários do sistema (admin, etc.)
├── system-characters.json       # Personagens do sistema (Narrator, etc.)
├── species/
│   └── species.json             # Espécies para classificação de personagens
└── tags/
    ├── tags-character.json      # Tags para classificação de personagens
    ├── tags-story.json          # Tags para classificação de histórias
    └── tags-asset.json          # Tags para classificação de assets (roupas, acessórios)
```

## Dados do Sistema

### Usuários do Sistema (`system-users.json`)

Contém usuários especiais criados durante a inicialização do banco:

- **Admin User** (`00000000-0000-0000-0000-000000000000`)
  - Username: `admin`
  - Role: `ADMIN`
  - Email: `admin@charhub.internal`
  - Usado para tarefas administrativas e manutenção do sistema

### Personagens do Sistema (`system-characters.json`)

Contém personagens especiais usados pelo sistema:

- **Narrator** (`00000000-0000-0000-0000-000000000001`)
  - Personagem invisível usado para narração
  - Usado em mensagens iniciais de conversas
  - Visibility: `UNLISTED` (não aparece em listagens públicas)
  - `isSystemCharacter: true` (oculto de usuários normais)

### Tags (`tags/*.json`)

Sistema de classificação de conteúdo com três tipos:

1. **CHARACTER** (85 tags) - Classificação de personagens
   - Tipos: VTuber, Anime, Elf, Demon, Maid, etc.
   - Profissões: Warrior, Mage, Detective, etc.
   - Personalidades: Tsundere, Yandere, Kuudere, etc.

2. **STORY** (64 tags) - Classificação de histórias
   - Gêneros: Fantasy, Sci-Fi, Romance, Horror, etc.
   - Subgêneros: Isekai, Cyberpunk, Post-Apocalyptic, etc.
   - Conteúdo: Harem, Gore, Psychological, etc.

3. **ASSET** (78 tags) - Classificação de visual/roupas
   - Roupas: School Uniform, Maid Outfit, Armor, etc.
   - Acessórios: Crown, Glasses, Wings, etc.
   - Armas: Sword, Gun, Staff, etc.

#### Estrutura das Tags

Cada tag contém:

```json
{
  "name": "VTuber",
  "type": "CHARACTER",
  "ageRating": "L",           // L, TWELVE, FOURTEEN, SIXTEEN, EIGHTEEN
  "contentTags": [],          // VIOLENCE, SEXUAL, NUDITY, GORE, etc.
  "description": "Virtual YouTuber or content creator"
}
```

### Species (`species/species.json`)

Sistema de classificação de espécies para personagens:

- **100+ species** - Diversidade de espécies de várias culturas e mitologias
- **Categorias**: humanoid, beast, mythical, elemental, undead, robot, other
- **Idempotente**: Execuções múltiplas são seguras
- **Tradução automática**: Gera arquivos de tradução em `translations/_source/species.json`

#### Estrutura das Species

Cada espécie contém:

```json
{
  "name": "Human",
  "category": "humanoid",
  "ageRating": "L",
  "contentTags": [],
  "description": "Standard human being",
  "weight": 10
}
```

## Como Usar

### Executar Seed Completo

```bash
# Dentro do container backend
docker compose exec backend npm run db:seed

# Com logs detalhados
docker compose exec backend npm run db:seed:verbose

# Dry run (testa sem fazer mudanças)
docker compose exec backend npm run db:seed:dry

# Forçar atualização de dados existentes
docker compose exec backend npm run db:seed:force
```

### Executar Seed Apenas de Tags

```bash
# Seed de tags apenas
docker compose exec backend npm run db:seed:tags

# Dry run de tags
docker compose exec backend npm run db:seed:tags:dry
```

### Executar Seed Apenas de Species

```bash
# Seed de species apenas
docker compose exec backend npm run db:seed:species

# Dry run de species
docker compose exec backend npm run db:seed:species:dry
```

## Comportamento do Seed

### Usuários
- **Primeira execução**: Cria usuário admin
- **Execuções subsequentes**: Pula (não recria)
- **Com --force**: Atualiza dados do usuário existente

### Personagens
- **Primeira execução**: Cria character Narrator
- **Execuções subsequentes**: Pula (não recria)
- **Com --force**: Atualiza dados do personagem existente

### Tags
- **Primeira execução**: Cria todas as tags (227 total)
- **Execuções subsequentes**:
  - Adiciona novas tags
  - Atualiza tags com mudanças (ageRating, contentTags)
  - Mantém tags sem mudanças
- **Sempre seguro**: Nunca remove tags existentes

### Species
- **Primeira execução**: Cria todas as espécies (100+ total)
- **Execuções subsequentes**:
  - Adiciona novas espécies
  - Atualiza espécies com mudanças (ageRating, category, weight)
  - Mantém espécies sem mudanças
- **Sempre seguro**: Nunca remove espécies existentes
- **Tradução automática**: Gera arquivos de tradução a cada execução

## Produção

### Pré-Deploy

Antes de fazer deploy em produção:

```bash
# 1. Fazer backup do banco de dados
docker compose exec postgres pg_dump -U charhub charhub_db > backup.sql

# 2. Testar seed em dry-run
docker compose exec backend npm run db:seed:dry --verbose

# 3. Executar seed real
docker compose exec backend npm run db:seed
```

### Durante Deploy

O seed deve ser executado automaticamente após as migrações do Prisma:

```bash
# Em ambiente de produção
npm run prisma:migrate:deploy  # Aplica migrations
npm run db:seed                # Popula dados iniciais
```

## Adicionando Novos Dados

### Adicionar Nova Tag

1. Edite o arquivo apropriado em `tags/`:
   - `tags-character.json` - Para tags de personagem
   - `tags-story.json` - Para tags de história
   - `tags-asset.json` - Para tags de asset

2. Adicione a nova tag:
```json
{
  "name": "NomeNovaTag",
  "type": "CHARACTER",  // ou STORY, ASSET
  "ageRating": "L",
  "contentTags": [],
  "description": "Descrição da tag"
}
```

3. Execute o seed:
```bash
docker compose exec backend npm run db:seed:tags
```

### Adicionar Novo Personagem do Sistema

1. Edite `system-characters.json`

2. Adicione o personagem:
```json
{
  "id": "UUID-AQUI",
  "userId": "00000000-0000-0000-0000-000000000000",
  "firstName": "Nome",
  "lastName": "Sobrenome",
  "personality": "Descrição da personalidade",
  "history": "História do personagem",
  "visibility": "UNLISTED",
  "isSystemCharacter": true,
  "ageRating": "L",
  "contentTags": []
}
```

3. Execute o seed:
```bash
docker compose exec backend npm run db:seed
```

## IDs Reservados

IDs com zeros são reservados para entidades do sistema:

- `00000000-0000-0000-0000-000000000000` - Admin User
- `00000000-0000-0000-0000-000000000001` - Narrator Character
- `00000000-0000-0000-0000-00000000000X` - Reservado para futuras entidades do sistema

**Não use estes IDs para conteúdo de usuários reais.**

## Scripts

Os scripts de seed estão localizados em:

- `backend/src/scripts/seed.ts` - Script principal de seed
- `backend/src/scripts/seedTags.ts` - Script específico para tags
- `backend/src/scripts/seedSpecies.ts` - Script específico para espécies

## Observações Importantes

1. **Idempotência**: O seed pode ser executado múltiplas vezes sem problemas
2. **Não remove dados**: Apenas adiciona ou atualiza
3. **Logs claros**: Mostra exatamente o que foi criado/atualizado/pulado
4. **Dry run sempre disponível**: Teste antes de aplicar mudanças
5. **Tradução automática**: Tags geram automaticamente arquivos de tradução

## Troubleshooting

### Erro: "User already exists"

Normal em execuções subsequentes. Use `--force` para atualizar:
```bash
docker compose exec backend npm run db:seed:force
```

### Erro: "Missing required field"

Verifique que todos os campos obrigatórios estão presentes nos arquivos JSON.
Campos obrigatórios para Character:
- `firstName` (obrigatório)
- `userId` (obrigatório)
- Outros campos podem ser `null`

### Seed não está sendo aplicado

Verifique se você fez rebuild do container após alterar os arquivos:
```bash
docker compose build backend
docker compose up -d backend
```

## Versionamento

Os dados de seed seguem o versionamento do projeto. Mudanças nos dados devem:

1. Ser documentadas no CHANGELOG
2. Ser compatíveis com a versão do schema do banco
3. Incluir migrations se o schema mudar
