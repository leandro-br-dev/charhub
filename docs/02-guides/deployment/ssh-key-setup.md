# SSH Key Setup - Windows + WSL to DBeaver

**Date**: 2025-12-02
**Purpose**: Copy SSH key from WSL to Windows for DBeaver access

---

## 📋 Quick Summary

A chave privada SSH está no WSL em `/root/.ssh/google_compute_engine`. Você precisa copiar para Windows em `C:\Users\Leandro\.ssh\` para usar no DBeaver.

---

## 🔑 Opção 1: Copiar via WSL (RECOMENDADO)

### No Windows PowerShell:

```powershell
# 1. Criar pasta .ssh no Windows se não existir
mkdir "C:\Users\Leandro\.ssh" -ErrorAction SilentlyContinue

# 2. Copiar chave do WSL para Windows
wsl cp /root/.ssh/google_compute_engine "C:\Users\Leandro\.ssh\google_compute_engine"

# 3. Copiar também a chave pública
wsl cp /root/.ssh/google_compute_engine.pub "C:\Users\Leandro\.ssh\google_compute_engine.pub"

# 4. Verificar que foi copiado
ls "C:\Users\Leandro\.ssh\"
```

**Esperado:**
```
    Directory: C:\Users\Leandro\.ssh

Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
-a----         12/2/2025   9:00 AM           2610 google_compute_engine
-a----         12/2/2025   9:00 AM            574 google_compute_engine.pub
```

---

## 🔑 Opção 2: Copiar via Windows WSL (Alternativa)

```powershell
# Dentro do WSL:
cat /root/.ssh/google_compute_engine

# Copiar TODO O CONTEÚDO (entre -----BEGIN e -----END)
# Colar em um arquivo no Windows:
# C:\Users\Leandro\.ssh\google_compute_engine
```

---

## ✅ Verificar Permissões (IMPORTANTE)

A chave privada deve ter permissões restritas:

### Windows:
```powershell
# 1. Clique direito no arquivo "google_compute_engine"
# 2. Properties → Security → Advanced
# 3. Remove "Users" (deixar apenas seu usuário)
# 4. Apply → OK

# OU via PowerShell (run as admin):
$path = "C:\Users\Leandro\.ssh\google_compute_engine"
$acl = Get-Acl $path
$acl.SetAccessRuleProtection($true, $false)
$rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
    "$env:USERNAME", "FullControl", "Allow")
$acl.SetAccessRule($rule)
Set-Acl -Path $path -AclObject $acl
```

---

## 🔗 Usar no DBeaver

Depois de copiar a chave:

1. Abrir DBeaver
2. File → New → Database Connection → PostgreSQL
3. Na aba "SSH Tunnel":
   - Check: "SSH Tunnel"
   - Host: `34.66.66.202`
   - Port: `22`
   - Username: `leandro_br_dev_gmail_com`
   - Authentication: Public Key
   - **Private Key File**: `C:\Users\Leandro\.ssh\google_compute_engine`
4. Test Connection ✅

---

## 🎯 Resumo das Chaves

| Arquivo | Localização WSL | Localização Windows | Uso |
|---------|-----------------|-------------------|-----|
| `google_compute_engine` | `/root/.ssh/` | `C:\Users\Leandro\.ssh\` | Chave privada (para SSH) |
| `google_compute_engine.pub` | `/root/.ssh/` | `C:\Users\Leandro\.ssh\` | Chave pública (referência) |

---

## 🔐 Segurança

- ✅ Nunca compartilhe a chave privada
- ✅ Mantenha permissões restritas (apenas seu usuário)
- ✅ Não commit para git (já está em .gitignore)
- ✅ Cada ambiente diferente pode ter sua chave

---

## 🔧 Troubleshooting

### Erro: "cp: cannot stat '/root/.ssh/google_compute_engine': No such file or directory"

**Causa**: Quando você executa `wsl cp` do PowerShell Windows, o WSL pode não estar acessando a pasta correta.

**Solução**:

```powershell
# 1. Primeiro, confirme que WSL está acessando a pasta correta:
wsl ls -la /root/.ssh/

# Esperado: Você verá os arquivos google_compute_engine e google_compute_engine.pub

# 2. Se ainda tiver erro, tente com caminho absoluto:
wsl cp /root/.ssh/google_compute_engine "/mnt/c/Users/Leandro/.ssh/google_compute_engine"

# 3. Ou manualmente dentro do WSL:
wsl
cd /root/.ssh
cat google_compute_engine
# Copiar o conteúdo completo (entre -----BEGIN e -----END)

# 4. No Windows PowerShell, criar o arquivo:
$content = @"
[COLAR CONTEÚDO AQUI]
"@
$content | Out-File "C:\Users\Leandro\.ssh\google_compute_engine" -Encoding UTF8 -NoNewline
```

### Erro: DBeaver não consegue conectar via SSH Tunnel

**Possíveis causas**:
1. SSH key não tem permissões corretas no Windows
2. IP da VM mudou (verifique: `gcloud compute instances describe charhub-vm`)
3. PostgreSQL não está rodando no container

**Verificar**:
```bash
# Verificar acesso SSH direto
ssh -i "C:\Users\Leandro\.ssh\google_compute_engine" leandro_br_dev_gmail_com@34.66.66.202 echo "SSH works"

# Se falhar, tente:
ssh-keygen -y -f "C:\Users\Leandro\.ssh\google_compute_engine"  # Testar chave
```

---

**Próximo Passo**: Depois de copiar a chave, você pode conectar ao banco de dados via DBeaver usando o `DATABASE_CONNECTION_GUIDE.md`
