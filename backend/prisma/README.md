# Prisma Database Documentation

Este projeto utiliza **Prisma ORM** para gerenciar o banco de dados PostgreSQL.

## 🗄️ Estrutura

- **schema.prisma**: Define os modelos de dados e configuração do Prisma
- **migrations/**: Histórico de alterações no banco de dados
- **seed.ts**: Script para popular o banco com dados iniciais

## 🚀 Comandos Principais

### Desenvolvimento Local (npm run dev)

```bash
# Gerar Prisma Client após alterar schema.prisma
npm run prisma:generate

# Criar e aplicar uma nova migration
npm run prisma:migrate

# Abrir Prisma Studio (interface visual do banco)
npm run prisma:studio

# Popular banco com dados iniciais
npm run db:seed
```

### Docker (Produção/Dev)

```bash
# Aplicar migrations pendentes (sem criar novas)
npm run prisma:migrate:deploy
```

## 📝 Workflow de Desenvolvimento

### 1. Criar um Novo Model

Edite `prisma/schema.prisma`:

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### 2. Criar Migration

```bash
npm run prisma:migrate
# Digite um nome descritivo: "add_user_model"
```

### 3. Usar no Código

```typescript
import { prisma } from './config/database';

// Criar usuário
const user = await prisma.user.create({
  data: {
    email: 'user@example.com',
    name: 'John Doe',
  },
});

// Buscar usuários
const users = await prisma.user.findMany();

// Buscar por ID
const user = await prisma.user.findUnique({
  where: { id: 'uuid-here' },
});
```

## 🔍 Prisma Studio

Interface visual para explorar e editar dados:

```bash
npm run prisma:studio
```

Acesse: http://localhost:5555

## 🌱 Seeds

Para adicionar dados iniciais, edite `prisma/seed.ts` e execute:

```bash
npm run db:seed
```

## 🐳 Docker

O PostgreSQL está configurado no `docker-compose.yml`:

- **Host**: `postgres` (dentro da rede Docker) ou `localhost:5432` (local)
- **Database**: `charhub_db`
- **User**: `charhub`
- **Password**: Definida no docker-compose.yml

## 📚 Recursos

- [Documentação Prisma](https://www.prisma.io/docs)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [Prisma Client API](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)
