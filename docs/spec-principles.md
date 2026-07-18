# 📐 Princípios de Especificação, Aceitação & Decomposição (agnósticos)

Catálogo **destilado e desacoplado** das boas práticas de escrever specs, critérios de aceite
executáveis e decomposição de trabalho — mapeado aos benchmarks canônicos (INVEST/Wake, Specification
by Example/Adzic, BDD/North, DDD/Evans, vertical slicing/Cockburn).

> **Para quem é:** os subagentes que traduzem intenção em contrato verificável — `feature-spec`,
> `bdd-author`, `task-decomposer` (e `migration-analyst` na spec de caracterização). Análogo do
> `docs/engineering-principles.md`, aplicado à disciplina de especificação.

---

## O núcleo — as cinco leis

1. **Spec descreve o problema e o comportamento observável** (o quê / por quê), **nunca a
   implementação** (o como). *(separação problema↔solução)*
2. **Todo critério de aceite é falsificável** e vira **oráculo executável** — se não dá para escrever um
   teste que falha, não é critério. *(Specification by Example)*
3. **Uma história = uma fatia vertical de valor** (INVEST); grande vira **micro-slices** com **árvore
   verde a cada uma** + uma slice de integração. *(vertical slicing)*
4. **Linguagem ubíqua da persona/domínio**; um cenário, **um** comportamento. *(DDD · BDD declarativo)*
5. **Ambiguidade é nomeada, nunca suposta.** `[NEEDS CLARIFICATION]` bloqueia — adivinhar é dívida
   silenciosa. *(honestidade de incerteza)*

---

## 1 · A spec — *o quê/por quê, não o como*

| Regra | Benchmark |
|---|---|
| Descreve **problema, persona, comportamento e resultado** — não escolhe estrutura de dados nem framework | Problema↔solução |
| Requisito **testável e não-ambíguo**; cada RF rastreável a um critério de aceite | Testability |
| **Escopo e anti-escopo** explícitos; o que fica de fora é decisão, não esquecimento | Scope / non-goals |
| Riscos e incertezas **nomeados**; ambiguidade vira `[NEEDS CLARIFICATION]`, não suposição | Definition of Ready |
| Detalhe de protocolo de sistema externo escrito **antes** de ler o outro lado é **hipótese**, não requisito | Confirmar na fonte |

## 2 · História / unidade de trabalho — *INVEST*

| Regra | Benchmark |
|---|---|
| **I**ndependente · **N**egociável · **V**aliosa · **E**stimável · **S**mall · **T**estável | INVEST (Wake) |
| Fatia **vertical** (UI→dado, ponta a ponta), não camada horizontal | Walking skeleton (Cockburn) |
| Entrega valor observável por si; se não, é tarefa, não história | Vertical slice |

## 3 · Aceitação executável (BDD) — *o oráculo*

| Regra | Benchmark |
|---|---|
| **Dado/Quando/Então** declarativo (o comportamento), nunca imperativo (os cliques) | Declarative BDD (North) |
| **Um cenário, um comportamento**; caminhos infelizes e bordas cobertos, não só o feliz | One-behavior scenario |
| Cenários são **living documentation** ligada ao runner — passam de verdade, não decoram | Specification by Example |
| Critério de aceite é o **contrato**; o `adversarial-reviewer` caça o cenário que faltou | Oracle completo |
| **Três amigos** (produto/dev/teste) alinham o exemplo antes de codar | Three amigos |

## 4 · Decomposição — *micro-slices verticais*

| Regra | Benchmark |
|---|---|
| Quebre só o **grande**; feature pequena não se decompõe (overhead > ganho) | Right-sizing |
| Cada slice: **árvore verde**, isolada em contexto próprio (janela menor, menos alucinação) | Elephant carpaccio |
| Uma **slice de integração** agrega o valor de ponta a ponta — a feature não é a soma solta das partes | Integration slice |
| Ordem por **dependência** (migration antes de código; porta antes de adapter); cada task com "done:" verificável | DAG de tasks |

## 5 · Anti-padrões de spec

| Anti-padrão | Por quê |
|---|---|
| Spec que já escolhe a implementação | Fecha o espaço de solução cedo; invade o `architect` |
| Critério de aceite não-verificável ("deve ser rápido/intuitivo") | Não vira oráculo; passa por acidente |
| Cenário imperativo que espelha a UI | Quebra a cada refactor de tela, não testa comportamento |
| Suposição no lugar de `[NEEDS CLARIFICATION]` | Constrói sobre entendimento errado — o erro mais caro |
| Emenda a um RF fechado sem nota cruzada bidirecional | Uma leitura isolada do RF antigo parece proibir o novo |

---

## Como usar
- **`feature-spec`:** problema+persona+critérios testáveis+anti-escopo; ambiguidade vira `[NEEDS CLARIFICATION]`.
- **`bdd-author`:** Dado/Quando/Então declarativo, um comportamento por cenário, bordas e caminhos infelizes; liga ao runner.
- **`task-decomposer`:** só o grande; fatia vertical com árvore verde + slice de integração; ordem por dependência.
- **`migration-analyst`:** a spec de caracterização É specification-by-example — captura o comportamento da origem como oráculo, não reinventa a spec.
