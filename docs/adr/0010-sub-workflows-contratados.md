# ADR-0010: Sub-workflows contratados como unidade de composição, reuso e avaliação

> Status: Accepted · Data: 2026-07-19
> Feature/Issue: método (composição de orquestração) · Princípios tocados: P-11/P-13 (isolamento e verificação independente), P-14 (orçamento/custo), P-15 (knobs) · Supersede: —

## Contexto

O ADR-0009 estabeleceu o **grafo de agentes** como forma de orquestração. Mas o grafo hoje é
**monolítico por driver**: cada skill (`/feature`, `/daily-build`, `/migrate`, `/kickoff`) reimplementa
a mesma cadeia (spec → plan → implement → verificação → docs) no seu próprio corpo. Três consequências:

1. **Duplicação de orquestração** — a subcadeia "construir uma feature" (Escala 1 do
   `token-efficiency.md` §4) vive copiada em vários drivers; corrigir o grafo num lugar não corrige nos
   outros.
2. **Sem contrato de subgrafo** — não há uma fronteira nomeada com **entrada e saída validadas** entre
   as partes reusáveis (construir-uma-feature, painel adversarial, experimento de growth, port de
   migração). O grafo é uma sequência de `agent()` sem junta.
3. **Nada é avaliável isoladamente** — o knob `Modelo fixado` promete "re-baseline de evals" no upgrade
   de modelo, mas **não há unidade** contra a qual rodar esse eval. Um subgrafo com contrato estável é
   exatamente essa unidade.

A ferramenta `Workflow` oferece `workflow(nameOrRef, args)` — rodar outro workflow inline como sub-passo,
retornando o que ele retorna. É o mecanismo para segregar o grafo em **sub-workflows** reusáveis. Mas ele
tem limites que a decisão precisa fixar para não gerar expectativa errada.

## Decisão

Adotamos **sub-workflows contratados** como a unidade de composição da orquestração, com estas regras:

1. **Um sub-workflow é um subgrafo com contrato.** Toda peça de orquestração reusável é um workflow
   próprio com **schema de entrada e schema de saída** (`StructuredOutput`). O pai o invoca por
   `workflow('nome', args)` e trata o retorno como fato validado, não texto solto.

2. **Fronteiras canônicas** (cada uma já mapeia a um ADR):
   - **`build-one-feature`** (Escala 1, ADR-0009) — spec → plan → [decompose] → implement → bdd → tester
     → adversarial → security → docs. É o subgrafo que `/feature`, `/daily-build`, `/kickoff` e
     `/migrate` **compõem** em vez de recopiar.
   - **`adversarial-panel`** (ADR-0005) — N céticos de lentes distintas → agregação de veredito.
   - **`growth-experiment`** (ADR-0004) — canário + guardas + kill.
   - **`characterize-and-port`** (ADR-0002) — caracterização → port por equivalência.

3. **Segregar organiza e habilita eval; NÃO isola recursos.** O `workflow()` aninhado **compartilha com
   o pai** o teto de concorrência, o contador de agentes, o abort signal e o **orçamento de token**
   (`budget.spent()` é pool único). Portanto: o **teto por feature** (`budget_per_feature`, ADR-0003) e a
   **política de loop** (`max_rerun_attempts`, ADR-0009) continuam **guardas explícitas no código da
   borda** — o sub-workflow não cria teto próprio sozinho. E o **aninhamento é de 1 nível** (`workflow()`
   dentro de um filho lança erro): a composição é `pai → filho`, nunca `pai → filho → neto`.

4. **Sub-workflow contratado é a unidade de eval.** O harness de regressão do pipeline (estratégia
   pendente) roda contra os schemas de um sub-workflow — mesma entrada-ouro, saída comparada. É o que
   torna o "re-baseline de evals" do upgrade de modelo **executável**.

5. **Isolamento intacto (P-11/P-13).** O sub-workflow **orquestra sessões independentes**; não funde
   raciocínio. Cada `agent()` continua uma sessão limpa; o `adversarial-reviewer`/`security-reviewer`
   segue cego ao raciocínio de quem escreveu. A composição compartilha **contrato/fato**, nunca histórico
   de decisão — coerente com ADR-0009 e `token-efficiency.md` §6.

## Alternativas consideradas

- **Manter o grafo monolítico por driver (status quo)** — simples, mas duplica a orquestração, não tem
  contrato de subgrafo e não deixa nada avaliável isoladamente. Descartada.
- **Aninhar sub-workflows em profundidade arbitrária** — a ferramenta proíbe (`workflow()` no filho lança
  erro). Aceitamos o limite de 1 nível como restrição de desenho, não como defeito.
- **Esperar do sub-workflow isolamento de orçamento/concorrência** — falso: o pool é compartilhado.
  Fixar isso explicitamente evita um bug de expectativa (achar que segregar contém um runaway — não
  contém; a guarda por feature é que contém).
- **Composição via cópia de trechos (sem `workflow()`)** — mantém a duplicação; perde o contrato e o
  journal nomeado. Descartada.

## Consequências

- **Positivas:** um grafo canônico reusado (corrige-se num lugar), fronteiras nomeadas no journal/
  `/workflows` (depuração mais clara), e — o maior retorno — **subgrafos avaliáveis** que destravam o
  harness de evals e tornam o upgrade de modelo verificável em vez de fé.
- **Custos/limites:** mais scripts versionados; a composição só compensa onde o subgrafo é reusado/
  contratado (passo linear de uso único não vira sub-workflow — vira cerimônia). O isolamento de recurso
  **continua manual** (teto por feature + política de loop na borda).
- **Restrições futuras:** todo driver que construir feature DEVE **compor `build-one-feature`**, não
  recopiar a cadeia; todo sub-workflow DEVE ter schema de entrada/saída; as guardas de orçamento/loop
  DEVEM viver na borda do pai (o aninhamento não as herda); a composição NUNCA passa raciocínio entre
  níveis, só contrato/fato. O harness de evals, quando existir, roda contra esses contratos.

## Relacionados

Constituição `P-11`/`P-13` (isolamento e verificação independente), `P-14` (orçamento/custo), `P-15`
(knobs); ADR-0009 (grafo + política de loop), ADR-0003 (`budget_per_feature` + Escala 2), ADR-0005
(painel adversarial), ADR-0004 (growth), ADR-0002 (migração); `docs/token-efficiency.md` §4 (grafo +
Escala 1/2) e §6 (fato datado); `templates/workflows/build-one-feature.mjs` (esqueleto de referência).
</content>
