# Tasks: [NOME DA FEATURE]

> Local: `docs/sdd/features/NNN-slug/tasks.md` · Deriva de `plan.md`.
> Cada task: pequena (cabe num PR revisável), verificável, rastreada a RF/RNF.
> Ordem respeita dependências (migration antes de código; porta antes de adapter).

## Checklist

- [ ] **T1 — [migration/dados]** … · *RF-XXX-01* · done: schema aplica e é testado
- [ ] **T2 — [domínio/política]** … · *RF-XXX-01* · done: unit tests da política
- [ ] **T3 — [repositório/porta]** … · *RF-XXX-02* · done: método na porta de dados + teste (mock completo)
- [ ] **T4 — [efeito/handler]** … · *RF-XXX-02* · done: teste de idempotência sob redelivery
- [ ] **T5 — [API/config]** … · *RF-XXX-03* · done: rota + auth + teste
- [ ] **T6 — [observabilidade]** métricas/logs · *RNF-08* · done: métrica emitida em teste
- [ ] **T7 — [eval]** caso mínimo determinístico (+ live se aplicável) · *P-10* · done: eval verde no CI
- [ ] **T8 — [docs]** atualizar spec/README/docs afetados · done: spec reflete o comportamento final

## Gate de merge

- [ ] `typecheck` · `lint` · `test` limpos
- [ ] Critérios de aceite da spec cobertos por teste
- [ ] Gate constitucional revisitado (nenhum P-# violado)
- [ ] PR com `Closes #NNN`
