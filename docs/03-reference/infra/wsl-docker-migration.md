# Migração para Docker Nativo no WSL

Este guia descreve como parar de usar o Docker Desktop (que pode ser lento devido à tradução de chamadas de sistema entre Windows e Linux) e passar a usar o Docker Engine nativo instalado diretamente no WSL (Ubuntu).

## Por que migrar?
- **Performance I/O**: Operações de disco (como `npm install` ou hot-reload) são muito mais rápidas.
- **Menor Consumo de RAM**: O Docker Desktop consome muita memória no Windows (Vmmem). O nativo usa apenas o kernel do Linux.
- **Estabilidade**: Menos problemas de sincronização de arquivos.

## Passo a Passo

### 1. Execute o Script de Instalação
Criamos um script automático para configurar o ambiente:

```bash
chmod +x scripts/install-native-docker.sh
./scripts/install-native-docker.sh
```

### 2. Desconecte o Docker Desktop
O Docker Desktop tenta injetar seu próprio `docker-cli` no WSL. Precisamos impedir isso para que o Linux use o que acabamos de instalar.

1. Abra o **Docker Desktop** no Windows.
2. Vá em **Settings** (Engrenagem) -> **Resources** -> **WSL Integration**.
3. **Desmarque** o switch da sua distribuição (ex: `Ubuntu`).
4. Clique em **Apply & Restart**.
5. (Opcional) Se quiser economizar RAM, você pode fechar totalmente o Docker Desktop. O Docker dentro do WSL funcionará independentemente.

### 3. Reinicie o Terminal
Para que as alterações de grupo de usuário (`usermod`) tenham efeito:
1. Feche o terminal do VSCode/Windows Terminal.
2. Abra-o novamente.

### 4. Verifique a Instalação
Rode:
```bash
docker info
```
Procure por `Name: ...` (deve ser o nome da máquina host) e não algo relacionado ao Docker Desktop.
Rode um teste:
```bash
docker run --rm hello-world
```

## Solução de Problemas Comuns

### Erro: "Cannot connect to the Docker daemon"
Se o comando `docker` falhar, o serviço pode não ter iniciado automaticamente. No WSL, o `systemd` às vezes não inicia serviços automaticamente no boot (dependendo da versão do WSL).

Para iniciar manualmente:
```bash
sudo service docker start
```

Para garantir que inicie sempre, você pode adicionar ao seu `.bashrc` ou `.zshrc`:
```bash
if service docker status 2>&1 | grep -q "is not running"; then
    wsl.exe -u root -e service docker start >/dev/null 2>&1
fi
```
*(Nota: isso requer que seu usuário tenha acesso sudo sem senha ou configuraçao no visudo)*

### Erro de Credenciais (docker-credential-desktop)
Se o `docker-compose` reclamar de credenciais, remova o `credsStore` do arquivo de config:
Abra `~/.docker/config.json` e remova a linha `"credsStore": "desktop.exe"`.
