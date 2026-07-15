# 🧭 ADRs — Architecture Decision Records

Registro **sustentável e cumulativo** das decisões arquiteturais do projeto. Cada ADR captura
**uma decisão** com contexto, alternativas e consequências — para que o *porquê* de uma escolha
sobreviva à pessoa/sessão que a tomou, e para que **cada feature nova decida à luz das
anteriores** (retroalimentação), em vez de re-litigar ou contradizer em silêncio.

> ADR ≠ spec/plan. A `spec.md`/`plan.md` de uma feature descrevem *aquela* feature. Um ADR
> registra uma **decisão durável** que **atravessa** features e as restringe daqui pra frente.
> Complementa a [constituição](../sdd/constitution.md): a constituição são os princípios
> inegociáveis; os ADRs são as decisões (revisáveis) tomadas dentro deles.

## Quando escrever um ADR (não é toda feature)

Escreva quando a feature toma uma decisão com **impacto arquitetural durável** — algo que
trabalhos futuros terão de **respeitar, reusar ou explicitamente substituir**:

- novo módulo/porta/adapter, ou mudança num ponto de extensão;
- nova invariante ou mudança numa existente (aí normalmente também mexe na constituição);
- escolha entre alternativas com trade-off relevante (banco A vs. B, uma fila vs. duas,
  push vs. pull, modelo de dados de um agregado, estratégia de cache);
- decisão de segurança/idempotência/proatividade que vira padrão.

**Não** escreva ADR para: ajuste de cópia, um campo a mais, bugfix trivial, refactor local sem
trade-off. Nesses casos, o `plan.md` da feature já basta.

## Fluxo (quem faz o quê)

1. **`architect`** — ao decidir algo durável no PLAN, **lê este índice primeiro** (para
   construir sobre / não contradizer decisões vivas) e **escreve o ADR** a partir do
   [`template.md`](template.md), numerado, ligado à feature/`#issue` e aos princípios `P-#`.
2. **`product-owner`** — consulta o índice para **não propor** algo que contradiga uma decisão
   `Accepted` sem justificar a substituição.
3. **`docs-writer`** — mantém este índice coerente e o **status** de cada ADR ao fim da feature.
4. **Substituição:** uma decisão nova que revoga outra marca a antiga `Superseded by NNNN` (o
   registro nunca mente sobre o estado atual).

## Convenções

- Arquivo: `docs/adr/NNNN-titulo-em-kebab.md` (`NNNN` sequencial, 4 dígitos).
- Status: `Proposed` · `Accepted` · `Superseded by NNNN` · `Deprecated`.
- Um ADR é **imutável em espírito**: não reescreva a decisão; para mudar, crie um novo ADR que
  supersede o antigo (e atualize o status do antigo).

## Índice

| ADR | Título | Status | Feature/Issue | P-# |
|---|---|---|---|---|
| [0001](0001-adotar-metodo-ai-first.md) | Adotar o método `ai-first` (SDD + subagentes + gate humano ajustável) | Accepted | baseline | P-1, P-2, P-10 |
| [0002](0002-migracao-strangler-fig.md) | Migração/reescrita como capacidade de primeira classe (strangler-fig + caracterização) | Accepted | capacidade de migração | P-1, P-11, P-13 |
| [0003](0003-build-multi-feature-workflow.md) | Build paralelo multi-feature num único `Workflow` (recursos compartilhados + teto de gasto por feature) | Accepted | capacidade de build paralelo | P-14, P-11, P-13, P-15 |

> Ao criar um ADR, adicione a linha aqui (o `docs-writer` fecha isso no fim da feature).
