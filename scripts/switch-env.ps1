# Script para alternar entre ambientes de desenvolvimento e produção
# Uso: .\scripts\switch-env.ps1 -Environment production
#      .\scripts\switch-env.ps1 -Environment development

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("development", "production")]
    [string]$Environment
)

$projectRoot = Split-Path -Parent $PSScriptRoot

Write-Host "🔄 Alternando para ambiente: $Environment" -ForegroundColor Cyan
Write-Host ""

# Função para copiar arquivo .env
function Copy-EnvFile {
    param(
        [string]$SourceFile,
        [string]$DestFile,
        [string]$Description
    )

    if (Test-Path $SourceFile) {
        Copy-Item -Path $SourceFile -Destination $DestFile -Force
        Write-Host "  ✅ $Description" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  $Description - Arquivo não encontrado: $SourceFile" -ForegroundColor Yellow
    }
}

# Alternar arquivos .env
if ($Environment -eq "production") {
    Write-Host "📦 Copiando arquivos de produção..." -ForegroundColor Yellow
    Copy-EnvFile "$projectRoot\.env.production" "$projectRoot\.env" "Root .env"
    Copy-EnvFile "$projectRoot\backend\.env.production" "$projectRoot\backend\.env" "Backend .env"
    Copy-EnvFile "$projectRoot\frontend\.env.production" "$projectRoot\frontend\.env" "Frontend .env"
} else {
    Write-Host "🛠️  Copiando arquivos de desenvolvimento..." -ForegroundColor Yellow
    Copy-EnvFile "$projectRoot\.env.development" "$projectRoot\.env" "Root .env"
    Copy-EnvFile "$projectRoot\backend\.env.development" "$projectRoot\backend\.env" "Backend .env"
    Copy-EnvFile "$projectRoot\frontend\.env.development" "$projectRoot\frontend\.env" "Frontend .env"
}

Write-Host ""
Write-Host "✨ Ambiente alterado para: $Environment" -ForegroundColor Green
Write-Host ""

if ($Environment -eq "production") {
    Write-Host "⚠️  ATENÇÃO: Você está em modo PRODUÇÃO!" -ForegroundColor Red
    Write-Host "   - Não rode localmente com estas configurações" -ForegroundColor Yellow
    Write-Host "   - Use apenas para fazer deploy" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "💡 Para voltar ao desenvolvimento:" -ForegroundColor Cyan
    Write-Host "   .\scripts\switch-env.ps1 -Environment development" -ForegroundColor White
} else {
    Write-Host "✅ Você está em modo DESENVOLVIMENTO" -ForegroundColor Green
    Write-Host "   - Seguro para rodar localmente" -ForegroundColor White
    Write-Host "   - docker compose up -d" -ForegroundColor White
}

Write-Host ""
