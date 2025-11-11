# Deploy para Google Cloud VM - Guia Rápido

## Passo 1: Autorizar VM a acessar Cloud SQL

Execute no seu PC local:

```bash
gcloud sql instances patch charhub-postgres \
  --authorized-networks=136.116.66.192
```

## Passo 2: Renomear arquivos .env.production para .env

Execute no seu PC local (PowerShell):

```powershell
# Fazer backup dos .env de desenvolvimento
Copy-Item .env .env.development -Force
Copy-Item backend\.env backend\.env.development -Force
Copy-Item frontend\.env frontend\.env.development -Force

# Copiar .env.production para .env (serão enviados para produção)
Copy-Item .env.production .env -Force
Copy-Item backend\.env.production backend\.env -Force
Copy-Item frontend\.env.production frontend\.env -Force
```

## Passo 3: Fazer upload do projeto para VM

Execute no seu PC local (PowerShell):

```powershell
cd E:\Projects\charhub

# Fazer upload do projeto (exclui arquivos desnecessários)
gcloud compute scp --recurse --zone=us-central1-a `
  E:\Projects\charhub charhub-vm:/tmp/charhub
```

**Nota**: O comando pode demorar alguns minutos dependendo da velocidade da sua internet.

## Passo 4: Configurar arquivos na VM

SSH na VM:

```bash
gcloud compute ssh charhub-vm --zone=us-central1-a
```

Dentro da VM, execute:

```bash
# Mover projeto para /opt
sudo mkdir -p /opt
sudo mv /tmp/charhub /opt/
cd /opt/charhub

# Verificar se os arquivos foram copiados
ls -la
ls -la backend/.env
ls -la frontend/.env
ls -la cloudflared/config/prod/

# Ajustar permissões
sudo chown -R chronos:chronos /opt/charhub
sudo chmod 600 .env backend/.env frontend/.env
sudo chmod 600 cloudflared/config/prod/*.json
```

## Passo 5: Build e iniciar containers

Ainda na VM:

```bash
cd /opt/charhub

# Build das imagens (pode demorar 5-10 minutos)
sudo docker compose build --no-cache

# Iniciar serviços
sudo docker compose up -d

# Verificar status
sudo docker compose ps
```

## Passo 6: Aplicar migrations do banco

```bash
# Executar migrations do Prisma
sudo docker compose exec backend npx prisma migrate deploy

# Verificar status
sudo docker compose exec backend npx prisma migrate status
```

## Passo 7: Verificar logs

```bash
# Ver logs de todos os serviços
sudo docker compose logs -f

# Verificar log específico do backend
sudo docker compose logs -f backend

# Testar healthcheck
curl http://localhost:3000/api/v1/health
```

## Passo 8: Restaurar .env de desenvolvimento

No seu PC local (PowerShell):

```powershell
# Restaurar arquivos de desenvolvimento
Copy-Item .env.development .env -Force
Copy-Item backend\.env.development backend\.env -Force
Copy-Item frontend\.env.development frontend\.env -Force
```

## Verificação Final

Acesse no navegador: https://charhub.app

Se tudo estiver correto, você verá o frontend carregando.

## Troubleshooting

### Backend não conecta ao PostgreSQL

```bash
# Verificar se Cloud SQL está acessível
sudo docker compose exec backend sh
ping 136.112.54.4
```

### Cloudflare Tunnel não conecta

```bash
# Verificar logs do cloudflared
sudo docker compose logs cloudflared
```

### Reiniciar serviços

```bash
sudo docker compose restart
# ou reiniciar serviço específico
sudo docker compose restart backend
```

## Comandos Úteis

```bash
# Parar todos os serviços
sudo docker compose down

# Remover volumes (CUIDADO: apaga dados)
sudo docker compose down -v

# Ver uso de recursos
sudo docker stats

# Limpar imagens antigas
sudo docker system prune -a
```
