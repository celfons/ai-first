# ADR-0016: Stacked PRs — não adotar como padrão do método; checkpoint incremental por sub-issue

> Status: Accepted · Data: 2026-07-31
> Feature/Issue: — (mudança de método) · Princípios tocados: P-10, P-11, P-13, P-14, P-15 · Supersede: —

## Contexto

O GitHub oferece **stacked PRs**: uma cadeia de pull requests em que cada branch tem como base a
anterior e só a última aponta para a branch de integração; ao mergear o PR de baixo, a base dos de
cima é retargeteada automaticamente. Surgiu a pergunta de adotar isso como padrão do `ai-first`.

O encaixe é plausível **porque o pré-requisito já existe**: o `task-decomposer` produz um **DAG de
micro-slices** (ADR-0008/ADR-0015), cada uma com árvore verde e critério de aceite próprio. Hoje elas
viram **commits numa branch única** `claude/<slug>` → **um PR contra `develop`** com `Closes #NNN`.
Stacked PRs seria materializar a mesma decomposição como 1 slice = 1 branch = 1 PR.

A decisão exige medir o custo-benefício **no contexto deste método**, não na indústria em geral.

## Decisão

**Não adotamos stacked PRs como padrão do método.** A convenção permanece: **uma issue = uma feature =
uma branch = um PR contra `develop` = um `Closes #NNN`**, com as micro-slices como commits verdes
dentro dessa branch.

**Quando houver necessidade real de checkpoint incremental** — feature 🔴 grande, migração
strangler-fig (`/migrate`), schema expand/contract, ou qualquer caso em que o dono queira aprovar
etapa por etapa antes de seguir — **a forma canônica é a sub-issue**, que o board já suporta e que o
`/backlog` já emite para épicos: cada etapa vira uma sub-issue própria (vinculada por
`sub_issue_write`), com sua branch e seu PR contra `develop`, **sequenciadas pelo `wip_limit` e pelo
footprint** (ADR-0007). Mesmo efeito de ponto de parada auditável, **zero superfície nova** no método.

### Por que o benefício é pequeno *aqui*

Stacked PRs existe primariamente para o **revisor humano**, que não sustenta atenção num diff de
centenas de linhas. Esse é o grosso do valor do padrão — e é exatamente o que este pipeline não tem:
com `autonomy_level: autônomo`, quem revisa é agente. Os demais ganhos já estão cobertos:

| Ganho alegado | Já entregue por | Delta real |
|---|---|---|
| Contexto de revisão menor | isolamento por slice na IMPLEMENT (cada slice numa invocação limpa) | pequeno — só o **gate final** vê o diff inteiro |
| Feedback cedo | árvore verde ao fim de cada slice | ~zero |
| Merge incremental | — | real, porém o merge em `develop` é serializado (ADR-0003) |
| Rastreabilidade | `tasks.md` como DAG + prova do vermelho (ADR-0015) | ~zero |

Sobra **um** ganho não-redundante: encolher o diff lido pelo `security-reviewer`/`adversarial-reviewer`
no gate (piso opus/alto, P-14) — e ele não paga os custos abaixo.

### Por que o custo é alto

- **Gate multiplicado.** Rodar segurança + adversarial em N slices custa **mais** que rodar 1× num diff
  N vezes maior: prompt de sistema, contexto fixo e rubrica são pagos N vezes; só a leitura do diff
  escala com o tamanho, e é a menor parcela. Contraria `docs/token-efficiency.md`.
- **N rodadas na fila de merge serializada** por feature (ADR-0003), competindo com as demais demandas
  do `wip_limit`.
- **Colisão com o footprint (ADR-0007).** Uma pilha é, por construção, N demandas de footprint
  **sobreposto** — o `wip_limit` teria de passar a contar *pilhas*, não demandas.
- **Rebase em cascata** a cada reprovação de slice de baixo: retrabalho de agente, token puro.
- **Complexidade permanente** em 4 pontos do método (`daily-build` guarda estado de pilha e retarget;
  `architect` declara footprint de pilha; `task-decomposer` decide o corte por PR; `wip_limit` muda de
  unidade), para um ganho marginal.

## Alternativas consideradas

- **Adotar stacked PRs como default** para toda feature decomposta — descartada: paga complexidade
  estrutural e mais token de gate para comprar revisão barata que o isolamento por slice já entrega.
- **Knob `pr_strategy: single | stacked`, desligado por default**, acionado em features 🔴 —
  descartada: um knob desligado ainda obriga `daily-build`/`architect`/`wip_limit` a sustentar o
  caminho de pilha para sempre. O custo é o mesmo do default; só o uso é menor. A sub-issue cobre o
  caso com mecanismo já existente.
- **Gate leve por slice + gate completo na integração** (mitigar o gate multiplicado) — descartada
  como justificativa para a pilha: é exatamente o que o `fast_path` (ADR-0008) já faz **dentro de uma
  branch única**, sem precisar de PRs empilhados.

## Consequências

- **Positivas:** a convenção de git (`feature → develop → main`, um `Closes #NNN`) permanece simples e
  **imposta por construção** (ADR-0006, guard + `ai-first-guard.yml`) sem caso especial; o gate caro
  roda uma vez por feature; `wip_limit`/footprint seguem contando demandas.
- **Custos/limites:** features 🔴 muito grandes continuam produzindo um diff único grande no gate — o
  freio correto para isso é **decompor no board** (sub-issues), não empilhar PRs. Se a decomposição em
  sub-issues não for feita, o custo do gate volta.
- **Restrições futuras:** nenhum agente/skill deve introduzir cadeias de PR com base em outra branch de
  feature. PR de feature abre **contra `develop`**. Para etapas auditáveis, use sub-issues sequenciadas
  pelo `wip_limit`/footprint. Reverter esta decisão exige um ADR novo que a supersede, com evidência de
  que o custo de gate por diff grande passou a dominar (medível pelo `finops-steward`).

## Relacionados

- Constituição: P-10 (autonomia/gate por tier), P-11 (verificação independente), P-13 (separação de
  papéis), P-14 (orçamento/modelo), P-15 (knobs ajustáveis).
- ADRs: [ADR-0003](0003-build-multi-feature-workflow.md) (merge serializado em `develop`),
  [ADR-0006](0006-arquitetura-de-enforcement.md) (fluxo de git imposto por construção),
  [ADR-0007](0007-priorizacao-unificada-e-concorrencia-wip.md) (WIP + footprint),
  [ADR-0008](0008-cerimonia-escalada-ao-risco-fast-path.md) (cerimônia escalada ao risco),
  [ADR-0015](0015-duplo-laco-bdd-tdd.md) (slices verdes + prova do vermelho).
- Skills: `skills/backlog` (sub-issues de épico), `skills/daily-build`, `skills/migrate`.
- Agentes: `agents/task-decomposer.md`, `agents/architect.md`.
