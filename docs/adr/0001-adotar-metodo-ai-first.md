# ADR-0001: Adotar o método `ai-first` (SDD + subagentes + gate único humano)

> Status: Accepted · Data: 2026-07-13
> Feature/Issue: baseline · Princípios tocados: P-1, P-2, P-10 · Supersede: —

## Contexto

Desenvolvimento assistido por IA sem processo ("vibe coding") produz código rápido mas
**sem rastreabilidade, sem invariantes garantidas e sem ponto de controle** — a IA decide o
que fazer, faz, e ninguém sabe por quê nem contra quais regras. Ao mesmo tempo, exigir um
humano em cada passo joga fora o ganho de velocidade da automação.

Queríamos um meio-termo **mais liberal que o vibe code**: a IA conduz o ciclo inteiro de
desenvolvimento (do backlog ao código), com processo e gates automáticos, e **uma única
interação humana** — a aprovação do que vai para produção.

## Decisão

Adotamos o método `ai-first`, composto por:

1. **SDD (Spec-Driven Development)** — toda feature passa por SPECIFY → PLAN → TASKS →
   IMPLEMENT → VERIFY → DOCS, com artefatos rastreáveis (`docs/sdd/features/NNN-slug/`).
2. **Governança em camadas** — uma **constituição** (princípios inegociáveis), **ADRs**
   (decisões duráveis), um **ledger de rejeições** (o que o dono recusou) e um **mapa de
   contexto** (context mesh leve: domínio → código+docs+ADRs+testes).
3. **Roster de subagentes** mapeado às fases do SDD (`product-owner`, `sdd-orchestrator`,
   `feature-spec`, `architect`, `backend-engineer`, `frontend-engineer`, `ux-designer`,
   `tester`, `docs-writer`, `tech-auditor`, `ops-investigator`).
4. **Skills** que dirigem o fluxo: `/feature` (uma issue → PR) e as rotinas diárias autônomas
   (`/daily-backlog`, `/daily-build`, `/daily-tech-scan`, `/daily-ops-scan`), mais
   `/reject-feature` (porta de saída do gate humano).
5. **Fluxo de git `feature → develop → main`** com **um único gate humano**: a automação
   auto-mergeia em `develop` (só com CI verde), e a **promoção `develop → main` é a decisão
   humana**.

## Alternativas consideradas

- **Vibe coding puro** — descartado: sem spec, sem invariantes garantidas, sem rastreabilidade;
  velocidade alta, dívida e risco altos.
- **Humano em todo gate (SDD manual)** — descartado para o fluxo do dia a dia: seguro, porém
  perde o ganho de automação. Continua disponível: o `/feature` manual mantém gates após spec
  e após plan para quando o humano quiser conduzir.
- **Um único mega-agente sem roster** — descartado: contexto inchado, processo incoerente; o
  roster mantém cada fase com escopo curto e invariantes pré-carregadas.

## Consequências

- **Positivas:** velocidade de automação com rastreabilidade e invariantes garantidas; contexto
  enxuto (cada subagente carrega só a fatia do seu domínio); o *porquê* das decisões vira
  acervo (ADRs) e os "nãos" do dono viram aprendizado (rejeições).
- **Custos/limites:** exige disciplina de manter constituição/context-map/ADRs coerentes (é
  trabalho do `docs-writer` em cada feature); o gate único concentra a responsabilidade da
  publicação no humano que revisa o PR `develop → main`.
- **Restrições futuras:** toda feature respeita o ciclo SDD e a constituição; nenhuma mudança de
  comportamento entra sem spec; `main` **nunca** recebe merge sem revisão humana.

## Relacionados

Constituição (P-1 spec-first, P-2 soberania, P-10 gate único), [`docs/sdd/README.md`](../sdd/README.md),
[`docs/context-map.md`](../context-map.md), [`.claude/agents/README.md`](../../.claude/agents/README.md).
