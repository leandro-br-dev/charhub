# LLM API Documentation

Sistema de gerenciamento de LLMs com suporte a **Google Gemini**, **OpenAI** e **XAI Grok**.

## 🔑 Configuração de API Keys

Adicione as chaves de API no arquivo `.env`:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
GROK_API_KEY=your_grok_api_key_here
```

### Onde obter as chaves:

- **Google Gemini**: https://ai.google.dev/
- **OpenAI**: https://platform.openai.com/api-keys
- **XAI Grok**: https://console.x.ai/

### ⚠️ Formato das chaves:

- **Gemini**: Começa com `AIza...`
- **OpenAI**: Começa com `sk-proj-...` ou `sk-...`
- **Grok**: Começa com `xai-...` (⚠️ Não confundir com chaves Anthropic que começam com `sk-ant-`)

## 📋 Endpoints Disponíveis

### 1. Listar todos os modelos
```http
GET /api/v1/llm/models
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "gemini": {
      "name": "Google Gemini",
      "models": { ... }
    },
    "openai": {
      "name": "OpenAI",
      "models": { ... }
    },
    "grok": {
      "name": "XAI Grok",
      "models": { ... }
    }
  }
}
```

### 2. Listar modelos de um provedor específico
```http
GET /api/v1/llm/models/:provider
```

**Exemplo:**
```bash
curl http://localhost/api/v1/llm/models/gemini
```

### 3. Gerar resposta com LLM
```http
POST /api/v1/llm/chat
Content-Type: application/json
```

**Body:**
```json
{
  "provider": "gemini",
  "model": "gemini-2.5-flash",
  "systemPrompt": "You are a helpful assistant.",
  "userPrompt": "What is the capital of France?",
  "temperature": 0.7,
  "maxTokens": 1000
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "provider": "gemini",
    "model": "gemini-2.5-flash",
    "content": "The capital of France is Paris.",
    "usage": {
      "promptTokens": 15,
      "completionTokens": 8,
      "totalTokens": 23
    }
  }
}
```

## 🚀 Exemplos de Teste

### Teste com Google Gemini (Rápido)
```bash
curl -X POST http://localhost/api/v1/llm/chat \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "gemini",
    "model": "gemini-2.5-flash-lite",
    "userPrompt": "Explique o que é Docker em uma frase"
  }'
```

### Teste com OpenAI GPT-5 (Alto Desempenho)
```bash
# GPT-5 não aceita parâmetros temperature ou maxTokens - use apenas defaults
curl -X POST http://localhost/api/v1/llm/chat \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "openai",
    "model": "gpt-5",
    "systemPrompt": "Você é um expert em programação.",
    "userPrompt": "Como implementar autenticação JWT em Node.js?"
  }'
```

### Teste com OpenAI GPT-4.1 Nano (Rápido - com temperature customizada)
```bash
curl -X POST http://localhost/api/v1/llm/chat \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "openai",
    "model": "gpt-4.1-nano",
    "systemPrompt": "Você é um expert em programação.",
    "userPrompt": "Explique o que é REST API em uma frase",
    "temperature": 0.5
  }'
```

### Teste com XAI Grok 4 (Alto Desempenho)
```bash
curl -X POST http://localhost/api/v1/llm/chat \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "grok",
    "model": "grok-4",
    "systemPrompt": "You are a technical advisor with deep knowledge of AI systems.",
    "userPrompt": "Explain the difference between transformer and RNN architectures",
    "temperature": 0.8,
    "maxTokens": 2000
  }'
```

## 📊 Classificação de Modelos (Outubro 2025)

### ⚡ **Rápidos** (Fast)
Otimizados para velocidade e menor custo:
- `gemini-2.5-flash-lite` - Modelo flash mais rápido do Gemini
- `gpt-5-nano` - Variante mais eficiente do GPT-5
- `gpt-4.1-nano` - Mais rápido e barato (80.1% MMLU)
- `grok-4-fast-non-reasoning` - Grok 4 sem modo raciocínio (2M context)

### 📈 **Médio Desempenho** (Medium)
Balanço entre qualidade e velocidade:
- `gemini-2.5-flash` - Melhor custo-benefício do Gemini
- `gemini-2.0-flash` - Features de nova geração
- `gpt-5-mini` - GPT-5 balanceado
- `grok-code-fast-1` - Especializado em código

### 🧠 **Alto Desempenho** (High)
Máxima qualidade de raciocínio:
- `gemini-2.5-pro` - IA mais inteligente com pensamento adaptativo
- `gpt-5` - Melhor para código e tarefas agentic (74.9% SWE-bench)
- `gpt-realtime` - Speech-to-speech avançado
- `grok-4` - Modelo mais inteligente com busca em tempo real
- `grok-4-fast-reasoning` - Performance frontier com eficiência

## 🎯 Parâmetros Disponíveis

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `provider` | string | ✅ | `gemini`, `openai` ou `grok` |
| `model` | string | ✅ | Nome do modelo (veja `/api/v1/llm/models`) |
| `userPrompt` | string | ✅ | Mensagem do usuário |
| `systemPrompt` | string | ❌ | Instruções do sistema |
| `temperature` | number | ❌ | 0.0 a 1.0 (padrão: 0.7) - **Não suportado em modelos GPT-5** |
| `maxTokens` | number | ❌ | Limite de tokens na resposta - **Não suportado em modelos GPT-5** |

### ⚠️ Limitações por Modelo

**GPT-5 e GPT-Realtime:**
- Não aceitam parâmetros `temperature`, `top_p` ou `maxTokens`
- Utilizam apenas valores padrão (temperature=1)
- Parâmetros customizados foram removidos por serem modelos de raciocínio

**Outros modelos (Gemini, Grok, GPT-4.1):**
- Suportam todos os parâmetros normalmente

## ⚠️ Tratamento de Erros

### API Key não configurada
```json
{
  "success": false,
  "error": "GEMINI_API_KEY not configured"
}
```

### Modelo inválido
```json
{
  "success": false,
  "error": "Invalid model gpt-5 for provider openai"
}
```

### Campos obrigatórios ausentes
```json
{
  "success": false,
  "error": "Missing required fields: provider, model, userPrompt"
}
```

## 🔍 Teste Rápido no Terminal

```bash
# 1. Listar modelos disponíveis
curl http://localhost/api/v1/llm/models

# 2. Testar resposta simples com o modelo mais rápido
curl -X POST http://localhost/api/v1/llm/chat \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "gemini",
    "model": "gemini-2.5-flash-lite",
    "userPrompt": "Diga olá em 5 idiomas"
  }'
```

## 📝 Próximos Passos

Para usar a API, você precisa:

1. **Obter API Keys** dos provedores que deseja usar
2. **Adicionar no .env** do backend
3. **Rebuild do backend**: `docker-compose build backend`
4. **Testar os endpoints** conforme exemplos acima

## 🛠️ Estrutura de Arquivos

```
backend/
├── src/
│   ├── data/
│   │   └── llm-models.json        # Configuração dos modelos
│   ├── services/
│   │   └── llm/
│   │       ├── index.ts           # Gerenciador principal
│   │       ├── gemini.ts          # Serviço Google Gemini
│   │       ├── openai.ts          # Serviço OpenAI
│   │       └── grok.ts            # Serviço XAI Grok
│   └── routes/
│       └── v1/
│           └── llm.ts             # Rotas da API
```
