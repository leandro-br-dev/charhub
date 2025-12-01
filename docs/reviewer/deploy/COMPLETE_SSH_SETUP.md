# Configuração Completa: SSH Key para GitHub Actions com osLogin

## Checklist Final

- [ ] Step 1: Dar permissão à sua conta (PowerShell)
- [ ] Step 2: Registrar chave no osLogin (WSL Ubuntu)
- [ ] Step 3: Obter POSIX username (WSL Ubuntu)
- [ ] Step 4: Adicionar secrets no GitHub (Browser)
- [ ] Step 5: Testar localmente (WSL Ubuntu)
- [ ] Step 6: Testar no GitHub Actions (Browser)

---

## Step 1: Dar Permissão à Sua Conta (PowerShell)

Sua conta pessoal precisa ter permissão para se passar por (impersonate) o service account.

**No PowerShell (que você já tem autenticado):**

```powershell
gcloud iam service-accounts add-iam-policy-binding github-deployer@charhub-prod.iam.gserviceaccount.com `
  --member=user:leandro.br.dev@gmail.com `
  --role=roles/iam.serviceAccountTokenCreator
```

**Esperado:**
```
Updated IAM policy for serviceAccount [github-deployer@charhub-prod.iam.gserviceaccount.com].
```

---

## Step 2: Registrar Chave Pública no osLogin (WSL Ubuntu)

Agora que você tem permissão, registre a chave pública.

**No WSL Ubuntu:**

```bash
gcloud compute os-login ssh-keys add \
  --key-file=$HOME/gcp-keys/github-deployer-ssh.pub \
  --impersonate-service-account=github-deployer@charhub-prod.iam.gserviceaccount.com
```

**Esperado:**
```
Created SSH key: sha256:XXXXXXXXXXXXXXXXXXXXXXXXXXXXX
Login profile for user: sa_XXXXXXXXXXXXXXXXXX
```

---

## Step 3: Obter POSIX Username (WSL Ubuntu)

Copie o número `sa_XXXXXXXXXXXXXXXXXX` que apareceu acima. Se precisar recuperar depois:

```bash
gcloud compute os-login describe-profile \
  --impersonate-service-account=github-deployer@charhub-prod.iam.gserviceaccount.com \
  --format="get(posixAccounts[0].username)"
```

**Resultado:** `sa_XXXXXXXXXXXXXXXXXX`

---

## Step 4: Adicionar Secrets no GitHub

### Secret 1: GCP_SSH_PRIVATE_KEY

1. No WSL Ubuntu, copie a chave privada:
   ```bash
   cat $HOME/gcp-keys/github-deployer-ssh
   ```

2. No GitHub (Settings → Secrets and variables → Actions):
   - Clique em **New repository secret**
   - **Name:** `GCP_SSH_PRIVATE_KEY`
   - **Secret:** Cole **TODO O CONTEÚDO** (de `-----BEGIN...` até `-----END...`)
   - Clique em **Add secret**

### Secret 2: GCP_SSH_POSIX_USER

1. No GitHub (Settings → Secrets and variables → Actions):
   - Clique em **New repository secret**
   - **Name:** `GCP_SSH_POSIX_USER`
   - **Secret:** `sa_XXXXXXXXXXXXXXXXXX` (aquele do Step 3)
   - Clique em **Add secret**

---

## Step 5: Testar Localmente (WSL Ubuntu)

Obtenha o IP da VM e teste SSH:

```bash
# Obter IP da VM
VM_IP=$(gcloud compute instances describe charhub-vm \
  --zone=us-central1-a \
  --format="get(networkInterfaces[0].accessConfigs[0].natIP)")

echo "IP da VM: $VM_IP"

# Testar SSH com a chave privada
POSIX_USER=$(gcloud compute os-login describe-profile \
  --impersonate-service-account=github-deployer@charhub-prod.iam.gserviceaccount.com \
  --format="get(posixAccounts[0].username)")

ssh -i $HOME/gcp-keys/github-deployer-ssh $POSIX_USER@$VM_IP "echo 'SSH Funciona!'"
```

**Esperado:**
```
SSH Funciona!
```

Se ver isso, significa que a chave está corretamente registrada e funcionando! ✅

---

## Step 6: Testar no GitHub Actions (Browser)

1. Vá para: https://github.com/leandro-br-dev/charhub/actions
2. Clique em: **Deploy to Production**
3. Clique em: **Run workflow**
4. Selecione: **main**
5. Clique em: **Run workflow**

**Na saída, procure por:**
```
✅ SSH key configured for service account
🔌 Testing SSH connection to VM...
✅ SSH connection successful
```

Se ver isso, o deploy automático está funcionando! 🎉

---

## Troubleshooting

### Erro: "PERMISSION_DENIED: Failed to impersonate"

**Causa:** Você não completou o Step 1 (dar permissão à sua conta).

**Solução:** Execute no PowerShell:
```powershell
gcloud iam service-accounts add-iam-policy-binding github-deployer@charhub-prod.iam.gserviceaccount.com `
  --member=user:leandro.br.dev@gmail.com `
  --role=roles/iam.serviceAccountTokenCreator
```

### Erro: "Unable to read file"

**Causa:** Caminho com `~` não está sendo expandido.

**Solução:** Use `$HOME` em vez de `~`:
```bash
gcloud compute os-login ssh-keys add \
  --key-file=$HOME/gcp-keys/github-deployer-ssh.pub \
  --impersonate-service-account=github-deployer@charhub-prod.iam.gserviceaccount.com
```

### Erro: "Permission denied (publickey)" no teste local

**Causa:** Chave privada não tem permissão de leitura.

**Solução:**
```bash
chmod 600 $HOME/gcp-keys/github-deployer-ssh
```

### Erro no GitHub Actions: "SSH key not found"

**Causa:** Secret `GCP_SSH_PRIVATE_KEY` não foi adicionado corretamente.

**Solução:**
1. Verifique que copiou a chave **INTEIRA** (desde `-----BEGIN` até `-----END`)
2. Teste localmente primeiro (Step 5)
3. Recrie o secret se necessário

---

## Resumo da Configuração

| Component | Status | Próximo Passo |
|-----------|--------|---------------|
| Permissão IAM | ⏳ Step 1 | Execute no PowerShell |
| SSH Key Gerada | ✅ Completo | Step 2 |
| Registrada em osLogin | ⏳ Step 2 | Execute no WSL |
| GitHub Secrets | ⏳ Step 4 | Adicione no GitHub |
| Teste Local | ⏳ Step 5 | Execute no WSL |
| Teste GitHub Actions | ⏳ Step 6 | Execute no GitHub |

---

**Status**: Pronto para começar do Step 1
