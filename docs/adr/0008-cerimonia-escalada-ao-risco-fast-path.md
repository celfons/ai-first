# ADR-0008: Cerimônia escalada ao risco — fast-path para baixo risco (gates preservados)

> Status: Accepted · Data: 2026-07-19
> Feature/Issue: — (mudança de método) · Princípios tocados: P-10, P-11, P-13, P-14, P-15 · Supersede: —

## Contexto

O ciclo SDD completo — `feature-spec` → `architect` (+ ADR) → `task-decomposer` → `bdd-author` →
implement → `tester` → `adversarial-reviewer` → `security-reviewer` → `docs-writer` — é o certo para
uma feature de comportamento novo. Mas aplicá-lo **a toda mudança** cobra um pedágio desproporcional
nos casos **triviais e de baixo risco** (correção de cópia, ajuste de UI, texto, leitura): spec/plan/
ADR/decomposição/BDD que ninguém vai ler, tokens gastos, latência — sem ganho de qualidade proporcional.
A `features_per_day: 1` isso é caro; em lote, é caro ao quadrado.

O `sdd-orchestrator` já tinha um atalho ("trivial → pula o SDD → backend → tester"), mas ele era
**só por tamanho**, não por **risco** — um `size:trivial` que toca dinheiro/PII/idempotência não deveria
pular nada — e a redação deixava a leitura perigosa de que "trivial pula os gates". Faltava uma política
**explícita, controlada por knob e registrada** que escalasse a **cerimônia** (as fases de autoria) ao
risco **sem nunca relaxar os gates** que a constituição exige.

## Decisão

**A cerimônia de autoria escala ao risco; os gates automáticos, nunca.** Introduzimos um **fast-path**
para demandas de baixo risco, controlado pelo knob de genoma **`fast_path`** (default `on`).

**Elegibilidade (TODAS as condições, senão cai no pipeline completo — default conservador):**
- `size:trivial`, **e**
- risco **🟢** (só texto/UI/cópia/leitura): **não** toca dinheiro, PII, idempotência/efeito colateral,
  invariante (P-#), proatividade, **nem** adiciona dependência nova;
- **sem** `[NEEDS CLARIFICATION]` e com **confiança alta** do orquestrador (senão escala — `uncertainty_escalation`);
- comportamento normativo novo = **não** (se há RF/critério de aceite novo, não é fast-path).

**O que o fast-path COLAPSA (autoria):** `feature-spec` (o corpo da issue é a spec), `architect`/ADR,
`task-decomposer`, `bdd-author` (sem oráculo novo). O plano do `sdd-orchestrator` vira:
`backend`/`frontend-engineer` → `tester` (com **teste de regressão** do que mudou) → gates.

**O que o fast-path PRESERVA (inegociável — P-10/P-11):** CI verde · `adversarial-reviewer`
(**single**, piso opus/alto — P-14) · `security-reviewer` (**gate obrigatório**, fixo opus/alto). O
merge, o tier de promoção e o `docs-writer` (se houver impacto de doc) seguem iguais. **Fast-path reduz
a autoria, não a verificação.**

Quem decide a elegibilidade é o **`sdd-orchestrator`** (já é o roteador de risco/modelo); ele marca a
issue com `fast-path` quando aplicável. Qualquer dúvida → pipeline completo.

## Alternativas consideradas

- **Manter só o atalho por tamanho** — descartada: `size:trivial` não é o mesmo que baixo risco; um
  patch trivial em código de pagamento precisa da cadeia completa.
- **Pular também um dos gates no 🟢** (ex.: segurança em mudança de texto) — descartada: viola P-11
  (gate de segurança obrigatório para auto-merge). O custo de um `security-reviewer` sobre um diff de
  texto é baixo (ele libera rápido); o risco de abrir exceção no gate não compensa.
- **Fast-path sempre ligado, sem knob** — descartada: o dono precisa poder desligar (P-15) num produto
  onde até "texto" é sensível (jurídico, saúde).

## Consequências

- **Positivas:** menos tokens/latência onde não há risco; a cerimônia passa a ser proporcional; o
  pipeline completo fica reservado ao que o merece. A distinção risco≠tamanho fica explícita.
- **Custos/limites:** exige do `sdd-orchestrator` uma classificação de **risco** correta na entrada
  (não só tamanho). Erro de classificação para baixo é contido pelos gates que permanecem
  (adversarial + segurança + CI): o pior caso é um 🟢 mal rotulado que **ainda** passa pelos gates.
- **Restrições futuras:** nenhum fast-path pode pular CI, `adversarial-reviewer` ou `security-reviewer`.
  A elegibilidade é por **risco E tamanho**, nunca só tamanho. O knob `fast_path` é a chave de
  desligamento por produto.

## Relacionados

- Constituição: P-10 (autonomia/gate), P-11 (verificação independente + gate de segurança), P-13
  (separação de papéis), P-14 (piso de modelo), P-15 (knobs).
- ADRs: [ADR-0007](0007-priorizacao-unificada-e-concorrencia-wip.md) (fila/WIP — o fast-path é o
  complemento no eixo da *profundidade* do processo), [ADR-0005](0005-arquitetura-cognitiva.md)
  (`uncertainty_escalation` — baixa confiança tira do fast-path).
- Agentes/skills: `agents/sdd-orchestrator.md` (classifica e marca `fast-path`), `skills/daily-build`.
- Genoma: `docs/ai-first/project.md §8` (`fast_path`).
