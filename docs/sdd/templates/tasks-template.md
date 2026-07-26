# Tasks: [NOME DA FEATURE]

> Local: `docs/sdd/features/NNN-slug/tasks.md` · Deriva de `plan.md`.
> Cada task/slice: pequena (cabe num contexto focado), verificável, rastreada a RF/RNF.
> Ordem respeita dependências (migration antes de código; porta antes de adapter).
> **Todo "done:" é red-testável (ADR-0015):** nomeia o **teste que falha hoje** e passa ao fim da task —
> é ele que o implementador abre no vermelho antes de escrever o código. Done que não vira teste
> concreto é sinal de task vaga ou grande demais.

## Forma A — checklist simples (feature pequena, sem decomposição)

Use quando a feature é trivial/pequena (1–3 arquivos, um efeito). O `architect` preenche direto.
A task de **aceitação (T1)** vem primeiro: o laço externo nasce vermelho, antes do código.

- [ ] **T1 — [aceitação/BDD]** cenários executáveis dos critérios (`bdd-author`) · *P-1* · done: cenários existem e **falham** (não há código); ao fim da feature, passam no CI (obrigatório p/ comportamento novo; formato pelo `bdd_style`)
- [ ] **T2 — [migration/dados]** … · *RF-XXX-01* · done: teste `up→down→up` + teste de escopo falham antes, passam depois
- [ ] **T3 — [domínio/política]** … · *RF-XXX-01* · done: teste da política (caso feliz + borda) escrito **antes**, vermelho → verde
- [ ] **T4 — [repositório/porta]** … · *RF-XXX-02* · done: teste do contrato da porta (mock completo) vermelho → verde
- [ ] **T5 — [efeito/handler]** … · *RF-XXX-02* · done: teste de idempotência sob redelivery vermelho → verde
- [ ] **T6 — [eval/docs]** … · *P-10/P-11* · done: eval verde + spec reflete o entregue

## Forma B — grafo de execução (feature grande/complexa, decomposta)

Use quando o `task-decomposer` fatia a feature em **micro-slices** para execução em contexto isolado
(menos alucinação, janela menor, entrega mais rápida). Cada slice roda numa **sessão de implementação
própria**, carregando **só** o contexto listado, e **fecha a árvore verde** antes da próxima.

| Slice | Título | Arquivos / contexto (context-map) | Depende de | Paralelizável | Done + teste (**red-testável**) | RF | Árvore verde |
|---|---|---|---|---|---|---|---|
| S1 | migration X | `migrations/…`, ctx: *dados* | — | não | teste `up→down→up` falha hoje → passa | RF-XXX-01 | sim (só adiciona) |
| S2 | porta de dados | `repositories/…`, ctx: *dados* | S1 | não | teste do contrato (mock completo) vermelho → verde | RF-XXX-02 | sim |
| S3 | efeito atrás de flag | `actions/…`, ctx: *efeitos* | S2 | S4? | teste de idempotência sob redelivery vermelho → verde | RF-XXX-02 | sim (flag off) |
| S4 | UI atrás de flag | `dashboard/…`, ctx: *UI* | S2 | S3? | teste de render/escape por estado vermelho → verde | RF-XXX-03 | sim (flag off) |
| **S5** | **INTEGRAÇÃO** | liga tudo, remove flags/stubs | S3, S4 | não | **cenários de aceitação (vermelhos desde o início) passam de ponta a ponta** | todos | sim |

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
- [ ] **Prova do vermelho** declarada por comportamento implementado (ADR-0015 · `tdd_mode`); bug
      corrigido nesta feature reproduzido em vermelho **antes** da correção
- [ ] `adversarial-reviewer` não-bloqueante sobre o agregado (P-11)
- [ ] Gate constitucional revisitado (nenhum P-# violado)
- [ ] PR com `Closes #NNN`
