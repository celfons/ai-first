# ADR-0019: Vereditos estruturados, orçamento por delta e knobs ligados no motor (o grafo passa a executar o que a doutrina promete)

> Status: Accepted · Data: 2026-08-17
> Feature/Issue: revisão da esteira (auditoria do pipeline) · Princípios tocados: P-3, P-10, P-11, P-13, P-14, P-15 · Supersede: —

## Contexto

Desde o ADR-0018 o **grafo é o caminho default**: `/feature`, `/daily-build`, `/kickoff` e `/migrate`
rodam `.claude/workflows/build-one-feature.mjs` (e o pai `build-many-features.mjs`). Uma auditoria da
esteira encontrou uma assimetria grave entre o que os ADRs/skills descrevem e o que o motor executa —
o método cresceu em prosa (18 ADRs, ~35 knobs, 27 agentes, ~11.700 linhas de markdown) enquanto o grafo
tinha 429 linhas, conhecia **9 agentes** e lia **7 knobs**. Os achados, todos verificados no código:

1. **Gate parseado por regex em texto livre.** `/BLOQUEIA|bloqueado|blocked/i` casava com a seção
   obrigatória `## Bloqueadores` de um veredito **APROVA** (toda feature virava re-run até
   `awaiting-human`) e **não** casava com o `tester`, cujo contrato (`status: ok | bug-encontrado`) não
   contém a palavra — um bug de produção passava o gate como não-bloqueante. Falso positivo e falso
   negativo pela mesma causa. O `schema:` já existia no motor, usado só na decomposição.
2. **Teto por feature medido no contador global.** `budget.spent()` é o gasto do **turno inteiro**
   (main loop + todos os workflows). Comparado direto a `budget_per_feature`, a 1ª feature consumia o
   teto e todas as seguintes abortavam com `budget-exceeded` antes da spec.
3. **Knobs só na prosa.** `fast_path` (ADR-0008), `verification_mode`/`adversarial_panel_size`
   (ADR-0005), a flag `comportamento:<cria|altera|nenhum>` (ADR-0015) e `uncertainty_escalation`
   (ADR-0005) não existiam no grafo. Consequência: **piso fixo de 12 invocações e 4 opus por feature**,
   independentemente do risco — um ajuste de cópia pagava o mesmo que uma migração de esquema. Os dois
   maiores redutores de custo do método estavam desligados no caminho quente.
4. **Agendador ciente de conflito inerte.** `scripts/plan-batch.mjs` lê o footprint do `plan.md`, que só
   existe **depois** da fase PLAN — mas o driver o chamava **antes** de fanar out, com issues recém-criadas
   pelo PO. Resultado: lote vazio ("sem footprint declarado") e o paralelismo caindo no "pega as N
   primeiras por prioridade", exatamente o que o ADR-0007 existe para evitar. O filtro `--only` ainda
   casava por id de diretório SDD enquanto o driver raciocina em número de issue.
5. **Caminho alternativo no gate mais crítico.** `verification_parallelism: flat` pagava o piso opus
   mesmo quando o `tester` reprovaria, para ganhar wall-clock — complexidade no ponto onde ela menos se
   justifica. E `context_clear_threshold` não era lido por ninguém.
6. **Um único ofício implementando tudo.** `implementaSlice()` chamava `backend-engineer` fixo:
   `frontend-engineer`, `data-engineer`, `prompt-engineer`, `sre-engineer` e `ux-designer` eram
   inalcançáveis pelo grafo. Uma feature de UI ou uma migração era escrita pelo agente com o system
   prompt errado. Somado a isso, o roteamento do `sdd-orchestrator` chegava como markdown e **nenhum
   parser existia**: `routing` chegava `{}` e todas as etapas caíam no modelo default.

O padrão comum: **doutrina que virou documentação em vez de virar código**, e código que contradizia a
doutrina em silêncio. Um método que se declara auto-evolutivo não pode ter o motor divergindo do texto.

## Decisão

O motor passa a **executar** o que a doutrina promete. Seis mudanças, todas no grafo contratado:

1. **Veredito é dado tipado, não prosa.** `tester`, `adversarial-reviewer` e `security-reviewer` são
   invocados com `VERDICT_SCHEMA` (`veredito` ∈ {APROVA, APROVA-COM-RESSALVAS, BLOQUEIA}, `bloqueadores[]`
   estruturados, `ressalvas[]`, `confidence`). O gate lê o campo. **Fail-closed:** verificador sem
   retorno conta como BLOQUEIA. O `tester` passa a **votar** no gate — é o Tier 1 do ADR-0013, e um voto
   invisível não é um gate. Em degradação (sem schema) o parse usa o token exato `\bBLOQUEIA\b`, nunca
   substring.
2. **Orçamento por feature é medido por DELTA** desde a entrada do subgrafo
   (`budget.spent() - SPENT_AT_START`), não pelo contador global do turno.
3. **Knobs ligados:** `fast_path`+elegibilidade colapsam a autoria (spec/plan/decompose/BDD) mantendo
   os gates; `comportamento: nenhum` pula o `bdd-author`; `verification_mode`/`adversarial_panel_size`
   escolhem entre **1 cético (default)** e **N lentes**, com painel forçado em tier 🔴 e em
   `autonomy_level: autônomo`; `uncertainty_escalation` lê o `confidence` que as etapas de autoria já
   devolviam (agora via `STEP_SCHEMA`) e escala ao humano por incerteza.
4. **Agendamento em duas etapas.** O grafo pai **planeja todas as features em paralelo** (spec/plan só
   escrevem os próprios docs ⇒ sem conflito de superfície), **colhe o footprint real** de cada
   `plan.md` e só então agenda o implement em **ondas de footprint disjunto**. `build-one-feature` ganha
   o parâmetro `stage` (`full` | `plan` | `build`). `plan-batch.mjs` continua a especificação canônica da
   regra de conflito, ganha casamento por `issue:` e reporta um bucket **`unplanned`** distinto de
   `deferred` — "ainda não planejada" exige ação diferente de "adiada por conflito".
5. **Menos caminho no gate:** `verification_parallelism: flat` é descontinuado (aceito e ignorado, com
   log); `context_clear_threshold` e o modo `dynamic` de `context_clear_policy` saem do genoma.
6. **Slice roteada ao ofício.** A decomposição declara `papel` (`backend`|`frontend`|`data`|`prompt`|`sre`)
   e o motor invoca o agente correspondente; `ux-designer` entra na fase DESIGN quando a feature tem UI
   significativa. O `sdd-orchestrator` passa a emitir um bloco **` ```routing json `** que o driver copia
   **verbatim** para os `args` do `Workflow` — fim da tradução de prosa "no olho".

Corolário do ADR-0015 que estava violado no motor: o `bdd-author` **não** corre concorrente ao implement;
ele roda **antes**, porque o laço externo tem de estar vermelho antes de existir código.

## Alternativas consideradas

- **Manter o parse por regex e só corrigir a expressão** — trocaria um regex frágil por outro; qualquer
  mudança de redação nos agentes voltaria a quebrar o gate. Saída estruturada é contrato, não convenção.
- **Deixar os knobs na prosa e confiar no driver (LLM) para aplicá-los** — é exatamente o que existia:
  o driver "deveria" pular fases e traduzir roteamento, e não o fazia de forma verificável. Knob que
  não é lido por código não é knob, é comentário.
- **Manter o agendador antes do PLAN e pedir footprint na issue** — empurraria para o `product-owner`
  uma decisão técnica que é do `architect`, e o footprint sairia adivinhado.
- **Fatiar o gate por slice** (rejeitado de novo, ADR-0017 §C): multiplicaria o piso opus por N.

## Consequências

- **Positivas:** o gate volta a discriminar (aprova o que passa, barra o que falha); o teto por feature
  funciona no build paralelo; o custo passa a escalar com o risco (uma 🟢 trivial pode custar 1 opus em
  vez de 4); o agendamento por conflito deixa de ser inerte; features de UI/dado/IA/infra são escritas
  pelo ofício certo; o roteamento do orquestrador deixa de ser decoração cara.
- **Custos/limites:** o motor cresce (~430 → ~600 linhas) e passa a depender de saída estruturada — um
  modelo que ignore o schema cai no caminho degradado (fail-closed, mais conservador). O agendamento em
  duas etapas introduz uma **barreira** entre planejar e construir: ganha-se segurança de conflito e
  perde-se um pouco de wall-clock ante o `pipeline()` anterior. `stage` fatiado faz o teto por feature
  ser medido por chamada (a fase PLAN é barata; o desvio é aceito e documentado).
- **Restrições futuras:** (a) **nenhum gate volta a ser parseado por texto livre** — veredito novo entra
  como campo de schema; (b) **knob novo nasce ligado**: se o motor não o lê, ele não existe (o
  `check-coherence` guarda a presença no genoma; a revisão guarda a leitura); (c) o `bdd-author` nunca
  volta a ser `paralelo:sim`; (d) o piso opus/alto de `adversarial-reviewer`/`security-reviewer` segue
  fora do alcance de `routing` (P-14).

## Emenda 2026-08-17 (4.5.1) — o roteamento chegava pela metade

A primeira entrega ligou o `routing` ao motor, mas deixou dois vazamentos no mesmo eixo:

- **Vocabulário de esforço.** O método fala `baixo|médio|alto|extra` (é o que este ADR mandou o
  `sdd-orchestrator` emitir, e o que suas tabelas de custo-benefício usam); o runtime fala
  `low|medium|high|xhigh`. Ninguém traduzia: o `model` do plano era honrado e o `effort` caía no default
  da sessão **em silêncio** — justo o eixo que calibra ambiguidade e risco. Agora `route()` normaliza
  (os dois vocabulários), e valor irreconhecível cai no fallback **com log**, nunca como valor inválido.
- **Piso virado teto.** O `adversarial-reviewer`/`security-reviewer` estavam cravados em `opus/high`.
  A instrução do orquestrador de subir a **opus/extra** em efeito de alto valor nunca executava: "nunca
  abaixo de opus/alto" (P-14) tinha virado "sempre exatamente opus/alto". O gate passa a rodar em
  `xhigh` quando a feature é marcada `efeitoDeAltoValor` ou o tier é 🔴 — o piso segue garantido e fora
  do alcance do `routing`, mas o teto passa a existir.
- Menor, mesma família: chave de `routing` desconhecida caía no fallback sem sinal. Agora é **ignorada
  com log**, listando as etapas roteáveis.

**A restrição (c) deste ADR ganha um irmão:** interface entre etapas não é só *tipada*, é *traduzida na
fronteira*. Vocabulário de domínio (português, do método) e vocabulário de runtime (inglês, da
ferramenta) se encontram num ponto único e explícito — nunca por coincidência de string.

## Relacionados

Constituição P-3/P-10/P-11/P-13/P-14/P-15 · ADR-0003 (teto por feature) · ADR-0005 (painel + incerteza)
· ADR-0007 (footprint de conflito) · ADR-0008 (fast-path) · ADR-0009 (terminação de loop) · ADR-0010
(sub-workflow contratado) · ADR-0012 (higiene de contexto) · ADR-0013 (dois tiers) · ADR-0015 (duplo laço)
· ADR-0017 (fan-out por slice) · ADR-0018 (grafo como default) · `.claude/workflows/*.mjs` ·
`scripts/plan-batch.mjs`
