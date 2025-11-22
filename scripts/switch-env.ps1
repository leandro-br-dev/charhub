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
    Write-Host "[*] Verificando integridade do arquivo .env.production..." -ForegroundColor Yellow

    # Verificar se .env.production existe e tem tamanho minimo (3KB = ~3000 bytes)
    $envProdFile = "$projectRoot\.env.production"
    if (Test-Path $envProdFile) {
        $fileSize = (Get-Item $envProdFile).Length
        $minSize = 3000  # Arquivo production completo tem ~3.5KB

        if ($fileSize -lt $minSize) {
            Write-Host ""
            Write-Host "  [!!!] ERRO CRITICO: .env.production parece estar corrompido ou incompleto!" -ForegroundColor Red
            Write-Host "  [!!!] Tamanho atual: $fileSize bytes (minimo esperado: $minSize bytes)" -ForegroundColor Red
            Write-Host ""
            Write-Host "  [i] O arquivo .env.production NAO deve ser modificado por scripts." -ForegroundColor Yellow
            Write-Host "  [i] Use secrets/production-secrets.txt para recuperar as credenciais." -ForegroundColor Yellow
            Write-Host ""
            Write-Host "  [!] Operacao ABORTADA para proteger o ambiente de producao." -ForegroundColor Red
            exit 1
        }

        # Verificar se contem variaveis essenciais
        $content = Get-Content $envProdFile -Raw
        $requiredVars = @("DATABASE_URL", "JWT_SECRET", "GOOGLE_CLIENT_ID", "R2_ACCESS_KEY_ID")
        $missingVars = @()

        foreach ($var in $requiredVars) {
            if ($content -notmatch "$var=") {
                $missingVars += $var
            }
        }

        if ($missingVars.Count -gt 0) {
            Write-Host ""
            Write-Host "  [!!!] ERRO CRITICO: .env.production esta incompleto!" -ForegroundColor Red
            Write-Host "  [!!!] Variaveis faltando: $($missingVars -join ', ')" -ForegroundColor Red
            Write-Host ""
            Write-Host "  [i] Use secrets/production-secrets.txt para recuperar." -ForegroundColor Yellow
            Write-Host ""
            Write-Host "  [!] Operacao ABORTADA para proteger o ambiente de producao." -ForegroundColor Red
            exit 1
        }

        Write-Host "  [OK] Arquivo .env.production validado ($fileSize bytes)" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "  [!!!] ERRO CRITICO: .env.production NAO ENCONTRADO!" -ForegroundColor Red
        Write-Host "  [i] Este arquivo e essencial para deploy em producao." -ForegroundColor Yellow
        Write-Host "  [i] Use secrets/production-secrets.txt para recria-lo." -ForegroundColor Yellow
        Write-Host ""
        exit 1
    }

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
