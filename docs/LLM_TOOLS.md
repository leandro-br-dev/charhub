# LLM Tool-Calling System

## Visão Geral

O CharHub implementa um sistema completo de **tool-calling** (chamada de ferramentas) para LLMs, permitindo que os modelos de IA acessem informações em tempo real e executem ações específicas além de seu conhecimento pré-treinado.

### Capacidades Atuais

- ✅ **Web Search**: Busca web em tempo real via DuckDuckGo API
- ✅ **Multi-Provider**: Suporte para OpenAI e Gemini (Grok sem suporte ainda)
- ✅ **Auto-Execution**: Execução automática de ferramentas com resultados agregados
- ✅ **Rate Limiting**: Proteção contra abuso com token bucket algorithm
- ✅ **Caching**: Cache in-memory para reduzir custos e latência

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    LLM Service (index.ts)                    │
│  - Roteamento de providers                                   │
│  - Preparação de tools                                       │
│  - Auto-execução opcional                                    │
└───────────────┬─────────────────────────────────────────────┘
                │
                ├─────────────────┬─────────────────┬──────────
                ▼                 ▼                 ▼
        ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
        │ OpenAI Adapter│ │ Gemini Adapter│ │  Grok Adapter │
        │ (function     │ │ (function     │ │ (sem suporte) │
        │  calling)     │ │  declarations)│ │               │
        └───────────────┘ └───────────────┘ └───────────────┘
                │                 │
                └────────┬────────┘
                         ▼
                ┌─────────────────┐
                │  Tool Registry  │
                │  (tools/index)  │
                └────────┬────────┘
                         │
                ┌────────┴────────┐
                ▼                 ▼
        ┌──────────────┐  ┌──────────────┐
        │  Web Search  │  │ Future Tools │
        │   Tool       │  │  (planned)   │
        └──────────────┘  └──────────────┘
```

---

## Como Funciona

### 1. Definição de Ferramentas

Cada ferramenta implementa a interface `ToolDefinition`:

```typescript
export interface ToolDefinition {
  name: string;                  // Nome único da ferramenta
  description: string;           // Descrição do que a ferramenta faz
  parameters: {                  // JSON Schema dos parâmetros
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
  execute: (args: any) => Promise<string>; // Função de execução
}
```

**Exemplo - Web Search Tool**:

```typescript
export const webSearchTool: ToolDefinition = {
  name: 'web_search',
  description: 'Searches the web for current information about a query. Use this when you need up-to-date facts, news, or information not in your training data.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query to look up',
      },
    },
    required: ['query'],
  },
  execute: webSearch,
};
```

### 2. Registro de Ferramentas

Ferramentas são registradas no `availableTools`:

```typescript
// backend/src/services/llm/tools/index.ts
export const availableTools: Record<string, ToolDefinition> = {
  web_search: webSearchTool,
  // Adicionar novas ferramentas aqui
};
```

### 3. Chamada de LLM com Tools

```typescript
import { callLLM } from '../services/llm';

const response = await callLLM({
  provider: 'gemini',
  model: 'gemini-2.0-flash-exp',
  systemPrompt: 'You are a helpful assistant.',
  userPrompt: 'What is the current weather in Tokyo?',

  // Opção 1: Especificar ferramentas manualmente
  tools: ['web_search'],
  toolChoice: 'auto', // 'auto' | 'none' | 'required'

  // Opção 2: Atalho para web search
  allowBrowsing: true,

  // Auto-executar ferramentas
  autoExecuteTools: true,
});

// Resposta contém:
// - response.content: Texto gerado
// - response.toolCalls: Ferramentas chamadas pelo LLM
// - response.toolResults: Resultados da execução (se autoExecuteTools=true)
```

### 4. Fluxo de Execução

```
1. Usuário faz chamada callLLM() com tools habilitadas
   ↓
2. LLM Service prepara tool definitions
   ↓
3. Provider adapter envia para API do LLM
   ↓
4. LLM decide se precisa usar ferramentas
   ↓
5. Se SIM: Retorna tool calls (nome + argumentos)
   ↓
6. Se autoExecuteTools=true:
   - Tool Registry executa cada ferramenta
   - Resultados agregados e retornados
   ↓
7. Response final com content + toolCalls + toolResults
```

---

## Web Search Tool

### Características

- **API**: DuckDuckGo Instant Answer API (gratuita, sem API key)
- **Cache**: In-memory com TTL de 1 hora
- **Rate Limiting**: Token bucket (10 tokens, 1 token/segundo)
- **Resultados**: Até 5 resultados com título, URL e snippet

### Implementação

```typescript
// backend/src/services/llm/tools/webSearch.ts

export async function webSearch(query: string): Promise<WebSearchResponse> {
  // 1. Check cache
  const cached = searchCache.get(query.toLowerCase().trim());
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  // 2. Rate limiting
  if (!consumeToken()) {
    throw new Error('Rate limit exceeded');
  }

  // 3. Fetch from DuckDuckGo API
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`;
  const response = await fetch(url);
  const data = await response.json();

  // 4. Parse results
  const results = parseResults(data);

  // 5. Cache and return
  cacheResult(query, results);
  return results;
}
```

### Uso em Agents

```typescript
// backend/src/agents/characterAutocompleteAgent.ts

const llmResponse = await callLLM({
  provider: 'gemini',
  model: 'gemini-2.5-flash-lite',
  systemPrompt: buildSystemPrompt(mode), // Inclui instruções para web search
  userPrompt: buildUserPrompt(input),
  allowBrowsing: mode === 'web',       // Habilita web search em modo 'web'
  autoExecuteTools: mode === 'web',    // Auto-executa buscas
});
```

---

## Provider Adapters

### OpenAI (Function Calling)

```typescript
// backend/src/services/llm/openai.ts

// Converter tools para formato OpenAI
if (request.tools && request.tools.length > 0) {
  completionParams.tools = request.tools.map(tool => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));

  // Tool choice modes
  if (request.toolChoice === 'auto' || 'none' || 'required') {
    completionParams.tool_choice = request.toolChoice;
  }
}

// Extrair tool calls da resposta
const toolCalls = choice.message.tool_calls?.map(tc => {
  if (tc.type === 'function') {
    return {
      id: tc.id,
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments),
    };
  }
});
```

### Gemini (Function Declarations)

```typescript
// backend/src/services/llm/gemini.ts

// Converter tools para formato Gemini
if (request.tools && request.tools.length > 0) {
  modelConfig.tools = [{
    functionDeclarations: request.tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'OBJECT',
        properties: tool.parameters.properties,
        required: tool.parameters.required,
      },
    })),
  }];

  // Tool config modes
  if (request.toolChoice === 'required') {
    modelConfig.toolConfig = { functionCallingConfig: { mode: 'ANY' } };
  } else if (request.toolChoice === 'none') {
    modelConfig.toolConfig = { functionCallingConfig: { mode: 'NONE' } };
  }
}

// Extrair function calls da resposta
for (const part of candidate.content.parts) {
  if ('functionCall' in part && part.functionCall) {
    toolCalls.push({
      name: part.functionCall.name,
      arguments: part.functionCall.args,
    });
  }
}
```

### Grok (Sem Suporte)

```typescript
// backend/src/services/llm/grok.ts

export interface GrokResponse {
  content: string;
  model: string;
  toolCalls?: undefined; // Grok não suporta tool calling
  usage?: { /* ... */ };
}
```

---

## Endpoints de Teste

### 1. Test Tool Calling Geral

```http
POST /api/v1/llm-test/tool-calling
Authorization: Bearer {token}
Content-Type: application/json

{
  "query": "What is the current weather in Tokyo?",
  "provider": "gemini",      // 'gemini' | 'openai'
  "autoExecute": true
}
```

**Resposta**:

```json
{
  "success": true,
  "data": {
    "provider": "gemini",
    "model": "gemini-2.0-flash-exp",
    "content": "Based on current web search results, Tokyo is experiencing...",
    "toolCalls": [
      {
        "id": "call_abc123",
        "name": "web_search",
        "arguments": { "query": "current weather Tokyo" }
      }
    ],
    "toolResults": [
      {
        "toolCallId": "call_abc123",
        "toolName": "web_search",
        "result": "{\"results\": [{\"title\": \"...\", \"url\": \"...\"}]}"
      }
    ],
    "usage": {
      "promptTokens": 150,
      "completionTokens": 80,
      "totalTokens": 230
    }
  }
}
```

### 2. Test Character Autocomplete com Web Search

```http
POST /api/v1/llm-test/character-autocomplete
Authorization: Bearer {token}
Content-Type: application/json

{
  "firstName": "Sherlock",
  "mode": "web"  // 'web' | 'ai'
}
```

**Resposta**:

```json
{
  "success": true,
  "mode": "web",
  "data": {
    "lastName": "Holmes",
    "age": 34,
    "gender": "Male",
    "species": "Human",
    "personality": "Highly intelligent detective with exceptional observational and deductive skills. Often appears cold and calculating but has a strong sense of justice.",
    "history": "Consulting detective based in London. Known for solving complex cases that baffle Scotland Yard. Lives at 221B Baker Street with Dr. John Watson.",
    "physicalCharacteristics": "Tall and lean build; Sharp facial features; Piercing eyes",
    "contentTags": ["PSYCHOLOGICAL", "CRIME"]
  }
}
```

---

## Adicionando Novas Ferramentas

### Passo 1: Criar o Arquivo da Ferramenta

```typescript
// backend/src/services/llm/tools/myNewTool.ts

export interface MyToolParams {
  param1: string;
  param2?: number;
}

export interface MyToolResponse {
  result: string;
  metadata?: Record<string, any>;
}

export async function executeMyTool(params: MyToolParams): Promise<string> {
  // Implementar lógica da ferramenta
  const result = await doSomething(params.param1);

  return JSON.stringify({
    result,
    metadata: { /* ... */ }
  });
}

export const myNewToolDefinition: ToolDefinition = {
  name: 'my_new_tool',
  description: 'Description of what this tool does',
  parameters: {
    type: 'object',
    properties: {
      param1: {
        type: 'string',
        description: 'Description of param1',
      },
      param2: {
        type: 'number',
        description: 'Optional param2',
      },
    },
    required: ['param1'],
  },
  execute: async (args: any) => {
    return executeMyTool(args as MyToolParams);
  },
};
```

### Passo 2: Registrar no Tool Registry

```typescript
// backend/src/services/llm/tools/index.ts

import { myNewToolDefinition } from './myNewTool';

export const availableTools: Record<string, ToolDefinition> = {
  web_search: webSearchTool,
  my_new_tool: myNewToolDefinition, // ← Adicionar aqui
};
```

### Passo 3: Usar em Agents ou Endpoints

```typescript
const response = await callLLM({
  provider: 'gemini',
  model: 'gemini-2.0-flash-exp',
  systemPrompt: 'You can use my_new_tool to do X.',
  userPrompt: 'Please do X',
  tools: ['my_new_tool'],  // ← Especificar ferramenta
  autoExecuteTools: true,
});
```

---

## Boas Práticas

### 1. System Prompts

Sempre instrua o LLM sobre quando e como usar ferramentas:

```typescript
const systemPrompt = [
  'You are a helpful assistant.',
  'You have access to web_search tool.',
  'Use web search when:',
  '- You need current or recent information',
  '- Facts that may have changed since your training',
  '- Real-time data like weather, news, stock prices',
  'Do NOT use web search for:',
  '- General knowledge questions',
  '- Historical facts',
  '- Theoretical concepts',
].join('\n');
```

### 2. Rate Limiting

Implementar rate limiting para todas as ferramentas que fazem chamadas externas:

```typescript
// Token bucket algorithm
let tokens = MAX_TOKENS;
let lastRefill = Date.now();

function consumeToken(): boolean {
  refillTokens();
  if (tokens > 0) {
    tokens--;
    return true;
  }
  return false;
}

function refillTokens() {
  const now = Date.now();
  const elapsed = (now - lastRefill) / 1000;
  const newTokens = Math.floor(elapsed * REFILL_RATE);

  if (newTokens > 0) {
    tokens = Math.min(MAX_TOKENS, tokens + newTokens);
    lastRefill = now;
  }
}
```

### 3. Caching

Implementar cache para reduzir custos e latência:

```typescript
const cache = new Map<string, { data: any; expires: number }>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && entry.expires > Date.now()) {
    return entry.data as T;
  }
  cache.delete(key);
  return null;
}

function setCache<T>(key: string, data: T, ttl: number) {
  cache.set(key, {
    data,
    expires: Date.now() + ttl,
  });

  // Eviction policy
  if (cache.size > MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
}
```

### 4. Error Handling

Ferramentas devem retornar erros de forma segura:

```typescript
export async function executeTool(toolCall: ToolCall): Promise<ToolResult> {
  const tool = getTool(toolCall.name);

  if (!tool) {
    return {
      toolCallId: toolCall.id,
      toolName: toolCall.name,
      result: '',
      error: `Tool "${toolCall.name}" not found`,
    };
  }

  try {
    const result = await tool.execute(toolCall.arguments);
    return {
      toolCallId: toolCall.id,
      toolName: toolCall.name,
      result,
    };
  } catch (error) {
    logger.error({ error, toolName: toolCall.name }, 'Tool execution failed');
    return {
      toolCallId: toolCall.id,
      toolName: toolCall.name,
      result: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

### 5. Logging

Sempre logar execuções de ferramentas para debugging:

```typescript
logger.info(
  { provider: request.provider, toolCalls: response.toolCalls?.length },
  'Auto-executing tool calls'
);

for (const result of toolResults) {
  if (result.error) {
    logger.error(
      { toolName: result.toolName, error: result.error },
      'Tool execution failed'
    );
  } else {
    logger.debug(
      { toolName: result.toolName },
      'Tool executed successfully'
    );
  }
}
```

---

## Performance e Custos

### Web Search Tool

| Métrica | Valor |
|---------|-------|
| **Latência (Cache Hit)** | < 1ms |
| **Latência (Cache Miss)** | 200-500ms |
| **Rate Limit** | 10 req/s |
| **Cache TTL** | 1 hora |
| **Custo API** | $0 (DuckDuckGo é gratuito) |

### LLM Tool Calling Overhead

| Provider | Overhead de Tokens | Latência Extra |
|----------|-------------------|----------------|
| **OpenAI** | ~50-100 tokens (tool schemas) | ~100ms |
| **Gemini** | ~30-80 tokens (function declarations) | ~50ms |
| **Grok** | N/A (sem suporte) | N/A |

### Comparação Auto-Execute vs Manual

**Auto-Execute** (`autoExecuteTools: true`):
- ✅ **Prós**: Uma única chamada, mais simples
- ❌ **Contras**: Sem controle sobre quando executar, pode executar ferramentas desnecessárias

**Manual**:
- ✅ **Prós**: Controle total, pode revisar antes de executar
- ❌ **Contras**: Requer lógica adicional no frontend/backend

---

## Troubleshooting

### Tool Calls Não Estão Sendo Retornados

**Possíveis causas**:
1. Provider não suporta tool calling (ex: Grok)
2. System prompt não instruiu o LLM a usar ferramentas
3. `toolChoice` configurado como `'none'`

**Solução**:
```typescript
// Verificar que o provider suporta
if (provider === 'grok') {
  throw new Error('Grok does not support tool calling');
}

// Adicionar instruções claras no system prompt
systemPrompt: 'You have access to web_search. Use it when needed.',

// Configurar toolChoice corretamente
toolChoice: 'auto', // ou 'required' para forçar uso
```

### Rate Limit Exceeded

**Erro**: `Rate limit exceeded for web search`

**Solução**:
- Aumentar `MAX_TOKENS` em `webSearch.ts`
- Aumentar `REFILL_RATE` para mais tokens/segundo
- Implementar queue system para requisições

```typescript
const MAX_TOKENS = 20;      // Aumentar de 10 para 20
const REFILL_RATE = 2;      // Aumentar de 1 para 2 tokens/s
```

### Cache Miss Excessivo

**Problema**: Muitas chamadas à API mesmo com cache

**Causas**:
- Queries com variações mínimas não fazem hit
- Cache TTL muito curto
- Cache size muito pequeno

**Solução**:
```typescript
// Normalizar queries antes de cachear
function normalizeQuery(query: string): string {
  return query.toLowerCase().trim().replace(/\s+/g, ' ');
}

const cacheKey = normalizeQuery(query);

// Aumentar TTL
const CACHE_TTL = 7200 * 1000; // 2 horas

// Aumentar max cache size
const MAX_CACHE_SIZE = 500;
```

---

## Próximas Melhorias

### Ferramentas Planejadas

- [ ] **Database Query Tool**: Buscar informações no banco de dados
- [ ] **Image Generation Tool**: Gerar imagens com DALL-E ou Stable Diffusion
- [ ] **Code Execution Tool**: Executar código em sandbox
- [ ] **Translation Tool**: Traduzir textos usando serviço de tradução
- [ ] **Calculator Tool**: Cálculos matemáticos complexos

### Melhorias no Sistema

- [ ] **Persistent Cache**: Migrar cache para Redis
- [ ] **Tool Metrics**: Dashboard de uso e performance
- [ ] **Tool Versioning**: Versionamento de ferramentas
- [ ] **Multi-Step Tool Chains**: Encadear múltiplas ferramentas
- [ ] **Tool Permissions**: Sistema de permissões por usuário/role

---

## Referências

- **Código Principal**: `backend/src/services/llm/`
- **Web Search Tool**: `backend/src/services/llm/tools/webSearch.ts`
- **Tool Registry**: `backend/src/services/llm/tools/index.ts`
- **Test Endpoints**: `backend/src/routes/v1/llm-test.ts`
- **Character Autocomplete**: `backend/src/agents/characterAutocompleteAgent.ts`

---

**Última atualização**: 2025-11-07
**Versão**: 1.0.0
