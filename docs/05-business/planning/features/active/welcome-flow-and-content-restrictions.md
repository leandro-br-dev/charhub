# Welcome Flow e Sistema de Restrições de Conteúdo

**Data**: 2025-12-20
**Status**: 📋 Active
**Prioridade**: Alta
**Estimativa**: 2-3 semanas
**Assigned to**: Agent Coder

---

## Índice

1. [Visão Geral](#visão-geral)
2. [Contexto e Motivação](#contexto-e-motivação)
3. [Objetivos](#objetivos)
4. [Arquitetura da Solução](#arquitetura-da-solução)
5. [Mudanças no Schema](#mudanças-no-schema)
6. [Implementação Técnica](#implementação-técnica)
7. [API Endpoints](#api-endpoints)
8. [Frontend](#frontend)
9. [Fluxos de Usuário](#fluxos-de-usuário)
10. [Regras de Negócio](#regras-de-negócio)
11. [Testes](#testes)
12. [Roadmap de Implementação](#roadmap-de-implementação)

---

## Visão Geral

Implementar sistema completo de onboarding para novos usuários através de uma tela de boas-vindas (Welcome Flow) combinado com melhorias no sistema de restrições de conteúdo baseado em idade e preferências do usuário.

### Características Principais

- ✅ **Welcome Flow**: Modal multi-step para coleta de dados essenciais no primeiro acesso
- ✅ **Salvamento Progressivo**: Cada passo salva dados imediatamente no backend
- ✅ **Reutilização de Código**: Componentes compartilhados com página de Profile
- ✅ **Auto-captura de Idioma**: Detecção automática no OAuth signup
- ✅ **Restrições Inteligentes**: Sistema de age rating com validação baseada em idade real
- ✅ **UX Melhorada**: Opção de pular com salvamento de dados já preenchidos

---

## Contexto e Motivação

### Problemas Atuais

```
❌ Usuários começam sem dados essenciais preenchidos
   └─ Agentes não sabem como se referir ao usuário
   └─ Sem controle de conteúdo apropriado para idade
   └─ Experiência genérica (sem personalização)

❌ languagePreference não é salvo no primeiro acesso
   └─ Sistema detecta idioma do navegador (i18nextLng)
   └─ Usuário vê interface traduzida
   └─ Mas preferência não é persistida no banco
   └─ Próximo login volta para en-US (padrão)

❌ Sistema de age rating sem validação de idade
   └─ Usuários podem selecionar conteúdo 18+ sem ter 18 anos
   └─ Sem restrição baseada em idade real
   └─ Potencial problema legal de proteção de menores
```

### Por que essa feature é importante?

1. **Proteção de Menores**: Garantir que apenas conteúdo apropriado seja exibido
2. **Personalização**: Agentes podem se comunicar melhor conhecendo nome e gênero
3. **Compliance**: Adequação a normas de classificação indicativa
4. **Experiência do Usuário**: Onboarding guiado melhora engajamento inicial
5. **Dados de Qualidade**: Coletar informações essenciais logo no início

---

## Objetivos

### Objetivos de Negócio

- ✅ Melhorar onboarding de novos usuários (reduzir drop-off inicial)
- ✅ Garantir compliance com classificação indicativa
- ✅ Aumentar personalização da experiência
- ✅ Reduzir suporte relacionado a conteúdo inapropriado

### Objetivos Técnicos

- ✅ Reutilizar componentes existentes (zero duplicação)
- ✅ Salvamento progressivo (cada step persiste dados)
- ✅ Auto-captura de preferências do navegador
- ✅ Validação robusta de idade e age rating
- ✅ Modal responsivo e acessível

### Objetivos de Produto

- ✅ Fluxo opcional mas incentivado (skip disponível)
- ✅ Máximo 5-6 steps (não cansar o usuário)
- ✅ Feedback visual de progresso
- ✅ Validação em tempo real
- ✅ Link direto para settings quando necessário

---

## Arquitetura da Solução

### 1. Welcome Flow (Frontend)

```
┌─────────────────────────────────────────────────────────────┐
│                    WelcomeModal Component                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Step 1: Display Name (como agentes chamam o usuário)       │
│  Step 2: Username (como outros usuários encontram)          │
│  Step 3: Birthdate (validação de idade)                     │
│  Step 4: Gender (opcional, para personalização)             │
│  Step 5: Language Preference (confirmação de idioma)        │
│  Step 6: Age Rating (baseado na idade informada)            │
│  Step 7: Content Filters/Themes (temas permitidos)          │
│                                                              │
│  [◀ Voltar]  [Pular]  [Próximo ▶]  Progress: ●●●○○○○         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Regras do Modal:**
- ✅ Aparece apenas se `user.hasCompletedWelcome === false`
- ✅ Cada "Próximo" salva os dados via API antes de avançar
- ✅ "Pular" fecha modal mas dados já preenchidos são mantidos
- ✅ "Voltar" permite editar step anterior
- ✅ Não bloqueia acesso ao app (pode fechar a qualquer momento)

### 2. Auto-captura de Idioma (OAuth)

```
┌─────────────────────────────────────────────────────────────┐
│              OAuth Signup Flow (authService.ts)              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Usuário clica "Login with Google"                       │
│  2. OAuth retorna perfil                                    │
│  3. Backend verifica se usuário existe                      │
│  4. Se novo usuário:                                        │
│     ├─ Captura i18nextLng do localStorage (frontend)        │
│     ├─ Envia para backend em POST /auth/google/callback     │
│     └─ Backend salva em user.languagePreference             │
│  5. Se usuário existente:                                   │
│     └─ Mantém languagePreference atual                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3. Age Rating Filter (Header)

```
┌─────────────────────────────────────────────────────────────┐
│                  Age Rating Dropdown (Header)                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  SE user.birthdate NÃO ESTÁ PREENCHIDA:                     │
│  ┌────────────────────────────────────────────┐             │
│  │ 🔒 Classificação Indicativa                │             │
│  ├────────────────────────────────────────────┤             │
│  │ ☑ Livre (bloqueado, ativo por padrão)     │             │
│  │ ☐ 10+ (desabilitado)                       │             │
│  │ ☐ 12+ (desabilitado)                       │             │
│  │ ☐ 14+ (desabilitado)                       │             │
│  │ ☐ 16+ (desabilitado)                       │             │
│  │ ☐ 18+ (desabilitado)                       │             │
│  ├────────────────────────────────────────────┤             │
│  │ ⚠️ Para alterar, cadastre sua idade        │             │
│  │    👉 Ir para Configurações                │             │
│  └────────────────────────────────────────────┘             │
│                                                              │
│  SE user.birthdate ESTÁ PREENCHIDA:                         │
│  ┌────────────────────────────────────────────┐             │
│  │ 🎯 Classificação Indicativa                │             │
│  ├────────────────────────────────────────────┤             │
│  │ ☑ Livre                                    │             │
│  │ ☑ 10+                                      │             │
│  │ ☑ 12+  ← Usuário selecionou                │             │
│  │ ☐ 14+ (auto-desmarcado)                    │             │
│  │ ☐ 16+ (auto-desmarcado)                    │             │
│  │ ☐ 18+ (desabilitado - usuário < 18 anos)   │             │
│  └────────────────────────────────────────────┘             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Regras de Auto-Ativação:**
- ✅ Ao selecionar 12+: ativa automaticamente "Livre" e "10+"
- ✅ Ao selecionar 16+: ativa automaticamente "Livre", "10+", "12+", "14+"
- ✅ Usuário pode desmarcar classificações inferiores se desejar
- ✅ Classificações acima da idade real ficam desabilitadas
- ✅ Exemplo: usuário de 17 anos → 18+ desabilitado até completar 18 anos

---

## Mudanças no Schema

### 1. User Model (Prisma)

```prisma
model User {
  // ... existing fields

  // Novos campos necessários
  hasCompletedWelcome Boolean @default(false)  // Flag para exibir welcome modal
  birthdate           DateTime?                 // Data de nascimento (opcional inicialmente)
  gender              String?                   // "male", "female", "other", "prefer_not_to_say"
  languagePreference  String @default("en-US")  // Já existe, mas será populado no OAuth
  maxAgeRating        String @default("G")      // Classificação máxima permitida
  contentFilters      Json @default("[]")       // Temas/filtros de conteúdo

  // ... existing relations
}
```

### 2. Age Rating Enum

```typescript
// src/types/content.ts
export enum AgeRating {
  G = "G",           // Livre (General Audiences)
  PG = "PG",         // 10+ (Parental Guidance)
  PG13 = "PG13",     // 12+
  T = "T",           // 14+ (Teen)
  M = "M",           // 16+ (Mature)
  A = "A",           // 18+ (Adult)
}

export const AGE_RATING_MAP = {
  G: { minAge: 0, label: "Livre" },
  PG: { minAge: 10, label: "10+" },
  PG13: { minAge: 12, label: "12+" },
  T: { minAge: 14, label: "14+" },
  M: { minAge: 16, label: "16+" },
  A: { minAge: 18, label: "18+" },
};
```

### 3. Migration

```sql
-- Add new fields to User table
ALTER TABLE "User"
  ADD COLUMN "hasCompletedWelcome" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "birthdate" TIMESTAMP(3),
  ADD COLUMN "gender" TEXT,
  ADD COLUMN "maxAgeRating" TEXT NOT NULL DEFAULT 'G',
  ADD COLUMN "contentFilters" JSONB NOT NULL DEFAULT '[]';

-- Update languagePreference default (if needed)
ALTER TABLE "User"
  ALTER COLUMN "languagePreference" SET DEFAULT 'en-US';
```

---

## Implementação Técnica

### Backend

#### 1. User Service (`backend/src/services/userService.ts`)

```typescript
// Nova função para calcular idade
export function calculateAge(birthdate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthdate.getFullYear();
  const monthDiff = today.getMonth() - birthdate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdate.getDate())) {
    age--;
  }

  return age;
}

// Nova função para validar maxAgeRating baseado na idade
export function getMaxAllowedAgeRating(birthdate: Date | null): AgeRating {
  if (!birthdate) return AgeRating.G;

  const age = calculateAge(birthdate);

  if (age >= 18) return AgeRating.A;
  if (age >= 16) return AgeRating.M;
  if (age >= 14) return AgeRating.T;
  if (age >= 12) return AgeRating.PG13;
  if (age >= 10) return AgeRating.PG;
  return AgeRating.G;
}

// Validação de age rating
export function validateAgeRating(
  requestedRating: AgeRating,
  birthdate: Date | null
): boolean {
  const maxAllowed = getMaxAllowedAgeRating(birthdate);
  const requestedValue = AGE_RATING_MAP[requestedRating].minAge;
  const maxValue = AGE_RATING_MAP[maxAllowed].minAge;

  return requestedValue <= maxValue;
}

// Update welcome flow progress
export async function updateWelcomeProgress(
  userId: string,
  data: Partial<User>
): Promise<User> {
  // Validar birthdate se fornecido
  if (data.birthdate) {
    const age = calculateAge(new Date(data.birthdate));
    if (age < 0 || age > 120) {
      throw new Error("Invalid birthdate");
    }
  }

  // Validar maxAgeRating se fornecido
  if (data.maxAgeRating && data.birthdate) {
    const isValid = validateAgeRating(
      data.maxAgeRating as AgeRating,
      new Date(data.birthdate)
    );

    if (!isValid) {
      throw new Error("Age rating exceeds user's age");
    }
  }

  return prisma.user.update({
    where: { id: userId },
    data,
  });
}

// Marcar welcome como completo
export async function completeWelcome(userId: string): Promise<User> {
  return prisma.user.update({
    where: { id: userId },
    data: { hasCompletedWelcome: true },
  });
}
```

#### 2. Auth Service - OAuth Language Capture

```typescript
// backend/src/services/authService.ts

// Modificar createUserFromOAuth para aceitar languagePreference
export async function createUserFromOAuth(
  profile: OAuthProfile,
  provider: "google" | "github",
  languagePreference?: string // Novo parâmetro
): Promise<User> {
  const user = await prisma.user.create({
    data: {
      email: profile.email,
      displayName: profile.name || profile.email.split("@")[0],
      username: generateUsername(profile.email),
      emailVerified: true,
      languagePreference: languagePreference || "en-US", // Auto-captura
      hasCompletedWelcome: false, // Forçar welcome flow
      // ... outros campos
    },
  });

  return user;
}
```

#### 3. Controllers

**a) User Controller (`backend/src/controllers/userController.ts`)**

```typescript
// PATCH /api/v1/users/me/welcome-progress
export async function updateWelcomeProgressHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = req.user!.id;
    const data = req.body;

    const updatedUser = await userService.updateWelcomeProgress(userId, data);

    res.json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    if (error.message === "Invalid birthdate" ||
        error.message === "Age rating exceeds user's age") {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    } else {
      throw error;
    }
  }
}

// POST /api/v1/users/me/complete-welcome
export async function completeWelcomeHandler(
  req: Request,
  res: Response
): Promise<void> {
  const userId = req.user!.id;
  const updatedUser = await userService.completeWelcome(userId);

  res.json({
    success: true,
    data: updatedUser,
  });
}

// GET /api/v1/users/me/age-rating-info
export async function getAgeRatingInfoHandler(
  req: Request,
  res: Response
): Promise<void> {
  const user = req.user!;

  const maxAllowed = userService.getMaxAllowedAgeRating(
    user.birthdate ? new Date(user.birthdate) : null
  );

  res.json({
    success: true,
    data: {
      hasBirthdate: !!user.birthdate,
      age: user.birthdate ? userService.calculateAge(new Date(user.birthdate)) : null,
      maxAllowedRating: maxAllowed,
      currentMaxRating: user.maxAgeRating,
    },
  });
}
```

**b) Auth Controller - Modificar OAuth Callback**

```typescript
// backend/src/controllers/authController.ts

// POST /api/v1/auth/google/callback
export async function googleCallbackHandler(
  req: Request,
  res: Response
): Promise<void> {
  const { code, languagePreference } = req.body; // Receber language do frontend

  const profile = await getGoogleProfile(code);

  let user = await findUserByEmail(profile.email);

  if (!user) {
    // Novo usuário - capturar languagePreference
    user = await authService.createUserFromOAuth(
      profile,
      "google",
      languagePreference
    );
  }

  const token = generateJWT(user);

  res.json({
    success: true,
    data: { user, token },
  });
}
```

---

## API Endpoints

### Novos Endpoints

#### 1. Welcome Progress
```
PATCH /api/v1/users/me/welcome-progress
Authorization: Bearer <token>

Request Body:
{
  "displayName": "João Silva",
  "username": "joaosilva",
  "birthdate": "1995-05-15T00:00:00.000Z",
  "gender": "male",
  "languagePreference": "pt-BR",
  "maxAgeRating": "A",
  "contentFilters": ["action", "sci-fi"]
}

Response:
{
  "success": true,
  "data": {
    "id": "user-123",
    "displayName": "João Silva",
    "hasCompletedWelcome": false,
    // ... todos os campos atualizados
  }
}
```

#### 2. Complete Welcome
```
POST /api/v1/users/me/complete-welcome
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "id": "user-123",
    "hasCompletedWelcome": true,
    // ...
  }
}
```

#### 3. Age Rating Info
```
GET /api/v1/users/me/age-rating-info
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "hasBirthdate": true,
    "age": 28,
    "maxAllowedRating": "A",
    "currentMaxRating": "M"
  }
}
```

#### 4. OAuth Callback (Modificado)
```
POST /api/v1/auth/google/callback

Request Body:
{
  "code": "google-oauth-code",
  "languagePreference": "pt-BR"  // Novo campo
}

Response:
{
  "success": true,
  "data": {
    "user": { /* user object */ },
    "token": "jwt-token"
  }
}
```

---

## Frontend

### 1. Welcome Modal Component

**Estrutura de Componentes:**

```
src/components/welcome/
├── WelcomeModal.tsx              # Container principal
├── WelcomeStep.tsx               # Layout genérico de step
├── steps/
│   ├── DisplayNameStep.tsx       # Step 1: Display Name
│   ├── UsernameStep.tsx          # Step 2: Username
│   ├── BirthdateStep.tsx         # Step 3: Birthdate
│   ├── GenderStep.tsx            # Step 4: Gender (opcional)
│   ├── LanguageStep.tsx          # Step 5: Language
│   ├── AgeRatingStep.tsx         # Step 6: Age Rating
│   └── ContentFiltersStep.tsx    # Step 7: Content Filters
├── hooks/
│   └── useWelcomeFlow.ts         # Lógica de navegação e salvamento
└── types.ts                      # Types do welcome flow
```

**WelcomeModal.tsx:**

```tsx
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useWelcomeFlow } from "./hooks/useWelcomeFlow";
import { DisplayNameStep } from "./steps/DisplayNameStep";
import { UsernameStep } from "./steps/UsernameStep";
// ... outros steps

const TOTAL_STEPS = 7;

export function WelcomeModal() {
  const {
    isOpen,
    currentStep,
    formData,
    goToNextStep,
    goToPreviousStep,
    skipWelcome,
    updateFormData,
    isLoading,
  } = useWelcomeFlow();

  const progress = ((currentStep + 1) / TOTAL_STEPS) * 100;

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <DisplayNameStep data={formData} onUpdate={updateFormData} />;
      case 1:
        return <UsernameStep data={formData} onUpdate={updateFormData} />;
      case 2:
        return <BirthdateStep data={formData} onUpdate={updateFormData} />;
      case 3:
        return <GenderStep data={formData} onUpdate={updateFormData} />;
      case 4:
        return <LanguageStep data={formData} onUpdate={updateFormData} />;
      case 5:
        return <AgeRatingStep data={formData} onUpdate={updateFormData} />;
      case 6:
        return <ContentFiltersStep data={formData} onUpdate={updateFormData} />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && skipWelcome()}>
      <DialogContent className="max-w-2xl">
        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-muted-foreground text-center">
              Passo {currentStep + 1} de {TOTAL_STEPS}
            </p>
          </div>

          {/* Step Content */}
          <div className="min-h-[300px]">{renderStep()}</div>

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={goToPreviousStep}
              disabled={currentStep === 0 || isLoading}
            >
              ◀ Voltar
            </Button>

            <Button variant="ghost" onClick={skipWelcome} disabled={isLoading}>
              Pular
            </Button>

            <Button onClick={goToNextStep} disabled={isLoading}>
              {currentStep === TOTAL_STEPS - 1 ? "Concluir" : "Próximo ▶"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**useWelcomeFlow.ts:**

```tsx
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

export function useWelcomeFlow() {
  const { user, refreshUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Abrir modal se usuário não completou welcome
  useEffect(() => {
    if (user && !user.hasCompletedWelcome) {
      setIsOpen(true);
    }
  }, [user]);

  const updateFormData = (data: any) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  const saveProgress = async () => {
    setIsLoading(true);
    try {
      await api.patch("/users/me/welcome-progress", formData);
      await refreshUser(); // Atualizar user context
    } catch (error) {
      console.error("Error saving welcome progress:", error);
      // TODO: Mostrar toast de erro
    } finally {
      setIsLoading(false);
    }
  };

  const goToNextStep = async () => {
    await saveProgress(); // Salvar antes de avançar

    if (currentStep === 6) {
      // Último step - completar welcome
      await api.post("/users/me/complete-welcome");
      await refreshUser();
      setIsOpen(false);
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const skipWelcome = async () => {
    await saveProgress(); // Salvar dados já preenchidos
    await api.post("/users/me/complete-welcome");
    await refreshUser();
    setIsOpen(false);
  };

  return {
    isOpen,
    currentStep,
    formData,
    goToNextStep,
    goToPreviousStep,
    skipWelcome,
    updateFormData,
    isLoading,
  };
}
```

**Exemplo de Step (DisplayNameStep.tsx):**

```tsx
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DisplayNameStepProps {
  data: any;
  onUpdate: (data: any) => void;
}

export function DisplayNameStep({ data, onUpdate }: DisplayNameStepProps) {
  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Bem-vindo ao CharHub! 👋</h2>
        <p className="text-muted-foreground">
          Como você gostaria que os agentes te chamassem?
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="displayName">Nome de Exibição</Label>
        <Input
          id="displayName"
          placeholder="Ex: João Silva"
          value={data.displayName || ""}
          onChange={(e) => onUpdate({ displayName: e.target.value })}
          autoFocus
        />
        <p className="text-sm text-muted-foreground">
          Este é o nome que aparecerá nas conversas com os agentes.
        </p>
      </div>
    </div>
  );
}
```

**⚠️ IMPORTANTE - Reutilização de Código:**
- Os steps devem reutilizar componentes existentes de `src/pages/Profile.tsx`
- Não duplicar inputs, validações ou lógica
- Extrair componentes compartilhados se necessário:
  - `DatePicker` (birthdate)
  - `LanguageSelector` (language preference)
  - `UsernameInput` (username com validação)

### 2. Age Rating Filter (Header)

**Modificar: `src/components/layout/Header.tsx`**

```tsx
import { useAgeRatingFilter } from "@/hooks/useAgeRatingFilter";
import { AgeRatingDropdown } from "@/components/content/AgeRatingDropdown";

export function Header() {
  // ... existing code

  return (
    <header>
      {/* ... existing elements */}
      <AgeRatingDropdown />
    </header>
  );
}
```

**Novo: `src/components/content/AgeRatingDropdown.tsx`**

```tsx
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const AGE_RATINGS = [
  { value: "G", label: "Livre", minAge: 0 },
  { value: "PG", label: "10+", minAge: 10 },
  { value: "PG13", label: "12+", minAge: 12 },
  { value: "T", label: "14+", minAge: 14 },
  { value: "M", label: "16+", minAge: 16 },
  { value: "A", label: "18+", minAge: 18 },
];

export function AgeRatingDropdown() {
  const { user } = useAuth();
  const [ageRatingInfo, setAgeRatingInfo] = useState<any>(null);
  const [selectedRatings, setSelectedRatings] = useState<string[]>(["G"]);

  useEffect(() => {
    fetchAgeRatingInfo();
  }, [user]);

  const fetchAgeRatingInfo = async () => {
    try {
      const response = await api.get("/users/me/age-rating-info");
      setAgeRatingInfo(response.data.data);
    } catch (error) {
      console.error("Error fetching age rating info:", error);
    }
  };

  const handleRatingToggle = (rating: string) => {
    if (!ageRatingInfo?.hasBirthdate) return; // Bloqueado

    const ratingObj = AGE_RATINGS.find((r) => r.value === rating);
    if (!ratingObj) return;

    // Verificar se excede idade
    const maxAllowedAge = AGE_RATINGS.find(
      (r) => r.value === ageRatingInfo.maxAllowedRating
    )?.minAge;
    if (ratingObj.minAge > maxAllowedAge!) return;

    // Auto-ativar classificações inferiores
    if (!selectedRatings.includes(rating)) {
      const inferiorRatings = AGE_RATINGS.filter(
        (r) => r.minAge <= ratingObj.minAge
      ).map((r) => r.value);

      setSelectedRatings((prev) => [
        ...new Set([...prev, ...inferiorRatings]),
      ]);
    } else {
      // Desmarcar apenas este
      setSelectedRatings((prev) => prev.filter((r) => r !== rating));
    }
  };

  const isRatingDisabled = (rating: string) => {
    if (!ageRatingInfo?.hasBirthdate) return rating !== "G";

    const ratingObj = AGE_RATINGS.find((r) => r.value === rating);
    const maxAllowedAge = AGE_RATINGS.find(
      (r) => r.value === ageRatingInfo.maxAllowedRating
    )?.minAge;

    return ratingObj && ratingObj.minAge > maxAllowedAge!;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          {ageRatingInfo?.hasBirthdate ? "🎯" : "🔒"} Classificação
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        {!ageRatingInfo?.hasBirthdate && (
          <>
            <div className="p-3 space-y-2 bg-yellow-50 dark:bg-yellow-900/20">
              <p className="text-sm font-medium">⚠️ Idade não cadastrada</p>
              <p className="text-xs text-muted-foreground">
                Para alterar a classificação, cadastre sua data de nascimento
                nas configurações.
              </p>
              <Link to="/profile">
                <Button size="sm" variant="link" className="p-0 h-auto">
                  👉 Ir para Configurações
                </Button>
              </Link>
            </div>
            <DropdownMenuSeparator />
          </>
        )}

        {AGE_RATINGS.map((rating) => (
          <DropdownMenuCheckboxItem
            key={rating.value}
            checked={selectedRatings.includes(rating.value)}
            onCheckedChange={() => handleRatingToggle(rating.value)}
            disabled={isRatingDisabled(rating.value)}
          >
            {rating.label}
            {isRatingDisabled(rating.value) && rating.value !== "G" && (
              <span className="ml-auto text-xs text-muted-foreground">
                (bloqueado)
              </span>
            )}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### 3. OAuth Language Capture

**Modificar: `src/services/authService.ts`**

```typescript
export async function handleGoogleCallback(code: string) {
  // Capturar idioma do localStorage
  const languagePreference = localStorage.getItem("i18nextLng") || "en-US";

  const response = await api.post("/auth/google/callback", {
    code,
    languagePreference, // Enviar para backend
  });

  return response.data;
}
```

---

## Fluxos de Usuário

### Fluxo 1: Novo Usuário via OAuth

```
1. Usuário clica "Login with Google"
   └─ Frontend captura i18nextLng do localStorage

2. OAuth retorna para /callback
   └─ Frontend envia code + languagePreference para backend

3. Backend cria novo usuário
   ├─ Salva languagePreference automaticamente
   └─ Define hasCompletedWelcome = false

4. Frontend redireciona para /home
   └─ WelcomeModal detecta hasCompletedWelcome = false
   └─ Abre automaticamente

5. Usuário preenche steps do welcome
   ├─ Cada "Próximo" salva dados via API
   ├─ Pode "Pular" a qualquer momento (dados já preenchidos são mantidos)
   └─ Ao finalizar ou pular, hasCompletedWelcome = true

6. Modal fecha, usuário acessa app normalmente
```

### Fluxo 2: Usuário sem Birthdate Tenta Filtrar Conteúdo

```
1. Usuário clica no dropdown "Classificação" no header
   └─ Dropdown abre mostrando apenas "Livre" ativo
   └─ Todas outras opções desabilitadas

2. Exibe aviso: "⚠️ Para alterar, cadastre sua idade"
   └─ Botão "👉 Ir para Configurações"

3. Usuário clica no botão
   └─ Redireciona para /profile

4. Usuário preenche birthdate no profile
   └─ Salva via API existente

5. Volta ao home
   └─ Dropdown agora permite seleção baseada na idade
```

### Fluxo 3: Usuário Seleciona Age Rating com Auto-Ativação

```
1. Usuário abre dropdown de classificação
   └─ Todas opções compatíveis com sua idade estão habilitadas

2. Usuário clica em "12+"
   └─ Sistema automaticamente marca:
       ☑ Livre
       ☑ 10+
       ☑ 12+
   └─ Sistema automaticamente desmarca:
       ☐ 14+
       ☐ 16+
       ☐ 18+ (se usuário < 18 anos, fica desabilitado)

3. Usuário pode desmarcar "Livre" se quiser
   └─ Sistema permite (desmarca apenas aquele)

4. Filtros aplicados na listagem de characters/chats
   └─ API filtra baseado em selectedRatings
```

---

## Regras de Negócio

### 1. Welcome Modal

| Regra | Descrição |
|-------|-----------|
| R1 | Modal só aparece se `hasCompletedWelcome === false` |
| R2 | Cada step salva dados antes de avançar (PATCH /welcome-progress) |
| R3 | "Pular" salva dados já preenchidos e marca welcome como completo |
| R4 | Todos os campos são opcionais (exceto step atual pode ter validação) |
| R5 | Usuário pode fechar modal a qualquer momento (equivalente a "Pular") |
| R6 | Modal não bloqueia acesso ao app |
| R7 | "Voltar" permite editar step anterior |

### 2. Birthdate e Age Rating

| Regra | Descrição |
|-------|-----------|
| R8 | Se `birthdate === null`, usuário só pode acessar conteúdo "Livre" (G) |
| R9 | `maxAgeRating` não pode exceder classificação compatível com idade real |
| R10 | Exemplo: usuário de 17 anos não pode definir maxAgeRating = "A" (18+) |
| R11 | Backend valida age rating em PATCH /welcome-progress |
| R12 | Frontend desabilita opções incompatíveis no dropdown |

### 3. Auto-Ativação de Ratings

| Regra | Descrição |
|-------|-----------|
| R13 | Ao selecionar rating X, auto-ativar todos ratings < X |
| R14 | Ao desmarcar rating X, não auto-desmarcar inferiores (manual) |
| R15 | Usuário pode manualmente desmarcar ratings inferiores |
| R16 | Sempre manter pelo menos "Livre" marcado (hard minimum) |

### 4. Language Preference

| Regra | Descrição |
|-------|-----------|
| R17 | No OAuth signup, capturar `i18nextLng` do localStorage |
| R18 | Salvar em `user.languagePreference` no momento da criação |
| R19 | Se i18nextLng não existir, usar "en-US" como fallback |
| R20 | No welcome flow, step de idioma permite confirmar/alterar |

### 5. Content Filtering (API)

| Regra | Descrição |
|-------|-----------|
| R21 | API de characters deve filtrar por `user.maxAgeRating` |
| R22 | API deve respeitar `user.contentFilters` (temas bloqueados) |
| R23 | Se usuário sem birthdate, forçar filtro apenas "Livre" |
| R24 | Characters com rating > user's maxAllowed não aparecem |

---

## Testes

### Backend Tests

#### 1. User Service Tests (`userService.test.ts`)

```typescript
describe("userService - Welcome Flow", () => {
  describe("calculateAge", () => {
    it("should calculate age correctly", () => {
      const birthdate = new Date("1995-05-15");
      const age = calculateAge(birthdate);
      expect(age).toBeGreaterThanOrEqual(28); // Dependendo do ano atual
    });

    it("should handle birthday not yet reached this year", () => {
      const birthdate = new Date("2000-12-31");
      const age = calculateAge(birthdate);
      // Test logic based on current date
    });
  });

  describe("getMaxAllowedAgeRating", () => {
    it("should return G for null birthdate", () => {
      expect(getMaxAllowedAgeRating(null)).toBe(AgeRating.G);
    });

    it("should return A for 18+ years old", () => {
      const birthdate = new Date("2000-01-01");
      expect(getMaxAllowedAgeRating(birthdate)).toBe(AgeRating.A);
    });

    it("should return M for 16-17 years old", () => {
      const birthdate = new Date("2008-01-01"); // Ajustar baseado no ano
      expect(getMaxAllowedAgeRating(birthdate)).toBe(AgeRating.M);
    });
  });

  describe("validateAgeRating", () => {
    it("should allow G for any age", () => {
      expect(validateAgeRating(AgeRating.G, null)).toBe(true);
    });

    it("should reject A for under 18", () => {
      const birthdate = new Date("2010-01-01");
      expect(validateAgeRating(AgeRating.A, birthdate)).toBe(false);
    });

    it("should allow A for 18+", () => {
      const birthdate = new Date("2000-01-01");
      expect(validateAgeRating(AgeRating.A, birthdate)).toBe(true);
    });
  });

  describe("updateWelcomeProgress", () => {
    it("should update user data", async () => {
      const user = await createTestUser();
      const updated = await updateWelcomeProgress(user.id, {
        displayName: "Test User",
      });
      expect(updated.displayName).toBe("Test User");
    });

    it("should reject invalid birthdate", async () => {
      const user = await createTestUser();
      await expect(
        updateWelcomeProgress(user.id, {
          birthdate: new Date("2050-01-01"), // Futuro
        })
      ).rejects.toThrow("Invalid birthdate");
    });

    it("should reject age rating exceeding user age", async () => {
      const user = await createTestUser();
      await expect(
        updateWelcomeProgress(user.id, {
          birthdate: new Date("2010-01-01"), // ~14 anos
          maxAgeRating: AgeRating.A, // 18+
        })
      ).rejects.toThrow("Age rating exceeds user's age");
    });
  });
});
```

#### 2. Auth Service Tests (`authService.test.ts`)

```typescript
describe("authService - OAuth Language Capture", () => {
  it("should save languagePreference from OAuth", async () => {
    const profile = {
      email: "test@example.com",
      name: "Test User",
    };

    const user = await createUserFromOAuth(profile, "google", "pt-BR");

    expect(user.languagePreference).toBe("pt-BR");
  });

  it("should default to en-US if not provided", async () => {
    const profile = {
      email: "test@example.com",
      name: "Test User",
    };

    const user = await createUserFromOAuth(profile, "google");

    expect(user.languagePreference).toBe("en-US");
  });

  it("should set hasCompletedWelcome to false", async () => {
    const profile = {
      email: "test@example.com",
      name: "Test User",
    };

    const user = await createUserFromOAuth(profile, "google");

    expect(user.hasCompletedWelcome).toBe(false);
  });
});
```

### Frontend Tests

#### 1. WelcomeModal Tests

```typescript
describe("WelcomeModal", () => {
  it("should open for user with hasCompletedWelcome = false", () => {
    const user = { hasCompletedWelcome: false };
    render(<WelcomeModal />, { user });
    expect(screen.getByText(/Bem-vindo/i)).toBeInTheDocument();
  });

  it("should not open for user with hasCompletedWelcome = true", () => {
    const user = { hasCompletedWelcome: true };
    render(<WelcomeModal />, { user });
    expect(screen.queryByText(/Bem-vindo/i)).not.toBeInTheDocument();
  });

  it("should save progress on next", async () => {
    const mockApi = jest.spyOn(api, "patch");
    render(<WelcomeModal />);

    fireEvent.change(screen.getByLabelText(/Nome de Exibição/i), {
      target: { value: "Test User" },
    });

    fireEvent.click(screen.getByText(/Próximo/i));

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith("/users/me/welcome-progress", {
        displayName: "Test User",
      });
    });
  });

  it("should complete welcome on finish", async () => {
    const mockApi = jest.spyOn(api, "post");
    // Navigate to last step
    // ...
    fireEvent.click(screen.getByText(/Concluir/i));

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith("/users/me/complete-welcome");
    });
  });
});
```

#### 2. AgeRatingDropdown Tests

```typescript
describe("AgeRatingDropdown", () => {
  it("should show warning for user without birthdate", () => {
    const user = { birthdate: null };
    render(<AgeRatingDropdown />, { user });

    expect(screen.getByText(/Idade não cadastrada/i)).toBeInTheDocument();
  });

  it("should disable ratings above user age", () => {
    const user = { birthdate: new Date("2010-01-01") }; // ~14 anos
    render(<AgeRatingDropdown />, { user });

    const rating18 = screen.getByText("18+");
    expect(rating18.closest("button")).toBeDisabled();
  });

  it("should auto-select inferior ratings when selecting higher", () => {
    const user = { birthdate: new Date("2000-01-01") }; // 18+ anos
    render(<AgeRatingDropdown />, { user });

    fireEvent.click(screen.getByText("12+"));

    expect(screen.getByLabelText("Livre")).toBeChecked();
    expect(screen.getByLabelText("10+")).toBeChecked();
    expect(screen.getByLabelText("12+")).toBeChecked();
    expect(screen.getByLabelText("14+")).not.toBeChecked();
  });
});
```

### E2E Tests (Playwright)

```typescript
test.describe("Welcome Flow E2E", () => {
  test("should complete full welcome flow", async ({ page }) => {
    // Login as new user
    await loginAsNewUser(page);

    // Welcome modal should appear
    await expect(page.getByText(/Bem-vindo/i)).toBeVisible();

    // Fill display name
    await page.fill('[placeholder*="João Silva"]', "Test User");
    await page.click("text=Próximo");

    // Fill username
    await page.fill('[placeholder*="username"]', "testuser");
    await page.click("text=Próximo");

    // Fill birthdate
    await page.fill('[type="date"]', "1995-05-15");
    await page.click("text=Próximo");

    // Skip gender (optional)
    await page.click("text=Próximo");

    // Confirm language
    await page.click("text=Próximo");

    // Select age rating
    await page.click("text=18+");
    await page.click("text=Próximo");

    // Complete
    await page.click("text=Concluir");

    // Modal should close
    await expect(page.getByText(/Bem-vindo/i)).not.toBeVisible();
  });

  test("should persist data when skipping", async ({ page }) => {
    await loginAsNewUser(page);

    await page.fill('[placeholder*="João Silva"]', "Test User");
    await page.click("text=Pular");

    // Re-login
    await logout(page);
    await loginAsNewUser(page);

    // Modal should not appear (hasCompletedWelcome = true)
    await expect(page.getByText(/Bem-vindo/i)).not.toBeVisible();

    // Check if data was saved
    await page.goto("/profile");
    await expect(page.getByDisplayValue("Test User")).toBeVisible();
  });
});
```

---

## Roadmap de Implementação

### Fase 1: Backend Foundation (Semana 1 - Dias 1-3)

**Objetivo**: Criar infraestrutura backend para welcome flow e age rating.

- [ ] **1.1. Database Schema**
  - [ ] Criar migration com novos campos no User model
  - [ ] Adicionar indexes necessários
  - [ ] Testar migration em ambiente de desenvolvimento

- [ ] **1.2. User Service**
  - [ ] Implementar `calculateAge()`
  - [ ] Implementar `getMaxAllowedAgeRating()`
  - [ ] Implementar `validateAgeRating()`
  - [ ] Implementar `updateWelcomeProgress()`
  - [ ] Implementar `completeWelcome()`
  - [ ] Escrever testes unitários

- [ ] **1.3. Auth Service**
  - [ ] Modificar `createUserFromOAuth()` para aceitar `languagePreference`
  - [ ] Testar OAuth flow com language capture
  - [ ] Escrever testes

- [ ] **1.4. API Endpoints**
  - [ ] `PATCH /api/v1/users/me/welcome-progress`
  - [ ] `POST /api/v1/users/me/complete-welcome`
  - [ ] `GET /api/v1/users/me/age-rating-info`
  - [ ] Modificar `POST /api/v1/auth/google/callback`
  - [ ] Adicionar validações e error handling
  - [ ] Escrever testes de integração

### Fase 2: Frontend - Welcome Modal (Semana 1 - Dias 4-7)

**Objetivo**: Criar welcome modal completo e funcional.

- [ ] **2.1. Estrutura de Componentes**
  - [ ] Criar `WelcomeModal.tsx` (container)
  - [ ] Criar `WelcomeStep.tsx` (layout genérico)
  - [ ] Criar hook `useWelcomeFlow.ts`
  - [ ] Criar types em `types.ts`

- [ ] **2.2. Steps Individuais**
  - [ ] `DisplayNameStep.tsx` (reutilizar input do profile)
  - [ ] `UsernameStep.tsx` (reutilizar validação do profile)
  - [ ] `BirthdateStep.tsx` (reutilizar DatePicker do profile)
  - [ ] `GenderStep.tsx` (novo component, simples)
  - [ ] `LanguageStep.tsx` (reutilizar LanguageSelector do profile)
  - [ ] `AgeRatingStep.tsx` (novo, baseado no dropdown)
  - [ ] `ContentFiltersStep.tsx` (novo, multi-select de temas)

- [ ] **2.3. Integração**
  - [ ] Integrar WelcomeModal no App.tsx
  - [ ] Implementar lógica de salvamento progressivo
  - [ ] Implementar navegação entre steps
  - [ ] Implementar "Pular" com salvamento
  - [ ] Adicionar progress bar
  - [ ] Escrever testes de componente

### Fase 3: Frontend - Age Rating Dropdown (Semana 2 - Dias 1-2)

**Objetivo**: Melhorar dropdown de classificação com validações.

- [ ] **3.1. Component**
  - [ ] Criar `AgeRatingDropdown.tsx`
  - [ ] Implementar lógica de bloqueio (sem birthdate)
  - [ ] Implementar auto-ativação de ratings inferiores
  - [ ] Implementar validação de idade máxima
  - [ ] Adicionar aviso com link para profile

- [ ] **3.2. Integração**
  - [ ] Substituir dropdown antigo no Header
  - [ ] Conectar com API de age rating info
  - [ ] Testar todos os cenários de uso
  - [ ] Escrever testes

### Fase 4: OAuth Language Capture (Semana 2 - Dia 3)

**Objetivo**: Auto-capturar idioma no signup via OAuth.

- [ ] **4.1. Frontend**
  - [ ] Modificar `authService.ts` para capturar `i18nextLng`
  - [ ] Enviar languagePreference no callback OAuth

- [ ] **4.2. Testes**
  - [ ] Testar signup com diferentes idiomas
  - [ ] Verificar persistência no banco
  - [ ] Testar fallback para en-US

### Fase 5: Content Filtering (API) (Semana 2 - Dias 4-5)

**Objetivo**: Aplicar filtros de age rating nas listagens.

- [ ] **5.1. Backend**
  - [ ] Modificar `GET /api/v1/characters` para filtrar por age rating
  - [ ] Implementar filtro de `contentFilters` (temas)
  - [ ] Garantir que usuários sem birthdate veem apenas "Livre"

- [ ] **5.2. Frontend**
  - [ ] Atualizar query de characters para passar filtros selecionados
  - [ ] Persistir seleção de ratings (localStorage ou user preference)
  - [ ] Testar filtragem em diferentes cenários

### Fase 6: Refatoração e Reutilização (Semana 2 - Dia 6)

**Objetivo**: Eliminar duplicação de código.

- [ ] **6.1. Shared Components**
  - [ ] Extrair `DatePicker` compartilhado
  - [ ] Extrair `LanguageSelector` compartilhado
  - [ ] Extrair `UsernameInput` compartilhado
  - [ ] Mover para `src/components/shared/`

- [ ] **6.2. Profile Page**
  - [ ] Atualizar Profile para usar componentes compartilhados
  - [ ] Verificar que tudo ainda funciona

### Fase 7: Testing & QA (Semana 2 - Dia 7)

**Objetivo**: Garantir qualidade e estabilidade.

- [ ] **7.1. Backend Tests**
  - [ ] Rodar todos os testes unitários
  - [ ] Rodar testes de integração
  - [ ] Verificar coverage (mínimo 80%)

- [ ] **7.2. Frontend Tests**
  - [ ] Rodar testes de componentes
  - [ ] Rodar testes E2E (Playwright)
  - [ ] Testar em diferentes navegadores

- [ ] **7.3. Manual QA**
  - [ ] Testar fluxo completo de novo usuário
  - [ ] Testar edge cases (idade limite, skip, etc)
  - [ ] Testar responsividade (mobile/desktop)
  - [ ] Testar acessibilidade (keyboard navigation, screen readers)

### Fase 8: Documentation & Deployment (Semana 3 - Dia 1)

**Objetivo**: Documentar e preparar para produção.

- [ ] **8.1. Documentation**
  - [ ] Atualizar README se necessário
  - [ ] Documentar novos endpoints na API reference
  - [ ] Criar guia de uso para usuários (opcional)

- [ ] **8.2. Deployment Preparation**
  - [ ] Revisar todas as mudanças
  - [ ] Criar PR detalhado
  - [ ] Solicitar code review
  - [ ] Merge após aprovação

---

## Considerações Finais

### Priorização

**Must Have (MVP)**:
- ✅ Welcome modal com campos essenciais
- ✅ Salvamento progressivo
- ✅ Age rating validation baseado em idade
- ✅ OAuth language capture

**Should Have**:
- ✅ Auto-ativação de ratings inferiores
- ✅ Content filters (temas)
- ✅ Reutilização de componentes

**Could Have** (Future):
- Gamificação (recompensa por completar welcome)
- Analytics de drop-off por step
- A/B testing de order dos steps
- Personalização da ordem dos steps

### Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Duplicação de código | Médio | Priorizar refatoração na Fase 6 |
| Validação de idade complexa | Baixo | Testes robustos, edge cases cobertos |
| UX do modal intrusivo | Médio | Permitir "Pular", não bloquear acesso |
| Performance (salvamento a cada step) | Baixo | Debounce, loading states, error handling |

### Métricas de Sucesso

**Produto**:
- Taxa de conclusão do welcome flow > 70%
- Redução de usuários sem birthdate em 80%
- Aumento de personalização (displayName preenchido)

**Técnico**:
- Zero duplicação de componentes
- Coverage de testes > 80%
- Zero bugs críticos em produção

**Negócio**:
- Compliance com classificação indicativa
- Redução de reclamações sobre conteúdo inapropriado
- Melhoria no NPS de novos usuários

---

## Aprovação e Próximos Passos

**Status**: 📋 Aguardando aprovação

**Approved by**: _____________________

**Start Date**: _____________________

**Expected Completion**: _____________________

---

**Agent Coder**: Pronto para começar? Qualquer dúvida, me avise! 🚀
