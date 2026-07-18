# CLAUDE.md

Contexto para sessões de IA (Claude Code) **deste repositório**. Este arquivo é o
**índice-mãe**: o mapa de módulos, invariantes e pontos de extensão que uma sessão carrega antes
de qualquer coisa. Para detalhes, veja `docs/sdd/` (constituição, spec, plano, ciclo SDD),
`docs/adr/` (decisões arquiteturais — **leia o índice antes de decidir algo durável**),
`docs/context-map.md` (**mapa de contexto**: domínio → código+docs+ADRs+testes — carregue a linha
do domínio que vai tocar em vez de reler a base), `docs/product/rejections.md` (**ledger de
rejeições**: o `product-owner` lê para não repropor o que o dono já recusou),
`docs/product/market-scan.md` (**cache de benchmarking auto-evolutivo**: o `product-owner` lê o digest
datado e busca só o delta — compartilhado por `/daily-backlog`, `/backlog` e `/kickoff`), `docs/knowledge.md`
(**saber-fazer**: padrões + **anti-padrões** — carregue antes de implementar/revisar),
`docs/engineering-principles.md` (**princípios de engenharia agnósticos**: as cinco leis + o catálogo
canônico — SOLID/GoF/Clean Code/DDD/distribuídos — que estão por trás das invariantes e do saber-fazer;
a forma **desacoplada** do que o uso real ensinou, o que sobe do produto para o método; serve os agentes
de **implementação**), e os **catálogos de princípios por disciplina** — o análogo para os agentes que
não escrevem código de produção, cada um alinhado ao benchmark de mercado da sua área:
`docs/product-principles.md` (**produto & growth** — SVPG/Cagan, JTBD, AARRR, experimentos confiáveis;
serve `product-owner`/`growth-strategist`/`experiment-designer`/`growth-analyst`/`outcome-analyst`),
`docs/spec-principles.md` (**especificação/BDD/decomposição** — INVEST, spec-by-example, vertical slicing;
serve `feature-spec`/`bdd-author`/`task-decomposer`/`migration-analyst`),
`docs/operations-principles.md` (**confiabilidade/auditoria/FinOps** — Google SRE, evolutionary
architecture, FinOps Foundation; serve `ops-investigator`/`tech-auditor`/`finops-steward`) e
`docs/delivery-principles.md` (**documentação & release** — Diátaxis, SemVer, Keep a Changelog, DORA;
serve `docs-writer`/`release-manager`),
`docs/evolution.md` (**linha do tempo de aprendizados**: o que mudou e o que o uso real ensinou) e
`docs/token-efficiency.md` (**política de eficiência de token**: bloco de contexto fixo p/ cache,
roteamento de modelo obrigatório, retorno enxuto, `Workflow`, **AIOps** — como todo *driver* gasta token
com intenção sem enfraquecer o isolamento/revisão independente) e `docs/ai-first/routing-policy.md`
(**memória auto-evolutiva do roteamento**: nasce vazia e se altera a cada rodada — o `finops-steward`
grava o custo real aprendido, o `sdd-orchestrator` lê antes de rotear; é o loop de AIOps que faz o
pipeline **melhorar sozinho com o uso**) e `docs/ai-first/memory.md` (**arquitetura de memória**,
ADR-0005: as 4 camadas — working/semantic/episodic/procedural — e sua **higiene**; o `knowledge-curator`
via `/distill` consolida o episódico recorrente, poda o resto e mantém o índice de recuperação coerente —
é o que impede a memória de inchar e faz o saber-fazer melhorar, não só acumular).

> ⚠️ **Este é o `CLAUDE.md` do framework `ai-first` (esqueleto).** As seções marcadas `_(preencha)_`
> são preenchidas **na gênese, pela skill primária [`/ai-first-init`](skills/ai-first-init/SKILL.md)**,
> que entrevista o humano sobre stack, cloud, arquitetura, infra e produto. As instruções de
> processo (fluxo de git, ciclo SDD, subagentes, skills) já valem como estão — o método é fixo, só o
> contexto é definido.
>
> 🧬 **Leia primeiro o genoma:** [`docs/ai-first/project.md`](docs/ai-first/project.md) é a fonte de
> verdade do contexto do projeto. Se ele estiver com campos `[A DEFINIR]`, o organismo não está
> armado — rode `/ai-first-init` antes de qualquer feature.

## O que é

_(preencha)_ — Uma descrição densa de 3–6 linhas do produto: o que faz, para quem, a stack macro,
e a forma do fluxo principal (ex.: `requisição → validação → caso de uso → efeito → resposta`).

## Mapa de módulos (`src/`)

_(preencha)_ — Uma tabela dos diretórios de topo e sua responsabilidade única. É o que permite ao
`sdd-orchestrator`/`context-map` apontar o subagente ao lugar certo.

| Dir | Responsabilidade |
|---|---|
| `api/` | _(rotas/entrada HTTP)_ |
| `domain/` | _(tipos, políticas, regras puras)_ |
| `repositories/` | _(acesso a dados — **único lugar que importa o driver/SQL**)_ |
| `services/` | _(casos de uso)_ |
| `…/` | _(adapters atrás de portas: IA, pagamento, fila…)_ |

## Invariantes (não quebrar — ver `docs/sdd/constitution.md`)

As **universais do método** (P-1…P-15) já estão na constituição e valem aqui. Liste abaixo as
**específicas do seu projeto** (Parte B da constituição, P-16+), no formato "invariante + onde é testada":

- _(ex.: **chave de escopo em toda query.** Multi-tenant é absoluto. Testado por `…`.)_
- _(ex.: **fonte de verdade externa** — pagamento = gateway; estado local é projeção.)_
- **Idempotência antes de todo efeito** (P-3): reserva + rollback na falha.
- **IA nunca confiada** (P-4): timeout, saída validada, fallback determinístico.
- **Acesso a dados atrás da porta** (P-5): driver/SQL só dentro de `repositories/`.

## Pontos de extensão (encaixe a mudança neles — não invente caminho novo)

_(preencha)_ — Onde comportamento novo entra sem tocar no núcleo. É o que a skill
`skills/new-extension` e o `architect` consultam.

- Provedor externo novo → implementa a **porta** em `…/`.
- Efeito novo → **handler/Action** + regra declarativa em `…/`.
- Dado novo → método na **porta de dados** (`repositories/`).
- _(strategy/plugin, se houver)_ → registrar em `…`.

## Padrões (referência rápida)

_(preencha)_ — Os idiomas do hot path do seu projeto, em uma linha cada (ex.: batch de banco,
reserva de idempotência, laço da fila, chamada de LLM com timeout+validação+fallback).

> **Versão profunda + anti-padrões:** [`docs/knowledge.md`](docs/knowledge.md). Aqui ficam só as
> one-liners; lá moram os padrões detalhados e as **armadilhas a evitar** (o `adversarial-reviewer` as
> usa como checklist de caça).

## Convenções

- **Fluxo de git: `feature → develop → main`.** Branch `claude/<slug>` sai de `develop` e o PR é
  aberto **contra `develop`**. `main` (produção) só recebe promoção `develop → main` — **nunca** PR de
  feature direto. **A promoção é por tier de risco** (P-10): no nível `conservador` o humano aprova
  tudo; em `progressivo`/`amplo`, 🟢/🟡 podem promover sozinhas e só as arriscadas sobem. Este fluxo é
  **imposto por construção** (não só convenção): ver `docs/governance/enforcement.md` (ADR-0006) — o
  hook `SessionStart` carrega os fundamentos no turno 0, o `PreToolUse` guard barra push/commit direto
  em main/develop, e a branch protection + `ai-first-guard.yml` recusam o merge fora do fluxo.
- PR com `Closes #NNN`; `typecheck` + `lint` + `test` limpos (P-10); **gate de segurança
  (`security-reviewer`, opus/alto)** e **`adversarial-reviewer` não-bloqueante** obrigatórios para o
  auto-merge (P-11/P-13). O que chega a `main` passa pelo **`release-manager`** (changelog/anúncio).
- **Ciclo SDD** para toda mudança de comportamento: ver `docs/sdd/README.md`. Uma issue = uma
  feature = uma branch = um `Closes #NNN`.
- **Feature grande é decomposta** (`task-decomposer`) em **micro-slices** implementadas em contexto
  isolado (menos alucinação, janela menor), com a **árvore verde a cada slice** e uma **slice de
  integração** que agrega o valor da feature de ponta a ponta. Feature pequena não é decomposta.
- **Aceitação em BDD:** o `bdd-author` converte os critérios de aceite da spec (Dado/Quando/Então) em
  **cenários executáveis** (o oráculo) — formato pelo knob `bdd_style` do genoma (`native`/`gherkin`/
  `off`). O `tester` os liga ao runner; o `adversarial-reviewer` os usa e caça o que faltou.
- **Subagentes de desenvolvimento** (`agents/`, ver `docs/roster.md`): roster
  mapeado ao ciclo SDD. Delegue a feature nova ao `sdd-orchestrator` para manter o contexto enxuto.
- **Modelo + esforço são roteados por etapa** (custo-benefício) pelo `sdd-orchestrator`
  (`haiku`/`sonnet`/`opus`/`fable` × `baixo`/`médio`/`alto`/`extra`); ele aplica a tag `model:*`/
  `effort:*` na issue e é o **único subagente de modelo fixo (opus/alto)**. Invariante/segurança e o
  `adversarial-reviewer` nunca abaixo de opus/alto (P-14).
- **Gênese (uma vez):** skill `/ai-first-init` — define contexto + knobs no genoma
  (`docs/ai-first/project.md`). Entrevista o **produto a criar + estratégia + ponto de partida** (semeia
  `docs/sdd/tasks.md` com as fatias do MVP), a **cadência** e o **desenvolvimento paralelo**, e a
  decisão de **ter ou não gate humano** (`autonomy_level`, incl. o nível **`autônomo` = 100% AI**) e
  **`initial_backlog`** (quantas histórias/épicos criar de imediato). Rode antes de qualquer feature. No
  fim, **encadeia o `/kickoff` sozinha** com `initial_backlog` — fluxo contínuo até o produto começar.
- **Arranque (encadeado pela gênese ou sob demanda):** skill `/kickoff [quantidade]` — garante o
  scaffold, o `product-owner` **escreve o board** com as histórias/épicos e o motor do `/daily-build`
  **puxa as tarefas e desenvolve** em paralelo (`parallelism`) até a entrega. Exige o genoma armado. A
  gênese o **encadeia sozinha** com `initial_backlog` (fluxo contínuo: init → responder → constrói).
- **Ideia do stakeholder → board:** skill `/feature-intake [ideia]` — formata uma ideia crua do humano
  no **mesmo padrão de issue do `product-owner`** (dedup + rejeições + gate + labels) e cria no board.
  O PO decide o quê (benchmarking); o intake só normaliza o que o humano já trouxe.
- **Backlog sob demanda (N de uma vez):** skill `/backlog [quantidade] [tema]` — o humano pede ao
  `product-owner` **quantas histórias/épicos quiser** numa tacada (histórias soltas ou um épico
  decomposto em histórias-filhas via sub-issue), com o mesmo rigor de benchmarking/dedup/labels do
  `/daily-backlog`, mas **sem o teto `features_per_day`**. Só popula o board; não implementa.
- **Starter a partir do board:** skill `/feature <número-da-issue>`.
- **Migração/reescrita (brownfield):** skill `/migrate <origem>` — traz uma solução JÁ implementada de
  outra base/stack. Em vez de inventar a spec, o `migration-analyst` **captura** o comportamento da
  origem como oráculo; o port é por **equivalência**, fatia a fatia (**strangler-fig, não big-bang**),
  atrás de flag, mesmo fluxo `feature → develop → main`. Ver ADR-0002.
- **Rotinas autônomas (crons):** `/daily-backlog` (cria `features_per_day` issues) → ~1h →
  `/daily-build` (implementa + verificação independente + auto-merge em develop + promoção por risco).
  Auditorias que só levantam issues: `/daily-tech-scan` (código + drift), `/daily-ops-scan` (runtime).
  Loop de resultado: `/daily-outcome` (mede se as features moveram o ponteiro; roda junto o
  **`finops-steward`** = custo/ROI + **AIOps**: realimenta o roteamento do `sdd-orchestrator`).
  Higiene de memória: `/distill` (o `knowledge-curator` consolida o episódico recorrente em
  `knowledge.md`, poda para `archive/` e audita o índice — ADR-0005). Espace os crons pesados.
- **Arquitetura cognitiva (ADR-0005):** a memória tem **4 camadas** nomeadas em
  `docs/ai-first/memory.md` (working/semantic/episodic/procedural) com **higiene** (`/distill` consolida e
  **esquece** movendo para `archive/`, nunca inchando). A verificação escala com o risco: `verification_mode:
  panel` roda o `adversarial-reviewer` como **N céticos de lentes distintas** (piso opus/alto por membro), e
  `uncertainty_escalation` escala ao humano por **baixa confiança** de uma etapa, **independentemente do
  tier** de risco (risco OU incerteza, o maior). Knobs no genoma §8.
- **Loop de growth autônomo (ADR-0004):** `/daily-growth` (o `growth-strategist` cria
  `growth_experiments_per_cycle` issues de experimento `growth:*` pela lente do funil AARRR, por ROI) →
  `/daily-build` implementa **atrás de flag, no canário** → `/growth-outcome` (o `growth-analyst` mede
  por coorte e decide **escalar/iterar/matar**; o `finops-steward` fecha CAC/ROI e a queima de token). A
  memória auto-evolutiva é `docs/product/growth-playbook.md`. **Autonomia total inclui mundo-externo**
  (preço/canal/comunicação em massa), contida por freios automáticos — canário, `external_action_cap`,
  `guardrail_metrics`, kill e o gate de conformidade do `security-reviewer` (não relaxa).
- **Cadência/paralelismo/autonomia/orçamento** são knobs do genoma (`features_per_day`, `parallelism`,
  `autonomy_level` — incl. `autônomo` (sem gate humano), `daily_budget`, `budget_per_feature` — teto por
  feature no build paralelo, ADR-0003), ajustáveis a qualquer momento
  (P-15). Mesmo em `autônomo`, os gates automáticos (CI + `adversarial-reviewer` + segurança) e o
  `/rollback` permanecem.
- **Reprovar uma feature antes de `main`:** `/reject-feature <issue#> [motivo]`.
- **Incidente em produção:** `/rollback <n> [motivo]` (kill-switch/revert em `main`).
