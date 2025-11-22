# Sincroniza arquivo .env.production local para a VM de producao
# Uso: .\scripts\sync-secrets.ps1
#
# Este script:
# 1. Envia .env.production local para a VM como .env
# 2. Reinicia os containers para aplicar mudancas

param(
    [string]$Zone = "us-central1-a",
    [string]$VMName = "charhub-vm",
    [switch]$NoRestart = $false
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot

# Cores para output
function Write-Step { param($msg) Write-Host "[>] $msg" -ForegroundColor Cyan }
function Write-Info { param($msg) Write-Host "  [i] $msg" -ForegroundColor Gray }
function Write-Success { param($msg) Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Warning { param($msg) Write-Host "  [!] $msg" -ForegroundColor Yellow }
function Write-Error { param($msg) Write-Host "  [X] $msg" -ForegroundColor Red }

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CharHub - Sync Secrets" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se .env.production existe
$envFile = Join-Path $projectRoot ".env.production"
if (-not (Test-Path $envFile)) {
    Write-Error "Arquivo .env.production nao encontrado em: $envFile"
    exit 1
}

Write-Step "Verificando arquivo .env.production..."
$envContent = Get-Content $envFile -Raw
if ($envContent -match "NODE_ENV=development") {
    Write-Warning "ATENCAO: O arquivo .env.production contem NODE_ENV=development!"
    $confirm = Read-Host "Deseja continuar mesmo assim? (s/N)"
    if ($confirm -ne "s" -and $confirm -ne "S") {
        Write-Info "Operacao cancelada"
        exit 0
    }
}

# Verificar variáveis críticas
$criticalVars = @("DATABASE_URL", "SESSION_SECRET", "GOOGLE_CLIENT_ID")
foreach ($var in $criticalVars) {
    if ($envContent -notmatch "$var=.+") {
        Write-Warning "Variavel critica '$var' pode estar vazia ou ausente"
    }
}

Write-Success "Arquivo .env.production validado"
Write-Host ""

Write-Step "Enviando .env para VM de producao..."

try {
    # Criar backup do .env atual na VM
    gcloud compute ssh $VMName --zone=$Zone --command="
        if [ -f /mnt/stateful_partition/charhub/.env ]; then
            cp /mnt/stateful_partition/charhub/.env /mnt/stateful_partition/charhub/.env.backup.\$(date +%Y%m%d%H%M%S)
            echo 'Backup do .env atual criado'
        fi
    " 2>$null

    # Enviar novo .env
    gcloud compute scp $envFile ${VMName}:/tmp/.env.new --zone=$Zone 2>$null

    if ($LASTEXITCODE -ne 0) {
        throw "Erro ao enviar arquivo para VM"
    }

    # Mover para local correto
    gcloud compute ssh $VMName --zone=$Zone --command="
        sudo mv /tmp/.env.new /mnt/stateful_partition/charhub/.env
        sudo chown chronos:chronos /mnt/stateful_partition/charhub/.env
        sudo chmod 600 /mnt/stateful_partition/charhub/.env
        echo 'Arquivo .env atualizado com sucesso'
    " 2>$null

    if ($LASTEXITCODE -ne 0) {
        throw "Erro ao configurar arquivo na VM"
    }

    Write-Success "Arquivo .env sincronizado"
    Write-Host ""

    if (-not $NoRestart) {
        Write-Step "Reiniciando containers para aplicar mudancas..."

        gcloud compute ssh $VMName --zone=$Zone --command="
            cd /mnt/stateful_partition/charhub
            sudo docker compose --env-file .env restart
            sleep 5
            sudo docker compose --env-file .env ps
        "

        if ($LASTEXITCODE -ne 0) {
            Write-Warning "Falha ao reiniciar containers"
        } else {
            Write-Success "Containers reiniciados"
        }
    } else {
        Write-Info "Reinicio de containers pulado (--NoRestart)"
        Write-Info "Execute 'docker compose restart' na VM para aplicar mudancas"
    }

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  SECRETS SINCRONIZADOS!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
}
catch {
    Write-Error "Erro: $_"
    exit 1
}
