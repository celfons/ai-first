---
name: daily-growth
description: Rotina de GROWTH — PARTE 1 de 2 (criação dos experimentos do ciclo). Skill standalone para trigger agendado. Aciona o subagente `growth-strategist` para propor e CRIAR `growth_experiments_per_cycle` issues NOVAS de experimento de crescimento (label `growth:*`) no board, pela lente do funil e por ROI, sem duplicar. Roda como Workflow sob teto de token — decide o grau de paralelismo pela sobra de orçamento. NÃO implementa nada — só cria as issues. O `/daily-build` roda ~1h depois e as desenvolve; o `/growth-outcome` mede depois.
---

# /daily-growth — cria os experimentos do ciclo (Parte 1/2)

Skill **autônoma e standalone** (sessão fresca, sem contexto prévio). Sua única responsabilidade:
**criar os experimentos de crescimento do ciclo** — as issues `growth:*` que o `/daily-build`
implementa ~1h depois e o `/growth-outcome` mede quando maturarem. É a irmã de `/daily-backlog`, mas a
lente é **funil/escala**, não valor de produto.

## Parâmetros (do genoma — `docs/ai-first/project.md §8`)
- **`growth_experiments_per_cycle`** — quantas issues de experimento criar (default **1**). Cadência
  variável (P-15). Crie **exatamente** essa quantidade (ou menos, se não houver aposta boa sem duplicar).
- **`growth_budget_per_cycle`** / **`budget_per_experiment`** — teto de token do ciclo e custo típico por
  experimento. Governam o **grau de paralelismo** (abaixo).
- **`parallelism`** — teto de fan-out; a decisão real é `min(parallelism, floor(budget.remaining() /
  budget_per_experiment))`.

## Orçamento e paralelização (rode como Workflow)
Prefira rodar o fan-out num `Workflow` sob o objeto `budget` (teto rígido `growth_budget_per_cycle`):
```
fan = min(parallelism, max(1, floor(budget.remaining() / budget_per_experiment)))
```
Se o orçamento só paga um, **serialize** (`fan=1`). A janela de uso ~5h do Claude é respeitada por
**teto por ciclo × cadência espaçada do cron** (não por API) — o `finops-steward` mede a taxa de queima
no `/growth-outcome` e realimenta `parallelism`/cadência. (Ref.: `docs/token-efficiency.md` §5 + o
objeto `budget` do `Workflow`.)

## Modelo + esforço (custo-benefício)
Invoque o `growth-strategist` em **`opus`/`alto`** por padrão (a escolha da alavanca é de alta
alavancagem — não economize no julgamento). `sonnet` se a alavanca for óbvia pelo playbook.

## O que fazer
1. Invoque o subagente **`growth-strategist`** pedindo **`growth_experiments_per_cycle`** issues de
   experimento. Ele **lê o `growth-playbook.md`** (o que pagou) + `evolution.md` (sinal real) +
   `market-scan.md` (delta), diagnostica o funil e escolhe a alavanca por **`argmax(ROI)`**, registrando
   a hipótese/ROI no corpo de cada issue.
2. Cada experimento deve ser **implementável**: prefira `size:trivial`/`size:media`, atrás de flag +
   rollout %. `size:grande` só se genuíno (e aí `needs-human-triage`).
3. Garanta os labels que o `/daily-build` usa: `growth-experiment` + exatamente uma `growth:<etapa>` +
   `po-suggested` + exatamente uma `size:*`.
4. **Mundo-externo é autônomo** (preço/canal/comunicação em massa) — **não** aplique `needs-human-triage`
   por isso. Garanta apenas que a issue traz os **freios automáticos** no corpo: canário (`canary_pct`),
   `external_action_cap`, `guardrail_metrics` e critério de kill (o `experiment-designer` os formaliza).
5. **NÃO implemente, não crie branch, não abra PR.** Esta parte só cria as issues.
6. **Atualize o cache de benchmarking:** se o estrategista emitiu um digest de mercado novo, **grave-o**
   em `docs/product/market-scan.md` (o subagente é só-leitura de docs — quem escreve é a skill).

## Regras
- **`growth_experiments_per_cycle` por ciclo** — sem inchar o board; sem experimentos concorrentes na
  mesma coorte (contaminação de atribuição). Se não houver aposta boa sem duplicar, crie menos e diga.
- **Fan-out limitado pela sobra de orçamento** — nunca paralelize além do que `growth_budget_per_cycle`
  paga; registre no relatório o `fan` usado.
- Board é a fonte; você só abastece — a medição/escala é do `/growth-outcome`.
- Idempotência: o `growth-strategist` deduplica.

## Relatório final (vira push/e-mail)
- **Sucesso:** uma linha por experimento criado — número, título, etapa do funil, e o `fan`/orçamento
  usados no ciclo.
- **Falha:** ver Resiliência abaixo.

## Resiliência — falha vira ALERTA de retry (push + e-mail)
Se **não conseguir criar o experimento do ciclo** (erro de API, benchmarking impossível, nenhuma aposta
nova sem duplicar, orçamento esgotado, subagente falhou), **não encerre em silêncio**:
```
⚠️ FALHA na rotina de criação de experimento (growth) — <o que aconteceu, 1 linha>.
Nenhum experimento foi criado neste ciclo.
Para tentar de novo: responda "rodar o growth de novo" (eu re-disparo /daily-growth).
```
Sucesso parcial ou incerteza também avisa. **Orçamento esgotado é achado, não silêncio.**
