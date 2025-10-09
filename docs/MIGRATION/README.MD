# Plano de Migração do Projeto CharHub

Bem-vindo à documentação centralizada para a migração do projeto CharHub da stack Python/FastAPI para Node.js/Express.

---

## 🗺️ Como Usar Esta Documentação

Para uma migração bem-sucedida, utilize os arquivos na seguinte ordem e propósito:

| # | Arquivo | Propósito | Quando Usar |
|---|---|---|---|
| 1 | **[01_RESUMO_EXECUTIVO.md](./01_RESUMO_EXECUTIVO.md)** | **Visão Geral e Estratégia.** Contém o "porquê", o escopo, o cronograma e as decisões chave. | **Leia primeiro.** Ideal para entender o projeto e os objetivos da migração. |
| 2 | **[02_PLANO_DE_MIGRACAO.md](./02_PLANO_DE_MIGRACAO.md)** | **O Plano de Ação.** Um checklist detalhado e sequencial, fase por fase, para guiar a implementação. | **Use diariamente.** É o seu guia principal para a execução e acompanhamento do progresso. |
| 3 | **[03_GUIA_TECNICO_E_REFERENCIA.md](./03_GUIA_TECNICO_E_REFERENCIA.md)**| **Recursos e Referências.** A "caixa de ferramentas" com o mapa do projeto antigo, comandos úteis e decisões técnicas. | **Consulte sempre que precisar.** Use para localizar código antigo, lembrar comandos ou entender o "porquê" de uma decisão. |
| 4 | **[README.md](./README.md)** | **O Mapa da Documentação.** Este próprio arquivo, que serve como ponto de partida. | Para se orientar sobre qual documento consultar. |

---

### 🚀 Fluxo de Trabalho Recomendado

1.  **Preparação (1-3 dias):**
    *   Leia o `01_RESUMO_EXECUTIVO.md` para entender o escopo.
    *   Configure seu ambiente de desenvolvimento conforme as tecnologias listadas.    

2.  **Execução (3-6 meses):**
    *   Abra o `02_PLANO_DE_MIGRACAO.md`.
    *   Comece pela **Fase 0** e siga as etapas sequencialmente.
    *   Marque os checkboxes `[ ]` conforme avança.
    *   Quando precisar de detalhes sobre o código antigo ou comandos, consulte o `03_GUIA_TECNICO_E_REFERENCIA.md`.

3.  **Conclusão:**
    *   Ao final de todas as fases, o projeto estará totalmente migrado e pronto para os testes finais e deploy.

---

### 🗓️ Resumo das Fases da Migração

| Fase | Título | Duração Estimada | Entrega Principal |
|:----:|---|---|---|
| **0** | Infraestrutura | 1-2 semanas | Base técnica para jobs, storage e classificação. |
| **1** | Sistema de Personagens | 2-3 semanas | CRUD completo de personagens e seus assets. |
| **2** | Sistema de Chat | 3-4 semanas | Chat em tempo real com IA funcional. |
| **3** | Sistema de Histórias | 3-4 semanas | Geração e player de Visual Novels. |
| **4** | Sistema de Créditos | 2 semanas | Monetização, planos e pagamentos via PayPal. |
| **5** | Sistema de Indicação | 1 semana | Programa de indicação com recompensas. |
| **6** | Módulo de Desenvolvimento | 3-4 semanas | *(Opcional)* IDE de IA para modificar código. |
| **7** | Polimento e Testes | 2-3 semanas | Testes, otimizações e documentação final. |