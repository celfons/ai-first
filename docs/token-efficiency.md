# Eficiência de token — política do método `ai-first`

Fonte de verdade sobre **como gastar token com intenção** neste método. Vale para todo *driver* (as
skills `/feature`, `/daily-build`, `/kickoff`, `/backlog`…) que orquestra os subagentes de `agents/`.

> **A premissa que não muda.** O `ai-first` troca token por corretude **de propósito**: cada etapa
> roda numa **sessão de contexto limpa** (isolamento → menos alucinação, janela menor) e a revisão é
> **genuinamente independente** (quem revisa não teve o viés de quem escreveu). Isso é desenho, não
> desperdício — e paga: o `adversarial-reviewer` bloqueia de verdade e o `tester` acha bug real que
> uma passada única mais barata deixaria passar. **Nada nesta política enfraquece isso.** O que ela
> corta é o **desperdício por descuido** — releitura fria dos mesmos arquivos, modelo caro onde o
> barato serve, relatório verboso que infla o contexto do driver, e sequencialidade onde há paralelo.

Quatro alavancas, da de maior retorno/menor risco à mais estrutural.

---

## 1 · Bloco de contexto fixo + ordem estável (prompt cache)

**O problema.** Isolar contexto é *não compartilhar histórico de raciocínio* entre subagentes — **não**
é reler os mesmos arquivos imutáveis 8 vezes. Os documentos-base (`CLAUDE.md`, `constitution.md`, a
linha do `context-map`) são **idênticos** entre todas as etapas de uma mesma fatia. Relê-los "a frio"
em cada subagente é gasto redundante puro.

**A regra.** Todo subagente de uma fatia recebe, **primeiro e byte-a-byte idêntico**, um **BLOCO DE
CONTEXTO FIXO** montado uma vez pelo driver:

```
<<CONTEXTO-BASE-DA-FATIA — não releia estes arquivos, já estão abaixo>>
1. CLAUDE.md (índice-mãe: mapa de módulos, invariantes, pontos de extensão)
2. docs/sdd/constitution.md (princípios P-1…P-N — gate de toda feature)
3. docs/context-map.md → só a(s) LINHA(S) do domínio que a fatia toca (o orchestrator as cita)
<</CONTEXTO-BASE-DA-FATIA>>
```

- O bloco é **imutável durante a fatia** (só muda quando o `docs-writer` roda no fim → nova fatia, novo
  bloco). Prefixo idêntico + mesma ordem = **cache hit** de prompt (TTL ~1h da Anthropic cobre uma
  fatia inteira): o 2º…Nº subagente paga ~10% do custo de leitura, não 100%.
- **O que varia por etapa vem DEPOIS do bloco fixo, nunca no meio** — o papel do subagente, a `spec.md`/
  `plan.md`/`tasks.md` específica, o escopo da slice. Intercalar variável no meio do bloco fixo
  **quebra o cache** de tudo que vem depois.
- **Subagentes não devem reler** os arquivos do bloco (o `Read` deles custa de novo e sem cache). A
  seção "Contexto obrigatório" de cada agente agora diz: *"se o bloco fixo foi fornecido, use-o; só
  abra com `Read` o que não estiver nele (o módulo real que vai mudar, um vizinho de estilo)."*

Ganho: **elimina as releituras frias** sem remover uma leitura sequer — as repetidas viram cache.
Risco: zero (o conteúdo é o mesmo). Toca corretude: não.

---

## 2 · Roteamento de modelo+esforço — sempre explícito no `Agent()`

**O problema.** O `sdd-orchestrator` já roteia modelo+esforço por etapa (haiku p/ `docs-writer`, sonnet
p/ a maioria, opus só onde importa), mas se o driver não passa `model`/`effort` no `Agent()`, a etapa
roda no **modelo-default da sessão** (tipicamente opus — o pior caso de custo).

**A regra.**
- O driver invoca **cada** subagente com o `model` (`haiku`/`sonnet`/`opus`/`fable`) e o `effort`
  (`baixo`/`médio`/`alto`/`extra`) **exatos** do plano de delegação. Não passar = bug de custo.
- O `sdd-orchestrator` emite o roteamento em **formato parseável** (uma linha por etapa,
  `agente · model:X · effort:Y`) para o driver mapear direto ao `Agent({model, effort})` sem
  reinterpretar. Ver o formato no `agents/sdd-orchestrator.md`.
- **Piso de segurança (P-14, inegociável):** `adversarial-reviewer` e qualquer etapa que toque
  invariante/segurança/efeito de alto valor **nunca** abaixo de **opus/alto**. Custo-benefício otimiza
  o mecânico, jamais a verificação independente.

Ganho: médio-alto (evita rodar etapas baratas em opus). Risco: zero. Toca corretude: não (o piso protege).

---

## 3 · Retorno enxuto e estruturado por subagente

**O problema.** O relatório final verboso de cada subagente volta ao contexto do **driver** e infla
**todas** as invocações seguintes daquela fatia — custo que **compõe**. A trilha de auditoria real já
mora nos commits, na `spec.md`/`plan.md` e no PR; o relatório no chat não precisa reproduzi-la.

**A regra — verbosidade proporcional à acionabilidade, não uniforme.** Cada subagente devolve o mínimo
que o **próximo elo** precisa para agir:

```
status: ok | bloqueado | needs-clarification
tocou: <arquivos/artefatos — caminho, sem colar conteúdo>
p/ o próximo: <1–3 bullets do que o próximo elo precisa saber para agir>
bloqueios: <[NEEDS CLARIFICATION] / veredito / bug — só se houver>
```

- **Ponteiros, não cópias.** "criei `spec.md` com RF-101..104" — não colar a spec inteira; ela está no
  arquivo. Idem diffs, tabelas de teste, listas longas de arquivos.
- **Exceção deliberada — o `adversarial-reviewer` quando BLOQUEIA.** Aí o detalhe é a entrega: qual
  invariante/cenário quebrou, como reproduzir, o mínimo para corrigir. Verificação que acha bug real
  justifica o custo do detalhe; relatório de rotina não.
- **Sem perda de rastreabilidade:** o que foi feito vive no commit/spec/PR. O retorno enxuto aponta
  para lá.

Ganho: médio, mas **composto** ao longo da fatia. Risco: baixo. Toca corretude: não.

---

## 4 · `Workflow` — pipeline real (paralelismo + orçamento)

**Exige opt-in explícito** do humano (a ferramenta `Workflow` não roda em modo silencioso). O driver
**não** dispara `Workflow` por conta própria — só quando o humano pede orquestração multi-agente
("use um workflow", "ultracode", ou equivalente). Sem opt-in, o fluxo sequencial das skills segue como
está.

**O que ganha.** A cadeia de uma fatia **não é toda sequencial-obrigatória**. Grafo real:

```
feature-spec → architect → ┬→ backend/frontend ─┐
                           ├→ bdd-author ────────┤→ tester → adversarial-reviewer → docs-writer
                           └→ ux-designer ────────┘
```

- `bdd-author` e `ux-designer` dependem só da **spec/plan**, não do código → rodam **em paralelo** com o
  implement (`parallel()`/`pipeline()` sem barreira). Ganho de **wall-clock**, não de token.
- `budget.total` dá **teto de token explícito** que casa com o knob `daily_budget` do genoma — o
  `/daily-build` pode escalar profundidade/parar de pegar features ao esgotar o orçamento.
- `pipeline()` fatia N slices **sem barreira entre etapas** (uma slice pode estar no `tester` enquanto
  outra ainda implementa) — encaixa direto no `parallelism` do genoma.
- **Isolamento preservado:** o `Workflow` *orquestra* sessões independentes; não funde contextos. O
  `adversarial-reviewer` continua uma sessão isolada que não escreveu o código. A troca deliberada
  (token por corretude) fica **intacta**.

Regras de fan-out (barreira só quando a etapa N precisa de **todos** os resultados de N-1; senão
`pipeline()`), roteamento por etapa (`model`/`effort` no `agent()`) e piso de segurança do
`adversarial-reviewer` valem **igual** dentro do `Workflow`.

### Painel adversarial · fan-out da verificação independente (ADR-0005)

Quando `verification_mode: panel` (tier 🔴 ou `autonomy_level: autônomo`), a etapa de verificação vira um
**fan-out**: em vez de um `adversarial-reviewer`, o driver dispara **N céticos concorrentes**
(`adversarial_panel_size`), **cada um com uma lente distinta** (correção · invariante/segurança ·
reprodução/runtime), com **barreira só na agregação** dos vereditos (`parallel()` → decide). Maioria refuta
⇒ bloqueia; um `BLOQUEIA` já barra. Regras que **não** mudam no painel: **piso opus/alto por membro**
(P-14 — a verificação é onde o custo-benefício não otimiza) e **isolamento** (cada membro é cego ao
raciocínio dos outros; recebe o **diff-digest** como fato, §6, não a opinião alheia). É o mesmo motor da
Escala 2, aplicado a **uma** feature de alto risco: gasta-se N× em verificação exatamente onde o gate
humano some — a troca token↔corretude no ponto mais frágil do modo autônomo. Ver
[`agents/adversarial-reviewer.md`](../agents/adversarial-reviewer.md).

### Política de loop · terminação explícita + teto (ADR-0009)

O grafo acima tem **loops iterativos** embutidos: quando o `adversarial-reviewer`/CI bloqueia, o passo
volta ao implement (`backend`/`frontend`) e roda de novo. Loop sem freio é o caminho do runaway de token
e da não-terminação ("re-roda até o reviewer aprovar" quando o reviewer nunca aprova). A política, então,
é **inegociável**: todo loop iterativo termina por **uma** de três condições, a que vier primeiro —

- **Sucesso verificável** — CI verde **e** os gates passam (`adversarial-reviewer` + `security-reviewer`).
- **Teto de re-run** — `max_rerun_attempts` do genoma (default **2**) re-runs do mesmo passo sem verde ⇒
  **PARA** e escala (`awaiting-human`/`needs-human-triage`), deixa o PR parcial atrás de flag.
- **Teto de orçamento** — `budget_per_feature` (loop de uma feature) ou `daily_budget`/`budget.total`
  (loop da rodada). Estourou ⇒ **PARA** aquela feature; as vizinhas seguem (§4 Escala 2).

A **escalada por incerteza** (`uncertainty_escalation`, ADR-0005) tem **precedência sobre "ainda há
orçamento"**: baixa confiança escala ao humano mesmo com re-runs/token sobrando (risco OU incerteza, o
maior). Os **loops de cadência** (crons `/daily-*` + `/distill`, §5 AIOps) são um tipo distinto — cada
firing é orçado e a terminação é o fim do ciclo; é o loop que faz o método **aprender com o uso**, não um
risco de runaway. O piso opus/alto do fan-out de verificação (§4 painel) **não** muda dentro de nenhum loop.

### Composição · sub-workflows contratados (ADR-0010)

O grafo não precisa viver **monolítico dentro de cada driver**. As subcadeias reusáveis viram
**sub-workflows contratados** — `workflow('nome', args)` com **schema de entrada e de saída** — que os
drivers **compõem** em vez de recopiar. A fronteira canônica é **`build-one-feature`** (esta Escala 1
inteira): `/feature`, `/daily-build`, `/kickoff` e `/migrate` a chamam; o painel adversarial (ADR-0005),
o experimento de growth (ADR-0004) e o port de migração (ADR-0002) são as outras. Esqueleto de referência:
[`templates/workflows/build-one-feature.mjs`](../templates/workflows/build-one-feature.mjs).

Três verdades que a composição assume (senão vira bug de expectativa):
- **Segregar ORGANIZA e habilita eval; NÃO isola recurso.** O `workflow()` aninhado **compartilha** com o
  pai o teto de concorrência, o contador de agentes, o abort e o **orçamento de token** (`budget.spent()`
  é pool único). Logo, `budget_per_feature` (§4 Escala 2) e a política de loop (`max_rerun_attempts`,
  ADR-0009) continuam **guardas explícitas na borda** — segregar não contém um runaway sozinho.
- **Aninhamento é de 1 nível** — `workflow()` dentro de um filho lança erro. Composição é `pai → filho`,
  nunca `pai → filho → neto` (o painel roda como `parallel()` de `agent()` dentro do filho, não aninhado).
- **Isolamento intacto (P-11/P-13)** — o sub-workflow orquestra sessões independentes; compartilha
  **contrato/fato**, nunca raciocínio. O maior retorno é que um subgrafo contratado é a **unidade de
  eval**: o "re-baseline de evals" do upgrade de modelo passa a ter contra o quê rodar.

### Escala 2 · N FEATURES num único `Workflow` (recursos compartilhados + teto por feature)

O grafo acima é de **uma** feature. Quando `parallelism > 1`, o `/daily-build` (e o `/kickoff`)
constroem **várias features na mesma rodada** — e o ganho de fazê-lo **num só `Workflow`** (em vez de N
invocações soltas) é **compartilhar o que é comum uma vez** e **orçar cada feature isoladamente**. A
`feature` vira a **dimensão externa** do `pipeline()`; cada feature é um **sub-pipeline isolado** (a
Escala 1 inteira) rodando concorrente, em **worktree próprio** e **branch `claude/<slug>` própria**.

**(a) Bundle de recursos compartilhado — derivado UMA vez, lido por todas.** Antes de abrir as
features, uma **pré-fase** computa o que é **idêntico entre elas** e o passa **read-through** a cada
sub-pipeline (é **fato, não raciocínio** — o isolamento da §1/§6 fica intacto):
- o **BLOCO DE CONTEXTO FIXO base** (`CLAUDE.md` + constitution) — imutável na rodada → cache de prompt
  entre features, não só entre etapas de uma feature;
- o **índice de repo/símbolos** e o **audit de dependências** (§6) — uma varredura serve a todas;
- o **digest de market-scan** (§6) e, quando útil, o **diff-digest** por feature.
Cada feature **sobrepõe** só o que é seu (a linha do `context-map` do seu domínio, sua `spec.md`/
`plan.md`). O que **não** se compartilha: o histórico de raciocínio, o código de uma feature com a
revisão de outra — cada `adversarial-reviewer`/`security-reviewer` continua cego ao resto.

**(b) Teto de gasto POR FEATURE — não só o do loop.** O `Workflow` impõe **dois** limites:
- **`daily_budget`** = `budget.total` (teto global da rodada — já existente);
- **`budget_per_feature`** (novo knob do genoma) = teto de **cada** sub-pipeline. Antes de escalar a
  profundidade de uma feature (mais slices, opus/extra, re-runs), o driver checa o **gasto acumulado
  daquela feature** contra o seu teto. **Estourou → aquela feature PARA** (marca `awaiting-human`/
  `needs-human-triage`, deixa o PR parcial atrás de flag ou fecha-o), **as outras seguem**. Um runaway
  não consome o orçamento das vizinhas nem derruba o lote. Contabilize o gasto por feature via o
  `budget.spent()` do `Workflow` mais as tags `model:*`/`effort:*` (o `finops-steward` fecha depois).

**(c) Merge continua SERIALIZADO.** Paralelo na construção; **serial no merge** em `develop` (uma
branch de cada vez, rebase sobre o `develop` já avançado antes de cada merge — conflito volta ao
`backend-engineer`). Duas features nunca tocam `develop` ao mesmo tempo. Cada feature respeita seus
próprios gates (CI + `adversarial-reviewer` + `security-reviewer`) — o compartilhamento é de **insumo**,
nunca de **veredito**.

Esboço (a `feature` é a dimensão externa; cada uma é a Escala 1 com o bundle injetado e o teto próprio):
```
bundle = derivaShared()                        // 1x: contexto base + índice + deps + market-scan
pipeline(features,                             // dimensão externa: N features concorrentes
  f => subPipelineDaFeature(f, bundle,         // Escala 1 inteira, isolada em worktree próprio
         capBudget = budget_per_feature),      // teto por feature; estourou → pausa SÓ esta
  ...                                          // gates por feature; merge serializado fora do fan-out
)
```

Ganho: wall-clock (features concorrentes) **+** token (bundle derivado 1×, não N×) **+** contenção de
custo justa (o teto por feature impede um runaway de queimar a rodada). Risco: médio-alto (mecânica
nova + worktrees). Toca corretude: não (gates e isolamento por feature intactos).

Ganho geral do `Workflow`: wall-clock + teto de gasto (global e por feature). Risco: médio (nova
mecânica). Toca corretude: não.

---

## 5 · AIOps — telemetria do pipeline + feedback de roteamento

**O problema.** As alavancas 1–4 **otimizam** o gasto, mas ninguém o **mede**. O `sdd-orchestrator`
roteia modelo/esforço por heurística fixa (§2) **sem sinal de acerto**: quando o `haiku`/`sonnet`
barato produz algo que o `adversarial-reviewer`/`security-reviewer` bloqueia e força reimplementação, o
roteamento foi **net-negativo** — saiu mais caro que ter usado o modelo bom de cara. Esse sinal existe e
está sendo jogado fora. Sem medir, `daily_budget` é um teto cego e o roteamento nunca aprende.

**A regra.** O pipeline é **instrumentado como um sistema de produção** — ops para a própria fábrica de
IA. O `finops-steward` (ver `agents/`) fecha o loop, numa cadência (não por fatia):
- **Contabiliza** por feature/etapa: tokens e custo (das tags `model:*`/`effort:*` na issue + do
  `budget.spent()` do `Workflow` quando houver), **custo por feature mergeada**, cache-hit, wall-clock.
- **Mede a qualidade do roteamento:** *taxa de re-run do modelo barato* — quantas vezes uma etapa
  roteada barata foi bloqueada e refeita. Alta taxa numa classe de tarefa = o piso daquela classe está
  baixo demais (o "barato" saiu caro).
- **Realimenta o `sdd-orchestrator` por um documento que se altera:** o ajuste é **persistido em
  `docs/ai-first/routing-policy.md`** — a **memória auto-evolutiva do roteamento**. O `finops-steward`
  grava ali (via a skill) os overrides de piso vigentes ("classe X: haiku forçou 2 re-runs → piso
  sonnet/alto") + o histórico append-only; o `sdd-orchestrator` **lê a tabela vigente** antes de rotear a
  próxima feature. **É esse arquivo que fecha o loop:** ele nasce vazio em todo projeto e **melhora a
  cada rodada** com o custo real. O piso de segurança (P-14) **nunca** desce por ele — só sobe.
- **Honestidade de acesso** (como o `outcome-analyst`): se a telemetria de custo não é alcançável, **diz**
  ("custo por feature não medível — falta instrumentar o contador de tokens"). É achado, não silêncio.
  **Nunca inventa número.**

Ganho: alto e **composto** (cada rodada afina o roteamento das seguintes). Risco: baixo (só mede + sugere;
não muta o fluxo). Toca corretude: não (o piso de segurança protege).

---

## 6 · Cache de derivações determinísticas ENTRE features (read-through de fatos)

**O problema.** O prompt cache (§1) vale **dentro de uma fatia** (~1h TTL). Mas há derivações **caras e
determinísticas** re-executadas do zero a cada feature/dia: o `product-owner` roda o **mesmo
benchmarking de mercado** (`WebSearch` de categoria) todo dia; vários agentes reconstroem o **mapa de
repo/símbolos**; o `security-reviewer` re-audita as **mesmas dependências**.

**A distinção que a política assume.** Compartilhar uma **derivação determinística é compartilhar um
FATO, não um raciocínio** — não fere o isolamento (que a premissa protege). O que o método proíbe é
fundir o *histórico de decisão* de quem escreveu com quem revisa; um digest de mercado ou um índice de
símbolos não é isso.

**A regra.** Derivações caras e estáveis viram **artefato versionado com validade**, lido em vez de
re-derivado:
- **Digest de market-scan** (`docs/product/market-scan.md`, TTL de dias) — o `product-owner` o **lê** e só
  re-busca o delta; não repete a varredura inteira por feature.
- **Diff-digest compartilhado** — `adversarial-reviewer` e `security-reviewer` recebem **um** resumo do
  diff (arquivos/hunks tocados) como fato de entrada; cada um ainda **conclui o veredito sozinho** (o
  julgamento continua independente). Corta uma releitura, não uma opinião.
- **Índice de repo/dependências** — derivado uma vez por rodada, lido pelos agentes que precisam.
- **Invalidação explícita:** todo artefato de cache carrega a **data/base** que o gerou; ao expirar ou ao
  mudar a base, re-deriva. Cache vencido servido como fresco é bug — datar é obrigatório.

Ganho: médio-alto entre features (mata re-derivação diária). Risco: baixo (fato, não raciocínio; datado).
Toca corretude: não.

---

## 7 · Higiene de memória — consolidar e esquecer (não só acumular)

**O problema.** As alavancas 1–6 otimizam o gasto **por rodada**, mas a memória episódica do método
(`evolution.md`, `rejections.md`, históricos de `routing-policy.md`/`growth-playbook.md`) só **cresce**.
Ledger *append-only* que incha por meses vira um custo de contexto silencioso: quem o lê paga por N
entradas onde 3 padrões destilados bastariam. Acumular sem esquecer **contradiz a §1** (contexto enxuto).

**A distinção que a política assume.** Consolidar não é perder informação — é **promover** o recorrente do
episódico (o que aconteceu) para o semantic (o padrão que se aprendeu), e **arquivar** o episódico
consumido. É higiene, não amnésia: a poda **move** para `archive/AAAA-MM.md` (reversível via git), com
ponteiro de volta. É a mesma lógica de "fato datado, não raciocínio" da §6, aplicada ao **tempo**.

**A regra.** Numa cadência (`distill_cadence`, cron `/distill`), o `knowledge-curator`:
- **Destila** ocorrências recorrentes (≥ limiar) num padrão/anti-padrão datado em `docs/knowledge.md` —
  N entradas episódicas viram 1 linha semantic que os agentes leem no lugar.
- **Poda** o episódico consumido/vencido (conforme `memory_retention`) para `archive/` datado — o ledger
  ativo encolhe, o cache de quem o lê barateia.
- **Sinal fraco = achado**, nunca padrão inventado (poluir o semantic é mais caro que não consolidar).

Isolamento intacto: o curator compartilha **fato datado** (padrão), nunca raciocínio. Ver
[`docs/ai-first/memory.md`](ai-first/memory.md) e ADR-0005.

Ganho: composto ao longo dos meses (o custo de ler a memória para de crescer sem limite). Risco: baixo
(poda reversível + gate PR/validate). Toca corretude: não.

---

## 8 · Higiene de contexto working — limpeza por costura (não reset)

**O problema.** As alavancas 1–7 otimizam o gasto por várias frentes, mas nenhuma trata do **rabo
variável que cresce dentro de uma sessão longa**: a thread do *driver* que acumula o retorno de cada
etapa ao longo de uma feature, e — pior — o contexto da tentativa que **falhou** e foi re-implementada no
loop de verificação (ADR-0009). O acúmulo infla toda invocação seguinte (custo que **compõe**, mesmo com
os retornos enxutos do §3) e, no re-run, arrasta raciocínio morto que **ancora** o modelo na abordagem
errada.

**O anti-padrão a evitar.** "Limpar geral entre toda etapa" é **pior que não limpar**: evicta o prompt
cache do §1 (o prefixo fixo quente, ~1h TTL → paga a releitura) e arrisca cortar estado vivo. A limpeza
tem de ser **cirúrgica**.

**A regra (ADR-0012).** Limpa-se o **rabo variável** (retornos antigos, ruído de tool-calls resolvidos);
**preserva-se byte-a-byte o BLOCO DE CONTEXTO FIXO** (§1) para não perder o cache. É seguro porque o
hand-off já é durável (§3): os retornos são ponteiros (commit/spec/PR) e o contrato "p/ o próximo"
re-passa o estado vivo mínimo como **fato**, não como histórico. **Costuras de limpeza** (default `seam`):
- **Fim de slice** — depois que o `docs-writer` fecha a fatia (§1 já troca o bloco fixo aqui).
- **Fim de feature** — antes da próxima no build paralelo (cada uma já é sub-pipeline isolado, §4/ADR-0010).
- **Entre re-runs de verificação** — o re-implement recebe **o veredito** (o que corrigir), **não** o
  contexto da tentativa falha. Ganho duplo: token **+** menos ancoragem no caminho errado.

**Limiar dinâmico gated.** Com `context_clear_policy: dynamic`, ao cruzar `context_clear_threshold` (% da
janela) a limpeza **espera a próxima costura** (hand-off durável) em vez de disparar mid-slice — escape
valve para features gigantes, nunca faca cega. Default `seam`; `off` desliga.

Camada certa: isto é higiene da memória **working** (ADR-0005) — distinta do `/distill` (§7), que cuida
da **episódica**. Mesma lei ("consolidar/esquecer, não inchar"), camada diferente.

Ganho: médio e **composto** por feature; alto no re-run. Risco: baixo **se** cirúrgica (default `seam`);
limpeza mal-feita perde eficiência. Toca corretude: não (isolamento/verificação intactos — limpar ≠ fundir).

---

## Consciência de janela de cache (afinação do agendamento)

O prompt cache (§1) tem TTL ~1h. Duas consequências operacionais:
- **Mantenha as slices de uma mesma feature dentro da janela** — espaçar as etapas de uma fatia além de
  ~1h joga o bloco fixo fora do cache e paga a leitura de novo. O espaçamento dos crons pesados
  (`docs/roster.md`) é sobre **janela de uso do modelo**; dentro de **uma** feature, o objetivo oposto
  vale: **agrupe** para manter o cache quente.
- **O gap de ~1h entre `/daily-backlog` e `/daily-build` é cache-frio de propósito** (fatias diferentes,
  blocos diferentes) — está correto; não é o alvo desta afinação.

---

## Resumo operacional (o que o driver faz em toda fatia)

1. **Monta o BLOCO DE CONTEXTO FIXO uma vez** (CLAUDE.md + constitution + linha(s) do context-map que o
   orchestrator citou) e o passa **idêntico, primeiro** a cada subagente. O que varia vem depois.
2. **Passa `model`/`effort`** do plano do orchestrator em **cada** `Agent()`. Nunca deixa cair no
   default. Piso opus/alto para `adversarial-reviewer` e invariante/segurança.
3. **Exige retorno enxuto** (status · tocou · p/ o próximo · bloqueios). Detalhe só quando bloqueia.
4. **Com opt-in do humano:** usa `Workflow` para paralelizar o independente e impor `budget.total`.
   Com `parallelism > 1`, constrói **N features num só `Workflow`** (§4 Escala 2): deriva o **bundle
   compartilhado 1×**, roda cada feature isolada com **teto `budget_per_feature`** e mantém o **merge
   serializado** — um runaway pausa só a sua feature, não o lote.
5. **Reaproveita as derivações caras** (§6) que já existem como artefato datado — market-scan,
   diff-digest, índice de repo — em vez de re-derivá-las; agrupa as slices de uma feature na janela de
   cache (~1h).
6. **Limpa o contexto working na costura** (§8): no fim de slice/feature e **entre re-runs de
   verificação** (passa o veredito, não a tentativa falha), **preservando o prefixo fixo cacheado**.
   `context_clear_policy: seam` (default) | `dynamic` (gated à costura) | `off`.

Itens 1–3 são puro ganho, sem trade-off. Item 4 é estrutural e opt-in. A telemetria da alavanca **5**
(AIOps) é medida **fora da fatia** pelo `finops-steward`, numa cadência, e realimenta o roteamento —
puro ganho (só mede e sugere).
</content>
</invoke>
