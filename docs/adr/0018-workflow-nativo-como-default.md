# ADR-0018: `Workflow` nativo como caminho **default** de orquestração (opt-in → knob), com a Escala 2 no motor

> Status: Accepted · Data: 2026-08-01
> Feature/Issue: método (execução da orquestração) · Princípios tocados: P-10 (gate), P-11/P-13 (isolamento e verificação independente), P-14 (orçamento/custo), P-15 (knobs) · Supersede: — (refina ADR-0003, ADR-0009, ADR-0010)

## Contexto

O método já **decidiu** o grafo (ADR-0009), já o **segregou em subgrafo contratado** (ADR-0010) e já o
**implementou** — `.claude/workflows/build-one-feature.mjs` é o grafo real, com fan-out por slice
(ADR-0017), staged fail-fast (ADR-0013) e política de loop (ADR-0009). Mas **nada disso rodava por
default**. Três lacunas entre a decisão e a execução:

1. **O motor estava atrás de opt-in.** `token-efficiency.md §4` abria com *"exige opt-in explícito do
   humano… o driver não dispara `Workflow` por conta própria"*, e `skills/feature` §2¾ repetia
   *"opcional — só com opt-in"*. Na prática o caminho executado era o **sequencial em prosa**: o script
   contratado só rodava se alguém dissesse "use um workflow". Um motor que quase nunca liga não é um
   motor — é documentação executável.

2. **A Escala 2 (N features numa orquestração) existia só como esboço.** `token-efficiency.md §4`
   descrevia o bundle compartilhado derivado 1×, o teto por feature e o merge serializado — em
   pseudocódigo. Não havia workflow pai. Cada driver reimplementava a rodada na sua prosa, exatamente a
   duplicação que o ADR-0010 §1 diagnosticou um nível abaixo.

3. **A premissa do opt-in mudou.** A restrição da ferramenta `Workflow` é que ela **não roda em modo
   silencioso** — e uma das formas válidas de consentimento é, literalmente, *"o usuário invocou uma
   skill cujas instruções mandam chamar `Workflow`"*. Ou seja: invocar `/feature 873` **já é** o opt-in,
   desde que a skill declare isso. O opt-in extra por frase mágica era um freio autoimposto, não um
   requisito da ferramenta.

O custo de manter o status quo é concreto: o caminho **autônomo** (`/daily-build`, `/kickoff`,
`/migrate`) — o de maior volume, sem humano observando — era o que **menos** usava o grafo, porque
ninguém está lá para dizer "use um workflow". O isolamento por slice, o teto por feature e o staged
fail-fast ficavam desligados justamente onde mais importam.

## Decisão

**`Workflow` passa a ser o caminho default de orquestração dos drivers**, governado por um knob, e a
Escala 2 vira código.

1. **Invocar a skill É o opt-in.** As skills `/feature`, `/daily-build` e `/kickoff` **declaram nas suas
   instruções** que chamam `Workflow`. Quem roda a skill consentiu com a orquestração multi-agente. Não
   existe mais "frase mágica" — e continua **não existindo** disparo silencioso fora de skill.
   **`/migrate` fica de fora por ora**: sua cadeia é a caracterização→port por equivalência, cujo
   subgrafo contratado (`characterize-and-port`, ADR-0010 §2) ainda não existe como script. Migrá-la
   sem esse contrato seria forçá-la no molde de `build-one-feature`, que é greenfield. Fica como
   pendência declarada, não como omissão.

2. **Knob `orchestration_mode`** (genoma §8): `workflow` (**default**) · `sequencial`. Em `sequencial`
   o driver executa a mesma cadeia com `Agent()` um a um — o caminho antigo permanece **suportado**, não
   removido, para depurar, para ambiente sem a ferramenta e para rodada de baixíssimo volume. P-15: é
   ajustável a qualquer momento.

3. **Degradação explícita, nunca simulação.** Se `Workflow` não estiver disponível na sessão, o driver
   **cai para sequencial e REPORTA a degradação**. Nunca finge ter rodado o grafo.

4. **A Escala 2 é um workflow pai real** — `.claude/workflows/build-many-features.mjs`:
   - **pré-fase** deriva o **bundle compartilhado 1×** (contexto base + índice de repo + audit de deps +
     digest de market-scan) e o passa **read-through** a cada feature — fato datado, nunca raciocínio;
   - a `feature` é a **dimensão externa** do `pipeline()` (sem barreira: uma feature no gate enquanto
     outra implementa), e cada uma compõe **`workflow('build-one-feature', …)`** — aninhamento
     **pai→filho**, o único nível que o ADR-0010 §3 permite;
   - **guarda de borda de orçamento** antes de abrir cada frente: o pool de token é compartilhado, então
     quem não couber em `budget_per_feature` **não abre**, e quem estoura **para sozinha** (as vizinhas
     seguem);
   - **não mergeia e não promove**: devolve fato validado (`rodada`, `prontasParaMerge`) e o **merge em
     `develop` continua SERIALIZADO pelo driver**, com rebase antes de cada merge.

5. **O que NÃO muda — e é o ponto.** O default novo é de **execução**, não de rigor:
   - **gates humanos (P-10)** onde o `autonomy_level` os exige — spec/plan em `/feature` continuam
     parando **fora** do workflow (o gate é do driver, não do grafo);
   - **isolamento (P-11/P-13)** — cada `agent()` é sessão limpa; `adversarial-reviewer`/
     `security-reviewer` seguem cegos a quem escreveu; compartilha-se contrato/fato, nunca histórico;
   - **piso opus/alto (P-14)** por membro do painel e no gate de segurança;
   - **política de loop (ADR-0009)** — terminação explícita + teto; estourou → `awaiting-human`;
   - **fluxo git (ADR-0006)** — branch/PR/merge/promoção continuam do driver, sob guard.

## Alternativas consideradas

- **Manter o opt-in (status quo)** — o motor contratado continua desligado no caminho autônomo, que é o
  de maior volume. Descartada: mantém a decisão (ADR-0009/0010) divorciada da execução.
- **Workflow sempre, sem knob** — tira do dono a capacidade de depurar em sequencial e quebra ambiente
  sem a ferramenta. Descartada em favor do knob com default `workflow` (P-15).
- **Escala 2 sem workflow pai (N invocações soltas de `build-one-feature`)** — funciona, mas derruba os
  dois ganhos que justificam a Escala 2: o bundle seria derivado N× e a guarda de orçamento global não
  teria onde morar. Descartada.
- **Aninhar mais de um nível (pai → rodada → feature → slice)** — a ferramenta lança erro no segundo
  nível. O fan-out por slice já roda **dentro** do filho como `parallel()`, que é a forma correta.
- **Mergear dentro do workflow pai** — mataria a serialização do merge e o gate do driver. Recusada.

## Consequências

- **Positivas:** o grafo que o método decidiu passa a ser o que o método **executa**, inclusive (e
  sobretudo) no caminho autônomo. Ganha-se wall-clock (features e slices concorrentes), token (bundle
  1×, staged fail-fast, contexto estreito por slice) e contenção de custo justa (teto por feature com
  guarda antes de abrir a frente). A duplicação de orquestração entre drivers cai de vez: a rodada é um
  script, não quatro prosas.
- **Custos/limites:** mecânica nova no caminho quente — falha do motor agora afeta o default, não um
  modo opcional (mitigado pela degradação explícita para sequencial + knob). O orçamento continua
  **pool único** (ADR-0010 §3): o teto por feature é guarda de código, não isolamento real. E o
  `budget.spent()` é do turno inteiro, então rodadas encadeadas dividem o mesmo teto.
- **Reversível?** Sim, e barato: `orchestration_mode: sequencial` restaura o comportamento anterior sem
  tocar em código.
