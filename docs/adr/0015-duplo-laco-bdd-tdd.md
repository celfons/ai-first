# ADR-0015: Duplo laço de teste — BDD (aceitação) por fora, TDD (red→green→refactor) por dentro

> Status: Accepted · Data: 2026-07-26
> Feature/Issue: — (mudança de método) · Princípios tocados: P-1, P-10, P-11, P-13, P-14, P-15 · Supersede: —

## Contexto

O método já tinha o **laço externo**: o `bdd-author` converte os critérios de aceite (spec §4) em
**cenários de aceitação executáveis** — o oráculo do `tester` e do `adversarial-reviewer` (corolário de
P-1). O que faltava era o **laço interno**: dentro da fase IMPLEMENT, o código nascia **primeiro** e o
teste vinha **depois** (`backend-engineer` implementa → `tester` cobre). Três defeitos concretos disso,
todos de *fidelidade*:

1. **Teste derivado do código, não do contrato.** Um teste escrito depois tende a espelhar a
   implementação que já existe (mesmos ramos, mesmos nomes, mesmas suposições). Ele passa porque
   descreve o que o código faz — não porque prova o que a spec pede. No fluxo autônomo isso é pior:
   o **mesmo cérebro** escreveu os dois, então o viés de confirmação não tem contrapeso (é exatamente
   a premissa de P-11).
2. **Oráculo sem prova de falseabilidade.** Um teste que nunca foi visto **vermelho** pode estar
   passando por acidente (asserção frouxa, mock que responde tudo, caminho não exercitado). O próprio
   `docs/engineering-principles.md` §8 já dizia isso na forma "critério de ausência exige teste de
   mutação"; o custo zero de fazê-lo — ver o teste falhar **antes** de existir a implementação —
   não estava capturado em lugar nenhum.
3. **Desenho empurrado pelo primeiro rascunho.** Sem um teste que force a fronteira antes, a
   implementação define a interface por inércia (dependência concreta em vez de porta, função com
   efeito escondido). O teste-depois herda o acoplamento em vez de o denunciar.

O laço externo sozinho não cobre isso: ele prova a feature **de ponta a ponta**, com granularidade de
comportamento de negócio. Entre "o cenário de aceitação passa" e "cada unidade faz o que deve" existe
um vão — e é nesse vão que mora a maior parte do retrabalho que o `adversarial-reviewer` acha tarde.

## Decisão

**Adotamos o duplo laço (outside-in): BDD por fora, TDD por dentro.**

| Laço | Quem | Quando | Artefato |
|---|---|---|---|
| **Externo — aceitação (BDD)** | `bdd-author` | **antes** do implement (fase 3¾) | `acceptance.feature`/`acceptance.md` — nasce **vermelho** (não há código) |
| **Interno — micro (TDD)** | o **implementador** (`backend`/`frontend`/`data`/`prompt`/`sre-engineer`) | dentro do implement (fase 4), ciclo a ciclo | micro-testes + **prova do vermelho** por comportamento |
| Ligação + suíte ampla | `tester` | fase 5 | liga a aceitação ao runner; integração/invariante/runtime/regressão/eval; **audita** o laço interno |
| Julgamento | `adversarial-reviewer` | fase 5½ | **força do oráculo**: teste que não falha quando o código quebra é achado |

**O ciclo interno é `vermelho → verde → refatorar`, por comportamento (não por arquivo):**
1. **Vermelho:** escreva o menor teste que expressa o próximo comportamento da task/slice e **rode-o
   para vê-lo falhar** — pela razão certa (asserção do comportamento, não erro de importação).
2. **Verde:** a menor implementação que o faz passar. Nada além do que o teste exige.
3. **Refatorar:** melhore nome/estrutura/duplicação **com a árvore verde**, sem mudar comportamento.

**A `prova do vermelho` é o artefato que torna a disciplina verificável.** Não basta afirmar "fiz
TDD": o implementador reporta, no retorno enxuto (`docs/token-efficiency.md` §3), o campo `tdd:` com o
**teste que falhou primeiro e a razão da falha** (asserção/mensagem, não o log inteiro). É o análogo
barato do teste de mutação — e o que o `tester`/`adversarial-reviewer` conferem em vez de acreditar.

**Knob de genoma `tdd_mode`** (§7 do genoma; ajustável a qualquer momento — P-15):
- **`estrito` (default):** todo comportamento novo/alterado começa vermelho; a prova acompanha o retorno.
- **`pragmático`:** vermelho-primeiro **obrigatório** onde o erro é caro — invariantes (P-3/P-4/P-5/
  P-6/P-7), dinheiro/PII/efeito colateral, e **toda correção de bug**; o resto pode ser coberto depois
  pelo `tester`.
- **`off`:** sem exigência test-first (test-after, como antes). Opt-out explícito para base legada
  onde escrever o teste antes é inviável hoje. **Os gates não mudam** — CI, `adversarial-reviewer` e
  `security-reviewer` seguem obrigatórios.

**Piso inegociável em qualquer modo (inclusive `off` e `fast_path`):** **correção de bug reproduz em
vermelho antes da correção.** O corpus de regressão já era exigido (P-11); o duplo laço só exige que o
teste **falhe primeiro** — custo ~zero, e é a única forma de saber que ele pega o bug.

**O que NÃO muda (deliberadamente):**
- **Não há agente de TDD.** O ciclo interno é indissociável de escrever o código: um hop de agente por
  ciclo vermelho-verde custaria mais token que o ganho e quebraria o fluxo. O implementador o executa
  **dentro da mesma invocação**.
- **A separação de papéis (P-13) permanece:** quem escreve o micro-teste **não** é quem aprova o risco.
  O julgamento continua com `adversarial-reviewer`/`security-reviewer`, que não escreveram nada — e o
  `tester` continua sendo o dono independente da suíte ampla e do oráculo ligado ao runner.

## Alternativas consideradas

- **Manter só o BDD** — descartada: o laço externo prova a feature, não a unidade; o vão entre os dois
  é onde o teste-depois passa por acidente. BDD e TDD não competem: um contrata o *comportamento de
  negócio*, o outro guia o *desenho* e falseia a *unidade*.
- **Criar um agente `tdd-engineer` que escreve o teste antes do `backend-engineer`** — descartada:
  duplica o custo por ciclo (dois contextos por comportamento), atrasa o feedback que TDD existe para
  encurtar, e o teste escrito por quem não vai implementar vira spec redundante do `bdd-author`.
  A independência que importa (quem aprova o risco) já está nos gates.
- **Exigir teste de mutação em vez de test-first** — descartada como *substituto* (caro por rodada,
  ferramenta específica de stack); mantida como reforço pontual onde o critério é "ausência de"
  (`engineering-principles.md` §8). A prova do vermelho é o mesmo sinal a custo ~zero.
- **TDD obrigatório sem knob** — descartada: base legada/brownfield pode não ter arnês de teste que
  permita começar vermelho (P-15 diz que o ritmo é do humano). O `off` é explícito e reversível, e
  nunca desliga os gates.

## Consequências

- **Positivas:** o teste passa a ser **derivado do contrato**, não da implementação; todo oráculo do
  laço interno tem prova de que **sabe falhar**; o desenho é empurrado pela fronteira testável (menos
  acoplamento acidental, mais aderência a P-5); o `adversarial-reviewer` recebe uma suíte mais forte e
  gasta o piso opus onde importa; retrabalho cai (o erro aparece no ciclo, não no gate).
- **Custos/limites:** mais ciclos dentro do implement (mais tokens por fatia, embora **sem hop de
  agente** — o ciclo roda na mesma invocação); exige `tasks.md`/slices formuladas por **comportamento
  verificável** (o `architect`/`task-decomposer` passam a escrever "done" red-testável); em código de
  UI/infra nem todo comportamento tem micro-teste barato — daí `pragmático`.
- **Restrições futuras:** nenhum modo de `tdd_mode` pode pular CI, `adversarial-reviewer` ou
  `security-reviewer`; a **prova do vermelho de bugfix** vale em todos os modos; o laço externo (BDD)
  continua sem `off` (corolário de P-1) — `tdd_mode` governa só o laço interno.

## Relacionados

- Constituição: **P-1** (corolário do laço externo — aceitação executável), **P-10** (corolário novo:
  o teste precede a implementação + prova do vermelho), P-11 (verificação independente — o duplo laço
  fortalece a suíte que ela julga), P-13 (separação de papéis preservada), P-14 (roteamento/custo),
  P-15 (knob ajustável).
- ADRs: [ADR-0008](0008-cerimonia-escalada-ao-risco-fast-path.md) (o `fast_path` colapsa autoria, mas
  o bugfix vermelho-primeiro permanece), [ADR-0011](0011-camada-de-avaliacao-rubricas.md) (o eval-set
  do `prompt-engineer` é a forma do laço interno para comportamento de IA),
  [ADR-0013](0013-validacao-em-dois-tiers-staged-fail-fast.md) (o track contínuo barato acompanha o
  ciclo interno ‖ ao implement).
- Agentes/skills: `agents/backend-engineer.md`, `frontend-engineer.md`, `data-engineer.md`,
  `prompt-engineer.md`, `sre-engineer.md` (executam o ciclo), `agents/tester.md` (audita + liga),
  `agents/bdd-author.md` (laço externo), `agents/adversarial-reviewer.md` (força do oráculo),
  `agents/architect.md`/`task-decomposer.md` (tasks/slices red-testáveis), `skills/feature`,
  `skills/daily-build`, `skills/migrate`, `skills/ai-first-init`.
- Genoma: `docs/ai-first/project.md §7` (`tdd_mode`, ao lado de `bdd_style`).
- Princípios: `docs/engineering-principles.md` §11 (disciplina de teste), `docs/spec-principles.md` §3.
