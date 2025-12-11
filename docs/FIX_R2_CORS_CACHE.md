# Correção do Cache CORS do R2

## Problema

As configurações CORS foram atualizadas no R2, mas o domínio personalizado `media.charhub.app` está servindo headers antigos em cache.

## Sintomas

- CORS configurado corretamente no bucket R2
- Erro no console: `No 'Access-Control-Allow-Origin' header is present`
- Request retorna 200 OK mas é bloqueado pelo navegador

## Causa

O Cloudflare faz cache dos headers de resposta do R2, incluindo headers CORS. Quando você atualiza o CORS no bucket, o cache precisa ser purgado.

## Solução em 3 Passos

### 1. Purgar Cache do Cloudflare

Acesse o Cloudflare Dashboard:

1. Vá para **Caching** → **Configuration**
2. Clique em **Purge Cache** → **Custom Purge**
3. Em "Purge by Host", adicione: `media.charhub.app`
4. Clique em **Purge**

OU purge tudo:

1. **Purge Everything** (mais fácil, mas afeta todo o domínio)

### 2. Verificar CORS no R2

Certifique-se de que o CORS está correto no bucket R2:

```json
[
  {
    "AllowedOrigins": [
      "https://charhub.app",
      "https://dev.charhub.app",
      "https://www.charhub.app",
      "http://localhost",
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
      "http://localhost:5175",
      "http://localhost:8082"
    ],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag", "Content-Length", "Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```

### 3. Verificar Custom Domain

No Cloudflare Dashboard, vá para **R2** → **Seu Bucket** → **Settings**:

1. Verifique se o Custom Domain está configurado como `media.charhub.app`
2. Certifique-se de que não há Page Rules ou Workers bloqueando os headers CORS

### 4. Teste Direto

Para verificar se o problema é cache, teste com a URL direta do R2 (sem custom domain):

```
https://bbfdfcb2cc085e47e191e51ad65b275c.r2.cloudflarestorage.com/charhub-media/[path-da-imagem]
```

Se funcionar com a URL direta mas não com `media.charhub.app`, confirma que é problema de cache.

## Verificação Final

Após purgar o cache:

1. **Limpe o cache do navegador** (Ctrl+Shift+Delete)
2. **Feche e abra o navegador** (hard reload: Ctrl+Shift+R)
3. Acesse a aplicação em `http://localhost:8082`
4. Abra o console (F12) e verifique que não há erros CORS
5. As imagens devem carregar normalmente

## Alternativa: Bypass Temporário de Cache

Se o purge não funcionar imediatamente, você pode adicionar query string às URLs para bypass:

```typescript
// Temporário - apenas para teste
const imageUrl = `https://media.charhub.app/path/image.webp?t=${Date.now()}`;
```

**NÃO USE EM PRODUÇÃO** - isso desabilita completamente o cache.

## Configuração Ideal de Cache (Opcional)

Para evitar esse problema no futuro, você pode criar uma Page Rule no Cloudflare:

**URL Pattern**: `media.charhub.app/*`

**Settings**:
- Cache Level: Standard
- Browser Cache TTL: Respect Existing Headers
- Edge Cache TTL: Respect Existing Headers

Isso faz o Cloudflare respeitar os headers do R2, incluindo CORS.

## Status Atual

- ✅ CORS configurado no R2
- ✅ Código frontend corrigido
- ✅ Formulário de criação manual corrigido
- ⏳ **Aguardando**: Você purgar cache do Cloudflare
