# CLAUDE.md

Contexto para sessões de IA (Claude Code) **deste repositório**. Este arquivo é o
**índice-mãe**: o mapa de módulos, invariantes e pontos de extensão que uma sessão carrega antes
de qualquer coisa. Para detalhes, veja `docs/sdd/` (constituição, spec, plano, ciclo SDD),
`docs/adr/` (decisões arquiteturais — **leia o índice antes de decidir algo durável**),
`docs/context-map.md` (**mapa de contexto**: domínio → código+docs+ADRs+testes — carregue a linha
do domínio que vai tocar em vez de reler a base) e `docs/product/rejections.md` (**ledger de
rejeições**: o `product-owner` lê para não repropor o que o dono já recusou).

> ⚠️ **Este é o `CLAUDE.md` do framework `ai-first` (esqueleto).** Ao adotar o método num projeto
> real, **substitua as seções marcadas `_(preencha)_`** pelo mapa e pelas invariantes do seu
> sistema. As instruções de processo (fluxo de git, ciclo SDD, subagentes, skills) já valem como
> estão. Veja o [README](README.md) para o passo a passo de adoção.

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

As **universais do método** (P-1…P-10) já estão na constituição e valem aqui. Liste abaixo as
**específicas do seu projeto** (Parte B da constituição), no formato "invariante + onde é testada":

- _(ex.: **chave de escopo em toda query.** Multi-tenant é absoluto. Testado por `…`.)_
- _(ex.: **fonte de verdade externa** — pagamento = gateway; estado local é projeção.)_
- **Idempotência antes de todo efeito** (P-3): reserva + rollback na falha.
- **IA nunca confiada** (P-4): timeout, saída validada, fallback determinístico.
- **Acesso a dados atrás da porta** (P-5): driver/SQL só dentro de `repositories/`.

## Pontos de extensão (encaixe a mudança neles — não invente caminho novo)

_(preencha)_ — Onde comportamento novo entra sem tocar no núcleo. É o que a skill
`.claude/skills/new-extension` e o `architect` consultam.

- Provedor externo novo → implementa a **porta** em `…/`.
- Efeito novo → **handler/Action** + regra declarativa em `…/`.
- Dado novo → método na **porta de dados** (`repositories/`).
- _(strategy/plugin, se houver)_ → registrar em `…`.

## Padrões (referência rápida)

_(preencha)_ — Os idiomas do hot path do seu projeto, em uma linha cada (ex.: batch de banco,
reserva de idempotência, laço da fila, chamada de LLM com timeout+validação+fallback).

## Convenções

- **Fluxo de git: `feature → develop → main`.** Branch `claude/<slug>` sai de `develop` e o PR é
  aberto **contra `develop`**. `main` (produção) só recebe PR de promoção `develop → main` —
  **nunca** PR de feature direto. **A promoção `develop → main` é o único gate humano.**
- PR com `Closes #NNN`; `typecheck` + `lint` + `test` limpos (P-10).
- **Ciclo SDD** para toda mudança de comportamento: ver `docs/sdd/README.md`. Uma issue = uma
  feature = uma branch = um `Closes #NNN`.
- **Subagentes de desenvolvimento** (`.claude/agents/`, ver `.claude/agents/README.md`): roster
  mapeado ao ciclo SDD. Delegue a feature nova ao `sdd-orchestrator` para manter o contexto enxuto.
- **Starter a partir do board:** skill `/feature <número-da-issue>`.
- **Rotinas diárias autônomas (crons):** `/daily-backlog` (cria a issue do dia) → ~1h → `/daily-build`
  (implementa + auto-merge em develop + PR de promoção). Auditorias que só levantam issues:
  `/daily-tech-scan` (código) e `/daily-ops-scan` (runtime). Espace os crons pesados.
- **Reprovar uma feature antes de `main`:** `/reject-feature <issue#> [motivo]`.
