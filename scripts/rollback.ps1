# Rollback para uma versao anterior do codigo
# Uso: .\scripts\rollback.ps1 [-Commit <hash>] [-Steps <n>]
#
# Exemplos:
#   .\scripts\rollback.ps1                    # Lista ultimos commits para escolher
#   .\scripts\rollback.ps1 -Steps 1           # Volta 1 commit
#   .\scripts\rollback.ps1 -Commit abc123     # Volta para commit especifico

param(
    [string]$Zone = "us-central1-a",
    [string]$VMName = "charhub-vm",
    [string]$Commit = "",
    [int]$Steps = 0
)

$ErrorActionPreference = "Stop"

# Cores para output
function Write-Step { param($msg) Write-Host "[>] $msg" -ForegroundColor Cyan }
function Write-Info { param($msg) Write-Host "  [i] $msg" -ForegroundColor Gray }
function Write-Success { param($msg) Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Warning { param($msg) Write-Host "  [!] $msg" -ForegroundColor Yellow }
function Write-Error { param($msg) Write-Host "  [X] $msg" -ForegroundColor Red }

Write-Host ""
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "  CharHub - Rollback" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""

# Se nenhum parametro, listar commits e pedir escolha
if (-not $Commit -and $Steps -eq 0) {
    Write-Step "Buscando ultimos commits na VM..."
    Write-Host ""

    $commits = gcloud compute ssh $VMName --zone=$Zone --command="
        cd /mnt/stateful_partition/charhub
        echo 'Commit atual:'
        git log -1 --format='  * %h - %s (%cr)' HEAD
        echo ''
        echo 'Commits anteriores disponiveis:'
        git log -10 --format='  %h - %s (%cr)' HEAD~1 2>/dev/null || echo '  (sem commits anteriores)'
    " 2>$null

    Write-Host $commits
    Write-Host ""

    $choice = Read-Host "Digite o hash do commit para rollback (ou 'q' para cancelar)"

    if ($choice -eq 'q' -or $choice -eq '') {
        Write-Info "Rollback cancelado"
        exit 0
    }

    $Commit = $choice
}

# Se especificou Steps, calcular commit
if ($Steps -gt 0) {
    Write-Step "Calculando commit para rollback ($Steps commits atras)..."

    $Commit = gcloud compute ssh $VMName --zone=$Zone --command="
        cd /mnt/stateful_partition/charhub
        git rev-parse HEAD~$Steps 2>/dev/null || echo 'ERRO'
    " 2>$null

    $Commit = $Commit.Trim()

    if ($Commit -eq "ERRO" -or -not $Commit) {
        Write-Error "Nao foi possivel calcular o commit. Verifique se existem commits suficientes."
        exit 1
    }

    Write-Info "Commit calculado: $Commit"
}

# Confirmar rollback
Write-Host ""
Write-Warning "ATENCAO: Voce esta prestes a fazer rollback para o commit: $Commit"
Write-Warning "Esta acao ira:"
Write-Warning "  - Parar os containers"
Write-Warning "  - Reverter o codigo para o commit especificado"
Write-Warning "  - Rebuild e reiniciar os containers"
Write-Host ""

$confirm = Read-Host "Confirma o rollback? (digite 'sim' para confirmar)"
if ($confirm -ne "sim") {
    Write-Info "Rollback cancelado"
    exit 0
}

Write-Host ""
Write-Step "Executando rollback..."

$rollbackScript = @"
#!/bin/bash
set -e

APP_DIR="/mnt/stateful_partition/charhub"
TARGET_COMMIT="$Commit"

cd "`$APP_DIR"

echo "[1/5] Estado atual..."
echo "  Branch: `$(git branch --show-current)"
echo "  Commit: `$(git log -1 --oneline)"
echo ""

echo "[2/5] Parando containers..."
sudo docker compose --env-file .env down || true
echo ""

echo "[3/5] Fazendo checkout para commit: `$TARGET_COMMIT"
git fetch origin main
git checkout `$TARGET_COMMIT
echo ""

echo "[4/5] Rebuild e start..."
export DOCKER_CONFIG=/var/lib/docker/.docker
sudo mkdir -p "`$DOCKER_CONFIG"
sudo docker system prune -f > /dev/null 2>&1 || true
sudo DOCKER_CONFIG="`$DOCKER_CONFIG" docker compose --env-file .env build
sudo DOCKER_CONFIG="`$DOCKER_CONFIG" docker compose --env-file .env up -d
sleep 10
echo ""

echo "[5/5] Executando migrations..."
sudo docker compose --env-file .env exec -T backend npx prisma migrate deploy || {
    echo "  [!] Migration falhou ou nao havia migrations pendentes"
}
echo ""

echo "========================================"
echo "  Rollback Concluido"
echo "========================================"
echo ""
echo "Commit atual: `$(git log -1 --oneline)"
echo ""
echo "Containers:"
sudo docker compose --env-file .env ps
echo ""
echo "[!] IMPORTANTE: A VM esta em 'detached HEAD'"
echo "    Para voltar ao normal, execute um novo deploy"
echo "    ou use: git checkout main && git pull"
"@

$tempScript = Join-Path $env:TEMP "rollback-script.sh"
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($tempScript, $rollbackScript, $utf8NoBom)

try {
    gcloud compute scp $tempScript ${VMName}:~/rollback.sh --zone=$Zone 2>$null

    if ($LASTEXITCODE -ne 0) {
        throw "Erro ao copiar script para VM"
    }

    gcloud compute ssh $VMName --zone=$Zone --command="chmod +x ~/rollback.sh && bash ~/rollback.sh"

    if ($LASTEXITCODE -ne 0) {
        throw "Rollback falhou na VM"
    }

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  ROLLBACK CONCLUIDO!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Warning "Lembre-se: A VM esta em 'detached HEAD'"
    Write-Info "Para voltar ao normal, execute: .\scripts\deploy-git.ps1"
    Write-Host ""
}
catch {
    Write-Error "Erro durante rollback: $_"
    exit 1
}
finally {
    if (Test-Path $tempScript) {
        Remove-Item $tempScript -Force
    }
}
