# ADR-0001: Adotar o método `ai-first` (SDD + subagentes + gate humano ajustável)

> Status: Accepted · Data: 2026-07-13
> Feature/Issue: baseline · Princípios tocados: P-1, P-2, P-10 · Supersede: —

> **Atualização (via mudança na constituição, P-10):** o `autonomy_level` ganhou um quarto nível,
> **`autônomo` (100% IA, sem gate humano)** — todos os tiers, inclusive 🔴, auto-promovem. O texto
> original abaixo descreve o default (gate humano por risco); onde ele diz "🔴 nunca auto-promove" ou
> "uma única interação humana", leia **"exceto no nível `autônomo`"**. Os gates **automáticos** (CI +
> `adversarial-reviewer` + segurança + orçamento) e o kill-switch (`/rollback`) permanecem em **todos**
> os níveis. O nível continua sendo um dial reversível do genoma.

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
5. **Fluxo de git `feature → develop → main`** com **verificação independente** antes do merge
   (`adversarial-reviewer`, P-11) e **gate humano por tier de risco** (P-10): a automação
   auto-mergeia em `develop` (só com CI verde + veredito não-bloqueante), e a **promoção
   `develop → main`** é liberada conforme o `autonomy_level` — no nível `conservador` (default) o
   humano aprova tudo; nos níveis maiores, só o que sobe por risco. O nível é um dial do genoma.
6. **Loop fechado com a realidade** (P-12): toda feature declara métrica de sucesso e é medida
   pós-ship (`outcome-analyst`); o que não moveu o ponteiro é iterado ou removido.

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
  trabalho do `docs-writer` em cada feature); no nível de autonomia `conservador`, o humano é o
  gargalo de throughput (mitigado subindo `autonomy_level`/`features_per_day` com o histórico).
- **Restrições futuras:** toda feature respeita o ciclo SDD e a constituição; nenhuma mudança de
  comportamento entra sem spec nem sem verificação independente; o que chega a `main` sempre passou
  pelo tier de risco (🔴 **nunca** auto-promove — sempre revisão humana; **exceto no nível `autônomo`**,
  onde 🔴 também auto-promove e só os gates automáticos barram — ver a Atualização no topo).

## Relacionados

Constituição (P-1 spec-first, P-2 soberania, P-10 autonomia progressiva, P-11 verificação independente,
P-12 loop de resultado), [`docs/sdd/README.md`](../sdd/README.md), [`docs/context-map.md`](../context-map.md),
[`docs/roster.md`](../roster.md).
