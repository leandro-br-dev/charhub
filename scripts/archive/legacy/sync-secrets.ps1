# Sincroniza todos os arquivos de producao para a VM
# Uso: .\scripts\sync-secrets.ps1 [-NoRestart] [-DryRun] [-Force]
#
# Este script sincroniza:
# 1. .env.production -> .env (na VM)
# 2. frontend/.env.production -> frontend/.env (na VM)
# 3. cloudflared/config/prod/*.json e *.pem -> mesmos paths (na VM)
# 4. Atualiza secrets/production-secrets.txt como backup

param(
    [string]$Zone = "us-central1-a",
    [string]$VMName = "charhub-vm",
    [switch]$NoRestart = $false,
    [switch]$DryRun = $false,
    [switch]$Force = $false
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$vmAppDir = "/mnt/stateful_partition/charhub"

# Cores para output
function Write-Step { param($msg) Write-Host "[>] $msg" -ForegroundColor Cyan }
function Write-Info { param($msg) Write-Host "  [i] $msg" -ForegroundColor Gray }
function Write-Success { param($msg) Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Warning { param($msg) Write-Host "  [!] $msg" -ForegroundColor Yellow }
function Write-Error { param($msg) Write-Host "  [X] $msg" -ForegroundColor Red }

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CharHub - Sync Production Secrets" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Warning "MODO DRY-RUN: Nenhum arquivo sera enviado"
    Write-Host ""
}

# Lista de arquivos para sincronizar
# Formato: @{ Local = "caminho local"; Remote = "caminho na VM"; Required = $true/$false }
$filesToSync = @(
    @{ Local = ".env.production"; Remote = ".env"; Required = $true; Description = "Variaveis de ambiente principais" }
    @{ Local = "frontend\.env.production"; Remote = "frontend/.env"; Required = $true; Description = "Variaveis do frontend" }
    @{ Local = "cloudflared\config\prod\64dc6dc0-b430-4d84-bc47-e2ac1838064f.json"; Remote = "cloudflared/config/prod/64dc6dc0-b430-4d84-bc47-e2ac1838064f.json"; Required = $true; Description = "Credenciais do tunnel Cloudflare" }
    @{ Local = "cloudflared\config\prod\cert.pem"; Remote = "cloudflared/config/prod/cert.pem"; Required = $true; Description = "Certificado do tunnel Cloudflare" }
)

# Verificar arquivos locais
Write-Step "Verificando arquivos de producao locais..."
$missingRequired = @()
$filesToSend = @()

foreach ($file in $filesToSync) {
    $localPath = Join-Path $projectRoot $file.Local
    if (Test-Path $localPath) {
        $filesToSend += @{
            LocalPath = $localPath
            RemotePath = "$vmAppDir/$($file.Remote)"
            Description = $file.Description
            Local = $file.Local
        }
        Write-Success "$($file.Local) encontrado"
    } else {
        if ($file.Required) {
            $missingRequired += $file.Local
            Write-Error "$($file.Local) NAO ENCONTRADO (obrigatorio)"
        } else {
            Write-Info "$($file.Local) nao encontrado (opcional)"
        }
    }
}

if ($missingRequired.Count -gt 0 -and -not $Force) {
    Write-Host ""
    Write-Error "Arquivos obrigatorios faltando. Use -Force para ignorar."
    exit 1
}

Write-Host ""

# Validar .env.production
$envProdPath = Join-Path $projectRoot ".env.production"
if (Test-Path $envProdPath) {
    Write-Step "Validando .env.production..."
    $envContent = Get-Content $envProdPath -Raw

    # Verificar se nao esta em modo development
    if ($envContent -match "NODE_ENV=development") {
        Write-Warning "ATENCAO: .env.production contem NODE_ENV=development!"
        if (-not $Force) {
            $confirm = Read-Host "Deseja continuar mesmo assim? (s/N)"
            if ($confirm -ne "s" -and $confirm -ne "S") {
                Write-Info "Operacao cancelada"
                exit 0
            }
        }
    }

    # Verificar variaveis criticas
    $criticalVars = @("DATABASE_URL", "JWT_SECRET", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET")
    foreach ($var in $criticalVars) {
        if ($envContent -notmatch "$var=.+") {
            Write-Warning "Variavel critica '$var' pode estar vazia ou ausente"
        }
    }
    Write-Success "Validacao concluida"
}

Write-Host ""

# Atualizar backup em secrets/production-secrets.txt
Write-Step "Atualizando backup em secrets/production-secrets.txt..."
$secretsDir = Join-Path $projectRoot "secrets"
$secretsBackup = Join-Path $secretsDir "production-secrets.txt"

if (-not (Test-Path $secretsDir)) {
    New-Item -ItemType Directory -Path $secretsDir -Force | Out-Null
}

$backupContent = @"
# CharHub Production Secrets Backup
# Gerado automaticamente por sync-secrets.ps1
# Data: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
#
# ATENCAO: Este arquivo contem TODOS os secrets de producao.
# NAO compartilhe este arquivo e mantenha-o seguro.
# Este arquivo esta no .gitignore e NAO deve ser commitado.

========================================
  ARQUIVOS SINCRONIZADOS
========================================

"@

foreach ($file in $filesToSend) {
    $backupContent += "--- $($file.Local) ---`n"
    $backupContent += "$($file.Description)`n"
    $backupContent += "Destino na VM: $($file.RemotePath)`n`n"

    # Adicionar conteudo do arquivo (exceto binarios)
    if ($file.Local -notmatch "\.pem$|\.json$") {
        $backupContent += (Get-Content $file.LocalPath -Raw)
        $backupContent += "`n`n"
    } else {
        $backupContent += "[Arquivo binario/JSON - conteudo omitido]`n`n"
    }
}

if (-not $DryRun) {
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($secretsBackup, $backupContent, $utf8NoBom)
    Write-Success "Backup salvo em secrets/production-secrets.txt"
} else {
    Write-Info "[DRY-RUN] Backup seria salvo em secrets/production-secrets.txt"
}

Write-Host ""

if ($DryRun) {
    Write-Step "Arquivos que seriam enviados:"
    foreach ($file in $filesToSend) {
        Write-Info "$($file.Local) -> $($file.RemotePath)"
    }
    Write-Host ""
    Write-Warning "Modo dry-run: nenhum arquivo foi enviado"
    exit 0
}

# Enviar arquivos para a VM
Write-Step "Enviando arquivos para a VM..."

try {
    # Criar backup na VM primeiro
    $backupTimestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
    $backupCmd = "cd $vmAppDir && BACKUP_DIR='.env_backups/$backupTimestamp' && mkdir -p `$BACKUP_DIR && [ -f .env ] && cp .env `$BACKUP_DIR/ ; [ -f frontend/.env ] && cp frontend/.env `$BACKUP_DIR/frontend.env ; [ -f cloudflared/config/prod/cert.pem ] && cp cloudflared/config/prod/cert.pem `$BACKUP_DIR/ ; cp cloudflared/config/prod/*.json `$BACKUP_DIR/ 2>/dev/null ; echo 'Backup criado em:' `$BACKUP_DIR"

    gcloud compute ssh $VMName --zone=$Zone --command=$backupCmd 2>$null

    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Falha ao criar backup na VM (pode ser primeira execucao)"
    }

    # Enviar cada arquivo
    foreach ($file in $filesToSend) {
        Write-Info "Enviando $($file.Local)..."

        # Criar diretorio remoto se necessario
        $remoteDir = Split-Path $file.RemotePath -Parent
        gcloud compute ssh $VMName --zone=$Zone --command="mkdir -p $remoteDir" 2>$null

        # Enviar arquivo
        gcloud compute scp $file.LocalPath ${VMName}:$($file.RemotePath) --zone=$Zone 2>$null

        if ($LASTEXITCODE -ne 0) {
            throw "Erro ao enviar $($file.Local)"
        }

        Write-Success "$($file.Local) enviado"
    }

    # Ajustar permissoes (644 para que containers Docker possam ler)
    Write-Step "Ajustando permissoes..."
    $chmodCmd = "cd $vmAppDir && chmod 644 .env frontend/.env cloudflared/config/prod/*.json cloudflared/config/prod/*.pem 2>/dev/null && echo 'Permissoes ajustadas'"
    gcloud compute ssh $VMName --zone=$Zone --command=$chmodCmd 2>$null

    Write-Success "Todos os arquivos enviados com sucesso"
    Write-Host ""

    if (-not $NoRestart) {
        Write-Step "Reiniciando containers para aplicar mudancas..."

        $restartCmd = "cd $vmAppDir && COMPOSE='/var/lib/toolbox/bin/docker-compose' && export DOCKER_CONFIG=/var/lib/docker/.docker && sudo DOCKER_CONFIG=`$DOCKER_CONFIG `$COMPOSE --env-file .env restart && sleep 5 && sudo DOCKER_CONFIG=`$DOCKER_CONFIG `$COMPOSE --env-file .env ps"
        gcloud compute ssh $VMName --zone=$Zone --command=$restartCmd

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
