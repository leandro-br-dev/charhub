# Sistema de Creditos - Fases Pendentes

> **Status**: Fases 1-2 COMPLETAS, Fases 3-5 pendentes
> **Prioridade**: Media
> **Complexidade**: Media
> **Ultima atualizacao**: 2025-11-23

## Status Atual

### Fases Completas

| Fase | Descricao | Status |
|------|-----------|--------|
| 1 - Core System | Schema, Services, API, Frontend | COMPLETO |
| 2 - Plans & Subscriptions | PayPal integration, Planos | COMPLETO |

### O Que Ja Esta Implementado

**Backend:**
- Models: CreditTransaction, ServiceCreditCost, Plan, UserPlan, etc.
- 18 tipos de servicos com custos configurados
- creditService.ts com todas funcoes principais
- usageService.ts para tracking de uso
- Jobs BullMQ para processamento mensal
- API endpoints completa (/api/v1/credits/*)
- Integracao PayPal para assinaturas

**Frontend:**
- CreditsDisplay no header
- DailyRewardButton
- Pagina de creditos (/credits)
- Pagina de planos (/plans)
- Fluxo de assinatura com PayPal

---

## Fase 3: Sistema de Referrals (1 semana)

### Backend

- [ ] Gerar codigo de referral unico no signup
- [ ] Adicionar campo `referralCode` em User model (se nao existir)
- [ ] Endpoint `GET /api/v1/referrals/code` - Obter codigo
- [ ] Endpoint `POST /api/v1/referrals/validate` - Validar codigo no signup
- [ ] `processReferral()` - Conceder recompensas:
  - 500 creditos ao indicador
  - 5 dias de acesso Plus (UserPlusAccess)
- [ ] Testes unitarios

### Frontend

- [ ] Componente `ReferralLink.tsx`
  - Input com link copiavel
  - Botoes de compartilhamento (WhatsApp, Twitter, Facebook)
- [ ] Estatisticas de referrals no perfil:
  - Total de indicacoes
  - Creditos ganhos
  - Dias Plus ganhos
- [ ] Integrar validacao de codigo no signup

**Estimativa**: 20-30 horas

---

## Fase 4: Admin Dashboard (1 semana)

### Backend

- [ ] Endpoints admin (require role ADMIN):
  - `POST /api/v1/admin/credits/adjust` - Ajuste manual
  - `GET /api/v1/admin/credits/stats` - Estatisticas gerais
  - `GET /api/v1/admin/usage/report` - Relatorio de uso
  - `PATCH /api/v1/admin/service-costs/:id` - Editar custos
- [ ] Middleware de autorizacao admin
- [ ] Queries de analytics

### Frontend

- [ ] Pagina `/admin/credits`
  - Dashboard com metricas
  - Buscar usuario e ajustar creditos
  - Visualizar historico
- [ ] Pagina `/admin/service-costs`
  - Tabela editavel de custos
  - Preview de impacto
- [ ] Graficos com Recharts ou similar

**Estimativa**: 20-30 horas

---

## Fase 5: Compra Avulsa de Creditos (Futuro)

### Pacotes Propostos

| Pacote | Creditos | Preco | Bonus |
|--------|----------|-------|-------|
| Starter | 500 | $5 | - |
| Popular | 1200 | $10 | +20% |
| Value | 3000 | $20 | +50% |

### Implementacao

- [ ] Endpoint `POST /api/v1/credits/purchase`
- [ ] Checkout one-time com PayPal
- [ ] Frontend com selecao de pacotes
- [ ] Integracao com gateway de pagamento

**Estimativa**: 15-20 horas

---

## Metricas a Implementar

### Queries Uteis

```sql
-- Conversion rate (free para pago)
SELECT
  COUNT(DISTINCT CASE WHEN plan.price_usd_monthly > 0 THEN up.user_id END) * 100.0
  / COUNT(DISTINCT up.user_id) as conversion_rate
FROM user_plans up
JOIN plans plan ON up.plan_id = plan.id
WHERE up.status = 'ACTIVE';

-- Top servicos por consumo
SELECT
  service_type,
  COUNT(*) as usage_count,
  SUM(credits_consumed) as total_credits
FROM usage_logs
WHERE credits_consumed IS NOT NULL
GROUP BY service_type
ORDER BY total_credits DESC
LIMIT 10;

-- Daily reward claim rate
SELECT
  DATE(timestamp) as date,
  COUNT(DISTINCT user_id) as users_claimed
FROM credit_transactions
WHERE transaction_type = 'SYSTEM_REWARD'
  AND notes = 'daily_login_reward'
GROUP BY DATE(timestamp);
```

---

## Referencias

- `docs/features/CREDITS_SYSTEM.md` - Documento completo original
- `backend/src/services/creditService.ts` - Service implementado
- `backend/src/routes/v1/credits.ts` - Rotas API
- `frontend/src/pages/credits/` - Paginas frontend

---

**Origem**: Extraido de `docs/features/CREDITS_SYSTEM.md` (Fases 3-5)
