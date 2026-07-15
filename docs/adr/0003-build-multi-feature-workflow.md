# ADR-0003: Build paralelo multi-feature num único `Workflow`, com recursos compartilhados e teto de gasto por feature

> Status: Accepted · Data: 2026-07-15
> Feature/Issue: capacidade de build paralelo · Princípios tocados: P-14 (orçamento/custo), P-11/P-13 (isolamento e gates por feature), P-15 (knobs) · Supersede: —

## Contexto

O método já construía **mais de uma feature por rodada** (`parallelism > 1`), mas de forma **solta**:
cada feature era uma orquestração independente, então **tudo que é comum entre elas era re-derivado N
vezes** (o bloco de contexto base, o índice de repo, o audit de dependências, o benchmarking de
mercado) e o único teto de gasto era o **`daily_budget` do loop inteiro**. Duas consequências ruins:

1. **Desperdício de token** — o mesmo fato (repo, deps, mercado) computado uma vez por feature em vez de
   uma vez por rodada.
2. **Contenção de custo grosseira** — uma feature "runaway" (muitos re-runs, opus/extra, decomposição
   grande) podia **queimar o orçamento da rodada** e sufocar as vizinhas, ou derrubar o lote, porque o
   único limite era global. Não havia como orçar **cada** feature.

A força motriz: paralelizar de verdade **num só `Workflow`**, compartilhando o que é comum e **orçando
por feature**, sem enfraquecer o isolamento (P-11/P-13) que é a razão de o método trocar token por
corretude.

## Decisão

Adotamos o **`Workflow` multi-feature** (`docs/token-efficiency.md` §4 Escala 2) como a forma de
construir com `parallelism > 1` sob opt-in de `Workflow`:

1. Uma **pré-fase deriva 1× o "bundle de recursos compartilhado"** — bloco de contexto fixo base
   (`CLAUDE.md` + constitution), índice de repo/símbolos, audit de dependências e digest de market-scan —
   e o passa **read-through** a cada feature. É **fato compartilhado, não raciocínio** (coerente com §6),
   então o isolamento não é ferido.
2. A **`feature` é a dimensão externa** do `pipeline()`; cada feature é um **sub-pipeline isolado**
   (worktree próprio, branch `claude/<slug>` própria) rodando concorrente, com o bundle injetado + só o
   contexto específico dela por cima.
3. Introduzimos o knob **`budget_per_feature`** (genoma §8; default `daily_budget / features_per_day`).
   O `Workflow` impõe **dois tetos**: `daily_budget` (global, `budget.total`) e `budget_per_feature`
   (por sub-pipeline). A feature que **estoura o seu teto PARA** (`awaiting-human`/`needs-human-triage`,
   PR parcial atrás de flag), **as vizinhas seguem**.
4. O **merge em `develop` continua serializado** e **cada feature mantém seus próprios gates** (CI +
   `adversarial-reviewer` + `security-reviewer`). Compartilha-se **insumo**, nunca **veredito**.

## Alternativas consideradas

- **Manter N orquestrações soltas (status quo)** — simples, mas re-deriva o comum N× e só tem teto
  global; não resolve nem o desperdício nem o runaway. Descartada.
- **Compartilhar contexto de raciocínio entre as features** (uma sessão que vê todas) — mataria o
  isolamento (P-11/P-13): a revisão de uma feature enxergaria o código/viés de outra. Inaceitável — o
  compartilhamento é restrito a **fatos derivados**, nunca a histórico de decisão.
- **Só um teto global mais apertado** — penaliza features baratas para conter a cara; não é justo nem
  eficiente. O teto **por feature** ataca o runaway na origem sem punir as demais.
- **Merge paralelo** — corromperia `develop` (duas branches tocando ao mesmo tempo). Mantido serial.

## Consequências

- **Positivas:** menos token (bundle 1× vs. N×), menos wall-clock (features concorrentes), e
  **contenção de custo justa** (um runaway pausa só a si mesmo). O bundle compartilhado reaproveita os
  caches datados da §6 (market-scan, índice) que outras rodadas também usam.
- **Custos/limites:** mecânica nova (worktrees + `Workflow`), maior complexidade de orquestração; exige
  contabilizar gasto **por feature** (via `budget.spent()` + tags `model:*`/`effort:*` — o
  `finops-steward` fecha). Só ativo sob **opt-in de `Workflow`**; sem opt-in, o mesmo desenho roda
  sequencializado.
- **Restrições futuras:** todo build paralelo DEVE (a) derivar o comum uma vez e passá-lo read-through,
  nunca re-derivar por feature; (b) respeitar os **dois** tetos; (c) manter **isolamento e gates por
  feature** — nenhum compartilhamento de veredito; (d) manter o **merge serializado**. O
  `finops-steward` monitora a adesão a `budget_per_feature` e realimenta o teto/roteamento.

## Relacionados

Constituição `P-14` (orçamento/custo), `P-11`/`P-13` (verificação independente e separação de papéis),
`P-15` (knobs ajustáveis); `docs/token-efficiency.md` §4 (Escala 2) e §6 (caches datados);
`docs/ai-first/project.md` §8 (`budget_per_feature`, `daily_budget`, `parallelism`);
skills `/daily-build` (Fase 2) e `/kickoff` (Fase 2); `agents/finops-steward.md`.
