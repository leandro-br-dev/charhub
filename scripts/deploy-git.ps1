# Deploy via Git - Faz pull da branch main e rebuild
# Uso: .\scripts\deploy-git.ps1 [-SkipSecrets] [-SkipMigrations] [-NoBuild]
#
# Este script:
# 1. Sincroniza secrets de producao (sync-secrets.ps1)
# 2. Conecta na VM de producao
# 3. Faz git pull origin main
# 4. Rebuild dos containers Docker
# 5. Executa migrations do Prisma

param(
    [string]$Zone = "us-central1-a",
    [string]$VMName = "charhub-vm",
    [switch]$SkipMigrations = $false,
    [switch]$NoBuild = $false,
    [switch]$SkipSecrets = $false
)

$ErrorActionPreference = "Stop"

# Cores para output
function Write-Step { param($msg) Write-Host "[>] $msg" -ForegroundColor Cyan }
function Write-Info { param($msg) Write-Host "  [i] $msg" -ForegroundColor Gray }
function Write-Success { param($msg) Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Warning { param($msg) Write-Host "  [!] $msg" -ForegroundColor Yellow }
function Write-Error { param($msg) Write-Host "  [X] $msg" -ForegroundColor Red }

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CharHub - Git-Based Deploy" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Passo 0: Sincronizar secrets (a menos que --SkipSecrets)
if (-not $SkipSecrets) {
    Write-Step "Sincronizando secrets de producao..."
    $syncSecretsScript = Join-Path $PSScriptRoot "sync-secrets.ps1"

    if (Test-Path $syncSecretsScript) {
        try {
            # Executa sync-secrets com -NoRestart (o deploy vai reiniciar depois)
            & $syncSecretsScript -Zone $Zone -VMName $VMName -NoRestart

            if ($LASTEXITCODE -ne 0) {
                Write-Warning "sync-secrets.ps1 retornou codigo de erro"
                $confirm = Read-Host "Deseja continuar mesmo assim? (s/N)"
                if ($confirm -ne "s" -and $confirm -ne "S") {
                    Write-Info "Deploy cancelado"
                    exit 1
                }
            }
        }
        catch {
            Write-Warning "Erro ao executar sync-secrets: $_"
            $confirm = Read-Host "Deseja continuar mesmo assim? (s/N)"
            if ($confirm -ne "s" -and $confirm -ne "S") {
                Write-Info "Deploy cancelado"
                exit 1
            }
        }
    } else {
        Write-Warning "sync-secrets.ps1 nao encontrado em $syncSecretsScript"
    }
    Write-Host ""
} else {
    Write-Info "Sincronizacao de secrets pulada (--SkipSecrets)"
    Write-Host ""
}

# Verificar branch local (apenas warning)
Write-Step "Verificando ambiente local..."
$localBranch = git branch --show-current 2>$null
if ($localBranch -and $localBranch -ne "main") {
    Write-Warning "Voce esta na branch '$localBranch' localmente"
    Write-Info "O deploy sempre usa a branch 'main' do GitHub"
    Write-Host ""
}

# Verificar se há mudanças não commitadas
$gitStatus = git status --porcelain 2>$null
if ($gitStatus) {
    Write-Warning "Existem alteracoes nao commitadas localmente"
    Write-Info "Lembre-se: apenas codigo na 'main' do GitHub sera deployed"
    Write-Host ""
}

Write-Step "Conectando na VM e executando deploy..."
Write-Host ""

$deployScript = @'
#!/bin/bash
set -e

APP_DIR="/mnt/stateful_partition/charhub"
DOCKER_COMPOSE="/var/lib/toolbox/bin/docker-compose"

echo "========================================"
echo "  Deploy Git-Based - VM de Producao"
echo "========================================"
echo ""

cd "$APP_DIR"

echo "[1/6] Verificando estado atual..."
echo "  Branch: $(git branch --show-current)"
echo "  Commit atual: $(git log -1 --oneline)"
echo ""

echo "[2/6] Atualizando codigo (git pull)..."
git fetch origin main
BEFORE_COMMIT=$(git rev-parse HEAD)
git pull origin main
AFTER_COMMIT=$(git rev-parse HEAD)

if [ "$BEFORE_COMMIT" = "$AFTER_COMMIT" ]; then
    echo "  [i] Nenhuma alteracao - codigo ja esta atualizado"
else
    echo "  [OK] Codigo atualizado!"
    echo "  Commits novos:"
    git log --oneline $BEFORE_COMMIT..$AFTER_COMMIT
fi
echo ""

echo "[3/6] Verificando .env e Docker Compose..."
if [ ! -f ".env" ]; then
    echo "  [X] ERRO: Arquivo .env nao encontrado!"
    exit 1
fi
echo "  [OK] Arquivo .env presente"

# Definir caminho do docker-compose para Container-Optimized OS
COMPOSE="/var/lib/toolbox/bin/docker-compose"
if [ ! -f "$COMPOSE" ]; then
    echo "  [i] Instalando Docker Compose..."
    sudo mkdir -p /var/lib/toolbox/bin
    sudo curl -SL https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-linux-x86_64 -o "$COMPOSE"
    sudo chmod +x "$COMPOSE"
fi
export DOCKER_CONFIG=/var/lib/docker/.docker
sudo mkdir -p "$DOCKER_CONFIG"
echo ""

'@

# Adicionar build condicional
if (-not $NoBuild) {
    $deployScript += @'
echo "[4/6] Parando containers..."
sudo DOCKER_CONFIG="$DOCKER_CONFIG" $COMPOSE --env-file .env down || true
echo ""

echo "[5/6] Rebuild e inicializacao..."
# Limpar imagens antigas para economizar espaco
sudo docker system prune -f > /dev/null 2>&1 || true

# Build e start
sudo DOCKER_CONFIG="$DOCKER_CONFIG" $COMPOSE --env-file .env build
sudo DOCKER_CONFIG="$DOCKER_CONFIG" $COMPOSE --env-file .env up -d

echo "  [i] Aguardando containers iniciarem..."
sleep 10
echo ""

'@
} else {
    $deployScript += @'
echo "[4/6] Pulando rebuild (--NoBuild especificado)..."
echo ""

echo "[5/6] Reiniciando containers..."
sudo DOCKER_CONFIG="$DOCKER_CONFIG" $COMPOSE --env-file .env restart
sleep 5
echo ""

'@
}

# Adicionar migrations condicional
if (-not $SkipMigrations) {
    $deployScript += @'
echo "[6/6] Executando migrations..."
sudo DOCKER_CONFIG="$DOCKER_CONFIG" $COMPOSE --env-file .env exec -T backend npx prisma migrate deploy || {
    echo "  [!] Migration falhou ou nao havia migrations pendentes"
}
echo ""

'@
} else {
    $deployScript += @'
echo "[6/6] Pulando migrations (--SkipMigrations especificado)..."
echo ""

'@
}

$deployScript += @'
echo "========================================"
echo "  Status Final"
echo "========================================"
echo ""
echo "Branch: $(git branch --show-current)"
echo "Commit: $(git log -1 --oneline)"
echo ""
echo "Containers:"
sudo DOCKER_CONFIG="$DOCKER_CONFIG" $COMPOSE --env-file .env ps
echo ""
echo "[OK] Deploy concluido com sucesso!"
'@

# Criar arquivo temporário com o script (garantir LF line endings para Linux)
$tempScript = Join-Path $env:TEMP "deploy-git-script.sh"
$deployScriptLF = $deployScript -replace "`r`n", "`n" -replace "`r", "`n"
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($tempScript, $deployScriptLF, $utf8NoBom)

try {
    # Enviar e executar script
    $remoteScript = "/tmp/deploy-git.sh"
    gcloud compute scp $tempScript ${VMName}:$remoteScript --zone=$Zone

    if ($LASTEXITCODE -ne 0) {
        throw "Erro ao copiar script para VM"
    }

    gcloud compute ssh $VMName --zone=$Zone --command="chmod +x $remoteScript && bash $remoteScript"

    if ($LASTEXITCODE -ne 0) {
        throw "Deploy falhou na VM"
    }

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  DEPLOY CONCLUIDO COM SUCESSO!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "URL: https://charhub.app" -ForegroundColor Cyan
    Write-Host ""
}
catch {
    Write-Error "Erro durante deploy: $_"
    exit 1
}
finally {
    if (Test-Path $tempScript) {
        Remove-Item $tempScript -Force
    }
}
