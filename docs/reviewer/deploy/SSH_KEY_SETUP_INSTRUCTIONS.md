# Configurar SSH Key para GitHub Actions (Passo a Passo)

## Situação Atual

- ✅ osLogin está habilitado na VM
- ❌ Chave SSH do GitHub Actions não está registrada
- ❌ Por isso: "Permission denied (publickey)"

## Solução em 5 Passos

### Passo 1: Autenticar gcloud no WSL Ubuntu

No terminal WSL Ubuntu, execute:

```bash
gcloud auth login
```

Isso vai abrir um navegador para você fazer login na sua conta Google. Depois disso, defina o projeto padrão:

```bash
gcloud config set project charhub-prod
gcloud config set compute/zone us-central1-a
```

### Passo 2: Gerar SSH Key Pair

No terminal WSL Ubuntu, execute estes comandos **exatamente assim** (use o caminho absoluto, sem tilde):

```bash
mkdir -p ~/gcp-keys

ssh-keygen -t rsa -f ~/gcp-keys/github-deployer-ssh -b 2048 -N ""
```

**Resultado esperado:**
```
Generating public/private rsa key pair.
Your identification has been saved in /home/[seu-user]/gcp-keys/github-deployer-ssh
Your public key has been saved in /home/[seu-user]/gcp-keys/github-deployer-ssh.pub
```

### Passo 3: Registrar Chave Pública no osLogin

Execute (com caminho absoluto):

```bash
gcloud compute os-login ssh-keys add \
  --key-file=~/gcp-keys/github-deployer-ssh.pub \
  --impersonate-service-account=github-deployer@charhub-prod.iam.gserviceaccount.com
```

**Resultado esperado:**
```
Created SSH key: [SHA256:XXXXX]
Login profile for user: sa_XXXXXXXXXXXXXXXXXX
```

**Copie o número do usuário POSIX** (sa_XXXXXXXXXXXXXXXXXX). Você vai precisar nos próximos passos.

### Passo 4: Adicionar Secrets no GitHub

#### 4a. Copiar chave privada

No WSL Ubuntu, execute:

```bash
cat ~/gcp-keys/github-deployer-ssh
```

Copie **todo o conteúdo** que aparecer na tela (começa com `-----BEGIN RSA PRIVATE KEY-----`).

#### 4b. Adicionar primeiro secret

No GitHub:
1. Vá para: **Settings** → **Secrets and variables** → **Actions**
2. Clique em **New repository secret**
3. Nome: `GCP_SSH_PRIVATE_KEY`
4. Valor: Cole o conteúdo copiado acima
5. Clique em **Add secret**

#### 4c. Adicionar segundo secret

No GitHub:
1. Clique em **New repository secret** novamente
2. Nome: `GCP_SSH_POSIX_USER`
3. Valor: `sa_XXXXXXXXXXXXXXXXXX` (aquele que você copiou no Passo 3)
4. Clique em **Add secret**

### Passo 5: Testar

No WSL Ubuntu, teste SSH manualmente:

```bash
# Obter IP da VM
VM_IP=$(gcloud compute instances describe charhub-vm \
  --zone=us-central1-a \
  --format="get(networkInterfaces[0].accessConfigs[0].natIP)")

echo "IP da VM: $VM_IP"

# Testar SSH com a chave
ssh -i ~/gcp-keys/github-deployer-ssh sa_XXXXXXXXXXXXXXXXXX@$VM_IP "echo 'SSH works!'"
```

**Esperado**: `SSH works!` sem erros de permissão

## Agora Sim: Testar no GitHub Actions

1. Vá para: https://github.com/leandro-br-dev/charhub/actions
2. Clique em: **Deploy to Production**
3. Clique em: **Run workflow**
4. Selecione: **main**
5. Clique em: **Run workflow**

**Esperado na saída**:
```
✅ SSH key configured for service account
✅ SSH connection successful
```

Se vir isso, significa que tudo funcionou! 🎉

## Troubleshooting

### Erro: "No such file or directory"

Se você recebeu esse erro ao registrar a chave:
```
ERROR: Unable to read file [~/gcp-keys/github-deployer-ssh.pub]
```

Use o caminho completo:
```bash
gcloud compute os-login ssh-keys add \
  --key-file=$HOME/gcp-keys/github-deployer-ssh.pub \
  --impersonate-service-account=github-deployer@charhub-prod.iam.gserviceaccount.com
```

### Erro: "Permission denied (publickey)" no teste local

Significa que a chave não foi registrada corretamente. Verifique:

```bash
# Listar chaves registradas
gcloud compute os-login ssh-keys list \
  --impersonate-service-account=github-deployer@charhub-prod.iam.gserviceaccount.com
```

Deve listar a chave que você adicionou.

### Erro: gcloud not found no WSL

Você precisa instalar o Google Cloud SDK no WSL Ubuntu:

```bash
# Instalar gcloud
curl https://sdk.cloud.google.com | bash

# Reiniciar terminal
exec -l $SHELL

# Verificar instalação
gcloud --version
```

Depois faça o login:
```bash
gcloud auth login
```

---

**Status**: Pronto para testar após completar os 5 passos acima.
