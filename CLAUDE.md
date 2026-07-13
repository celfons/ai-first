# CLAUDE.md

Contexto para sessões de IA (Claude Code) **deste repositório**. Este arquivo é o
**índice-mãe**: o mapa de módulos, invariantes e pontos de extensão que uma sessão carrega antes
de qualquer coisa. Para detalhes, veja `docs/sdd/` (constituição, spec, plano, ciclo SDD),
`docs/adr/` (decisões arquiteturais — **leia o índice antes de decidir algo durável**),
`docs/context-map.md` (**mapa de contexto**: domínio → código+docs+ADRs+testes — carregue a linha
do domínio que vai tocar em vez de reler a base) e `docs/product/rejections.md` (**ledger de
rejeições**: o `product-owner` lê para não repropor o que o dono já recusou).

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

## Convenções

- **Fluxo de git: `feature → develop → main`.** Branch `claude/<slug>` sai de `develop` e o PR é
  aberto **contra `develop`**. `main` (produção) só recebe promoção `develop → main` — **nunca** PR de
  feature direto. **A promoção é por tier de risco** (P-10): no nível `conservador` o humano aprova
  tudo; em `progressivo`/`amplo`, 🟢/🟡 podem promover sozinhas e só as arriscadas sobem.
- PR com `Closes #NNN`; `typecheck` + `lint` + `test` limpos (P-10); **gate de segurança** e
  **`adversarial-reviewer` não-bloqueante** obrigatórios para o auto-merge (P-11/P-13).
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
  (`docs/ai-first/project.md`). Rode antes de qualquer feature.
- **Ideia do stakeholder → board:** skill `/feature-intake [ideia]` — formata uma ideia crua do humano
  no **mesmo padrão de issue do `product-owner`** (dedup + rejeições + gate + labels) e cria no board.
  O PO decide o quê (benchmarking); o intake só normaliza o que o humano já trouxe.
- **Starter a partir do board:** skill `/feature <número-da-issue>`.
- **Rotinas autônomas (crons):** `/daily-backlog` (cria `features_per_day` issues) → ~1h →
  `/daily-build` (implementa + verificação independente + auto-merge em develop + promoção por risco).
  Auditorias que só levantam issues: `/daily-tech-scan` (código + drift), `/daily-ops-scan` (runtime).
  Loop de resultado: `/daily-outcome` (mede se as features moveram o ponteiro). Espace os crons pesados.
- **Cadência/autonomia/orçamento** são knobs do genoma (`features_per_day`, `autonomy_level`,
  `daily_budget`), ajustáveis a qualquer momento (P-15).
- **Reprovar uma feature antes de `main`:** `/reject-feature <issue#> [motivo]`.
- **Incidente em produção:** `/rollback <n> [motivo]` (kill-switch/revert em `main`).
