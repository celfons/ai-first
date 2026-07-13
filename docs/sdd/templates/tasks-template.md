# Tasks: [NOME DA FEATURE]

> Local: `docs/sdd/features/NNN-slug/tasks.md` · Deriva de `plan.md`.
> Cada task/slice: pequena (cabe num contexto focado), verificável, rastreada a RF/RNF.
> Ordem respeita dependências (migration antes de código; porta antes de adapter).

## Forma A — checklist simples (feature pequena, sem decomposição)

Use quando a feature é trivial/pequena (1–3 arquivos, um efeito). O `architect` preenche direto.

- [ ] **T1 — [migration/dados]** … · *RF-XXX-01* · done: schema aplica e é testado
- [ ] **T2 — [domínio/política]** … · *RF-XXX-01* · done: unit tests da política
- [ ] **T3 — [repositório/porta]** … · *RF-XXX-02* · done: método na porta + teste (mock completo)
- [ ] **T4 — [efeito/handler]** … · *RF-XXX-02* · done: teste de idempotência sob redelivery
- [ ] **T5 — [eval/docs]** … · *P-10/P-11* · done: eval verde + spec reflete o entregue

## Forma B — grafo de execução (feature grande/complexa, decomposta)

Use quando o `task-decomposer` fatia a feature em **micro-slices** para execução em contexto isolado
(menos alucinação, janela menor, entrega mais rápida). Cada slice roda numa **sessão de implementação
própria**, carregando **só** o contexto listado, e **fecha a árvore verde** antes da próxima.

| Slice | Título | Arquivos / contexto (context-map) | Depende de | Paralelizável | Done + teste | RF | Árvore verde |
|---|---|---|---|---|---|---|---|
| S1 | migration X | `migrations/…`, ctx: *dados* | — | não | schema aplica + teste | RF-XXX-01 | sim (só adiciona) |
| S2 | porta de dados | `repositories/…`, ctx: *dados* | S1 | não | método + teste mock | RF-XXX-02 | sim |
| S3 | efeito atrás de flag | `actions/…`, ctx: *efeitos* | S2 | S4? | idempotência sob redelivery | RF-XXX-02 | sim (flag off) |
| S4 | UI atrás de flag | `dashboard/…`, ctx: *UI* | S2 | S3? | render + escape | RF-XXX-03 | sim (flag off) |
| **S5** | **INTEGRAÇÃO** | liga tudo, remove flags/stubs | S3, S4 | não | **aceite da spec ponta a ponta** | todos | sim |

- **Contexto estreito:** cada slice carrega só os arquivos + a **linha do domínio** no
  `docs/context-map.md` — nunca "o repositório".
- **Árvore sempre verde:** comportamento parcial fica atrás de **flag/stub** (P-9) até a integração;
  `typecheck`+`lint`+`test` verdes **ao fim de cada slice**.
- **Slice de integração (última):** remove os andaimes e **prova a feature inteira** contra os
  critérios de aceite — é a que agrega o valor e o alvo do `adversarial-reviewer` no agregado.
- **Caminho crítico:** liste a sequência que não dá para paralelizar; slices independentes (sem
  arquivos em comum) podem rodar em paralelo.

## Gate de merge (da feature inteira)

- [ ] `typecheck` · `lint` · `test` limpos (verdes **a cada slice**, não só no fim)
- [ ] Critérios de aceite da spec cobertos por teste (incl. o teste de ponta a ponta da integração)
- [ ] `adversarial-reviewer` não-bloqueante sobre o agregado (P-11)
- [ ] Gate constitucional revisitado (nenhum P-# violado)
- [ ] PR com `Closes #NNN`
