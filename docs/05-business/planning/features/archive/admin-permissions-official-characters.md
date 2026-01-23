# Admin Permissions for Official Characters - Feature Specification

**Status**: 🏗️ Active (Ready for Implementation)
**Version**: 1.0.0
**Date Created**: 2026-01-02
**Last Updated**: 2026-01-02
**Priority**: Medium
**Assigned To**: Agent Coder
**GitHub Issue**: TBD

---

## Overview

Implementar permissões de ADMIN para permitir edição de personagens oficiais (CharHub Official).

**Core Requirements**:
- Usuários com `role: ADMIN` podem editar personagens do user ID `00000000-0000-0000-0000-000000000001` (CharHub Official)
- Validação **EXCLUSIVAMENTE no backend** (segurança crítica)
- Frontend deve exibir botão de edição se usuário for ADMIN
- Necessário para gerenciar personagens gerados automaticamente pelo bot

---

## Business Value

### Problema Atual

**Situação**:
- Personagens são gerados automaticamente pelo sistema de população (T006 - Automated Character Population)
- Personagens pertencem ao usuário "CharHub Official" (UUID fixo: `00000000-0000-0000-0000-000000000001`)
- Atualmente **ninguém pode editar ou excluir** esses personagens
- Se personagem gerado tiver erro, não há como corrigir
- Se personagem for inadequado, não há como removê-lo

**Impacto**:
- 🚨 **Bloqueador Operacional**: Impossível moderar conteúdo gerado automaticamente
- 🐛 **Quality Issues**: Personagens com erros ficam permanentes
- 🔒 **Content Moderation**: Impossível remover conteúdo inadequado
- 📊 **Maintenance**: Impossível atualizar informações de personagens oficiais

**Need**:
- Administradores precisam de acesso para:
  - Corrigir informações erradas (typos, classificação etária incorreta)
  - Atualizar descrições ou imagens de baixa qualidade
  - Excluir personagens inadequados (falsos positivos do filtro NSFW)
  - Adicionar tags ou categorias

---

## User Stories

### US-1: Admin Pode Editar Personagens Oficiais
**Como** administrador do CharHub
**Quero** poder editar personagens do "CharHub Official"
**Para que** eu corrija erros e mantenha qualidade do catálogo

**Acceptance Criteria**:
- [ ] Usuário com `role: ADMIN` vê botão "Editar" em personagens oficiais
- [ ] Ao clicar "Editar", abre formulário de edição normalmente
- [ ] Todas as funcionalidades de edição disponíveis (campos, imagens, tags)
- [ ] Botão "Excluir" também disponível para ADMINs
- [ ] Validação no backend: `PUT /api/v1/characters/:id` verifica se user é ADMIN antes de permitir edit
- [ ] Validação no backend: `DELETE /api/v1/characters/:id` verifica se user é ADMIN antes de permitir delete
- [ ] Audit log: Registro de quem editou/excluiu personagens oficiais

### US-2: Non-Admin Não Pode Editar Personagens Oficiais
**Como** usuário comum
**Quero** que personagens oficiais sejam read-only
**Para que** integridade do catálogo seja mantida

**Acceptance Criteria**:
- [ ] Usuário sem `role: ADMIN` **não** vê botão "Editar" em personagens oficiais
- [ ] Tentativa de editar via API retorna 403 Forbidden
- [ ] Tentativa de excluir via API retorna 403 Forbidden
- [ ] Mensagem de erro clara: "Apenas administradores podem editar personagens oficiais"

---

## Technical Implementation

### Part 1: Database Schema Validation (15 min)

#### Verify User Schema Has Role Field

**File**: `backend/prisma/schema.prisma`

**Expected**:
```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  role      UserRole @default(USER) // ✅ Must exist
  // ... other fields
}

enum UserRole {
  USER
  ADMIN
  // MODERATOR (future)
}
```

**If Missing**:
- Add `role` field to User model
- Create migration: `npx prisma migrate dev --name add-user-role`
- Update seed script to create ADMIN user

---

### Part 2: Backend Authorization Middleware (1-2 hours)

#### Create Authorization Helpers

**File**: `backend/src/middleware/authorization.ts` (create)

```typescript
import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';

/**
 * Check if user is ADMIN
 */
export function isAdmin(req: Request): boolean {
  return req.user?.role === UserRole.ADMIN;
}

/**
 * Require ADMIN role
 * Use this middleware for admin-only routes
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!isAdmin(req)) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Admin privileges required'
    });
  }

  next();
}

/**
 * Check if user can edit character
 * - User is owner, OR
 * - User is ADMIN and character belongs to CharHub Official
 */
export function canEditCharacter(
  userId: string,
  userRole: UserRole,
  characterUserId: string
): boolean {
  const CHARHUB_OFFICIAL_ID = '00000000-0000-0000-0000-000000000001';

  // User is owner
  if (userId === characterUserId) {
    return true;
  }

  // User is ADMIN and character is official
  if (userRole === UserRole.ADMIN && characterUserId === CHARHUB_OFFICIAL_ID) {
    return true;
  }

  return false;
}
```

#### Update Character Routes

**File**: `backend/src/routes/v1/characters.ts`

**Before** (❌):
```typescript
// PUT /api/v1/characters/:id - Update character
router.put('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  const character = await prisma.character.findUnique({ where: { id } });

  // ❌ WRONG: Only checks if user is owner
  if (character.userId !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // ... update logic
});

// DELETE /api/v1/characters/:id - Delete character
router.delete('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  const character = await prisma.character.findUnique({ where: { id } });

  // ❌ WRONG: Only checks if user is owner
  if (character.userId !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // ... delete logic
});
```

**After** (✅):
```typescript
import { canEditCharacter } from '@/middleware/authorization';

// PUT /api/v1/characters/:id - Update character
router.put('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  const character = await prisma.character.findUnique({ where: { id } });

  if (!character) {
    return res.status(404).json({ error: 'Character not found' });
  }

  // ✅ CORRECT: Check owner OR admin
  if (!canEditCharacter(req.user.id, req.user.role, character.userId)) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'You do not have permission to edit this character'
    });
  }

  // Audit log for admin edits
  if (req.user.role === 'ADMIN' && character.userId !== req.user.id) {
    await prisma.auditLog.create({
      data: {
        action: 'CHARACTER_EDIT',
        userId: req.user.id,
        resourceId: character.id,
        metadata: {
          characterId: character.id,
          characterName: character.firstName,
          isOfficialCharacter: true
        }
      }
    });
  }

  // ... update logic
  const updatedCharacter = await prisma.character.update({
    where: { id },
    data: req.body
  });

  res.json(updatedCharacter);
});

// DELETE /api/v1/characters/:id - Delete character
router.delete('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  const character = await prisma.character.findUnique({ where: { id } });

  if (!character) {
    return res.status(404).json({ error: 'Character not found' });
  }

  // ✅ CORRECT: Check owner OR admin
  if (!canEditCharacter(req.user.id, req.user.role, character.userId)) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'You do not have permission to delete this character'
    });
  }

  // Audit log for admin deletes
  if (req.user.role === 'ADMIN' && character.userId !== req.user.id) {
    await prisma.auditLog.create({
      data: {
        action: 'CHARACTER_DELETE',
        userId: req.user.id,
        resourceId: character.id,
        metadata: {
          characterId: character.id,
          characterName: character.firstName,
          isOfficialCharacter: true
        }
      }
    });
  }

  // ... delete logic
  await prisma.character.delete({ where: { id } });

  res.json({ success: true });
});
```

---

### Part 3: Frontend Conditional Rendering (1 hour)

#### Update Auth Context to Include Role

**File**: `frontend/src/contexts/AuthContext.tsx`

**Verify User Type Includes Role**:
```typescript
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN'; // ✅ Must exist
  // ... other fields
}
```

**Verify API Response Includes Role**:
```typescript
// GET /api/v1/auth/me response
{
  "id": "user-123",
  "email": "admin@charhub.app",
  "role": "ADMIN" // ✅ Backend must return this
}
```

#### Create Admin Helper Hook

**File**: `frontend/src/hooks/useAdmin.ts` (create)

```typescript
import { useAuth } from '@/contexts/AuthContext';

export function useAdmin() {
  const { user } = useAuth();

  const isAdmin = user?.role === 'ADMIN';

  return { isAdmin };
}
```

#### Update Character Profile Page

**File**: `frontend/src/pages/(characters)/[id]/CharacterProfile.tsx`

**Add Edit/Delete Buttons for Admins**:
```tsx
import { useAdmin } from '@/hooks/useAdmin';

export function CharacterProfile({ character }: CharacterProfileProps) {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const router = useRouter();

  const CHARHUB_OFFICIAL_ID = '00000000-0000-0000-0000-000000000001';

  // User can edit if:
  // - User is owner, OR
  // - User is ADMIN and character is official
  const canEdit = user && (
    user.id === character.userId ||
    (isAdmin && character.userId === CHARHUB_OFFICIAL_ID)
  );

  return (
    <div className="character-profile">
      {/* Character info... */}

      {canEdit && (
        <div className="action-buttons">
          <Button
            onClick={() => router.push(`/characters/${character.id}/edit`)}
          >
            Editar Personagem
          </Button>

          <Button
            variant="destructive"
            onClick={handleDelete}
          >
            Excluir Personagem
          </Button>
        </div>
      )}

      {/* Admin badge for official characters */}
      {character.userId === CHARHUB_OFFICIAL_ID && (
        <Badge variant="secondary" className="ml-2">
          Personagem Oficial
        </Badge>
      )}
    </div>
  );
}
```

#### Update Character Edit Page

**File**: `frontend/src/pages/(characters)/[id]/edit/CharacterEditPage.tsx`

**Authorization Check**:
```tsx
export function CharacterEditPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { isAdmin } = useAdmin();

  const { data: character, isLoading } = useQuery(['character', id], () =>
    characterService.getCharacter(id)
  );

  const CHARHUB_OFFICIAL_ID = '00000000-0000-0000-0000-000000000001';

  // Check if user can edit
  const canEdit = user && character && (
    user.id === character.userId ||
    (isAdmin && character.userId === CHARHUB_OFFICIAL_ID)
  );

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!canEdit) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Acesso Negado</h2>
        <p className="text-gray-600 mb-6">
          Apenas administradores podem editar personagens oficiais.
        </p>
        <Button onClick={() => router.push(`/characters/${id}`)}>
          Voltar ao Perfil
        </Button>
      </div>
    );
  }

  return <CharacterEditForm character={character} />;
}
```

---

### Part 4: Audit Logging (Optional but Recommended) (30 min)

#### Create Audit Log Schema

**File**: `backend/prisma/schema.prisma`

```prisma
model AuditLog {
  id         String   @id @default(uuid())
  action     String   // CHARACTER_EDIT, CHARACTER_DELETE, etc.
  userId     String   // Who performed the action
  user       User     @relation(fields: [userId], references: [id])
  resourceId String   // ID of affected resource (character ID)
  metadata   Json?    // Additional context
  createdAt  DateTime @default(now())

  @@index([userId])
  @@index([resourceId])
  @@index([action])
}
```

**Migration**:
```bash
npx prisma migrate dev --name add-audit-log
```

#### Admin Dashboard to View Audit Logs (Future)

**File**: `frontend/src/pages/(admin)/audit-logs/AuditLogsPage.tsx`

```tsx
// Future feature: Admin can view who edited/deleted official characters
export function AuditLogsPage() {
  const { data: logs } = useQuery(['audit-logs'], () =>
    adminService.getAuditLogs({ action: 'CHARACTER_EDIT' })
  );

  return (
    <div>
      <h1>Audit Logs - Character Edits</h1>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Admin</th>
            <th>Action</th>
            <th>Character</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log.id}>
              <td>{new Date(log.createdAt).toLocaleString()}</td>
              <td>{log.user.email}</td>
              <td>{log.action}</td>
              <td>{log.metadata.characterName}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## Testing Strategy

### Unit Tests

**Backend**:
```typescript
describe('Character Authorization', () => {
  describe('canEditCharacter', () => {
    test('returns true if user is owner', () => {
      expect(canEditCharacter('user-1', 'USER', 'user-1')).toBe(true);
    });

    test('returns false if user is not owner and not admin', () => {
      expect(canEditCharacter('user-1', 'USER', 'user-2')).toBe(false);
    });

    test('returns true if user is ADMIN and character is official', () => {
      const OFFICIAL_ID = '00000000-0000-0000-0000-000000000001';
      expect(canEditCharacter('admin-1', 'ADMIN', OFFICIAL_ID)).toBe(true);
    });

    test('returns false if user is ADMIN but character is not official', () => {
      expect(canEditCharacter('admin-1', 'ADMIN', 'user-2')).toBe(false);
    });
  });
});
```

### Integration Tests

**Backend API**:
```typescript
describe('PUT /api/v1/characters/:id', () => {
  test('allows owner to edit character', async () => {
    const character = await createCharacter({ userId: 'user-1' });
    const response = await request(app)
      .put(`/api/v1/characters/${character.id}`)
      .set('Authorization', `Bearer ${getUserToken('user-1')}`)
      .send({ firstName: 'Updated' });

    expect(response.status).toBe(200);
  });

  test('allows ADMIN to edit official character', async () => {
    const OFFICIAL_ID = '00000000-0000-0000-0000-000000000001';
    const character = await createCharacter({ userId: OFFICIAL_ID });
    const response = await request(app)
      .put(`/api/v1/characters/${character.id}`)
      .set('Authorization', `Bearer ${getAdminToken()}`)
      .send({ firstName: 'Updated' });

    expect(response.status).toBe(200);
  });

  test('denies non-admin from editing official character', async () => {
    const OFFICIAL_ID = '00000000-0000-0000-0000-000000000001';
    const character = await createCharacter({ userId: OFFICIAL_ID });
    const response = await request(app)
      .put(`/api/v1/characters/${character.id}`)
      .set('Authorization', `Bearer ${getUserToken('user-1')}`)
      .send({ firstName: 'Updated' });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Forbidden');
  });

  test('denies ADMIN from editing non-official character', async () => {
    const character = await createCharacter({ userId: 'user-1' });
    const response = await request(app)
      .put(`/api/v1/characters/${character.id}`)
      .set('Authorization', `Bearer ${getAdminToken()}`)
      .send({ firstName: 'Updated' });

    expect(response.status).toBe(403);
  });
});
```

### Manual Testing

**Test Cases**:
1. **User Edits Own Character** (✅ Should Work):
   - Login as regular user
   - Navigate to own character
   - Click "Editar"
   - Update fields
   - Save → Success

2. **User Tries to Edit Official Character** (❌ Should Fail):
   - Login as regular user
   - Navigate to official character
   - No "Editar" button visible
   - Direct API call → 403 Forbidden

3. **Admin Edits Official Character** (✅ Should Work):
   - Login as ADMIN
   - Navigate to official character (CharHub Official)
   - Click "Editar"
   - Update fields
   - Save → Success
   - Check audit log created

4. **Admin Tries to Edit User's Character** (❌ Should Fail):
   - Login as ADMIN
   - Navigate to non-official character
   - No "Editar" button visible
   - Direct API call → 403 Forbidden

---

## Rollout Strategy

### Development (2.5-3.5 hours)

**Part 1: Database Schema** (15 min):
1. Verify User schema has `role` field
2. Create migration if needed
3. Seed ADMIN user for testing

**Part 2: Backend Authorization** (1-2 hours):
1. Create authorization helpers (30 min)
2. Update character routes (PUT, DELETE) (45 min)
3. Add audit logging (30 min)
4. Unit tests (30 min)

**Part 3: Frontend Conditional UI** (1 hour):
1. Update User type to include role (5 min)
2. Create useAdmin hook (10 min)
3. Update CharacterProfile page (20 min)
4. Update CharacterEditPage (15 min)
5. Add "Official" badge (10 min)

**Part 4: Testing** (30-60 min):
1. Integration tests (30 min)
2. Manual testing (30 min)

### Deployment

**Pre-deployment**:
1. Create ADMIN user in production database:
```sql
-- Run in production database
UPDATE "User"
SET role = 'ADMIN'
WHERE email = 'admin@charhub.app'; -- Replace with actual admin email
```

2. Verify CharHub Official user exists:
```sql
SELECT id, email FROM "User" WHERE id = '00000000-0000-0000-0000-000000000001';
```

**Deploy**:
1. Deploy backend first
2. Test API authorization
3. Deploy frontend
4. Manual smoke test

**Total: 3-4.5 hours**

---

## Success Metrics

- [ ] ADMINs can edit official characters
- [ ] ADMINs can delete official characters
- [ ] Regular users cannot edit official characters
- [ ] Regular users cannot delete official characters
- [ ] Audit logs created for all admin actions
- [ ] 100% test coverage for authorization logic
- [ ] 0 unauthorized access incidents

---

## Security Considerations

### Critical Security Rules

1. **Backend-Only Validation**: NEVER trust frontend role checks
2. **Immutable Official ID**: `00000000-0000-0000-0000-000000000001` is hardcoded constant
3. **Role Assignment**: Only database admins can set `role = ADMIN` (no UI)
4. **Audit Logging**: All admin actions must be logged
5. **Least Privilege**: ADMINs can ONLY edit official characters, not all characters

### Attack Vectors to Consider

**Attack 1**: User modifies frontend to show edit button
- **Mitigation**: Backend validates role before allowing edit

**Attack 2**: User sends PUT request with ADMIN role in payload
- **Mitigation**: Role comes from JWT token (server-side), not request body

**Attack 3**: User tries to edit character by changing characterId in URL
- **Mitigation**: Backend checks both user role AND character ownership

**Attack 4**: User creates character with userId = official ID
- **Mitigation**: Backend prevents creating characters with that specific UUID

---

## Future Enhancements

### Phase 2 (Future)

1. **Admin Dashboard**:
   - View all official characters
   - Bulk edit capabilities
   - Quality score filter (edit low-quality characters first)

2. **Role Hierarchy**:
   - MODERATOR role (can flag content, cannot delete)
   - SUPER_ADMIN (can manage other admins)

3. **Audit Log UI**:
   - Admin page to view all edits
   - Filter by date, admin, action type
   - Export audit logs to CSV

4. **Automated Flags**:
   - System flags low-quality official characters
   - Admins review flagged content

---

## Dependencies

### Backend
- Prisma (User.role field)
- JWT authentication (role in token)
- AuditLog model (optional)

### Frontend
- Auth context (user.role)
- React Router (protected routes)
- Conditional rendering logic

### Database
- User table with role column
- CharHub Official user (UUID: `00000000-0000-0000-0000-000000000001`)
- AuditLog table (optional)

---

## Notes for Agent Coder

### Implementation Priority
**MEDIUM** - Needed for operational maintenance, not critical for MVP

### Estimated Effort
- **Optimistic**: 3 hours
- **Realistic**: 3.5-4 hours
- **Pessimistic**: 5 hours

**Recommendation**: Allocate 4 hours

### Quick Start

```bash
# 1. Create branch
git checkout -b feature/admin-permissions-official-characters

# 2. Backend
# Verify User schema has role field
# Create authorization helpers in middleware/authorization.ts
# Update character routes (PUT, DELETE)
# Add audit logging
# Write unit tests

# 3. Frontend
# Update User type
# Create useAdmin hook
# Update CharacterProfile.tsx
# Update CharacterEditPage.tsx

# 4. Database
# Create ADMIN user for testing (seed or manual SQL)

# 5. Test
npm run test # Backend tests
npm run dev  # Manual testing
# Test all 4 scenarios (user edit own, user edit official, admin edit official, admin edit user)

# 6. Create PR
```

### Key Considerations

1. **Security First**: All validation in backend
2. **Hardcoded UUID**: CharHub Official ID is constant
3. **Audit Trail**: Log all admin actions
4. **Limited Scope**: ADMINs can only edit official characters, not all characters
5. **Role Assignment**: Manual database update only (no UI to promote to ADMIN)

### Questions to Clarify

- Should we add MODERATOR role for future?
- Audit log retention policy (30 days? 1 year?)
- Should ADMINs be able to edit ANY character or only official ones? (Spec says ONLY official)
- Should we add UI for audit logs in this PR or separate feature?

---

**End of Specification**

🔐 Ready for implementation - Focus on security and proper authorization!
