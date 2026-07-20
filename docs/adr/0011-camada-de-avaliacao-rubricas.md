# ADR-0011: Camada de avaliação — rubricas pass/fail contra contratos de sub-workflow (eval-gate no upgrade de modelo)

> Status: Accepted · Data: 2026-07-19
> Feature/Issue: método (avaliação de qualidade) · Princípios tocados: P-11/P-13 (verificação independente), P-14 (custo/roteamento e o gate de upgrade de modelo), P-15 (knobs) · Supersede: —

## Contexto

O método verifica **cada feature** (BDD + `adversarial-reviewer` + `security-reviewer`), mas **não
avalia o pipeline como sistema**. Duas lacunas concretas:

1. **O upgrade de modelo é um salto de fé.** O knob `Modelo fixado` promete "re-baseline de evals"
   quando o modelo troca (Opus 4.8 → 5), mas **não existe mecanismo** — nada contra o quê rodar. Trocar
   o modelo hoje é confiar que o pipeline continua bom sem medir.
2. **Não há rubrica de qualidade do OUTPUT do agente/subgrafo.** O BDD é o oráculo *daquela feature*;
   não diz se o `feature-spec` escreve specs boas em geral, nem se o `architect` decide bem. Falta a
   matriz pass/fail transversal — a régua que os slides de mercado chamam de *quality-rubrics*.

O ADR-0010 criou a peça que faltava: o **sub-workflow contratado** (schema in → schema out) é a
**unidade avaliável**. Com um contrato estável, dá para rodar uma rubrica pass/fail contra a saída de um
subgrafo sobre um **conjunto-ouro** de tarefas — e comparar modelos.

## Decisão

Adotamos uma **camada de avaliação** de primeira classe, análoga ao loop de AIOps (§5) mas para
**qualidade**, não custo:

1. **Novo subagente `evaluator`** (`agents/evaluator.md`) — roda **rubricas pass/fail** contra a saída
   **contratada** de um sub-workflow (ADR-0010) sobre um **conjunto-ouro** de tarefas, e emite um
   *scorecard* (aprovado/reprovado por critério + score agregado + regressões vs. baseline). **Só mede;
   nunca muta produção nem implementa.** Piso **opus/alto** (P-14 — avaliar é julgamento independente,
   não desce por custo-benefício), e **isolamento**: o `evaluator` não escreveu o código/subgrafo que
   avalia.

2. **Skill `/eval [alvo]`** (`skills/eval`) — o driver que aciona o `evaluator`: sob demanda, numa
   **cadência** (`eval_cadence`) e — o ponto crítico — como **gate de upgrade de modelo**.

3. **Memória auto-evolutiva `docs/ai-first/eval-rubrics.md`** — nasce vazia, enche com o uso: as
   rubricas por contrato, o conjunto-ouro e o **baseline de score por modelo** (datado). Mesmo padrão de
   `routing-policy.md`/`growth-playbook.md` — fato datado, não raciocínio.

4. **Eval-gate no upgrade de modelo (`eval_gate`, knob §8, default `on`).** Trocar o `Modelo fixado`
   **exige** um re-baseline: o `/eval` roda o conjunto-ouro no modelo novo e compara ao baseline. **Score
   abaixo do piso ⇒ o upgrade NÃO passa** (fica `awaiting-human`). É o P-14 aplicado à decisão de modelo:
   upgrade é decisão explícita **com evidência**, não fé.

## Alternativas consideradas

- **Continuar sem camada de eval (status quo)** — deixa o upgrade de modelo cego e não tem régua de
  qualidade transversal. É a lacuna nº 1 que os concorrentes maduros cobrem e nós não. Descartada.
- **Reusar o `adversarial-reviewer` como avaliador** — confunde papéis: o adversarial **quebra uma
  feature**; o `evaluator` **mede o pipeline** sobre um conjunto-ouro. Lentes e cadência distintas;
  juntar borraria a verificação por feature. Mantidos separados.
- **Eval sem gate (só relatório)** — mede mas não protege: o upgrade ruim passaria mesmo assim. O gate
  (com piso e escalada) é o que dá dente à camada.
- **Rubrica embutida no BDD** — o BDD é o oráculo *da feature*, escopo errado; a rubrica é *do agente/
  subgrafo* ao longo de muitas tarefas. Camadas diferentes.

## Consequências

- **Positivas:** o upgrade de modelo vira **decisão medida** (re-baseline obrigatório); surge uma régua
  de qualidade transversal por subgrafo; fecha a estratégia "harness de evals" que estava pendente. A
  camada reaproveita os **contratos** do ADR-0010 — sem eles não haveria unidade avaliável.
- **Custos/limites:** manter o conjunto-ouro e as rubricas custa curadoria (o `knowledge-curator` pode
  ajudar na higiene); rodar eval gasta token (piso opus/alto) — por isso é **cadência + gate de upgrade**,
  não por-fatia. Um conjunto-ouro pobre dá falsa confiança: datar e evoluir é obrigatório.
- **Restrições futuras:** todo **upgrade de `Modelo fixado`** DEVE passar pelo `/eval` com `eval_gate:
  on`; toda rubrica/baseline é **datada** e vive em `eval-rubrics.md`; o `evaluator` nunca desce de
  opus/alto e nunca implementa; a avaliação roda contra **contratos de sub-workflow** (ADR-0010), não
  contra prosa. O piso de segurança (P-14) nunca é relaxado pela camada de eval.

## Relacionados

Constituição `P-11`/`P-13` (verificação independente), `P-14` (custo/roteamento + gate de modelo),
`P-15` (knobs); ADR-0010 (sub-workflows contratados = unidade avaliável), ADR-0009 (grafo + loop),
ADR-0005 (painel adversarial — papel distinto), ADR-0003 (orçamento); `docs/token-efficiency.md` §5
(AIOps/custo — o par econômico desta camada de qualidade); `agents/evaluator.md`, `skills/eval`,
`docs/ai-first/eval-rubrics.md`; genoma §8 (`eval_gate`, `eval_cadence`).
</content>
