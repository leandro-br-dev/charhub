# Script para monitorar a producao
# Uso: .\scripts\monitor-production.ps1 [comando]

param(
    [string]$Zone = "us-central1-a",
    [string]$VMName = "charhub-vm",
    [ValidateSet("status", "logs", "logs-backend", "logs-frontend", "logs-db", "logs-nginx", "logs-tunnel", "shell", "restart", "stop", "db-migrate")]
    [string]$Command = "status"
)

$ErrorActionPreference = "Stop"

Write-Host "[>] Monitorando producao: $Command" -ForegroundColor Cyan
Write-Host ""

# Container-Optimized OS: docker-compose instalado em /var/lib/toolbox/bin
$dc = "/var/lib/toolbox/bin/docker-compose"
$projectPath = "/mnt/stateful_partition/charhub"

switch ($Command) {
    "status" {
        Write-Host "[i] Status dos containers:" -ForegroundColor Yellow
        gcloud compute ssh $VMName --zone=$Zone --command="cd $projectPath && sudo $dc ps"

        Write-Host ""
        Write-Host "[i] Uso de recursos:" -ForegroundColor Yellow
        gcloud compute ssh $VMName --zone=$Zone --command="sudo docker stats --no-stream"
    }

    "logs" {
        Write-Host "[i] Logs de todos os containers (Ctrl+C para sair):" -ForegroundColor Yellow
        gcloud compute ssh $VMName --zone=$Zone --command="cd $projectPath && sudo $dc logs -f --tail=100"
    }

    "logs-backend" {
        Write-Host "[i] Logs do backend (Ctrl+C para sair):" -ForegroundColor Yellow
        gcloud compute ssh $VMName --zone=$Zone --command="cd $projectPath && sudo $dc logs -f --tail=100 backend"
    }

    "logs-frontend" {
        Write-Host "[i] Logs do frontend (Ctrl+C para sair):" -ForegroundColor Yellow
        gcloud compute ssh $VMName --zone=$Zone --command="cd $projectPath && sudo $dc logs -f --tail=100 frontend"
    }

    "logs-db" {
        Write-Host "[i] Logs do PostgreSQL (Ctrl+C para sair):" -ForegroundColor Yellow
        gcloud compute ssh $VMName --zone=$Zone --command="cd $projectPath && sudo $dc logs -f --tail=100 postgres"
    }

    "logs-nginx" {
        Write-Host "[i] Logs do Nginx (Ctrl+C para sair):" -ForegroundColor Yellow
        gcloud compute ssh $VMName --zone=$Zone --command="cd $projectPath && sudo $dc logs -f --tail=100 nginx"
    }

    "logs-tunnel" {
        Write-Host "[i] Logs do Cloudflare Tunnel (Ctrl+C para sair):" -ForegroundColor Yellow
        gcloud compute ssh $VMName --zone=$Zone --command="cd $projectPath && sudo $dc logs -f --tail=100 cloudflared"
    }

    "shell" {
        Write-Host "[i] Abrindo shell na VM..." -ForegroundColor Yellow
        gcloud compute ssh $VMName --zone=$Zone
    }

    "restart" {
        Write-Host "[i] Reiniciando containers..." -ForegroundColor Yellow
        gcloud compute ssh $VMName --zone=$Zone --command="cd $projectPath && sudo $dc restart"
        Write-Host "  [OK] Containers reiniciados" -ForegroundColor Green
    }

    "stop" {
        Write-Host "[!] Parando containers..." -ForegroundColor Red
        gcloud compute ssh $VMName --zone=$Zone --command="cd $projectPath && sudo $dc down"
        Write-Host "  [OK] Containers parados" -ForegroundColor Green
    }

    "db-migrate" {
        Write-Host "[i] Aplicando migrations do banco de dados..." -ForegroundColor Yellow
        gcloud compute ssh $VMName --zone=$Zone --command="cd $projectPath && sudo $dc exec -T backend npx prisma migrate deploy"
        Write-Host "  [OK] Migrations aplicadas" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "[i] Comandos disponiveis:" -ForegroundColor Cyan
Write-Host "    status        - Ver status dos containers" -ForegroundColor White
Write-Host "    logs          - Ver todos os logs" -ForegroundColor White
Write-Host "    logs-backend  - Ver logs do backend" -ForegroundColor White
Write-Host "    logs-frontend - Ver logs do frontend" -ForegroundColor White
Write-Host "    logs-db       - Ver logs do PostgreSQL" -ForegroundColor White
Write-Host "    logs-nginx    - Ver logs do Nginx" -ForegroundColor White
Write-Host "    logs-tunnel   - Ver logs do Cloudflare Tunnel" -ForegroundColor White
Write-Host "    shell         - Abrir shell SSH na VM" -ForegroundColor White
Write-Host "    restart       - Reiniciar containers" -ForegroundColor White
Write-Host "    stop          - Parar containers" -ForegroundColor White
Write-Host "    db-migrate    - Aplicar migrations" -ForegroundColor White
Write-Host ""
