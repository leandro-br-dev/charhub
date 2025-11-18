# Script de deploy usando bucket publico temporario (mais simples e rapido)
# Uso: .\scripts\deploy-via-gcs-public.ps1
#
# Este script automaticamente:
# 1. Alterna para modo producao
# 2. Faz o deploy
# 3. Retorna para modo desenvolvimento (mesmo se houver erro)

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
    "secrets"
)

$excludeArgs = $excludeDirs | ForEach-Object { "--exclude=$_" }
& tar -czf $tempFile $excludeArgs $projectName

if ($LASTEXITCODE -ne 0) {
    Write-Host "[!] Erro ao comprimir" -ForegroundColor Red
    Pop-Location
    exit 1
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

# Limpar arquivos antigos do bucket (evitar acumulo de arquivos de deploy antigos)
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

# Tornar objeto publico usando iam (mais confiavel que acl)
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
$deployScriptContent = @"
#!/bin/bash
set -e

echo '[*] Verificando espaco em disco...'
df -h /tmp
df -h /home

echo '[*] Limpando /tmp (esta 100% cheio)...'
sudo rm -rf /tmp/* 2>/dev/null || true
df -h /tmp
echo '  [OK] /tmp limpo'

echo '[*] Limpando arquivos antigos no home...'
rm -rf ~/charhub-deploy.tar.gz 2>/dev/null || true
rm -rf ~/charhub 2>/dev/null || true

echo '[*] Baixando arquivo para home...'
cd ~
curl -L -o charhub-deploy.tar.gz '$publicUrl'

if [ ! -f charhub-deploy.tar.gz ]; then
  echo '[!] Erro ao baixar arquivo'
  exit 1
fi

echo '  [OK] Download concluido'
ls -lh charhub-deploy.tar.gz

echo '[*] Parando containers (se existirem)...'
if [ -d /mnt/stateful_partition/charhub ]; then
  cd /mnt/stateful_partition/charhub
  sudo docker compose down 2>/dev/null || true
  cd ~
fi

echo '[*] Fazendo backup e removendo codigo anterior...'
if [ -d /mnt/stateful_partition/charhub ]; then
  # Backup
  sudo cp -r /mnt/stateful_partition/charhub /home/charhub.backup.$timestamp
  echo '  [OK] Backup criado em /home/charhub.backup.$timestamp'

  # Remover completamente o diretorio antigo
  sudo rm -rf /mnt/stateful_partition/charhub
  echo '  [OK] Diretorio antigo removido'
fi

echo '[*] Extraindo arquivo...'
tar -xzf charhub-deploy.tar.gz 2>/dev/null
echo '  [OK] Arquivo extraido'

echo '[*] Criando diretorio e copiando arquivos...'
# Usar /mnt/stateful_partition (local correto para dados no COS)
sudo mkdir -p /mnt/stateful_partition/charhub
sudo cp -r charhub/* /mnt/stateful_partition/charhub/

# Limpar arquivos temporarios
rm -rf charhub charhub-deploy.tar.gz
echo '  [OK] Codigo copiado para /mnt/stateful_partition/charhub'

echo '[*] Ajustando proprietario dos arquivos...'
sudo chown -R chronos:chronos /mnt/stateful_partition/charhub
echo '  [OK] Proprietario ajustado'

echo '[*] Instalando docker-compose (se necessario)...'
# Container-Optimized OS: quase tudo tem noexec, mas /var/lib/toolbox nao tem!
DOCKER_COMPOSE="/var/lib/toolbox/bin/docker-compose"

if [ ! -f "`$DOCKER_COMPOSE" ]; then
  echo '  [i] docker-compose nao encontrado, instalando em /var/lib/toolbox/bin...'
  sudo mkdir -p /var/lib/toolbox/bin
  sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-linux-x86_64" -o "`$DOCKER_COMPOSE"
  sudo chmod +x "`$DOCKER_COMPOSE"
  echo '  [OK] docker-compose instalado'
else
  echo '  [OK] docker-compose ja instalado'
fi

# Verificar se funciona
if ! "`$DOCKER_COMPOSE" version &> /dev/null; then
  echo '  [!] ERRO: docker-compose nao funciona'
  exit 1
fi

echo '[*] Configurando ambiente Docker...'
# Container-Optimized OS: /root e read-only, precisamos apontar DOCKER_CONFIG para local gravavel
export DOCKER_CONFIG=/var/lib/docker/.docker
sudo mkdir -p "`$DOCKER_CONFIG"

echo '[*] Construindo imagens (isso pode demorar 5-10 minutos)...'
cd /mnt/stateful_partition/charhub
sudo DOCKER_CONFIG="`$DOCKER_CONFIG" "`$DOCKER_COMPOSE" build

echo '[*] Iniciando containers...'
sudo DOCKER_CONFIG="`$DOCKER_CONFIG" "`$DOCKER_COMPOSE" up -d

echo '[*] Aguardando containers iniciarem...'
sleep 15

echo '[*] Verificando status...'
sudo "`$DOCKER_COMPOSE" ps

echo '[*] Aplicando migrations...'
sudo "`$DOCKER_COMPOSE" exec -T backend npx prisma migrate deploy

echo '[*] Verificando logs do backend...'
sudo "`$DOCKER_COMPOSE" logs --tail=30 backend

echo ''
echo '[OK] Deploy concluido!'
"@

# Salvar script localmente com encoding UTF-8 SEM BOM (essencial para bash)
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($deployScriptPath, $deployScriptContent, $utf8NoBom)

$deploySuccess = $false

try {
    # Copiar script para VM (sem caminho vai para home do usuario automaticamente)
    Write-Host "  [i] Enviando script de deploy..." -ForegroundColor Gray
    gcloud compute scp $deployScriptPath ${VMName}:deploy.sh --zone=$Zone *> $null

    if ($LASTEXITCODE -ne 0) {
        throw "Erro ao copiar script para VM"
    }

    # Executar script na VM (usando bash diretamente, nao depende de chmod +x)
    Write-Host "  [i] Executando deploy na VM (isso pode levar varios minutos)..." -ForegroundColor Gray
    gcloud compute ssh $VMName --zone=$Zone --command="bash deploy.sh"

    if ($LASTEXITCODE -ne 0) {
        throw "Deploy falhou"
    }

    Write-Host "  [OK] Deploy concluido" -ForegroundColor Green
    $deploySuccess = $true
}
catch {
    Write-Host "  [!] Erro ao fazer deploy: $_" -ForegroundColor Red

    # Retornar ao desenvolvimento imediatamente em caso de erro
    if ($wasInDevelopment) {
        Write-Host ""
        Write-Host "[!] Retornando ao modo desenvolvimento devido ao erro..." -ForegroundColor Yellow
        try {
            & "$PSScriptRoot\switch-env.ps1" -Environment development *> $null
            Write-Host "  [OK] Modo DEVELOPMENT restaurado" -ForegroundColor Green
        } catch {
            Write-Host "  [!] Execute manualmente: .\scripts\switch-env.ps1 -Environment development" -ForegroundColor Red
        }
    }

    # Remover arquivo publico mesmo com erro (garantir limpeza)
    $ErrorActionPreference = "Continue"
    gsutil rm gs://$Bucket/charhub-deploy-$timestamp.tar.gz 2>&1 | Out-Null
    $ErrorActionPreference = "Stop"

    Write-Host ""
    exit 1
}
finally {
    # Limpar script temporario local
    if (Test-Path $deployScriptPath) {
        Remove-Item $deployScriptPath -Force
    }
}

Write-Host ""
Write-Host "[5/6] Limpando Cloud Storage..." -ForegroundColor Yellow

# Limpar sempre, mesmo se houve erro antes
$ErrorActionPreference = "Continue"
gsutil rm gs://$Bucket/charhub-deploy-$timestamp.tar.gz 2>&1 | Out-Null
$ErrorActionPreference = "Stop"

if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] Arquivo removido do Cloud Storage" -ForegroundColor Green
} else {
    Write-Host "  [i] Nenhum arquivo para limpar ou ja foi removido" -ForegroundColor Gray
}

Write-Host ""
Write-Host "[6/6] Retornando ao modo desenvolvimento..." -ForegroundColor Yellow

# Sempre retornar ao desenvolvimento se estava nesse modo antes
if ($wasInDevelopment) {
    try {
        & "$PSScriptRoot\switch-env.ps1" -Environment development
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  [OK] Modo DEVELOPMENT restaurado" -ForegroundColor Green
        } else {
            Write-Host "  [!] AVISO: Falha ao voltar para desenvolvimento" -ForegroundColor Yellow
            Write-Host "      Execute manualmente: .\scripts\switch-env.ps1 -Environment development" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  [!] AVISO: Erro ao voltar para desenvolvimento: $_" -ForegroundColor Yellow
        Write-Host "      Execute manualmente: .\scripts\switch-env.ps1 -Environment development" -ForegroundColor Yellow
    }
} else {
    Write-Host "  [i] Mantendo modo PRODUCTION (ja estava neste modo antes)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "[OK] DEPLOY CONCLUIDO COM SUCESSO!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "[i] Proximos passos:" -ForegroundColor Cyan
Write-Host "    1. Acesse: https://charhub.app" -ForegroundColor White
Write-Host "    2. Teste login OAuth e funcionalidades" -ForegroundColor White
Write-Host ""
Write-Host "[i] Para ver logs em tempo real:" -ForegroundColor Cyan
Write-Host "    gcloud compute ssh $VMName --zone=$Zone --command='cd /mnt/stateful_partition/charhub && sudo docker compose logs -f'" -ForegroundColor White
Write-Host ""
