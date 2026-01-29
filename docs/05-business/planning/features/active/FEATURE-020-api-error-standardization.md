# FEATURE-020: API Error Response Standardization

**Status**: Active
**Priority**: High
**Assigned To**: Agent Coder
**Created**: 2026-01-29
**Last Updated**: 2026-01-29
**Epic**: Developer Experience & i18n

**GitHub Issue**: #129

---

## Problem Statement

API error responses are currently inconsistent and use hardcoded English strings, making internationalization difficult and creating maintenance burden.

### Current State

```typescript
// Current pattern (inconsistent, hardcoded)
res.status(403).json({ error: 'Admin access required' });
res.status(400).json({ error: 'Invalid input' });
res.status(500).json({ error: 'Something went wrong' });
```

### Problems

1. **No error codes** - Frontend cannot reliably translate or handle specific errors
2. **Hardcoded strings** - English only, scattered across 33+ route files
3. **Inconsistent format** - Some return `{ error: string }`, others `{ message: string }`
4. **No field information** - Validation errors don't indicate which field failed
5. **~90+ occurrences** to update across the codebase

### Target Users

- Frontend developers (consistent error handling)
- International users (translated error messages)
- API consumers (predictable error format)

### Value Proposition

- **Consistent API** - Predictable error format across all endpoints
- **i18n Ready** - Frontend can translate using error codes
- **Better DX** - Easier debugging with structured errors
- **Fallback Support** - English message always available

---

## Solution: Hybrid Approach (Code + Fallback Message)

### Standard Error Response Format

```typescript
// Success responses (unchanged)
res.status(200).json({ data: {...} });

// Error responses (NEW format)
res.status(4xx|5xx).json({
  error: {
    code: string;        // Machine-readable code (UPPER_SNAKE_CASE)
    message: string;     // Human-readable fallback (English)
    field?: string;      // Optional: field name for validation errors
    details?: object;    // Optional: additional context
  }
});
```

### Examples

```typescript
// Authentication error
res.status(401).json({
  error: {
    code: 'AUTH_REQUIRED',
    message: 'Authentication required'
  }
});

// Authorization error
res.status(403).json({
  error: {
    code: 'ADMIN_REQUIRED',
    message: 'Admin access required'
  }
});

// Validation error
res.status(400).json({
  error: {
    code: 'VALIDATION_FAILED',
    message: 'Invalid email format',
    field: 'email'
  }
});

// Not found
res.status(404).json({
  error: {
    code: 'CHARACTER_NOT_FOUND',
    message: 'Character not found',
    details: { characterId: '123' }
  }
});

// Rate limit
res.status(429).json({
  error: {
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests. Please try again later.',
    details: { retryAfter: 60 }
  }
});

// Server error
res.status(500).json({
  error: {
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred'
  }
});
```

---

## User Stories

### US-1: Standardized Error Format
**As a** frontend developer,
**I want** all API errors to follow the same format,
**So that** I can handle errors consistently.

**Acceptance Criteria**:
- [ ] All error responses use `{ error: { code, message, field?, details? } }` format
- [ ] Error codes use UPPER_SNAKE_CASE convention
- [ ] English fallback message always present
- [ ] TypeScript types exported for frontend

### US-2: Frontend Error Translation
**As a** user in Brazil,
**I want** to see error messages in Portuguese,
**So that** I understand what went wrong.

**Acceptance Criteria**:
- [ ] Frontend intercepts API errors
- [ ] Frontend translates using error code: `t(\`api.errors.${code}\`)`
- [ ] Falls back to English message if translation missing
- [ ] Field name included in validation error translations

### US-3: Error Code Catalog
**As a** developer,
**I want** a documented catalog of all error codes,
**So that** I know what errors to handle.

**Acceptance Criteria**:
- [ ] Error codes defined in central constants file
- [ ] TypeScript enum/const for type safety
- [ ] Documentation with all codes and their meanings

---

## Technical Approach

### Backend Implementation

#### 1. Create Error Response Utilities

**File**: `backend/src/utils/apiErrors.ts`

```typescript
/**
 * Standard API Error Codes
 * Use these constants instead of hardcoded strings
 */
export const API_ERROR_CODES = {
  // Authentication & Authorization
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_INVALID: 'AUTH_INVALID',
  AUTH_EXPIRED: 'AUTH_EXPIRED',
  ADMIN_REQUIRED: 'ADMIN_REQUIRED',
  FORBIDDEN: 'FORBIDDEN',

  // Validation
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  VALUE_OUT_OF_RANGE: 'VALUE_OUT_OF_RANGE',

  // Resources
  NOT_FOUND: 'NOT_FOUND',
  CHARACTER_NOT_FOUND: 'CHARACTER_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  CONVERSATION_NOT_FOUND: 'CONVERSATION_NOT_FOUND',
  STORY_NOT_FOUND: 'STORY_NOT_FOUND',
  IMAGE_NOT_FOUND: 'IMAGE_NOT_FOUND',
  SUBSCRIPTION_NOT_FOUND: 'SUBSCRIPTION_NOT_FOUND',

  // Conflicts
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',

  // Rate Limiting & Quotas
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  CREDITS_INSUFFICIENT: 'CREDITS_INSUFFICIENT',

  // External Services
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  STRIPE_ERROR: 'STRIPE_ERROR',
  PAYPAL_ERROR: 'PAYPAL_ERROR',
  AI_SERVICE_ERROR: 'AI_SERVICE_ERROR',
  R2_STORAGE_ERROR: 'R2_STORAGE_ERROR',

  // Server Errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',

  // Business Logic
  OPERATION_NOT_ALLOWED: 'OPERATION_NOT_ALLOWED',
  INVALID_STATE: 'INVALID_STATE',
  FEATURE_DISABLED: 'FEATURE_DISABLED',
} as const;

export type ApiErrorCode = typeof API_ERROR_CODES[keyof typeof API_ERROR_CODES];

/**
 * Standard API Error Response
 */
export interface ApiError {
  code: ApiErrorCode;
  message: string;
  field?: string;
  details?: Record<string, unknown>;
}

/**
 * Default English messages for error codes
 */
export const ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  // Authentication & Authorization
  AUTH_REQUIRED: 'Authentication required',
  AUTH_INVALID: 'Invalid authentication credentials',
  AUTH_EXPIRED: 'Authentication has expired',
  ADMIN_REQUIRED: 'Admin access required',
  FORBIDDEN: 'You do not have permission to perform this action',

  // Validation
  VALIDATION_FAILED: 'Validation failed',
  INVALID_INPUT: 'Invalid input provided',
  MISSING_REQUIRED_FIELD: 'Required field is missing',
  INVALID_FORMAT: 'Invalid format',
  VALUE_OUT_OF_RANGE: 'Value is out of allowed range',

  // Resources
  NOT_FOUND: 'Resource not found',
  CHARACTER_NOT_FOUND: 'Character not found',
  USER_NOT_FOUND: 'User not found',
  CONVERSATION_NOT_FOUND: 'Conversation not found',
  STORY_NOT_FOUND: 'Story not found',
  IMAGE_NOT_FOUND: 'Image not found',
  SUBSCRIPTION_NOT_FOUND: 'Subscription not found',

  // Conflicts
  ALREADY_EXISTS: 'Resource already exists',
  DUPLICATE_ENTRY: 'Duplicate entry',

  // Rate Limiting & Quotas
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please try again later.',
  QUOTA_EXCEEDED: 'Quota exceeded',
  CREDITS_INSUFFICIENT: 'Insufficient credits',

  // External Services
  EXTERNAL_SERVICE_ERROR: 'External service error',
  STRIPE_ERROR: 'Payment processing error',
  PAYPAL_ERROR: 'PayPal payment error',
  AI_SERVICE_ERROR: 'AI service temporarily unavailable',
  R2_STORAGE_ERROR: 'Storage service error',

  // Server Errors
  INTERNAL_ERROR: 'An unexpected error occurred',
  DATABASE_ERROR: 'Database error',
  CONFIGURATION_ERROR: 'Configuration error',

  // Business Logic
  OPERATION_NOT_ALLOWED: 'Operation not allowed',
  INVALID_STATE: 'Invalid state for this operation',
  FEATURE_DISABLED: 'This feature is currently disabled',
};

/**
 * Create a standardized error response object
 */
export function createApiError(
  code: ApiErrorCode,
  options?: {
    message?: string;
    field?: string;
    details?: Record<string, unknown>;
  }
): { error: ApiError } {
  return {
    error: {
      code,
      message: options?.message || ERROR_MESSAGES[code],
      ...(options?.field && { field: options.field }),
      ...(options?.details && { details: options.details }),
    },
  };
}

/**
 * Send error response helper
 */
export function sendError(
  res: Response,
  statusCode: number,
  code: ApiErrorCode,
  options?: {
    message?: string;
    field?: string;
    details?: Record<string, unknown>;
  }
): void {
  res.status(statusCode).json(createApiError(code, options));
}
```

#### 2. Update Route Files

**Before**:
```typescript
// backend/src/routes/v1/characters.ts
if (!character) {
  return res.status(404).json({ error: 'Character not found' });
}
```

**After**:
```typescript
// backend/src/routes/v1/characters.ts
import { sendError, API_ERROR_CODES } from '../../utils/apiErrors';

if (!character) {
  return sendError(res, 404, API_ERROR_CODES.CHARACTER_NOT_FOUND, {
    details: { characterId: req.params.id }
  });
}
```

---

### Frontend Implementation

#### 1. Create Error Handler Utility

**File**: `frontend/src/utils/apiErrorHandler.ts`

```typescript
import { t } from 'i18next';

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    field?: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Check if response is a standard API error
 */
export function isApiError(data: unknown): data is ApiErrorResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'error' in data &&
    typeof (data as ApiErrorResponse).error?.code === 'string'
  );
}

/**
 * Get translated error message from API error
 * Falls back to English message if translation not found
 */
export function getErrorMessage(error: ApiErrorResponse['error']): string {
  const { code, message, field } = error;

  // Try to get translated message
  const translationKey = `api.errors.${code}`;
  const translated = t(translationKey, {
    defaultValue: '',
    field: field ? t(`fields.${field}`, { defaultValue: field }) : undefined,
    ...error.details
  });

  // Return translated message or fallback to English
  return translated || message;
}

/**
 * Extract error message from axios error response
 */
export function extractErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as { response?: { data?: unknown } };

    if (axiosError.response?.data && isApiError(axiosError.response.data)) {
      return getErrorMessage(axiosError.response.data.error);
    }

    // Legacy format fallback
    if (axiosError.response?.data && typeof axiosError.response.data === 'object') {
      const data = axiosError.response.data as Record<string, unknown>;
      if (typeof data.error === 'string') return data.error;
      if (typeof data.message === 'string') return data.message;
    }
  }

  return t('api.errors.INTERNAL_ERROR', { defaultValue: 'An unexpected error occurred' });
}
```

#### 2. Add Translation Namespace

**File**: `frontend/public/locales/en/api.json`

```json
{
  "errors": {
    "AUTH_REQUIRED": "Please log in to continue",
    "AUTH_INVALID": "Invalid login credentials",
    "AUTH_EXPIRED": "Your session has expired. Please log in again",
    "ADMIN_REQUIRED": "Admin access required",
    "FORBIDDEN": "You don't have permission to do this",

    "VALIDATION_FAILED": "Please check your input and try again",
    "INVALID_INPUT": "Invalid input provided",
    "MISSING_REQUIRED_FIELD": "{{field}} is required",
    "INVALID_FORMAT": "{{field}} has invalid format",
    "VALUE_OUT_OF_RANGE": "{{field}} must be between {{min}} and {{max}}",

    "NOT_FOUND": "The requested resource was not found",
    "CHARACTER_NOT_FOUND": "Character not found",
    "USER_NOT_FOUND": "User not found",
    "CONVERSATION_NOT_FOUND": "Conversation not found",
    "STORY_NOT_FOUND": "Story not found",
    "IMAGE_NOT_FOUND": "Image not found",
    "SUBSCRIPTION_NOT_FOUND": "Subscription not found",

    "ALREADY_EXISTS": "This item already exists",
    "DUPLICATE_ENTRY": "A duplicate entry was found",

    "RATE_LIMIT_EXCEEDED": "Too many requests. Please wait a moment and try again",
    "QUOTA_EXCEEDED": "You've reached your limit",
    "CREDITS_INSUFFICIENT": "Not enough credits. Please purchase more to continue",

    "EXTERNAL_SERVICE_ERROR": "An external service is temporarily unavailable",
    "STRIPE_ERROR": "Payment could not be processed. Please try again",
    "PAYPAL_ERROR": "PayPal payment failed. Please try again",
    "AI_SERVICE_ERROR": "AI service is temporarily unavailable. Please try again later",
    "R2_STORAGE_ERROR": "File storage error. Please try again",

    "INTERNAL_ERROR": "Something went wrong. Please try again later",
    "DATABASE_ERROR": "A database error occurred",
    "CONFIGURATION_ERROR": "Configuration error",

    "OPERATION_NOT_ALLOWED": "This operation is not allowed",
    "INVALID_STATE": "Cannot perform this action in the current state",
    "FEATURE_DISABLED": "This feature is currently disabled"
  }
}
```

**File**: `frontend/public/locales/pt-BR/api.json`

```json
{
  "errors": {
    "AUTH_REQUIRED": "Faça login para continuar",
    "AUTH_INVALID": "Credenciais de login inválidas",
    "AUTH_EXPIRED": "Sua sessão expirou. Faça login novamente",
    "ADMIN_REQUIRED": "Acesso de administrador necessário",
    "FORBIDDEN": "Você não tem permissão para fazer isso",

    "VALIDATION_FAILED": "Verifique suas informações e tente novamente",
    "INVALID_INPUT": "Entrada inválida",
    "MISSING_REQUIRED_FIELD": "{{field}} é obrigatório",
    "INVALID_FORMAT": "{{field}} tem formato inválido",
    "VALUE_OUT_OF_RANGE": "{{field}} deve estar entre {{min}} e {{max}}",

    "NOT_FOUND": "O recurso solicitado não foi encontrado",
    "CHARACTER_NOT_FOUND": "Personagem não encontrado",
    "USER_NOT_FOUND": "Usuário não encontrado",
    "CONVERSATION_NOT_FOUND": "Conversa não encontrada",
    "STORY_NOT_FOUND": "História não encontrada",
    "IMAGE_NOT_FOUND": "Imagem não encontrada",
    "SUBSCRIPTION_NOT_FOUND": "Assinatura não encontrada",

    "ALREADY_EXISTS": "Este item já existe",
    "DUPLICATE_ENTRY": "Entrada duplicada encontrada",

    "RATE_LIMIT_EXCEEDED": "Muitas requisições. Aguarde um momento e tente novamente",
    "QUOTA_EXCEEDED": "Você atingiu seu limite",
    "CREDITS_INSUFFICIENT": "Créditos insuficientes. Adquira mais para continuar",

    "EXTERNAL_SERVICE_ERROR": "Um serviço externo está temporariamente indisponível",
    "STRIPE_ERROR": "O pagamento não pôde ser processado. Tente novamente",
    "PAYPAL_ERROR": "Pagamento PayPal falhou. Tente novamente",
    "AI_SERVICE_ERROR": "Serviço de IA temporariamente indisponível. Tente mais tarde",
    "R2_STORAGE_ERROR": "Erro no armazenamento de arquivos. Tente novamente",

    "INTERNAL_ERROR": "Algo deu errado. Tente novamente mais tarde",
    "DATABASE_ERROR": "Ocorreu um erro no banco de dados",
    "CONFIGURATION_ERROR": "Erro de configuração",

    "OPERATION_NOT_ALLOWED": "Esta operação não é permitida",
    "INVALID_STATE": "Não é possível realizar esta ação no estado atual",
    "FEATURE_DISABLED": "Este recurso está desativado no momento"
  }
}
```

#### 3. Update API Client Interceptor

**File**: `frontend/src/services/api.ts` (update existing)

```typescript
import { extractErrorMessage, isApiError } from '../utils/apiErrorHandler';

// Add response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log error for debugging
    if (error.response?.data && isApiError(error.response.data)) {
      console.error('[API Error]', error.response.data.error);
    }

    return Promise.reject(error);
  }
);
```

#### 4. Update Components to Use New Error Handler

**Example**: Update toast notifications

```typescript
// Before
addToast(error.response?.data?.error || 'An error occurred', 'error');

// After
import { extractErrorMessage } from '../utils/apiErrorHandler';
addToast(extractErrorMessage(error), 'error');
```

---

## Files to Update

### Backend - Route Files (~90 occurrences)

| File | Error Count | Priority |
|------|-------------|----------|
| `routes/v1/image-generation.ts` | 41 | High |
| `routes/v1/system-config.ts` | 16 | Medium |
| `routes/v1/character-population.ts` | 13 | Medium |
| `routes/v1/style-themes.ts` | 7 | Medium |
| `routes/v1/storage.ts` | 5 | Medium |
| `routes/v1/characters.ts` | ~10 | High |
| `routes/v1/users.ts` | ~5 | Medium |
| `routes/v1/conversations.ts` | ~5 | Medium |
| `routes/v1/subscriptions.ts` | ~5 | Medium |
| `routes/v1/credits.ts` | ~5 | Medium |
| `routes/v1/story.ts` | ~5 | Medium |
| `routes/webhooks/stripe.ts` | 3 | Low |
| `routes/webhooks/paypal.ts` | 1 | Low |
| `routes/oauth.ts` | 3 | Low |
| Other routes | ~10 | Low |

### Backend - New Files

| File | Description |
|------|-------------|
| `utils/apiErrors.ts` | Error codes, messages, helpers |
| `types/api.ts` | TypeScript types for API responses |

### Frontend - New Files

| File | Description |
|------|-------------|
| `utils/apiErrorHandler.ts` | Error extraction and translation |
| `public/locales/en/api.json` | English error translations |
| `public/locales/pt-BR/api.json` | Portuguese error translations |

### Frontend - Files to Update

| File | Changes |
|------|---------|
| `services/api.ts` | Add error interceptor |
| Components using `addToast` with errors | Use `extractErrorMessage()` |
| Form components with error handling | Use new error format |

---

## Testing Requirements

### Unit Tests

- [ ] `createApiError()` returns correct format
- [ ] `sendError()` sends correct status and body
- [ ] `isApiError()` correctly identifies API errors
- [ ] `getErrorMessage()` returns translated or fallback message
- [ ] `extractErrorMessage()` handles all error formats

### Integration Tests

- [ ] API endpoints return new error format
- [ ] Frontend correctly displays translated errors
- [ ] Fallback to English works when translation missing

### Manual Tests

- [ ] Test each error type in browser console
- [ ] Verify Portuguese translations display correctly
- [ ] Verify English fallback works

---

## Success Criteria

### Core Functionality

- [ ] All API errors use standardized format
- [ ] Error codes documented and typed
- [ ] Frontend translates errors using codes
- [ ] Fallback to English message works

### Quality

- [ ] Zero hardcoded error strings in route files
- [ ] All error codes have translations (en, pt-BR)
- [ ] TypeScript types exported and used
- [ ] No breaking changes to existing frontend

### Metrics

| Metric | Target |
|--------|--------|
| Error responses standardized | 100% |
| Error codes with translations | 100% |
| Breaking changes | 0 |

---

## Implementation Phases

### Phase 1: Backend Foundation (2 hours)
1. Create `utils/apiErrors.ts` with codes and helpers
2. Create TypeScript types
3. Add unit tests

### Phase 2: Backend Migration - High Priority Routes (3 hours)
1. Update `image-generation.ts` (41 errors)
2. Update `characters.ts` (~10 errors)
3. Test affected endpoints

### Phase 3: Backend Migration - Medium Priority Routes (3 hours)
1. Update `system-config.ts` (16 errors)
2. Update `character-population.ts` (13 errors)
3. Update remaining v1 routes
4. Test affected endpoints

### Phase 4: Backend Migration - Low Priority Routes (1 hour)
1. Update webhooks
2. Update oauth
3. Update admin routes
4. Final backend testing

### Phase 5: Frontend Foundation (2 hours)
1. Create `utils/apiErrorHandler.ts`
2. Create translation files (en, pt-BR)
3. Update API interceptor
4. Add unit tests

### Phase 6: Frontend Integration (2 hours)
1. Update components using error toasts
2. Update form error displays
3. Test all error scenarios

### Phase 7: Documentation & Cleanup (1 hour)
1. Update API documentation
2. Add error code reference
3. Final testing
4. Create PR

---

## Risks & Mitigations

### Risk 1: Breaking Changes
**Impact**: High
**Description**: Frontend expecting old error format
**Mitigation**:
- Backend changes are additive (new format includes message)
- Frontend `extractErrorMessage()` handles both formats
- Gradual rollout per route file

### Risk 2: Missing Translations
**Impact**: Low
**Description**: Some error codes might not have translations
**Mitigation**:
- Always include English fallback message
- `getErrorMessage()` returns message if translation missing

### Risk 3: Large Scope
**Impact**: Medium
**Description**: ~90 files to update
**Mitigation**:
- Prioritize by usage frequency
- Phase implementation
- Automated find/replace for common patterns

---

## Dependencies

### Internal
- Existing i18n infrastructure
- Toast notification system
- API client configuration

### External
- i18next (already installed)

---

## Notes

- This approach is used by Stripe, Google Cloud, and Shopify APIs
- Error codes should be stable - don't rename once released
- Consider adding error code to logging for debugging
- Future: Generate API error documentation from constants

---

## References

- GitHub Issue: #129
- Stripe API Error Handling: https://stripe.com/docs/error-handling
- Industry best practices for API error responses

---

**End of FEATURE-020 Specification**
