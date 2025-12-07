# Mostra status da VM de producao
# Uso: .\scripts\vm-status.ps1 [-Logs] [-LogLines <n>]
#
# Exemplos:
#   .\scripts\vm-status.ps1              # Status basico
#   .\scripts\vm-status.ps1 -Logs        # Inclui logs recentes
#   .\scripts\vm-status.ps1 -Logs -LogLines 50

param(
    [string]$Zone = "us-central1-a",
    [string]$VMName = "charhub-vm",
    [switch]$Logs = $false,
    [int]$LogLines = 20
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CharHub - VM Status" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$statusScript = @"
#!/bin/bash

APP_DIR="/mnt/stateful_partition/charhub"

echo "========================================"
echo "  Informacoes do Repositorio"
echo "========================================"
cd "`$APP_DIR"
echo "Branch: `$(git branch --show-current 2>/dev/null || echo 'detached HEAD')"
echo "Commit: `$(git log -1 --oneline 2>/dev/null || echo 'N/A')"
echo "Data:   `$(git log -1 --format='%ci' 2>/dev/null || echo 'N/A')"
echo ""

# Verificar se há commits atras do origin
git fetch origin main --quiet 2>/dev/null
LOCAL=`$(git rev-parse HEAD 2>/dev/null)
REMOTE=`$(git rev-parse origin/main 2>/dev/null)

if [ "`$LOCAL" != "`$REMOTE" ]; then
    BEHIND=`$(git rev-list HEAD..origin/main --count 2>/dev/null)
    if [ "`$BEHIND" != "0" ] && [ -n "`$BEHIND" ]; then
        echo "[!] ATENCAO: `$BEHIND commits atras do origin/main"
        echo ""
    fi
fi

echo "========================================"
echo "  Status dos Containers"
echo "========================================"
sudo docker compose --env-file .env ps 2>/dev/null || echo "Erro ao obter status dos containers"
echo ""

echo "========================================"
echo "  Uso de Recursos"
echo "========================================"
echo "Disco:"
df -h /mnt/stateful_partition | tail -1 | awk '{print "  Usado: " `$3 " / " `$2 " (" `$5 ")"}'
echo ""
echo "Docker:"
sudo docker system df 2>/dev/null | head -5
echo ""

echo "========================================"
echo "  Ultimo Deploy"
echo "========================================"
echo "Ultimos 5 commits:"
git log -5 --format='  %h - %s (%cr)' 2>/dev/null || echo "  N/A"
echo ""
"@

if ($Logs) {
    $statusScript += @"

echo "========================================"
echo "  Logs Recentes (ultimas $LogLines linhas)"
echo "========================================"
echo ""
echo "--- Backend ---"
sudo docker compose --env-file .env logs backend --tail=$LogLines 2>/dev/null || echo "Erro ao obter logs"
echo ""
"@
}

try {
    $tempScript = Join-Path $env:TEMP "vm-status-script.sh"
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($tempScript, $statusScript, $utf8NoBom)

    gcloud compute scp $tempScript ${VMName}:~/vm-status.sh --zone=$Zone 2>$null
    gcloud compute ssh $VMName --zone=$Zone --command="chmod +x ~/vm-status.sh && bash ~/vm-status.sh"

    if ($LASTEXITCODE -ne 0) {
        Write-Host "[!] Erro ao obter status" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "[X] Erro: $_" -ForegroundColor Red
    exit 1
}
finally {
    if (Test-Path $tempScript) {
        Remove-Item $tempScript -Force
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Comandos Disponiveis" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  .\scripts\deploy-git.ps1     - Deploy (git pull + rebuild)" -ForegroundColor Gray
Write-Host "  .\scripts\sync-secrets.ps1   - Atualizar .env" -ForegroundColor Gray
Write-Host "  .\scripts\rollback.ps1       - Rollback para versao anterior" -ForegroundColor Gray
Write-Host "  .\scripts\vm-status.ps1 -Logs - Ver logs" -ForegroundColor Gray
Write-Host ""
