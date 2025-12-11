# Correção do CORS do R2 para Carregamento de Imagens

## Problema

As imagens do R2 não estão sendo carregadas porque o CORS está faltando as origens do ambiente de desenvolvimento.

## Solução

Você precisa atualizar a configuração CORS do bucket R2 no Cloudflare Dashboard.

### Configuração CORS Atualizada

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
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "DELETE",
      "HEAD"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag",
      "Content-Length",
      "Content-Type"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

### Origens Adicionadas

- ✅ `http://localhost:5175` - Frontend direto (Vite dev server)
- ✅ `http://localhost:8082` - **PRINCIPAL** - Nginx (porta de acesso ao app)

### Como Aplicar

1. Acesse o [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Vá para R2 → Seu bucket de imagens
3. Clique em "Settings" → "CORS Policy"
4. Substitua a configuração existente pela configuração acima
5. Salve as alterações

### Verificação

Após aplicar o CORS:
1. Limpe o cache do navegador (Ctrl+Shift+Delete)
2. Recarregue a página (F5)
3. As imagens devem carregar normalmente sem erros CORS

## Mudanças no Código

O código já foi atualizado para usar `mode: 'cors'` corretamente:
- `frontend/src/components/ui/CachedImage.tsx` - Usa fetch com CORS adequado
- Blob cache mantido para reduzir requisições
- Funcionará automaticamente após CORS ser configurado

## Status

- ✅ Código frontend corrigido
- ✅ Backend saudável
- ⏳ **Aguardando**: Você configurar CORS no R2
