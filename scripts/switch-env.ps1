# Script para alternar entre ambientes de desenvolvimento e producao
# Uso: .\scripts\switch-env.ps1 -Environment production
#      .\scripts\switch-env.ps1 -Environment development

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("development", "production")]
    [string]$Environment
)

$projectRoot = Split-Path -Parent $PSScriptRoot

Write-Host "[>] Alternando para ambiente: $Environment" -ForegroundColor Cyan
Write-Host ""

# Funcao para copiar arquivo .env
function Copy-EnvFile {
    param(
        [string]$SourceFile,
        [string]$DestFile,
        [string]$Description
    )

    if (Test-Path $SourceFile) {
        Copy-Item -Path $SourceFile -Destination $DestFile -Force
        Write-Host "  [OK] $Description" -ForegroundColor Green
    } else {
        Write-Host "  [!] $Description - Arquivo nao encontrado: $SourceFile" -ForegroundColor Yellow
    }
}

# Alternar arquivos .env e docker-compose
if ($Environment -eq "production") {
    Write-Host "[*] Copiando arquivos de producao..." -ForegroundColor Yellow
    Copy-EnvFile "$projectRoot\.env.production" "$projectRoot\.env" "Root .env"    
    Copy-EnvFile "$projectRoot\frontend\.env.production" "$projectRoot\frontend\.env" "Frontend .env"
    Copy-EnvFile "$projectRoot\docker-compose.production.yml" "$projectRoot\docker-compose.yml" "Docker Compose"
} else {
    Write-Host "[*] Copiando arquivos de desenvolvimento..." -ForegroundColor Yellow
    Copy-EnvFile "$projectRoot\.env.development" "$projectRoot\.env" "Root .env"    
    Copy-EnvFile "$projectRoot\frontend\.env.development" "$projectRoot\frontend\.env" "Frontend .env"
    Copy-EnvFile "$projectRoot\docker-compose.development.yml" "$projectRoot\docker-compose.yml" "Docker Compose"
}

Write-Host ""
Write-Host "[OK] Ambiente alterado para: $Environment" -ForegroundColor Green
Write-Host ""

if ($Environment -eq "production") {
    Write-Host "[!] ATENCAO: Voce esta em modo PRODUCAO!" -ForegroundColor Red
    Write-Host "    - Nao rode localmente com estas configuracoes" -ForegroundColor Yellow
    Write-Host "    - Use apenas para fazer deploy" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "[i] Para voltar ao desenvolvimento:" -ForegroundColor Cyan
    Write-Host "    .\scripts\switch-env.ps1 -Environment development" -ForegroundColor White
} else {
    Write-Host "[OK] Voce esta em modo DESENVOLVIMENTO" -ForegroundColor Green
    Write-Host "     - Seguro para rodar localmente" -ForegroundColor White
    Write-Host "     - docker compose up -d" -ForegroundColor White
}

Write-Host ""
