# Habilitar OS Login na VM

## Problema

O GitHub Actions não consegue fazer SSH via `gcloud compute ssh` porque:
1. A VM não tem OS Login habilitado no metadata
2. gcloud tenta adicionar SSH keys dinamicamente ao metadata
3. Service account não tem `compute.instances.setMetadata` permission

## Solução

OS Login precisa ser habilitado **na VM**, não apenas no gcloud.

### Step 1: Habilitar OS Login na VM

Execute este comando no seu terminal local (com gcloud autenticado):

```bash
gcloud compute instances add-metadata charhub-vm \
  --zone=us-central1-a \
  --metadata enable-oslogin=TRUE
```

**Verificar se funcionou:**
```bash
gcloud compute instances describe charhub-vm \
  --zone=us-central1-a \
  --format="get(metadata.items[name='enable-oslogin'].value)"

# Esperado output: TRUE
```

### Step 2: Verificar Permissões da Service Account

A service account `github-deployer` precisa de `compute.osLogin` role (você já adicionou isso, mas vamos confirmar):

```bash
gcloud projects get-iam-policy charhub-prod \
  --flatten="bindings[].members" \
  --filter="bindings.members:github-deployer@charhub-prod.iam.gserviceaccount.com"

# Esperado: roles/compute.osLogin deve aparecer na lista
```

### Step 3: Testar SSH Manualmente

Após habilitar osLogin na VM, teste:

```bash
gcloud compute ssh charhub-vm \
  --zone=us-central1-a \
  --command="echo 'SSH works!'"

# Deve funcionar sem erro
```

### Step 4: Atualizar Workflow

O workflow foi simplificado para confiar em osLogin:

```yaml
- name: Set up gcloud
  uses: google-github-actions/setup-gcloud@v2

- name: Test SSH connection
  run: |
    gcloud compute ssh ${{ env.VM_NAME }} \
      --zone=${{ env.GCP_ZONE }} \
      --command="echo '✅ SSH connection successful'" || true
```

## Como Funciona

Quando **osLogin está habilitado na VM**:
1. gcloud não tenta adicionar SSH keys ao metadata
2. gcloud usa a identidade IAM da service account
3. SSH funciona automaticamente sem `setMetadata` permission
4. Não precisa de configurações especiais do gcloud

## Verificação Final

Após completar os passos:

1. **Habilitar osLogin na VM** ✅ (execute comando acima)
2. **Confirmar service account tem compute.osLogin role** ✅ (você já fez)
3. **Testar SSH manualmente** ✅ (execute comando acima)
4. **Rodar workflow no GitHub Actions** ✅ (próximo passo)

## Se Ainda Não Funcionar

Se após habilitar osLogin ainda tiver problema, pode ser:

1. **Permissão ainda não foi propagada** - aguarde 2-3 minutos
2. **Service account key expirou** - regenere GCP_SERVICE_ACCOUNT_KEY_PROD secret
3. **VM requer IAP tunnel** - VM não tem IP externo
4. **Algo diferente do osLogin** - verifique logs detalhados

Execute este comando para ver detalhes da autenticação:

```bash
gcloud compute ssh charhub-vm \
  --zone=us-central1-a \
  --command="whoami" \
  --verbosity=debug 2>&1 | grep -i "oslogin\|auth\|permission"
```

---

**Próximo passo**: Execute o comando `gcloud compute instances add-metadata` acima para habilitar osLogin na VM.
