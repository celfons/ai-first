# ADR-0007: Priorização unificada (growth propõe, PO arbitra) e concorrência WIP-limited por footprint

> Status: Accepted · Data: 2026-07-18
> Feature/Issue: — (mudança de método) · Princípios tocados: P-10, P-11, P-13, P-14, P-15 · Supersede: —

## Contexto

Duas lacunas no fluxo autônomo:

1. **O growth se auto-prioriza.** Hoje o `/daily-growth` aciona o `growth-strategist`, que cria issues
   `growth:*` já com `po-suggested` — o mesmo label que o `/daily-build` usa para pegar trabalho. Ou
   seja, um experimento de funil **entra na fila de implementação sem passar pelo julgamento do PO** de
   se vale priorizar contra as apostas de produto. As duas lentes (valor de produto × escala de funil)
   disputam a mesma capacidade de build **sem um árbitro único** — o board incha e a cadência real
   (`features_per_day`) é furada por trabalho que ninguém priorizou em conjunto. O cron que "começa com
   o PO" (`/daily-backlog`) não enxerga as propostas de growth naquele momento.

2. **A concorrência do build é grossa.** Existe `parallelism` (fan-out de features em worktrees
   isolados) e o merge em `develop` é serializado — mas **não há teto de WIP** (Kanban) nem **regra de
   conflito por superfície de arquivos**. Duas demandas que tocam os mesmos arquivos podem ser
   desenvolvidas em paralelo e só descobrir o conflito no merge (retrabalho, rebase, alucinação de
   contexto grande). Falta dizer, de forma executável, **o que pode rodar em paralelo (superfícies
   disjuntas — ex.: architect planejando, backend × frontend em dirs distintos) e o que deve serializar
   (superfícies sobrepostas)**.

## Decisão

**A. Fila única de prioridade — growth PROPÕE, PO ARBITRA.**
O `growth-strategist` deixa de aplicar `po-suggested`. Ele cria issues de experimento com o label
**`growth-proposed`** (proposta de funil, **ainda não priorizada**) + a `growth:<etapa>` + `size:*`. O
**momento do PO** (`/daily-backlog`, que roda **depois** do `/daily-growth`) passa a **ler as issues
`growth-proposed` abertas** e o `product-owner` **arbitra uma fila única** de produto + growth por
valor/ROI: aplica **`po-suggested` só ao que ganha vaga** dentro do orçamento do dia, deixando o resto
como proposta (`growth-proposed` sem `po-suggested`) para um ciclo futuro ou recusa registrada. Assim
**toda demanda — de produto ou de growth — é priorizada por um árbitro único** antes de virar trabalho.
A lente de funil continua separada (o `growth-strategist` ainda diagnostica o funil e escolhe a
alavanca por ROI); o que muda é que **a decisão de priorizar é do PO**, não auto-aplicada.

**Contrapressão da fila (o gargalo é a esteira, não a criatividade do growth).** O growth pode propor
quantas ideias quiser (`growth-proposed` é ilimitado), mas o PO só promove a `po-suggested` até o teto
**`ready_backlog_cap`** (genoma; default = `features_per_day`) **menos** o que já está pronto e não
iniciado no board. Vagas reais = `min(features_per_day, ready_backlog_cap − prontas_não_iniciadas)`,
podendo ser **0** quando a esteira está cheia. Um PO **conservador** (o default) promove só o que o
build drena numa rodada — a pilha de trabalho pronto **nunca cresce além do que o `wip_limit`
consome**. Propostas sem vaga esperam; as que passam de **`proposal_ttl`** ciclos (default 3) são
podadas (fechadas com motivo no ledger) para o board de propostas não inchar.

**B. Concorrência WIP-limited por footprint de conflito.**
Novo knob de genoma **`wip_limit`** (default = `parallelism`) = **nº máximo de demandas simultaneamente
em andamento** no build. Distinto de `parallelism` (capacidade de fan-out): `wip_limit ≤ parallelism`
permite reduzir a rotatividade de merge sem baixar a capacidade. O `architect` passa a declarar, no
`plan.md`/`tasks.md`, o **footprint** de cada demanda — o conjunto de superfícies (diretórios/arquivos)
que ela vai **escrever**. O `/daily-build` agenda com esta regra:

- **Etapas de planejamento** (`feature-spec`, `architect`, `task-decomposer`, `bdd-author`) escrevem só
  nos próprios docs isolados (`docs/sdd/features/NNN-*`) → **sempre paralelizáveis** entre demandas.
- **Escritores de implementação** (`backend-engineer`, `frontend-engineer`) rodam em **worktrees
  isolados**; duas demandas de **footprints disjuntos** rodam **em paralelo**; duas de footprints
  **sobrepostos serializam** (uma espera a outra mergear e rebaseia sobre o `develop` avançado).
- **Dentro de uma demanda**, backend e frontend tocam superfícies distintas (ex.: `api/`+`domain/` ×
  `web/`/`ui/`) → **paralelos**; se um depende do contrato do outro, a `tasks.md` os ordena.
- O **merge em `develop` permanece serializado** (ADR-0003 intacto): duas demandas nunca tocam `develop`
  ao mesmo tempo, e a fila de merge respeita o `wip_limit`.

## Alternativas consideradas

- **Fundir growth e backlog num cron só** — o `/daily-backlog` rodaria PO + growth-strategist juntos.
  Descartada: perde o espaçamento e a cadência própria da lente de funil (coorte matura em dias) e
  acopla dois ciclos que hoje têm orçamentos (`growth_budget_per_cycle` × `daily_budget`) e cadências
  distintos. Mantemos dois crons; a convergência é só no **árbitro** (o PO), não na execução.
- **Só reforçar o worktree+merge serializado já existente** (sem `wip_limit` nem footprint) —
  descartada: não elimina o conflito de superfície detectado tarde (no merge), que é a causa real de
  retrabalho e de janela de contexto inflada.
- **Detectar conflito por lock de arquivo em runtime** — descartada por ora: mais complexo e frágil que
  declarar o footprint no plano (o `architect` já conhece os módulos tocados). O footprint declarado é a
  fonte; o merge serializado é a rede de segurança se a declaração errar.

## Consequências

- **Positivas:** uma única fila priorizada (sem board inflado por trabalho não-arbitrado); o PO enxerga
  produto + growth no mesmo momento; paralelismo seguro (superfícies disjuntas correm juntas) e WIP
  controlado (menos rebase/alucinação); a regra de conflito é **executável** (footprint declarado), não
  convenção.
- **Custos/limites:** o `architect` precisa declarar o footprint (custo pequeno; ele já lista módulos
  tocados). Um footprint mal declarado só cai para o caso serializado no merge — nunca corrompe
  `develop`. O PO ganha mais uma fonte de leitura (`growth-proposed`) por rodada.
- **Restrições futuras:** nenhum agente/skill deve reintroduzir `po-suggested` no growth sem passar pelo
  PO. Todo plano de feature declara footprint. O build respeita `wip_limit` e serializa footprints
  sobrepostos. Novos tipos de demanda (ex.: ops) que disputem o build entram pela mesma fila do PO.
- **Contrapressão:** a promoção a `po-suggested` é limitada por `ready_backlog_cap` (default
  `features_per_day`) — o board de trabalho pronto não pode crescer além do que a esteira drena; propostas
  velhas (`proposal_ttl`, default 3 ciclos) são podadas. É o freio que impede o volume de ideias do growth
  de inflar o backlog na esteira.

## Relacionados

- Constituição: P-10 (autonomia/gate por tier), P-11 (verificação independente), P-13 (separação de
  papéis), P-14 (orçamento/modelo), P-15 (knobs ajustáveis).
- ADRs: [ADR-0003](0003-build-multi-feature-workflow.md) (build multi-feature/worktree — esta decisão o
  estende com WIP+footprint), [ADR-0004](0004-ecossistema-growth-autonomo.md) (loop de growth — esta
  decisão insere o árbitro do PO entre a proposta e o build).
- Skills: `skills/daily-growth`, `skills/daily-backlog`, `skills/daily-build`.
- Agentes: `agents/growth-strategist.md`, `agents/product-owner.md`, `agents/architect.md`.
- Genoma: `docs/ai-first/project.md §8` (`wip_limit`, ordem dos crons).
