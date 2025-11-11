#!/bin/bash
# Script para alternar entre ambientes de desenvolvimento e produção
# Uso: ./scripts/switch-env.sh production
#      ./scripts/switch-env.sh development

set -e

ENVIRONMENT=$1
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ -z "$ENVIRONMENT" ]; then
    echo "❌ Erro: Especifique o ambiente (development ou production)"
    echo "Uso: ./scripts/switch-env.sh [development|production]"
    exit 1
fi

if [ "$ENVIRONMENT" != "development" ] && [ "$ENVIRONMENT" != "production" ]; then
    echo "❌ Erro: Ambiente inválido. Use 'development' ou 'production'"
    exit 1
fi

echo "🔄 Alternando para ambiente: $ENVIRONMENT"
echo ""

copy_env_file() {
    local source=$1
    local dest=$2
    local desc=$3

    if [ -f "$source" ]; then
        cp "$source" "$dest"
        echo "  ✅ $desc"
    else
        echo "  ⚠️  $desc - Arquivo não encontrado: $source"
    fi
}

if [ "$ENVIRONMENT" = "production" ]; then
    echo "📦 Copiando arquivos de produção..."
    copy_env_file "$PROJECT_ROOT/.env.production" "$PROJECT_ROOT/.env" "Root .env"
    copy_env_file "$PROJECT_ROOT/backend/.env.production" "$PROJECT_ROOT/backend/.env" "Backend .env"
    copy_env_file "$PROJECT_ROOT/frontend/.env.production" "$PROJECT_ROOT/frontend/.env" "Frontend .env"
else
    echo "🛠️  Copiando arquivos de desenvolvimento..."
    copy_env_file "$PROJECT_ROOT/.env.development" "$PROJECT_ROOT/.env" "Root .env"
    copy_env_file "$PROJECT_ROOT/backend/.env.development" "$PROJECT_ROOT/backend/.env" "Backend .env"
    copy_env_file "$PROJECT_ROOT/frontend/.env.development" "$PROJECT_ROOT/frontend/.env" "Frontend .env"
fi

echo ""
echo "✨ Ambiente alterado para: $ENVIRONMENT"
echo ""

if [ "$ENVIRONMENT" = "production" ]; then
    echo "⚠️  ATENÇÃO: Você está em modo PRODUÇÃO!"
    echo "   - Não rode localmente com estas configurações"
    echo "   - Use apenas para fazer deploy"
    echo ""
    echo "💡 Para voltar ao desenvolvimento:"
    echo "   ./scripts/switch-env.sh development"
else
    echo "✅ Você está em modo DESENVOLVIMENTO"
    echo "   - Seguro para rodar localmente"
    echo "   - docker compose up -d"
fi

echo ""
