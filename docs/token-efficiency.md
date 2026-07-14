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

Ganho: wall-clock + teto de gasto. Risco: médio (nova mecânica). Toca corretude: não.

---

## Resumo operacional (o que o driver faz em toda fatia)

1. **Monta o BLOCO DE CONTEXTO FIXO uma vez** (CLAUDE.md + constitution + linha(s) do context-map que o
   orchestrator citou) e o passa **idêntico, primeiro** a cada subagente. O que varia vem depois.
2. **Passa `model`/`effort`** do plano do orchestrator em **cada** `Agent()`. Nunca deixa cair no
   default. Piso opus/alto para `adversarial-reviewer` e invariante/segurança.
3. **Exige retorno enxuto** (status · tocou · p/ o próximo · bloqueios). Detalhe só quando bloqueia.
4. **Com opt-in do humano:** usa `Workflow` para paralelizar o independente e impor `budget.total`.

Itens 1–3 são puro ganho, sem trade-off. Item 4 é estrutural e opt-in.
</content>
</invoke>
