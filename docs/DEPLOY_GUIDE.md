# Guia Rápido de Deploy - CharHub

**Fase Atual**: Deploy Manual (Fase 1)

Este guia contém os comandos essenciais para fazer deploy no CharHub. Para estratégia completa, veja `docs/DEPLOY_STRATEGY.md`.

---

## 🚀 Deploy Rápido (TL;DR)

```powershell
# 1. Preparar
.\scripts\switch-env.ps1 -Environment production

# 2. Autorizar VM no Cloud SQL (primeira vez apenas)
gcloud sql instances patch charhub-postgres --authorized-networks=136.116.66.192

# 3. Upload
gcloud compute scp --recurse --zone=us-central1-a E:\Projects\charhub charhub-vm:/tmp/charhub

# 4. Deploy (SSH na VM)
gcloud compute ssh charhub-vm --zone=us-central1-a
# Dentro da VM:
sudo mv /tmp/charhub /opt/ && cd /opt/charhub
sudo docker compose down && sudo docker compose build && sudo docker compose up -d
sudo docker compose exec backend npx prisma migrate deploy
exit

# 5. Restaurar desenvolvimento
.\scripts\switch-env.ps1 -Environment development
```

---

## 📋 Processo Detalhado

### Passo 1: Preparar Ambiente Local

```powershell
# Garantir que está em desenvolvimento
.\scripts\switch-env.ps1 -Environment development

# Testar localmente ANTES de deployar
docker compose up -d
# Testar no navegador: http://localhost
docker compose down
```

### Passo 2: Alternar para Produção

```powershell
# Alternar arquivos .env para produção
.\scripts\switch-env.ps1 -Environment production

# Verificar que aplicou corretamente
Get-Content .env | Select-String "NODE_ENV"
# Deve mostrar: NODE_ENV=production
```

### Passo 3: Autorizar VM no Cloud SQL (Primeira Vez Apenas)

```bash
gcloud sql instances patch charhub-postgres \
  --authorized-networks=136.116.66.192
```

### Passo 4: Upload do Projeto

```powershell
# Upload completo (demora ~5-10 minutos)
gcloud compute scp --recurse --zone=us-central1-a `
  E:\Projects\charhub charhub-vm:/tmp/charhub
```

**Dica**: Para deploys futuros mais rápidos, use rsync ou apenas arquivos modificados.

### Passo 5: Deploy na VM

```bash
# SSH na VM
gcloud compute ssh charhub-vm --zone=us-central1-a

# Dentro da VM:

# Backup do código anterior (primeira vez pular)
sudo mv /opt/charhub /opt/charhub.backup.$(date +%Y%m%d_%H%M%S)

# Mover novo código
sudo mv /tmp/charhub /opt/
cd /opt/charhub

# Verificar arquivos .env
ls -la .env backend/.env frontend/.env

# Build e deploy
sudo docker compose down
sudo docker compose build --no-cache
sudo docker compose up -d

# Verificar containers
sudo docker compose ps

# Aplicar migrations
sudo docker compose exec backend npx prisma migrate deploy

# Ver logs
sudo docker compose logs -f backend
# Ctrl+C para sair

# Testar health
curl http://localhost:3000/api/v1/health

# Sair da VM
exit
```

### Passo 6: Verificação

```powershell
# Acessar aplicação
Start-Process "https://charhub.app"

# Testar:
# - ✅ Página carrega
# - ✅ Login OAuth funciona
# - ✅ Features principais funcionam
```

### Passo 7: Restaurar Ambiente de Desenvolvimento

```powershell
# IMPORTANTE: Voltar para desenvolvimento
.\scripts\switch-env.ps1 -Environment development

# Confirmar
Get-Content .env | Select-String "NODE_ENV"
# Deve mostrar: NODE_ENV=development
```

---

## 🔄 Deploy Incremental (Mais Rápido)

Depois do primeiro deploy, para deploys subsequentes:

```bash
# Na VM (SSH)
cd /opt/charhub
sudo git pull origin main  # Se usar Git
# OU fazer upload apenas dos arquivos modificados

sudo docker compose down
sudo docker compose up -d --build

# Se houver novas migrations
sudo docker compose exec backend npx prisma migrate deploy
```

---

## 🆘 Troubleshooting

### Problema: Backend não conecta ao PostgreSQL

```bash
# Na VM, verificar se IP está autorizado
gcloud sql instances describe charhub-postgres \
  --format="get(settings.ipConfiguration.authorizedNetworks)"

# Adicionar IP da VM se necessário
gcloud sql instances patch charhub-postgres \
  --authorized-networks=136.116.66.192
```

### Problema: Cloudflare Tunnel não conecta

```bash
# Na VM, verificar logs do tunnel
sudo docker compose logs cloudflared

# Verificar se arquivo de credenciais existe
ls -la cloudflared/config/prod/
```

### Problema: Erro ao aplicar migrations

```bash
# Na VM, verificar status
sudo docker compose exec backend npx prisma migrate status

# Resolver migration falhada
sudo docker compose exec backend npx prisma migrate resolve --rolled-back MIGRATION_NAME
```

### Problema: Esqueceu de voltar para desenvolvimento

```powershell
# Sempre pode rodar novamente
.\scripts\switch-env.ps1 -Environment development
```

---

## 📝 Checklist de Deploy

### Antes do Deploy
- [ ] Código testado localmente
- [ ] `switch-env.ps1 production` executado
- [ ] Commit e push do código (se usar Git)

### Durante o Deploy
- [ ] Upload para VM concluído
- [ ] Docker build sem erros
- [ ] Containers rodando (`docker compose ps`)
- [ ] Migrations aplicadas
- [ ] Logs sem erros críticos

### Depois do Deploy
- [ ] Aplicação acessível em https://charhub.app
- [ ] Login OAuth funciona
- [ ] Features principais testadas
- [ ] `switch-env.ps1 development` executado
- [ ] Confirmado que voltou para dev (verificar .env)

---

## 🎯 Comandos Úteis

### Ver logs em tempo real
```bash
# SSH na VM
gcloud compute ssh charhub-vm --zone=us-central1-a

# Logs de todos os serviços
sudo docker compose logs -f

# Logs apenas do backend
sudo docker compose logs -f backend

# Últimas 100 linhas
sudo docker compose logs --tail=100 backend
```

### Reiniciar serviços
```bash
# SSH na VM
gcloud compute ssh charhub-vm --zone=us-central1-a

# Reiniciar tudo
sudo docker compose restart

# Reiniciar apenas backend
sudo docker compose restart backend
```

### Ver status
```bash
# Status dos containers
sudo docker compose ps

# Uso de recursos
sudo docker stats

# Espaço em disco
df -h
```

---

## 📚 Documentação Relacionada

- **Estratégia Completa**: `docs/DEPLOY_STRATEGY.md`
- **Setup de Produção**: `docs/PRODUCTION_DEPLOYMENT.md`
- **Decisões Arquiteturais**: `docs/ARCHITECTURE_DECISIONS.md`
- **CI/CD (Futuro)**: `docs/CI_CD_SETUP.md`

---

## ⚠️ IMPORTANTE

1. **SEMPRE** alternar para produção antes de fazer upload
2. **SEMPRE** voltar para desenvolvimento depois do deploy
3. **NUNCA** commitar arquivos `.env` ativos
4. **SEMPRE** testar localmente antes de deployar
5. **SEMPRE** verificar logs após deploy

---

**Última atualização**: 2025-01-10
**Versão**: 1.0
