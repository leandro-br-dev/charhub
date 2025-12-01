# Configurar SSH para Service Account com OS Login

## Problema

Quando OS Login está habilitado na VM, toda SSH key precisa ser registrada no osLogin do service account. O GitHub Actions gera uma nova chave a cada execução, que não está registrada, causando "Permission denied (publickey)".

## Solução

Criar e registrar uma SSH key permanente para o service account `github-deployer`.

### Step 1: Criar SSH Key Pair

Execute no seu terminal local:

```bash
# Criar diretório para as chaves
mkdir -p ~/gcp-keys
cd ~/gcp-keys

# Gerar RSA key pair (sem passphrase para CI/CD)
ssh-keygen -t rsa -f github-deployer-ssh -b 2048 -N ""

# Resultado: dois arquivos
# github-deployer-ssh        (chave privada)
# github-deployer-ssh.pub    (chave pública)
```

### Step 2: Registrar a Chave Pública no Service Account

```bash
# Registrar a chave pública no osLogin do service account
gcloud compute os-login ssh-keys add \
  --key-file=~/gcp-keys/github-deployer-ssh.pub \
  --impersonate-service-account=github-deployer@charhub-prod.iam.gserviceaccount.com

# Esperado output:
# Created SSH key: [FINGERPRINT]
# Login profile for user: sa_XXXXXXXXXXXXX
```

**Copie o número do usuário POSIX** (sa_XXXXXXXXXXXXX). Você precisará dele no próximo passo.

### Step 3: Obter o Usuário POSIX do Service Account

```bash
# Se não anotou no passo anterior, pode recuperar com:
gcloud compute os-login describe-profile \
  --impersonate-service-account=github-deployer@charhub-prod.iam.gserviceaccount.com

# Esperado output:
# name: users/XXXXXXXXXXXXXXXXXXXXXXXXXXXXX/loginProfiles/1234567890
# posixAccounts:
# - gecos: sa_110491369899107386224
#   gid: '1234567890'
#   homeDirectory: /home/sa_110491369899107386224
#   operatingSystemType: LINUX
#   uid: '1234567890'
#   username: sa_110491369899107386224

# Copie o username: sa_110491369899107386224
```

### Step 4: Adicionar Chave Privada no GitHub Secrets

1. Copie o conteúdo da chave privada:
   ```bash
   cat ~/gcp-keys/github-deployer-ssh
   ```

2. Vá para GitHub:
   - Settings → Secrets and variables → Actions
   - Clique em "New repository secret"
   - Nome: `GCP_SSH_PRIVATE_KEY`
   - Valor: Cole o conteúdo inteiro da chave privada

3. Vá para GitHub:
   - Settings → Secrets and variables → Actions
   - Clique em "New repository secret"
   - Nome: `GCP_SSH_POSIX_USER`
   - Valor: `sa_110491369899107386224` (o número que você copiou)

### Step 5: Atualizar o Workflow

Modifique `.github/workflows/deploy-production.yml` para usar a chave privada registrada:

```yaml
      - name: Setup SSH for Service Account
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.GCP_SSH_PRIVATE_KEY }}" > ~/.ssh/github-deployer-ssh
          chmod 600 ~/.ssh/github-deployer-ssh
          ssh-keyscan -H $(gcloud compute instances list --filter="name:charhub-vm" --format="get(networkInterfaces[0].accessConfigs[0].natIP)") >> ~/.ssh/known_hosts 2>/dev/null || true

      - name: Test SSH connection
        run: |
          echo "🔌 Testing SSH connection to VM..."
          ssh -i ~/.ssh/github-deployer-ssh ${{ secrets.GCP_SSH_POSIX_USER }}@$(gcloud compute instances describe charhub-vm --zone=us-central1-a --format="get(networkInterfaces[0].accessConfigs[0].natIP)") "echo '✅ SSH connection successful'"
```

**OU, Forma Alternativa (Mais Simples)**: Usar o gcloud com a chave privada registrada:

```yaml
      - name: Setup SSH for Service Account
        env:
          SSH_KEY: ${{ secrets.GCP_SSH_PRIVATE_KEY }}
        run: |
          mkdir -p ~/.ssh
          echo "$SSH_KEY" > ~/.ssh/google_compute_engine
          chmod 600 ~/.ssh/google_compute_engine

      - name: Test SSH connection
        run: |
          echo "🔌 Testing SSH connection to VM..."
          gcloud compute ssh charhub-vm \
            --zone=us-central1-a \
            --command="echo '✅ SSH connection successful'"
```

## Verificação

Após completar todos os passos, teste manualmente:

```bash
# Testar se a chave está registrada
gcloud compute os-login ssh-keys list \
  --impersonate-service-account=github-deployer@charhub-prod.iam.gserviceaccount.com

# Esperado: deve listar sua chave com fingerprint
```

## Se Algo Deu Errado

### Chave não foi registrada
```bash
# Tente novamente com mais detalhes
gcloud compute os-login ssh-keys add \
  --key-file=~/gcp-keys/github-deployer-ssh.pub \
  --impersonate-service-account=github-deployer@charhub-prod.iam.gserviceaccount.com \
  --verbosity=debug
```

### Permissão negada ao usar a chave
```bash
# Verificar se o service account tem os dois roles
gcloud projects get-iam-policy charhub-prod \
  --flatten="bindings[].members" \
  --filter="bindings.members:github-deployer@charhub-prod.iam.gserviceaccount.com"

# Esperado: roles/compute.osLogin
# Se não tiver, adicione:
gcloud projects add-iam-policy-binding charhub-prod \
  --member=serviceAccount:github-deployer@charhub-prod.iam.gserviceaccount.com \
  --role=roles/compute.osLogin
```

### IP Externo da VM mudou
```bash
# Se a VM foi recreada, o IP pode ter mudado
gcloud compute instances describe charhub-vm \
  --zone=us-central1-a \
  --format="get(networkInterfaces[0].accessConfigs[0].natIP)"
```

## Segurança

⚠️ **IMPORTANTE**:
- A chave privada está armazenada em GitHub Secrets (encrypted)
- Ela só é usada em GitHub Actions runners (ambiente confiável)
- A chave não é commitada no git
- A chave pode ser rotacionada a qualquer momento
- Se comprometida, delete e gere nova chave

Para remover uma chave comprometida:
```bash
# Listar fingerprints
gcloud compute os-login ssh-keys list \
  --impersonate-service-account=github-deployer@charhub-prod.iam.gserviceaccount.com

# Remover por fingerprint
gcloud compute os-login ssh-keys remove --fingerprint=<FINGERPRINT> \
  --impersonate-service-account=github-deployer@charhub-prod.iam.gserviceaccount.com
```

---

**Próximo passo**: Execute os comandos acima e atualize o workflow conforme instruído.
