#!/bin/bash
set -e

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}[INFO] Iniciando instalação do Docker Nativo no WSL...${NC}"

# 1. Remover versões conflitantes/antigas
echo -e "${BLUE}[INFO] Removendo instalações antigas ou do Docker Desktop...${NC}"
for pkg in docker.io docker-doc docker-compose docker-compose-v2 podman-docker containerd runc; do sudo apt-get remove $pkg; done

# 2. Configurar Repositório Docker Oficial
echo -e "${BLUE}[INFO] Adicionando repositório oficial do Docker...${NC}"
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
if [ ! -f /etc/apt/keyrings/docker.gpg ]; then
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
fi

echo \
  "deb [arch=\"$(dpkg --print-architecture)\" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 3. Instalar Docker Engine
echo -e "${BLUE}[INFO] Instalando Docker Engine, CLI e Compose...${NC}"
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 4. Configurar IPTables (Comum problema no WSL)
echo -e "${BLUE}[INFO] Ajustando alternativas do iptables para legado (fix comum para WSL)...${NC}"
sudo update-alternatives --set iptables /usr/sbin/iptables-legacy || true
sudo update-alternatives --set ip6tables /usr/sbin/ip6tables-legacy || true

# 5. Iniciar serviço
echo -e "${BLUE}[INFO] Iniciando serviço Docker...${NC}"
sudo service docker start

# 6. Adicionar usuário atual ao grupo docker
echo -e "${BLUE}[INFO] Adicionando usuário '$USER' ao grupo docker...${NC}"
sudo usermod -aG docker $USER

echo -e "${GREEN}[SUCESSO] Instalação concluída!${NC}"
echo -e "${YELLOW}[IMPORTANTE] Para finalizar a migração:${NC}"
echo "1. No Windows, abra o Docker Desktop -> Settings -> Resources -> WSL Integration."
echo "2. DESMARQUE a sua distribuição atual (Ubuntu) e clique em Apply."
echo "3. Feche este terminal e abra novamente para aplicar as permissões de grupo."
echo "4. Teste rodando: docker run hello-world"
