# ADR-0009: Grafo de agentes como forma de orquestração de primeira classe + política de loop com terminação e orçamento

> Status: Accepted · Data: 2026-07-19
> Feature/Issue: método (orquestração explícita) · Princípios tocados: P-3 (idempotência/terminação), P-11/P-13 (isolamento e verificação independente), P-14 (orçamento/custo), P-15 (knobs) · Supersede: —

## Contexto

O método **já orquestra os subagentes como um grafo** e **já roda loops** — mas de forma implícita,
espalhada por vários documentos, sem um lugar único que nomeie a característica e fixe seus freios:

1. **Grafo (DAG) de agentes** — a cadeia de uma fatia não é sequencial-obrigatória. O
   `docs/token-efficiency.md` §4 já desenha um grafo real (`feature-spec → architect → {backend/frontend
   ‖ bdd-author ‖ ux-designer} → tester → adversarial-reviewer → docs-writer`), com `parallel()`/
   `pipeline()` e **barreira só quando a etapa N precisa de todos os resultados de N-1**. O painel
   adversarial (ADR-0005) e o build multi-feature (ADR-0003) também são grafos — fan-out + barreira de
   agregação. Falta **elevar o grafo a decisão explícita** e dizer o que ele DEVE e NÃO DEVE fazer.

2. **Loops** — existem em duas formas: **loops de cadência** (crons `/daily-*`, o loop de AIOps que
   realimenta `routing-policy.md` e faz o pipeline melhorar sozinho a cada rodada) e **loops iterativos**
   (re-run quando o `adversarial-reviewer`/CI bloqueia; loop-until-dry de verificação). O risco do loop
   iterativo é o **runaway de token** e a **não-terminação** — um loop "até parecer bom" queima orçamento
   sem critério de parada.

A força motriz: **formalizar o que já é prática** para que trabalhos futuros construam sobre uma
característica nomeada (grafo + loop) em vez de reinventá-la ad-hoc — e, principalmente, **fixar os freios**
(terminação explícita + teto de orçamento) que tornam o loop seguro, sem enfraquecer o isolamento que é a
razão de o método trocar token por corretude.

## Decisão

Adotamos **grafo de agentes** como a forma canônica de orquestração e uma **política de loop** com
terminação e orçamento obrigatórios. Ambos preservam a premissa inegociável: o grafo *orquestra sessões
independentes*; **nunca funde raciocínio** — só compartilha **fato datado** (coerente com §1/§6).

1. **Grafo (DAG) explícito.** A orquestração de uma fatia (e de N features, ADR-0003) é um **grafo de
   dependências**, não uma cadeia linear. A regra de fan-out permanece: **`pipeline()` por default**
   (sem barreira entre etapas — uma slice pode estar no `tester` enquanto outra implementa); **barreira
   (`parallel()`) só quando a etapa N precisa de TODOS os resultados de N-1** (merge/dedup/agregação de
   vereditos). Duas etapas que dependem só da spec/plan (`bdd-author`, `ux-designer`) rodam **concorrentes**
   com o implement. O ganho é **wall-clock**, não corretude — e o isolamento fica intacto.

2. **Fan-out de verificação é grafo de primeira classe.** O painel adversarial (`verification_mode: panel`,
   ADR-0005) é o caso onde o grafo paga em **corretude**: N céticos concorrentes de lentes distintas
   (correção · invariante/segurança · reprodução/runtime), **barreira só na agregação** dos vereditos.
   **Piso opus/alto por membro (P-14) e isolamento (cada membro cego ao raciocínio dos outros, recebe só o
   diff-digest como fato) não mudam** dentro do grafo.

3. **Política de loop — todo loop tem terminação e teto.** Nenhum loop iterativo roda "até parecer bom".
   Todo loop DEVE ter:
   - **Critério de terminação explícito** — contagem de re-runs, `loop-until-dry` (K rodadas consecutivas
     sem achado novo), ou condição de sucesso verificável (CI verde + gates passam). Nunca "até convergir".
   - **Teto de orçamento** — `budget_per_feature` (ADR-0003) para o loop de uma feature e `daily_budget`
     (`budget.total`) para o loop da rodada. **Estourou o teto → o loop PARA** e marca
     `awaiting-human`/`needs-human-triage` (não continua queimando token).
   - **Escalada por incerteza preservada** — `uncertainty_escalation` (ADR-0005) escala ao humano por baixa
     confiança **independentemente** de o loop ainda ter orçamento (risco OU incerteza, o maior).

4. **Loops de cadência (crons) são o loop de aprendizado.** Os crons `/daily-*` + `/distill` são o loop de
   AIOps que faz o método **melhorar sozinho com o uso** (realimenta `routing-policy.md`, consolida a
   memória). Ficam como estão — são o diferencial, não um risco de runaway (cada firing é orçado).

## Alternativas consideradas

- **Manter grafo e loop implícitos (status quo)** — funciona, mas cada trabalho futuro re-deduz as regras
  de fan-out/terminação a partir de §4/ADR-0003/ADR-0005 espalhados; sem um lugar que as nomeie, é fácil
  introduzir um loop sem teto ou uma barreira desnecessária. Descartada em favor de formalizar.
- **Loop iterativo sem teto explícito** (parar "quando o reviewer aprovar") — vulnerável a runaway e a
  não-terminação quando o reviewer nunca aprova. Inaceitável: o teto por feature é o freio.
- **Grafo que compartilha contexto de raciocínio entre nós** (uma sessão que vê o histórico das outras) —
  mataria o isolamento (P-11/P-13): a verificação deixaria de ser independente. O grafo compartilha só
  **fato derivado datado**, nunca histórico de decisão.
- **Barreira entre toda etapa (grafo síncrono)** — desperdiça wall-clock (a etapa rápida espera a lenta
  sem necessidade). Barreira só quando N depende de todos os resultados de N-1.

## Consequências

- **Positivas:** a característica de orquestração fica **nomeada e reutilizável** — grafo (fan-out por
  dependência) para wall-clock, painel/loop-until-dry para corretude, cadência para aprendizado. Os freios
  ficam num lugar só, então nenhum loop novo nasce sem terminação + teto. Nada disso toca o isolamento.
- **Custos/limites:** exige que todo loop iterativo **declare** seu critério de terminação e seu teto
  (mais disciplina de autoria de driver/skill); o `finops-steward` monitora a adesão (taxa de re-run,
  gasto por feature). Só o grafo do `Workflow` é opt-in do humano; o grafo sequencializado das skills roda
  como está sem opt-in.
- **Restrições futuras:** todo driver/skill que orquestrar múltiplos agentes DEVE (a) usar `pipeline()`
  por default e barreira só na dependência-de-todos; (b) dar a **todo loop iterativo** terminação explícita
  + teto (`budget_per_feature`/`daily_budget`); (c) manter **piso opus/alto + isolamento** no fan-out de
  verificação; (d) nunca compartilhar raciocínio entre nós do grafo — só fato datado. A escalada por
  incerteza tem precedência sobre "ainda há orçamento".

## Relacionados

Constituição `P-3` (idempotência/terminação), `P-11`/`P-13` (verificação independente e separação de
papéis), `P-14` (orçamento/custo), `P-15` (knobs); `docs/token-efficiency.md` §4 (grafo + painel
adversarial + build multi-feature) e §5 (AIOps/loop de aprendizado); ADR-0003 (build multi-feature +
`budget_per_feature`), ADR-0005 (painel adversarial + `uncertainty_escalation`), ADR-0007 (concorrência
WIP por footprint); skills `/daily-build`, `/kickoff`, `/distill`; `agents/finops-steward.md`,
`agents/adversarial-reviewer.md`.
</content>
</invoke>
