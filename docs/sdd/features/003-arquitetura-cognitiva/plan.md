# Plan: Arquitetura cognitiva de 2ª ordem

> Local: `docs/sdd/features/003-arquitetura-cognitiva/plan.md` · Deriva de `spec.md` (aprovada).
> Aqui entram as decisões técnicas — cada uma **rastreada ao RF** que serve.

## 1 · Abordagem

O framework **já é** um organismo com memória de fato; esta feature a torna **explícita e higiênica**
sem introduzir infraestrutura nova. Cinco alavancas, todas em `docs/*`, `agents/*` e `skills/*`
(o "código" deste repo-método): (1) um **doc-mãe de memória** que nomeia as 4 camadas e as mapeia aos
artefatos existentes; (2) uma **política de retenção + consolidação** operada por um novo agente
`knowledge-curator` e a skill `/distill`; (3) o `context-map.md` promovido a **índice de recuperação por
tag**, mantendo a curadoria determinística; (4) um **modo painel** para o `adversarial-reviewer`; (5) um
**sinal de confiança** que escala ao humano por incerteza. Tudo **opt-in por knob**, defaults
conservadores, isolamento de contexto intacto.

Alternativas descartadas: **retrieval semântico/vetorial** (adiado — a base cabe num índice; ADR-0005
reafirma a nota do `context-map`); **consolidação automática sem gate** (fere P-13 — o curator *propõe*,
o PR/validate aprova); **painel sempre-ligado** (encarece o caminho comum sem retorno — só no risco alto).

> **Decisão arquitetural durável?** Sim — nomear as 4 camadas, a política de esquecimento e o modo painel
> restringem features futuras. → **ADR-0005** (`docs/adr/0005-arquitetura-cognitiva.md`), Proposed nesta
> feature, Accepted na integração. Herda a nota de "determinístico > semântico" do `context-map`.

## 2 · Módulos tocados

Não há `src/` (repo-método): os "módulos" são os artefatos do plugin. P-5 aqui = memória escreve só em
`docs/*` e `skills/*`, nunca em lógica de app.

| Artefato | Mudança | RFs |
|---|---|---|
| `docs/ai-first/memory.md` | **novo** — doc-mãe das 4 camadas | RF-COG-01, RF-COG-13 |
| `docs/ai-first/project.md` §8 | novos knobs (retenção, cadência, painel, incerteza) | RF-COG-12 |
| `docs/evolution.md`, `docs/ai-first/routing-policy.md`, `docs/product/{market-scan,rejections,growth-playbook}.md` | cabeçalho de **política de retenção** | RF-COG-02 |
| `agents/knowledge-curator.md` | **novo** subagente (consolida + poda + propõe skill) | RF-COG-03, RF-COG-11 |
| `skills/distill/SKILL.md` | **nova** skill (driver do curator, cadência) | RF-COG-04 |
| `docs/context-map.md` | tabela → **índice por tag** + auto-manutenção | RF-COG-05, RF-COG-06 |
| `agents/adversarial-reviewer.md` | **modo painel** (N céticos, lentes distintas) | RF-COG-07, RF-COG-08 |
| `docs/token-efficiency.md` | nova alavanca §7 (consolidação) + padrão de painel no §4 | RF-COG-03, RF-COG-07 |
| `agents/{backend-engineer,architect,feature-spec,experiment-designer,sdd-orchestrator}.md` | contrato de **confiança** + escalada por incerteza | RF-COG-09, RF-COG-10 |
| `docs/sdd/constitution.md` | **corolário aditivo** em P-10/P-11 | RF-COG-08, RF-COG-10 |
| `CLAUDE.md`, `docs/roster.md`, `docs/adr/README.md` | índice/roster/índice-ADR atualizados (integração) | todos |

## 3 · Dados

- **Sem migration/banco.** O "estado" é markdown versionado.
- **Retenção/poda (RF-COG-02):** cada ledger episódico ganha um cabeçalho `retenção:` (limite de entradas
  ou TTL em dias + destino `.../archive/AAAA-MM.md`). A poda **move**, não apaga (reversível via git). O
  padrão consolidado em `knowledge.md` referencia a origem arquivada.
- **Sem PII** nova (P-7 não aplicável): a memória do método é sobre o próprio pipeline, não sobre usuários.

## 4 · Idempotência e falha

- **`/distill` é idempotente:** rodar duas vezes sobre o mesmo ledger não duplica padrão em
  `knowledge.md` (o curator deduplica por chave de aprendizado) nem re-poda o já arquivado. Consolidação
  parcial que falha **não** deixa `knowledge.md` e o ledger incoerentes: a poda só ocorre **após** o padrão
  ser gravado (ordem: grava semantic → arquiva episodic). Falha entre as duas = ledger intacto, re-tentável.
- **Painel:** um cético que morre/timeout **não** vira "aprovado" — conta como voto ausente; empate/falha
  ⇒ trata como não-refutado só se o quórum mínimo de votos válidos foi atingido, senão o driver re-roda ou
  escala (nunca merge no escuro). P-4/silêncio-é-bug aplicado ao próprio pipeline.
- **Escalada por incerteza:** confiança baixa marca `awaiting-human` **uma vez**; não re-dispara em loop.

## 5 · Config e rollout

- **Knobs novos (P-9, opt-in, default seguro):** `memory_retention` (default: 90 dias / 50 entradas por
  ledger), `distill_cadence` (default: semanal, cron espaçado), `verification_mode` (`single` default),
  `adversarial_panel_size` (default 3, só vale em `panel`), `uncertainty_escalation` (`on` por default —
  é barato e seguro; limiar = `confidence: baixa`).
- **Kill-switch:** `verification_mode: single` e `uncertainty_escalation: off` revertem ao comportamento
  atual sem tocar em agente. `/distill` desativável removendo o cron.
- **Ordem:** doc-mãe + knobs (S1) → índice (S2) → curator+skill (S3) → procedural (S4) → painel (S5) →
  incerteza (S6) → integração/costura (S7). Cada fatia é reversível (só adiciona; `validate` verde).

## 6 · Observabilidade e medição de resultado

- **Auditoria da memória:** toda consolidação/poda deixa data-base + ponteiro de arquivo (P-8); o
  `finops-steward` já contabiliza o custo de `/distill` como qualquer etapa (tags `model:*`/`effort:*`).
- **Métrica de sucesso (spec §8) instrumentada por inspeção do repo:** link-check de `memory.md`
  (0 fantasmas), presença do cabeçalho de retenção nos ledgers, rastro de tag no plano de delegação,
  presença do painel nos PRs de risco alto, labels `awaiting-human` por incerteza, histórico de `skills/`.
  Não há telemetria runtime — a medição é **verificável no diff/histórico** (honestidade de acesso: dito).

## 7 · Testes

O gate deste repo é `node scripts/validate-plugin.mjs` (frontmatter de todo `agents/*.md` e
`skills/*/SKILL.md`). Cada fatia fecha com **validate verde**. Como não há runner de app:
- **Invariante de estrutura:** `validate` garante que `knowledge-curator` e `distill` são componentes
  válidos (não viram "fantasma").
- **Invariante de coerência (revisão + link-check manual):** todo artefato citado em `memory.md` existe;
  toda referência cruzada nova (CLAUDE.md, roster, context-map, ADR índice) resolve.
- **BDD:** `bdd_style` do genoma está `[A DEFINIR]` (esqueleto) e não há runner — os critérios de aceite da
  spec §4 servem de checklist de revisão (o `tester`/`adversarial-reviewer` os usa quando o genoma armar).

## 8 · Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| Consolidação inventa padrão de sinal fraco | Poluição de `knowledge.md`, decisão enviesada | Limiar de ocorrências + "sem sinal = achado" (RF-COG-03); gate PR/validate; poda reversível |
| Poda apaga aprendizado ainda útil | Perda de memória | Poda **move** para `archive/` datado (nunca apaga); ponteiro de volta; git |
| Painel encarece o caminho comum | Queima de token sem retorno | Opt-in por knob; só risco alto/autônomo; default `single` |
| Confiança mal-calibrada (falsa baixa) enche o humano | Fadiga de gate, autonomia regride | Limiar ajustável (P-15); confiança **roteia**, não bloqueia; escala uma vez |
| Índice por tag colide/ambíguo | Retrieval carrega domínio errado | Determinístico + curadoria; ausência/ambiguidade de linha = achado (RF-COG-06) |
| Corolário na constituição lido como afrouxar P-10 | Governança confusa | Corolário é **aditivo** (risco OU incerteza, o maior); nenhum gate removido; PR toca a constituição explicitamente |
