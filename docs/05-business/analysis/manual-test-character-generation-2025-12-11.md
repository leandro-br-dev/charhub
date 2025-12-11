# Guia de Teste - Sistema de Progresso em Tempo Real

## Status da Implementação ✅

### Backend
- ✅ WebSocket configurado (`/backend/src/websocket/characterGenerationHandler.ts`)
- ✅ Eventos de progresso implementados
- ✅ Controller modificado para emitir eventos em tempo real
- ✅ Tipos TypeScript criados
- ✅ Backend compilando sem erros
- ✅ Servidor rodando na porta 3002

### Frontend
- ✅ Hook `useCharacterGenerationSocket` criado
- ✅ Componente `GenerationWizard` implementado
- ✅ Componentes auxiliares criados:
  - `ProgressBar` - Barra de progresso animada
  - `StepDisplay` - Exibição de cada etapa com dados
  - `ActionButtons` - Botões de ação ao finalizar
- ✅ Página `/characters/create-ai` integrada com wizard
- ✅ Frontend compilando sem erros
- ✅ Vite rodando na porta 5175

## Como Testar

### 1. Acessar a Interface

Abra seu navegador em:
```
http://localhost:5175/characters/create-ai
```

### 2. Fazer Login

Se não estiver logado, faça login primeiro em:
```
http://localhost:5175/login
```

### 3. Testar Geração Automática

#### Opção A: Com Imagem + Descrição (Recomendado)

1. Adicione uma descrição:
   ```
   Uma guerreira élfica de cabelos prateados, olhos azuis brilhantes,
   vestindo armadura leve de couro negro. Ela tem cicatrizes de batalha
   e carrega um arco mágico feito de madeira lunar.
   ```

2. Faça upload de uma imagem de personagem (anime, realistic, etc.)

3. Clique em "Generate Character"

4. **Observe o progresso em tempo real:**
   - 📤 Uploading Image (5%)
   - 🔍 Analyzing Image (15%)
   - 📝 Extracting Description (30%) → Mostra descrição física extraída
   - ✨ Generating Details (40-55%) → Mostra nome, idade, gênero, etc.
   - 📖 Generating History (70%) → Mostra história do personagem
   - 🎭 Creating Character (80%)
   - 🖼️ Queuing Avatar (90%)
   - ✅ Completed (100%)

#### Opção B: Apenas Imagem

1. Faça upload de uma imagem
2. Deixe descrição em branco
3. Clique em "Generate Character"
4. AI irá extrair tudo da imagem

#### Opção C: Apenas Descrição

1. Adicione uma descrição detalhada
2. Não faça upload de imagem
3. Clique em "Generate Character"
4. AI irá criar tudo baseado no texto

### 4. Durante a Geração

**O que você verá:**

1. **Barra de Progresso Animada**
   - Gradiente azul → roxo
   - Atualiza em tempo real (0% → 100%)
   - Animação suave

2. **Etapa Atual Destacada**
   - Card com borda azul
   - Emoji indicativo
   - Mensagem descritiva

3. **Dados Sendo Gerados**
   - Descrição física (quando imagem é analisada)
   - Nome do personagem
   - Idade, gênero, espécie
   - Personalidade
   - História completa

4. **Histórico de Etapas Anteriores**
   - Clique em "View Previous Steps" para expandir
   - Todas as etapas anteriores ficam opacas

### 5. Quando Completo

**Você verá:**

1. **Card de Sucesso Verde** com emoji 🎉

2. **4 Botões de Ação:**
   - ✏️ **Edit Character** - Ir para página de edição
   - 👁️ **View Character** - Ver perfil do personagem
   - 🔄 **Regenerate Avatar** - Gerar novo avatar
   - 🗑️ **Discard** - Descartar personagem

3. **ID do Personagem** exibido

### 6. Casos de Erro

**Se algo der errado:**

- Card vermelho com mensagem de erro
- Stack trace em modo development
- Botão "Try Again" para recomeçar

## Verificação do WebSocket

### Abrir Console do Navegador (F12)

Você verá logs como:

```javascript
[useCharacterGenerationSocket] Creating socket instance with token
[useCharacterGenerationSocket] ✅ Connected to WebSocket
[useCharacterGenerationSocket] Joining character generation room
[useCharacterGenerationSocket] Successfully joined room
[useCharacterGenerationSocket] character_generation_progress event received
  step: "uploading_image"
  progress: 5
  message: "Converting and uploading image..."
```

### Verificar Network Tab

1. Abra DevTools → Network
2. Filtre por "WS" (WebSocket)
3. Você verá:
   - Connection estabelecida em `/api/v1/ws`
   - Mensagens enviadas: `join_character_generation`
   - Mensagens recebidas: `character_generation_progress`

## Testes Específicos

### Teste 1: Geração Completa com Imagem

**Input:**
- Imagem: Foto de personagem anime
- Descrição: "Uma maga poderosa"

**Resultado Esperado:**
- Todos os passos executados (1-8)
- Descrição física extraída da imagem
- Nome criativo gerado
- Personalidade condizente
- História épica gerada
- Personagem criado no banco
- Avatar em fila de geração

### Teste 2: Reconexão WebSocket

**Passos:**
1. Inicie uma geração
2. Durante a geração, desconecte WiFi/Rede
3. Reconecte em 5 segundos
4. Verifique se eventos continuam sendo recebidos

**Resultado Esperado:**
- Socket.io reconecta automaticamente
- Eventos podem ser perdidos durante desconexão
- Mas processo continua no backend

### Teste 3: Múltiplas Gerações Simultâneas

**Passos:**
1. Abra 2 abas do navegador
2. Inicie geração em ambas
3. Cada uma terá sessionId diferente

**Resultado Esperado:**
- Cada aba recebe apenas seus próprios eventos
- Não há vazamento entre sessões

### Teste 4: Cancelamento Implícito

**Passos:**
1. Inicie uma geração
2. Feche a aba antes de terminar

**Resultado Esperado:**
- WebSocket desconecta
- Backend continua processamento
- Personagem é criado mesmo sem ninguém assistindo

### Teste 5: Ações Pós-Geração

**Após geração completa, teste:**

1. **Edit Character** → Abre `/characters/{id}/edit`
2. **View Character** → Abre `/characters/{id}`
3. **Discard** →
   - Mostra confirmação
   - Deleta personagem
   - Volta para formulário

## Troubleshooting

### Problema: WebSocket não conecta

**Sintomas:**
- Card amarelo "Connecting to server..."
- Não sai desse estado

**Soluções:**
1. Verificar token JWT no localStorage
2. Verificar console para erros de autenticação
3. Verificar se backend está rodando:
   ```bash
   curl http://localhost:3002/api/v1/health
   ```

### Problema: Eventos não aparecem

**Sintomas:**
- WebSocket conecta
- Mas não recebe eventos `character_generation_progress`

**Soluções:**
1. Verificar logs do backend:
   ```bash
   docker compose logs backend -f | grep "character_generation"
   ```
2. Verificar se sessionId foi recebido
3. Verificar se `join_character_generation` foi emitido

### Problema: Backend retorna erro 401

**Sintomas:**
- POST `/characters/generate-automated` retorna 401

**Soluções:**
1. Fazer logout e login novamente
2. Verificar se token está expirado
3. Verificar se header `Authorization` está sendo enviado

### Problema: Geração trava em alguma etapa

**Sintomas:**
- Progresso para em 30% por exemplo
- Nenhum erro exibido

**Soluções:**
1. Verificar logs do backend para erros silenciosos:
   ```bash
   docker compose logs backend --tail 100
   ```
2. Verificar se LLM API keys estão configuradas:
   - `GEMINI_API_KEY`
   - `GROK_API_KEY`
3. Verificar se R2 está configurado corretamente

## Logs Úteis

### Backend Logs (Todas as etapas)
```bash
docker compose logs backend -f | grep -E "automated_character|character_generation|progress"
```

### Frontend Logs (Console do navegador)
Filtrar por:
- `[useCharacterGenerationSocket]`
- `[GenerationWizard]`

### WebSocket Messages (Network Tab)
1. DevTools → Network → WS
2. Clique na conexão WebSocket
3. Aba "Messages"

## Dados de Teste

### Descrições de Exemplo

**Guerreiro:**
```
Um guerreiro viking de 35 anos, músculos definidos, barba ruiva longa
e tranças no cabelo. Porta um machado de duas lâminas e usa armadura
de couro e ferro. Tem cicatrizes de batalha no rosto e um olhar
determinado. É conhecido por sua coragem e lealdade.
```

**Maga:**
```
Uma maga élfica jovem de aparência delicada mas olhar penetrante.
Cabelos platinados que flutuam sutilmente como se houvesse magia ao redor.
Veste robes azul-escuro bordados com runas douradas. Carrega um cajado
de cristal que brilha com energia arcana. Estudiosa e reservada.
```

**Ladino:**
```
Um halfling ágil e astuto de 28 anos. Baixa estatura mas extremamente
rápido. Veste roupas escuras adequadas para mover-se nas sombras.
Tem dedos habilidosos perfeitos para abrir fechaduras. Carrega várias
adagas escondidas. Brincalhão mas leal aos amigos.
```

### Imagens Recomendadas para Teste

- **Anime Character Art** - Melhor para detecção de estilo
- **Fantasy Art** - Bom para descrições detalhadas
- **Portrait Photos** - Testa extração realista
- **Game Characters** - Testa diferentes estilos

## Performance Esperada

### Tempo Médio por Etapa

| Etapa | Tempo Esperado |
|-------|----------------|
| Upload | 1-3 segundos |
| Análise de Imagem | 5-10 segundos |
| Geração de Nome | 2-4 segundos |
| Geração de Personalidade | 3-5 segundos |
| Geração de História | 5-8 segundos |
| Criação no DB | 1-2 segundos |
| Queue Avatar | 1 segundo |
| **TOTAL** | **~30-45 segundos** |

### Avatar Generation (Assíncrono)

- Avatar é gerado em background via BullMQ
- Pode levar 1-3 minutos dependendo do ComfyUI
- Personagem é criado mesmo antes do avatar ficar pronto

## Próximos Passos (Futuras Melhorias)

1. **Polling de Avatar**
   - Adicionar polling para verificar quando avatar está pronto
   - Atualizar wizard quando avatar for gerado

2. **Persistência de Sessão**
   - Salvar sessionId no localStorage
   - Permitir reconexão após refresh da página

3. **Cancelamento Manual**
   - Botão "Cancel" durante geração
   - Endpoint para cancelar geração

4. **Estimativa de Tempo**
   - Mostrar tempo estimado restante
   - Baseado em médias históricas

5. **Retry Granular**
   - Permitir retry de etapas específicas que falharam
   - Sem precisar recomeçar tudo

## Sucesso!

Se você conseguir:
1. ✅ Iniciar uma geração
2. ✅ Ver progresso em tempo real
3. ✅ Receber todos os eventos via WebSocket
4. ✅ Ver personagem completo ao final
5. ✅ Usar os botões de ação

**Parabéns! O sistema está funcionando perfeitamente! 🎉**

---

**Última atualização:** 2025-12-06
**Versão:** 1.0.0
