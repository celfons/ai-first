# Tasks: Arquitetura cognitiva de 2ª ordem

> Local: `docs/sdd/features/003-arquitetura-cognitiva/tasks.md` · Deriva de `plan.md`.
> Feature **grande** (5 alavancas + integração) → decomposta em micro-slices (Forma B). Cada slice roda
> em contexto focado, carrega só o listado, e **fecha a árvore verde** (`node scripts/validate-plugin.mjs`)
> antes da próxima. A slice de integração (S7) agrega o valor e prova a coerência ponta a ponta.

## Forma B — grafo de execução

| Slice | Título | Arquivos / contexto | Depende de | Paraleliz. | Done + teste | RF | Árvore verde |
|---|---|---|---|---|---|---|---|
| S0 | SPECIFY+PLAN+DECOMPOSE | `features/003-*/`, ADR-0005 (Proposed) | — | não | spec+plan+tasks+ADR existem; gate constitucional | P-1/P-2 | sim (só docs) |
| S1 | Fundação da memória | `docs/ai-first/memory.md` (novo), `project.md §8` (knobs), cabeçalho de retenção nos ledgers | S0 | não | 4 camadas nomeadas + link-check 0 fantasmas; knobs no genoma; retenção nos ledgers | RF-COG-01, RF-COG-02, RF-COG-12, RF-COG-13 | sim (só adiciona) |
| S2 | Retrieval indexado | `docs/context-map.md` (tabela→índice por tag + auto-manutenção) | S1 | S5,S6 | tags por domínio; regra de seleção por casamento; nota determinística | RF-COG-05, RF-COG-06 | sim |
| S3 | Consolidação + poda | `agents/knowledge-curator.md` (novo), `skills/distill/SKILL.md` (nova), `token-efficiency.md §7` | S1 | S5,S6 | curator + skill são componentes válidos (`validate`); alavanca §7 escrita | RF-COG-03, RF-COG-04 | sim |
| S4 | Memória procedural | `agents/knowledge-curator.md` (+seção), `memory.md` (camada procedural) | S3 | — | curator detecta procedimento recorrente → propõe skill via gate | RF-COG-11 | sim |
| S5 | Painel adversarial | `agents/adversarial-reviewer.md` (modo painel), `token-efficiency.md §4` (padrão) | S1 | S2,S3,S6 | N céticos, lentes distintas, piso opus/alto, um BLOQUEIA basta | RF-COG-07, RF-COG-08 | sim |
| S6 | Escalada por incerteza | `agents/{backend-engineer,architect,feature-spec,experiment-designer,sdd-orchestrator}.md`, `constitution.md` (corolário) | S1 | S2,S3,S5 | contrato `confidence`; escala por incerteza ⟂ tier; corolário aditivo | RF-COG-09, RF-COG-10 | sim |
| **S7** | **INTEGRAÇÃO** | `CLAUDE.md`, `roster.md`, `context-map.md` (linha transversal), `evolution.md` (entrada), `adr/README.md` (índice), ADR-0005→Accepted | S1–S6 | não | **critérios de aceite da spec §4 ponta a ponta**; validate verde; cross-links resolvem | todos | sim |

## Caminho crítico

`S0 → S1 → (S2 ∥ S3 ∥ S5 ∥ S6) → S7`, com **S4 depois de S3** (mesma peça: o `knowledge-curator`).
S2, S3, S5 e S6 dependem só da fundação (S1) e tocam arquivos distintos → paralelizáveis. Sob `Workflow`
(opt-in), rodariam como sub-pipelines concorrentes; sequencialmente, esta é a ordem de menor risco.

## Gate de merge (da feature inteira)

- [ ] `node scripts/validate-plugin.mjs` verde **a cada slice** (não só no fim)
- [ ] Critérios de aceite da spec §4 cobertos (checklist de revisão + link-check; não há runner de app)
- [ ] `adversarial-reviewer` não-bloqueante sobre o agregado (P-11) — quando o genoma armar o runner
- [ ] Gate constitucional revisitado: corolário de P-10/P-11 é **aditivo**, nenhum P-# violado
- [ ] PR com `Closes #NNN` (quando houver issue no board)
