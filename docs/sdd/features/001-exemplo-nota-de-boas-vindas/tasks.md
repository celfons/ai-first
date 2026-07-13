# Tasks: Nota de boas-vindas no primeiro contato (EXEMPLO)

> Local: `docs/sdd/features/001-exemplo-nota-de-boas-vindas/tasks.md` · Deriva de `plan.md`.
> **Exemplo didático** da decomposição em tasks pequenas, ordenadas por dependência.

## Checklist

- [ ] **T1 — [migration]** coluna/tabela `welcome_sent` por contato · *RF-WELCOME-02* · done: schema
      aplica e é testado
- [ ] **T2 — [domínio]** seletor de idioma da nota · *RF-WELCOME-03* · done: unit tests (pt/en/default)
- [ ] **T3 — [repositório]** `hasWelcomeBeenSent` / `markWelcomeSent` na porta de dados · *RF-WELCOME-02*
      · done: método + teste com mock completo
- [ ] **T4 — [action]** `SendWelcomeNoteAction` com reserva de idempotência antes + rollback na falha
      · *RF-WELCOME-01/02* · done: teste de redelivery (no-op) e de falha (rollback)
- [ ] **T5 — [pipeline]** etapa `welcome` antes do fluxo padrão, respeitando opt-out · *RF-WELCOME-01*
      · *P-7* · done: 1º contato recebe antes; opt-out não recebe
- [ ] **T6 — [config]** flag `WELCOME_NOTE_ENABLED` (default off) · done: comportamento off = no-op
- [ ] **T7 — [observabilidade]** métricas `welcome.note_sent` / `welcome.note_failed` · *RNF-03* ·
      done: métrica emitida em teste
- [ ] **T8 — [docs]** atualizar `specification.md` (RF-WELCOME-*) + `CLAUDE.md` se novo módulo · done:
      spec reflete o comportamento final

## Gate de merge

- [ ] `typecheck` · `lint` · `test` limpos
- [ ] Critérios de aceite da spec cobertos por teste (incl. redelivery, opt-out, falha degrada)
- [ ] Gate constitucional revisitado (P-3/P-7/P-8 ok; nenhum violado)
- [ ] PR com `Closes #001`
