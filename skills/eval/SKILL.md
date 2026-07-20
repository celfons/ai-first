---
name: eval
description: Camada de AVALIAÇÃO do pipeline (quality-rubrics, ADR-0011). Aciona o subagente `evaluator` para rodar rubricas pass/fail contra a saída CONTRATADA de um sub-workflow (ADR-0010) sobre um conjunto-ouro de tarefas, e emitir um scorecard (aprovado/reprovado por critério + score + regressões vs. baseline datado). Três usos: sob demanda (`/eval <alvo>`), na cadência `eval_cadence`, e — o crítico — como GATE de upgrade do `Modelo fixado`: trocar o modelo exige re-baseline aprovado (`eval_gate: on`). Só mede; nunca implementa nem muta produção. Notifica o dono no bloqueio.
---

# /eval — o pipeline ainda é bom? (régua de qualidade + gate de upgrade de modelo)

Skill de **avaliação**. Enquanto o `/daily-build` produz e o `/daily-outcome` mede se a feature moveu o
negócio, esta mede se os **subgrafos** do pipeline mantêm a qualidade — e **protege o upgrade de modelo**
de ser um salto de fé. É a estratégia "harness de evals" encaixada nos **contratos** do ADR-0010: sem a
unidade contratada, não haveria contra o quê avaliar.

> Cadência sugerida: **eval_cadence** do genoma (`docs/ai-first/project.md §8`) — não por-fatia (avaliar
> gasta token, piso opus/alto). Espace dos demais crons pesados. O **gate de upgrade** roda sob demanda,
> quando o `Modelo fixado` vai mudar.

## Modelo + esforço
Invoque o `evaluator` em **`opus`/`alto`** — piso fixo (P-14): avaliar é julgamento independente, não
desce por custo-benefício. (Ref.: tabela no `sdd-orchestrator`.)

## Alvo
- `/eval <sub-workflow>` — avalia um contrato específico (ex.: `build-one-feature`, `adversarial-panel`).
- `/eval` sem alvo — roda a suíte da cadência (todos os contratos com conjunto-ouro semeado).
- `/eval --upgrade <modelo-novo>` — o **eval-gate**: re-baseline do modelo novo vs. o atual.

## Fase 1 · Rodar a rubrica
Invoque o subagente **`evaluator`** para, sobre o **conjunto-ouro** de tarefas do alvo, rodar a rubrica
**pass/fail** contra a saída **contratada** do sub-workflow e comparar ao **baseline datado** em
`docs/ai-first/eval-rubrics.md`. Ele aponta **regressões por critério**, não só o score agregado, e é
**honesto sobre acesso** (contrato sem conjunto-ouro = achado, não score inventado).

## Fase 2 · Decisão
- **Cadência/sob demanda:** o scorecard vira relatório ao dono; regressão relevante abre issue
  `needs-human-triage` (a correção é feature nova pelo fluxo normal — o `evaluator` **não** implementa).
- **Eval-gate (`--upgrade`, `eval_gate: on`):** score do modelo novo **< piso** OU regressão em critério
  de **invariante/segurança** ⇒ **BLOQUEIA o upgrade** (`awaiting-human` + scorecard). Passou ⇒ o
  `evaluator` grava o **novo baseline datado** em `eval-rubrics.md` e o upgrade é liberado.

## Quem escreve o quê
- **Quem lê/roda:** esta skill (thread principal), acionando o `evaluator` (só-leitura de docs + Bash p/
  rodar o conjunto-ouro).
- **Quem escreve o baseline:** a skill grava em `docs/ai-first/eval-rubrics.md` o texto datado que o
  `evaluator` emite — mesmo padrão de `/daily-outcome` → `routing-policy.md` (o subagente não escreve doc
  de produção sozinho; entrega sob gate).

## Contrato de falha (como as demais rotinas)
Sem conjunto-ouro semeado, sem contrato-alvo, ou erro ao rodar a suíte ⇒ **não termina em silêncio**:
alerta push/e-mail dizendo o que falta (ex.: "semear conjunto-ouro de `build-one-feature`") e a frase p/
re-disparar. Baseline vazio = `sem-baseline` (maturação), reportado como tal, nunca como aprovação.

Ver ADR-0011, ADR-0010 (a unidade avaliável) e `docs/ai-first/eval-rubrics.md`.
</content>
