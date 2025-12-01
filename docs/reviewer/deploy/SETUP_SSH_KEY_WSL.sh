#!/bin/bash
# Script para configurar SSH key para osLogin no GCP via WSL Ubuntu

set -e  # Exit on error

echo "======================================================"
echo "Setup SSH Key para Service Account com OS Login"
echo "======================================================"

# Step 1: Criar diretório
echo ""
echo "Step 1: Criando diretório para chaves SSH..."
mkdir -p ~/gcp-keys
echo "✅ Diretório criado: $HOME/gcp-keys"

# Step 2: Gerar SSH key pair
echo ""
echo "Step 2: Gerando SSH key pair..."
cd ~/gcp-keys

# Usar caminho absoluto para evitar problemas com tilde
ssh-keygen -t rsa -f "$HOME/gcp-keys/github-deployer-ssh" -b 2048 -N ""

echo "✅ Chaves geradas:"
echo "   Privada: $HOME/gcp-keys/github-deployer-ssh"
echo "   Pública:  $HOME/gcp-keys/github-deployer-ssh.pub"

# Step 3: Registrar chave pública no osLogin
echo ""
echo "Step 3: Registrando chave pública no osLogin do service account..."

# Usar caminho absoluto
gcloud compute os-login ssh-keys add \
  --key-file="$HOME/gcp-keys/github-deployer-ssh.pub" \
  --impersonate-service-account=github-deployer@charhub-prod.iam.gserviceaccount.com

echo "✅ Chave registrada no osLogin"

# Step 4: Obter POSIX username
echo ""
echo "Step 4: Obtendo POSIX username do service account..."

POSIX_USER=$(gcloud compute os-login describe-profile \
  --impersonate-service-account=github-deployer@charhub-prod.iam.gserviceaccount.com \
  --format="get(posixAccounts[0].username)")

echo "✅ POSIX username: $POSIX_USER"

# Step 5: Exibir resumo
echo ""
echo "======================================================"
echo "Próximos Passos:"
echo "======================================================"
echo ""
echo "1. Copie a chave privada:"
echo "   cat ~/gcp-keys/github-deployer-ssh"
echo ""
echo "2. No GitHub (Settings → Secrets and variables → Actions):"
echo "   - Crie secret: GCP_SSH_PRIVATE_KEY"
echo "   - Cole o conteúdo da chave privada"
echo ""
echo "3. Também crie no GitHub:"
echo "   - Secret: GCP_SSH_POSIX_USER"
echo "   - Valor: $POSIX_USER"
echo ""
echo "4. Teste SSH localmente:"
echo "   ssh -i ~/gcp-keys/github-deployer-ssh $POSIX_USER@<IP-DA-VM>"
echo ""
echo "======================================================"
echo "✅ Setup SSH Key Concluído!"
echo "======================================================"
