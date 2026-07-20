# Rubricas de avaliação — memória auto-evolutiva da camada de eval (ADR-0011)

**Este documento se ALTERA durante as execuções.** É o substrato da camada de avaliação
(`docs/token-efficiency.md` §5 é o par econômico; esta é a régua de **qualidade**): a skill `/eval`
grava aqui as rubricas por contrato, o conjunto-ouro e o **baseline de score por modelo** (datado); o
`evaluator` **lê o baseline** antes de julgar e **grava o novo** quando um upgrade de modelo passa.

> **Embarca vazio, enche com o uso.** Todo projeto nasce com este arquivo em branco (só a estrutura).
> Ele **não** é preenchido na gênese — é populado pelas rodadas do `/eval` (subagente `evaluator`). Sem
> conjunto-ouro semeado = `sem-baseline` = o `eval-gate` não tem contra o quê medir (achado, não
> aprovação). Cada rodada o afina.

> **Quem escreve:** a skill `/eval` (thread principal), a partir do texto datado que o `evaluator`
> emite — mesmo padrão de `docs/ai-first/routing-policy.md`. **Quem lê:** o `evaluator` (no "Contexto
> obrigatório" dele) e o gate de upgrade de modelo.

> **Fato datado, não raciocínio (coerência com §6/ADR-0010).** Rubrica e baseline são fatos; compartilhá-los
> não fere o isolamento. O que nunca entra aqui é o histórico de decisão de quem produziu o subgrafo.

---

## 1 · Rubricas por contrato de sub-workflow (pass/fail)

Cada contrato do ADR-0010 tem uma rubrica de **critérios objetivos pass/fail** (não nota vaga). Semeie
conforme os sub-workflows ganham conjunto-ouro. Piso: critérios que tocam **invariante/segurança** são
**bloqueantes** no eval-gate (regressão neles barra o upgrade, mesmo com score agregado alto).

| Contrato | Critério (pass/fail) | Bloqueante? |
|---|---|---|
| _(ex.: `build-one-feature`)_ | _(a spec cobre todos os RF da issue)_ | não |
| _(ex.: `build-one-feature`)_ | _(o gate verde é real — não teste tautológico)_ | **sim** |
| _(ex.: `build-one-feature`)_ | _(retorno respeita o `FEATURE_RESULT_SCHEMA`)_ | não |
| _(preencher com o uso)_ | | |

## 2 · Conjunto-ouro (tarefas de referência)

As entradas fixas contra as quais cada contrato é avaliado — datadas, versionadas, evoluídas. Conjunto
pobre = falsa confiança; datar e crescer é obrigatório.

| Contrato | Tarefa-ouro | Entrada | Saída esperada (resumo) | Semeada em |
|---|---|---|---|---|
| _(preencher com o uso)_ | | | | |

## 3 · Baseline de score por modelo (datado)

O placar vigente por modelo — a régua que o upgrade tem de igualar ou superar. Append-only para o
histórico; a linha "vigente" é a última datada por modelo.

| Data | Modelo | Contrato | Score agregado | Critérios bloqueantes | Nota |
|---|---|---|---|---|---|
| _(preencher com o uso)_ | | | | | |

## 4 · Histórico de eval-gate (upgrades avaliados)

Registro append-only de cada re-baseline de upgrade de modelo — passou/bloqueou e por quê.

| Data | De → Para | Veredito | Regressão que barrou (se houve) |
|---|---|---|---|
| _(preencher com o uso)_ | | | |
</content>
