# CI/CD com GitHub Actions

> **Status**: PARCIALMENTE IMPLEMENTADO
> **Prioridade**: Alta
> **Complexidade**: Media
> **Ultima atualizacao**: 2025-12-02

## Resumo

Implementar CI/CD automatizado com GitHub Actions:
- ✅ Deploy automatico para producao (CONCLUÍDO)
- 🔲 Deploy automatico para staging (PENDENTE)
- 🔲 Testes automaticos em cada PR (PENDENTE - requer test suites)

## Status Atual

### ✅ CONCLUÍDO

1. **Workflow Deploy Production**
   - Arquivo: `.github/workflows/deploy-production.yml`
   - Status: ✅ Production Ready
   - Trigger: Push to main
   - Features:
     - SSH via static key
     - Git safe.directory handling
     - Docker-compose rebuild with --remove-orphans
     - Health checks via container status
     - Cloudflare tunnel credentials sync
   - Documentação: `docs/reviewer/deploy/CD_DEPLOY_GUIDE.md`

2. **Production VM Setup**
   - ✅ GCP Compute Engine instance
   - ✅ Container-Optimized OS
   - ✅ Docker Compose orchestration
   - ✅ Cloudflare tunnel for HTTPS
   - Documentação: `docs/reviewer/deploy/VM_SETUP_AND_RECOVERY.md`

3. **SSH Infrastructure**
   - ✅ Static RSA 4096-bit key in GitHub Secrets
   - ✅ OS Login configured on VM
   - ✅ Permission handling in workflow

## Pre-requisitos para Próximas Fases

Antes de implementar Staging:
- [ ] Criar VM staging (custo: ~R$90/mês)
- [ ] Configurar Cloudflare tunnel para staging.charhub.app
- [ ] Implementar testes automaticos (requer test suites)

---

## Fase Staging: Deploy Automatico para Staging Environment

### Status: 🔲 PENDENTE

> **Status**: Bloqueado por custos
> **Prioridade**: Alta
> **Data Sugerida**: Quando usuários > 100 ou receitas > R$1000/mês
> **Motivo**: Atualmente 7 usuários, custos crescentes, sem receitas

### Por que Staging é Importante

- **Testes isolados**: Validar mudanças sem afetar produção
- **Dados produção-like**: Testar com escala real antes de deploy
- **Rollback seguro**: Se algo quebrar, usuários não são afetados
- **Integração APIs**: Validar PayPal, Cloudflare, Gemini antes do deploy

### Setup quando Implementar

1. **Criar VM Staging**:
```bash
gcloud compute instances create charhub-vm-staging \
  --zone=us-central1-a \
  --machine-type=e2-micro \
  --image-family=cos-stable \
  --image-project=cos-cloud
```

2. **Cloudflare Tunnel**: `staging.charhub.app` → VM staging

3. **GitHub Workflow**: Deploy automático para staging após merge em main

4. **Fluxo Ideal**:
```
develop/feature → (CI) → main → (CD) → staging → (Manual Approval) → (CD) → production
```

### Why Staging is Important

- **Testes isolados**: Validar mudanças sem afetar produção
- **Dados produção-like**: Testar com escala real antes de deploy
- **Rollback seguro**: Se algo quebrar, usuários não são afetados
- **Integração APIs**: Validar PayPal, Cloudflare, Gemini antes do deploy

### Setup when Implementing

1. **Create Staging VM**:
```bash
gcloud compute instances create charhub-vm-staging \
  --zone=us-central1-a \
  --machine-type=e2-micro \
  --image-family=cos-stable \
  --image-project=cos-cloud
```

2. **Cloudflare Tunnel**: `staging.charhub.app` → VM staging

3. **GitHub Workflow**: Deploy automático para staging após merge em main

4. **Fluxo Ideal**:
```
main push → (CD) → staging → (Manual Approval) → (CD) → production
```

### Tarefas for Staging Implementation

- [ ] Quando receitas aumentarem, criar VM staging (custo: ~R$90/mês)
- [ ] Configurar Cloudflare tunnel para staging.charhub.app
- [ ] Implementar workflow `deploy-staging.yml`
- [ ] Adicionar notificações Slack/Discord para staging deploys
- [ ] Atualizar workflow `deploy-production.yml` para requer aprovação após staging tests

---

## Custos Atuais

- **GitHub Actions Free Tier**: 2000 min/mes (repos privados)
- **VM Production (e2-medium)**: ~$15-20/mes
- **Cloudflare Tunnel**: Free (included in Cloudflare Free plan)
- **Estimativa de uso CD**: ~1440 min/mes (dentro do free tier)

### Custos Futuros (com Staging)

- **VM Staging (e2-micro)**: ~$8/mes
- **Total mensal**: ~$23-28/mes

---

## Referencias

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [google-github-actions/auth](https://github.com/google-github-actions/auth)
- [Dependabot Configuration](https://docs.github.com/en/code-security/dependabot)

---

**Origem**: Extraido de `docs/FUTURE_CI_CD_GUIDE.md`
