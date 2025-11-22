# Deploy Baseado em Git

> **Status: IMPLEMENTADO** - Este documento descreve o processo de deploy atual.

## Visão Geral

### Problemas Identificados

| Problema | Impacto | Risco |
|----------|---------|-------|
| Envia **todos os arquivos** a cada deploy | Lento, ~50-100MB por deploy | Baixo |
| Não usa branches para controle | Pode enviar código não testado | **Alto** |
| Depende da branch local | `feature/*` pode ir para produção acidentalmente | **Crítico** |
| Compacta e transfere via GCS | Complexo, muitos pontos de falha | Médio |
| Não tem rollback fácil | Restaurar versão anterior é manual | Alto |

### Fluxo Atual (Problemático)

```
[Dev Local] → tar.gz (todos arquivos) → GCS → VM → Extrai → Build
     ↑
 Qualquer branch!  ← PERIGO: pode ser feature/* não testada
```

---

## Nova Estratégia: Git-Based Deploy

### Princípios

1. **Produção = Branch `main`** - Sempre e somente
2. **Deploy = Git Pull** - Apenas sincroniza diferenças
3. **Secrets separados** - `.env` nunca versionado, transferido separadamente
4. **Rollback instantâneo** - `git checkout <commit>` + rebuild

### Novo Fluxo

```
[GitHub main] ←── git pull ←── [VM Produção]
                                    ↓
                              docker compose build
                              docker compose up -d
```

### Arquitetura

```
VM Produção (/mnt/stateful_partition/charhub/)
├── .git/                    # Repositório clonado
├── .env                     # Secrets (NÃO versionado, transferido manualmente)
├── .env.production          # Template de referência (opcional)
├── backend/
├── frontend/
├── docker-compose.yml
└── ...
```

---

## Implementação em 3 Etapas

### Etapa 1: Setup Inicial (Uma vez)

**1.1 Configurar SSH Key na VM para GitHub**

```bash
# Na VM
ssh-keygen -t ed25519 -C "charhub-vm-deploy"
cat ~/.ssh/id_ed25519.pub
# Adicionar esta chave como Deploy Key no GitHub (Settings → Deploy Keys)
```

**1.2 Clonar Repositório na VM**

```bash
# Na VM
cd /mnt/stateful_partition
git clone git@github.com:seu-usuario/charhub.git
cd charhub
```

**1.3 Configurar .env de Produção**

```bash
# Na VM - criar .env com secrets de produção
# Este arquivo NUNCA vai para o Git
nano .env
```

### Etapa 2: Script de Deploy (Novo)

O novo script será muito mais simples:

```powershell
# deploy-git.ps1
# 1. Verificar se estamos na branch correta localmente (warning)
# 2. Conectar na VM via SSH
# 3. git pull origin main
# 4. docker compose build
# 5. docker compose up -d
# 6. prisma migrate deploy
```

### Etapa 3: Script de Atualização de Secrets

Quando `.env` mudar, script separado para enviar apenas secrets:

```powershell
# sync-env.ps1
# Transfere .env.production local → .env na VM
```

---

## Scripts Propostos

### 1. `deploy-git.ps1` - Deploy Principal

```powershell
# Faz pull do main e rebuild na VM
# - Seguro: sempre usa branch main
# - Rápido: só baixa diferenças (git diff)
# - Simples: sem compactação, sem GCS
```

### 2. `sync-secrets.ps1` - Sincronização de Secrets

```powershell
# Envia .env.production local para VM como .env
# Usado apenas quando secrets mudam
```

### 3. `rollback.ps1` - Rollback Rápido

```powershell
# Lista últimos commits
# Permite escolher versão para rollback
# Executa: git checkout <commit> + rebuild
```

### 4. `vm-status.ps1` - Status da VM

```powershell
# Mostra: branch atual, último commit, containers, logs
```

---

## Comparação: Antes vs Depois

| Aspecto | Processo Atual | Git-Based Deploy |
|---------|----------------|------------------|
| **Tempo de deploy** | 5-10 min | 1-2 min |
| **Dados transferidos** | ~50-100 MB | ~1-5 MB (diff) |
| **Segurança** | Qualquer branch | Sempre `main` |
| **Rollback** | Restaurar backup manual | `git checkout` + rebuild |
| **Complexidade** | Alta (GCS, tar, etc) | Baixa (git pull) |
| **Rastreabilidade** | Nenhuma | Commits exatos |
| **Secrets** | Incluídos no tar | Separados, controlados |

---

## Técnicas Adicionais de Mercado

### Opção A: Deploy Simples (Recomendado para Começar)
- Git pull + Docker rebuild
- **Prós**: Simples, rápido de implementar
- **Contras**: Downtime durante rebuild (~2-3 min)

### Opção B: Blue-Green Deploy
- Dois ambientes (blue/green), alterna entre eles
- **Prós**: Zero downtime
- **Contras**: Mais complexo, requer mais recursos

### Opção C: GitHub Actions (CI/CD)
- Deploy automático ao fazer merge na main
- **Prós**: Totalmente automatizado
- **Contras**: Requer configuração inicial mais elaborada

### Opção D: Watchtower (Auto-update)
- Container que monitora e atualiza automaticamente
- **Prós**: Hands-off
- **Contras**: Menos controle

**Recomendação**: Começar com **Opção A** (simples), evoluir para **Opção C** (GitHub Actions) quando o projeto crescer.

---

## Fluxo de Trabalho do Desenvolvedor

### Desenvolvimento Normal

```bash
# 1. Criar branch para feature
git checkout -b feature/nova-funcionalidade

# 2. Desenvolver e testar localmente
npm run dev

# 3. Commit e push
git add .
git commit -m "feat: nova funcionalidade"
git push origin feature/nova-funcionalidade

# 4. Criar PR no GitHub
# 5. Code review + testes
# 6. Merge na main
```

### Deploy para Produção

```powershell
# Apenas quando quiser atualizar produção:
.\scripts\deploy-git.ps1

# O script vai:
# - Verificar que você NÃO está fazendo deploy da branch errada
# - Conectar na VM
# - Fazer git pull origin main
# - Rebuild + restart containers
```

### Atualização de Secrets

```powershell
# Quando mudar .env.production local:
.\scripts\sync-secrets.ps1
```

---

## Scripts Disponíveis

### `deploy-git.ps1` - Deploy Principal
```powershell
# Deploy normal (pull + rebuild + migrations)
.\scripts\deploy-git.ps1

# Pular migrations
.\scripts\deploy-git.ps1 -SkipMigrations

# Apenas restart (sem rebuild)
.\scripts\deploy-git.ps1 -NoBuild
```

### `sync-secrets.ps1` - Atualizar Secrets
```powershell
# Envia .env.production local para VM
.\scripts\sync-secrets.ps1

# Sem reiniciar containers
.\scripts\sync-secrets.ps1 -NoRestart
```

### `rollback.ps1` - Rollback
```powershell
# Listar commits e escolher interativamente
.\scripts\rollback.ps1

# Voltar N commits
.\scripts\rollback.ps1 -Steps 1

# Voltar para commit específico
.\scripts\rollback.ps1 -Commit abc1234
```

### `vm-status.ps1` - Status da VM
```powershell
# Status básico
.\scripts\vm-status.ps1

# Com logs
.\scripts\vm-status.ps1 -Logs

# Com mais linhas de log
.\scripts\vm-status.ps1 -Logs -LogLines 50
```

---

## Configuração da VM

A VM de produção está configurada com:
- **Repositório**: `/mnt/stateful_partition/charhub`
- **Branch**: `main` (sempre)
- **Deploy Key**: Configurada para acesso read-only ao GitHub
- **.env**: Arquivo local, não versionado

---

## Checklist de Migração (Concluído)

- [x] Criar Deploy Key no GitHub para a VM
- [x] Clonar repositório na VM
- [x] Configurar .env na VM
- [x] Criar script `deploy-git.ps1`
- [x] Criar script `sync-secrets.ps1`
- [x] Criar script `rollback.ps1`
- [x] Criar script `vm-status.ps1`
- [x] Remover scripts antigos
- [ ] Testar deploy completo

---

## Evolução Futura

### GitHub Actions (CI/CD Automático)
Para implementar deploy automático no merge para `main`:

1. Criar workflow `.github/workflows/deploy.yml`
2. Configurar secrets no GitHub (SSH key, etc.)
3. Trigger: push para `main`

### Blue-Green Deploy (Zero Downtime)
Se necessário zero downtime no futuro:
1. Dois diretórios: `charhub-blue` e `charhub-green`
2. Nginx como proxy reverso
3. Alternar entre ambientes no deploy
