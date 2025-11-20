# Script de deploy usando bucket publico temporario (Otimizado e Corrigido)
# Uso: .\scripts\deploy-via-gcs-public.ps1

param(
    [string]$Zone = "us-central1-a",
    [string]$VMName = "charhub-vm",
    [string]$Bucket = "charhub-deploy-temp"
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot

Write-Host "[>] Iniciando deploy via Cloud Storage (publico temporario)..." -ForegroundColor Cyan
Write-Host ""

# Salvar ambiente atual
Write-Host "[0/6] Verificando ambiente atual..." -ForegroundColor Yellow
$currentEnvFile = Join-Path $projectRoot ".env"
$wasInDevelopment = $false

if (Test-Path $currentEnvFile) {
    $envContent = Get-Content $currentEnvFile
    if ($envContent -match "NODE_ENV=development") {
        $wasInDevelopment = $true
        Write-Host "  [i] Ambiente atual: DEVELOPMENT" -ForegroundColor Gray
    } else {
        Write-Host "  [i] Ambiente atual: PRODUCTION" -ForegroundColor Gray
    }
}

# Alternar para producao
Write-Host ""
Write-Host "[*] Alternando para modo PRODUCTION..." -ForegroundColor Yellow
try {
    & "$PSScriptRoot\switch-env.ps1" -Environment production
    if (-not $?) {
        throw "Falha ao alternar para producao"
    }
    Write-Host "  [OK] Modo PRODUCTION ativado" -ForegroundColor Green
} catch {
    Write-Host "  [!] Erro ao alternar para producao: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

Write-Host "[1/6] Comprimindo projeto..." -ForegroundColor Yellow
$timestamp = Get-Date -Format 'yyyyMMddHHmmss'
$tempFile = Join-Path $env:TEMP "charhub-deploy-$timestamp.tar.gz"

Push-Location (Split-Path $projectRoot)
$projectName = Split-Path $projectRoot -Leaf

$excludeDirs = @(
    "node_modules",
    ".git",
    "frontend\dist",
    "frontend\node_modules",
    "backend\dist",
    "backend\node_modules",
    ".vscode",
    ".idea",
    "*.log",
    ".env.development",
    "secrets",
    "old_project_reference",
    "project_analyzer.py",
    "project_context.log"
)

$excludeArgs = $excludeDirs | ForEach-Object { "--exclude=$_" }

# Incluir arquivos ocultos (dot files) no tar
# O tar do Windows precisa especificar explicitamente para incluir dot files
& tar -czf $tempFile $excludeArgs --exclude=".git" $projectName

if ($LASTEXITCODE -ne 0) {
    Write-Host "[!] Erro ao comprimir" -ForegroundColor Red
    Pop-Location
    exit 1
}

# Verificar se .env foi incluido
Write-Host "  [i] Verificando se .env foi incluido..." -ForegroundColor Gray
$tarContents = & tar -tzf $tempFile | Select-String "\.env$"
if ($tarContents) {
    Write-Host "  [OK] Arquivo .env incluido no pacote" -ForegroundColor Green
} else {
    Write-Host "  [!] AVISO: Arquivo .env nao foi encontrado no pacote!" -ForegroundColor Yellow
}

Pop-Location

$fileSize = (Get-Item $tempFile).Length / 1MB
Write-Host "  [OK] Arquivo comprimido: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Green

Write-Host ""
Write-Host "[2/6] Fazendo upload para Cloud Storage..." -ForegroundColor Yellow

# Verificar/criar bucket
$bucketCheck = gsutil ls gs://$Bucket 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [i] Criando bucket..." -ForegroundColor Gray
    gsutil mb -p charhub-prod -l us-central1 gs://$Bucket 2>&1 | Out-Null
}

# Limpar arquivos antigos do bucket
Write-Host "  [i] Limpando arquivos antigos do bucket..." -ForegroundColor Gray
$ErrorActionPreference = "Continue"
gsutil -m rm gs://$Bucket/charhub-deploy-*.tar.gz 2>&1 | Out-Null
$ErrorActionPreference = "Stop"

$uploadStart = Get-Date
gsutil -m cp $tempFile gs://$Bucket/charhub-deploy-$timestamp.tar.gz

if ($LASTEXITCODE -ne 0) {
    Write-Host "[!] Erro ao fazer upload" -ForegroundColor Red
    Remove-Item $tempFile -Force
    exit 1
}

$uploadEnd = Get-Date
$uploadDuration = ($uploadEnd - $uploadStart).TotalSeconds
Write-Host "  [OK] Upload concluido em $([math]::Round($uploadDuration, 1))s" -ForegroundColor Green

Remove-Item $tempFile -Force

Write-Host ""
Write-Host "[3/6] Tornando arquivo publico temporariamente..." -ForegroundColor Yellow

# Tornar objeto publico usando iam
$ErrorActionPreference = "Continue"
gsutil iam ch allUsers:objectViewer gs://$Bucket 2>&1 | Out-Null
$ErrorActionPreference = "Stop"

Write-Host "  [OK] Bucket configurado como publico" -ForegroundColor Green

# Gerar URL publica
$publicUrl = "https://storage.googleapis.com/$Bucket/charhub-deploy-$timestamp.tar.gz"
Write-Host "  [i] URL: $publicUrl" -ForegroundColor Cyan

# Testar se arquivo esta acessivel
Write-Host "  [i] Testando acesso ao arquivo..." -ForegroundColor Gray
try {
    $response = Invoke-WebRequest -Uri $publicUrl -Method Head -UseBasicParsing -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "  [OK] Arquivo acessivel publicamente" -ForegroundColor Green
    }
} catch {
    Write-Host "  [!] AVISO: Nao foi possivel acessar arquivo via HTTP HEAD" -ForegroundColor Yellow
    Write-Host "  [i] Forcando permissoes no objeto especifico..." -ForegroundColor Gray
    $ErrorActionPreference = "Continue"
    gsutil acl ch -u AllUsers:R gs://$Bucket/charhub-deploy-$timestamp.tar.gz 2>&1 | Out-Null
    $ErrorActionPreference = "Stop"
    Write-Host "  [OK] Permissoes aplicadas" -ForegroundColor Green
}

Write-Host ""
Write-Host "[4/6] Baixando na VM e fazendo deploy..." -ForegroundColor Yellow

# Criar script temporario local
$deployScriptPath = Join-Path $env:TEMP "charhub-deploy-script.sh"

# NOTA: Usamos crases (backticks) antes do $ em variaveis que sao do BASH (`$APP_DIR)
# Variaveis do PowerShell ($publicUrl, $timestamp) ficam normais para serem substituidas.
$deployScriptContent = @"
#!/bin/bash
set -e

# Definicao de caminhos
APP_DIR="/mnt/stateful_partition/charhub"
BACKUP_ROOT="/mnt/stateful_partition/backups"

echo '[*] LIMPEZA PREVIA: Garantindo espaco antes do download...'
sudo rm -rf /tmp/* 2>/dev/null || true
rm -rf ~/charhub-deploy.tar.gz 2>/dev/null || true
rm -rf ~/charhub 2>/dev/null || true
echo '  [OK] Espaco limpo'

echo '[*] Baixando arquivo para home...'
cd ~
curl -L -o charhub-deploy.tar.gz '$publicUrl'

if [ ! -f charhub-deploy.tar.gz ]; then
  echo '[!] Erro ao baixar arquivo'
  exit 1
fi

echo '  [OK] Download concluido'
ls -lh charhub-deploy.tar.gz

echo '[*] Parando containers...'
if [ -d "`$APP_DIR" ]; then
  cd "`$APP_DIR"
  if [ -f ".env" ]; then
    sudo docker compose --env-file .env down 2>/dev/null || true
  else
    sudo docker compose down 2>/dev/null || true
  fi
  cd ~
fi

echo '[*] Gerenciamento de Backup Inteligente...'
if [ -d "`$APP_DIR" ]; then
  sudo mkdir -p "`$BACKUP_ROOT"
  
  # Variavel 'timestamp' vem do PowerShell, entao nao usamos crase nela
  BACKUP_DEST="`$BACKUP_ROOT/charhub.backup.$timestamp"
  echo "  [i] Criando backup em: \$BACKUP_DEST"
  
  sudo cp -r "`$APP_DIR" "\$BACKUP_DEST"
  
  echo "  [i] Rotacionando backups (mantendo os 3 ultimos)..."
  cd "`$BACKUP_ROOT"
  ls -dt charhub.backup.* 2>/dev/null | tail -n +4 | xargs -r sudo rm -rf
  echo '  [OK] Backups antigos removidos'

  sudo rm -rf "`$APP_DIR"
  echo '  [OK] Diretorio da aplicacao antiga limpo'
fi

echo '[*] Extraindo novo codigo...'
cd ~
tar -xzf charhub-deploy.tar.gz 2>/dev/null
echo '  [OK] Arquivo extraido'

echo '[*] Instalando arquivos...'
# O erro de mkdir acontecia aqui porque `$APP_DIR estava sendo resolvido pelo PowerShell como vazio
sudo mkdir -p "`$APP_DIR"

# Copiar todos os arquivos incluindo dot files (arquivos ocultos como .env)
# Usando shopt para habilitar dotglob temporariamente
shopt -s dotglob
sudo cp -r charhub/* "`$APP_DIR/"
shopt -u dotglob

rm -rf charhub charhub-deploy.tar.gz
echo '  [OK] Arquivos temporarios removidos'

# Verificar se .env foi copiado corretamente
if [ ! -f "`$APP_DIR/.env" ]; then
  echo '[!] ERRO CRITICO: Arquivo .env nao foi copiado para o diretorio da aplicacao!'
  echo '[i] Listando arquivos dot no diretorio:'
  ls -la "`$APP_DIR" | grep '^\.'
  exit 1
fi
echo '  [OK] Arquivo .env confirmado no diretorio da aplicacao'

echo '[*] Ajustando proprietario...'
sudo chown -R chronos:chronos "`$APP_DIR"

echo '[*] Configurando Docker Compose...'
DOCKER_COMPOSE="/var/lib/toolbox/bin/docker-compose"
if [ ! -f "`$DOCKER_COMPOSE" ]; then
  sudo mkdir -p /var/lib/toolbox/bin
  sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-linux-x86_64" -o "`$DOCKER_COMPOSE"
  sudo chmod +x "`$DOCKER_COMPOSE"
fi

export DOCKER_CONFIG=/var/lib/docker/.docker
sudo mkdir -p "`$DOCKER_CONFIG"

echo '[*] Limpeza do Docker...'
sudo docker system prune -f > /dev/null 2>&1 || true

echo '[*] Construindo e Iniciando...'
cd "`$APP_DIR"

# Verificar se arquivo .env existe
if [ ! -f ".env" ]; then
  echo '[!] ERRO: Arquivo .env nao encontrado!'
  ls -la
  exit 1
fi

echo '  [i] Arquivo .env encontrado'

# Build com variáveis de ambiente
sudo DOCKER_CONFIG="`$DOCKER_CONFIG" "`$DOCKER_COMPOSE" --env-file .env build

# Start com variáveis de ambiente
sudo DOCKER_CONFIG="`$DOCKER_CONFIG" "`$DOCKER_COMPOSE" --env-file .env up -d

echo '[*] Aguardando containers...'
sleep 15
sudo "`$DOCKER_COMPOSE" --env-file .env ps

echo '[*] Migrations...'
sudo "`$DOCKER_COMPOSE" --env-file .env exec -T backend npx prisma migrate deploy

echo '[OK] Deploy finalizado!'
"@

# Salvar script localmente
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($deployScriptPath, $deployScriptContent, $utf8NoBom)

$deploySuccess = $false

try {
    Write-Host "  [i] Enviando script de deploy..." -ForegroundColor Gray
    gcloud compute scp $deployScriptPath ${VMName}:deploy.sh --zone=$Zone *> $null

    if ($LASTEXITCODE -ne 0) { throw "Erro ao copiar script para VM" }

    Write-Host "  [i] Executando deploy na VM..." -ForegroundColor Gray
    gcloud compute ssh $VMName --zone=$Zone --command="bash deploy.sh"

    if ($LASTEXITCODE -ne 0) { throw "Deploy falhou" }

    Write-Host "  [OK] Deploy concluido" -ForegroundColor Green
    $deploySuccess = $true
}
catch {
    Write-Host "  [!] Erro ao fazer deploy: $_" -ForegroundColor Red
    
    if ($wasInDevelopment) {
        Write-Host ""
        Write-Host "[!] Retornando ao modo desenvolvimento..." -ForegroundColor Yellow
        try { & "$PSScriptRoot\switch-env.ps1" -Environment development *> $null } catch {}
    }
    
    # Limpeza em caso de erro
    gsutil rm gs://$Bucket/charhub-deploy-$timestamp.tar.gz 2>&1 | Out-Null
    exit 1
}
finally {
    if (Test-Path $deployScriptPath) { Remove-Item $deployScriptPath -Force }
}

Write-Host ""
Write-Host "[5/6] Limpando Cloud Storage..." -ForegroundColor Yellow
Write-Host "  [i] Removendo arquivo de deploy temporario..." -ForegroundColor Gray
$ErrorActionPreference = "Continue"
gsutil rm gs://$Bucket/charhub-deploy-$timestamp.tar.gz 2>&1 | Out-Null
$ErrorActionPreference = "Stop"
Write-Host "  [OK] Arquivo de deploy removido (backups SQL preservados)" -ForegroundColor Green

Write-Host ""
Write-Host "[6/6] Retornando ao modo desenvolvimento..." -ForegroundColor Yellow

if ($wasInDevelopment) {
    try {
        & "$PSScriptRoot\switch-env.ps1" -Environment development
        Write-Host "  [OK] Modo DEVELOPMENT restaurado" -ForegroundColor Green
    } catch {
        Write-Host "  [!] Falha ao voltar para desenvolvimento manual necessario" -ForegroundColor Yellow
    }
} else {
    Write-Host "  [i] Mantendo modo PRODUCTION" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "[OK] DEPLOY CONCLUIDO COM SUCESSO!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green