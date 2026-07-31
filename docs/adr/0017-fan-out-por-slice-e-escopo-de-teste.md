# ADR-0017: Fan-out por micro-slice no subgrafo contratado + escopo de teste escalado ao diff

> Status: Accepted · Data: 2026-07-31
> Feature/Issue: método (execução da decomposição + custo do laço de teste) · Princípios tocados: P-10 (árvore verde), P-11/P-13 (verificação independente — **intocada**), P-14 (custo/wall-clock), P-15 (knobs) · Supersede: — (refina ADR-0012 e ADR-0013)

## Contexto

Duas lacunas foram encontradas no motor, e elas são **acopladas** — por isso um ADR só.

**1 · A decomposição existe na prosa do driver manual, não no motor autônomo.** O `task-decomposer`
(ADR-0012) promete "cada slice num contexto isolado, só os arquivos que toca", e a skill `/feature` §5
de fato faz isso: *"para cada slice, uma invocação nova e separada… uma slice = uma sessão de contexto
limpa"*. Mas o **subgrafo contratado** `templates/workflows/build-one-feature.mjs` (ADR-0010) — que os
drivers `/daily-build`, `/kickoff` e `/migrate` compõem — **não tem fase DECOMPOSE** e colapsa tudo numa
única invocação: `agent('backend-engineer', 'Implemente as slices do tasks.md')`.

O efeito é pior do que uma omissão: o caminho **manual** (baixo volume, humano no loop) recebe o
isolamento, e o caminho **autônomo** (onde está o volume e onde não há humano para notar a alucinação)
não recebe. Quando a prosa da skill e o motor divergem, **o motor é o que roda**.

O próprio ADR-0010 já descrevia o contrato como `spec → plan → **[decompose]** → implement → …` — a fase
estava na definição da fronteira canônica e **faltava no esqueleto**. Este ADR não inventa a etapa;
cumpre a que já estava contratada.

Havia ainda um obstáculo técnico: o `task-decomposer` devolve **prosa**. Um script não roteia prosa —
para fatiar a execução, a decomposição precisa ser **dado**.

**2 · O Tier 1 do ADR-0013 nunca foi definido operacionalmente.** Ele diz "typecheck/lint/**testes
rápidos**" sem dizer o que os torna rápidos. Na prática roda-se a suíte inteira: no laço interno TDD
(dezenas de vezes por slice), ao fechar cada slice, e a cada re-run do loop de verificação.

E é aqui que as duas lacunas se encontram: **fatiar sem escopo de teste piora o wall-clock**. N slices
× suíte completa é mais caro do que a invocação monolítica de hoje. Corrigir (1) sem (2) seria uma
regressão de tempo travestida de melhoria de qualidade.

## Decisão

Adotamos **fan-out por micro-slice no subgrafo contratado** e **escopo de teste escalado ao diff**.

### A · A decomposição vira dado roteável

O `task-decomposer` passa a devolver, além do `tasks.md`, um **retorno estruturado** (schema): para
cada slice — `id`, `arquivos` (o **footprint**), `dependeDe`, `doneTest`, `rf`, `integracao`,
`escopoDeTeste`. O `status: nao-decomposto` continua sendo resposta legítima (feature pequena) e cai no
caminho de invocação única. A régua de "quando NÃO quebrar" não muda.

### B · Uma slice = uma invocação, no motor

`build-one-feature.mjs` ganha a fase **DECOMPOSE** e executa o DAG em **ondas**:

- dentro de uma onda entram só as slices cujas dependências já fecharam **e** cujo **footprint de
  arquivo é disjunto** — a mesma regra de conflito que o ADR-0007 já aplica **entre** features, agora
  aplicada **dentro** de uma; footprint sobreposto serializa na onda seguinte;
- cada slice recebe o `fixedContext` (prefixo cacheado, byte-a-byte) **+ só os seus arquivos e o seu
  `doneTest`** — não o `tasks.md` inteiro. É a costura de contexto do ADR-0012 §8 aplicada por slice: o
  rabo variável da slice anterior não atravessa;
- a **slice de integração** roda sozinha, por último, e é ela que agrega o valor da feature;
- entre ondas, a guarda de `budgetPerFeature` é reavaliada — um fan-out não fura o teto por feature.

### C · O gate de julgamento continua **uma vez por feature**

O Tier 2 (painel adversarial ‖ security, piso opus/alto) roda sobre o **diff congelado agregado**,
depois da slice de integração — **nunca por slice**. Fatiar o Tier 2 multiplicaria o piso caro por N.
O que o fan-out fatia é a **autoria**, não a **verificação**.

### D · Escopo de teste escalado ao diff (definição operacional do Tier 1)

| Momento | Escopo | Razão |
|---|---|---|
| Laço interno TDD (por comportamento, dentro da slice) | só os testes relacionados aos arquivos tocados | é o loop que roda dezenas de vezes — é aqui que mora o wall-clock |
| Fechamento da slice (árvore verde, P-10) | typecheck + lint + suíte do(s) módulo(s) do footprint | mantém "verde a cada slice" sem pagar a suíte inteira N vezes |
| Diff congelado · gate · CI | **suíte completa, sempre** | é o gate; aqui não se economiza |

O mecanismo é **agnóstico de stack**: o genoma declara `test` e `test (escopo)` (ex.: `vitest related`,
`jest --findRelatedTests`, `pytest --testmon`, `go test ./pkg/...`, `dotnet test --filter`).

### E · Os freios do escopo estreito (sem eles a ideia é perigosa)

Seleção por impacto tem **falso-negativo real**. São inegociáveis:

1. **Diff que toca migration/esquema, config, injeção de dependência, fixture ou snapshot ⇒ escopo
   `full`.** O grafo de import estático não enxerga esses acoplamentos.
2. **As suítes de invariante/segurança (P-3/P-5/P-6/P-7) entram no escopo mínimo sempre**, mesmo
   classificadas como "não relacionadas" — são precisamente as que quebram por acoplamento indireto.
3. **Sem comando de seleção declarado, degrada para a suíte do diretório do footprint e REPORTA** — não
   finge que selecionou (é o mesmo piso do ADR-0013: Tier 1 no-op se reporta, não se simula).
4. **O escopo estreito nunca substitui o gate.** O ganho é de laço, não de cobertura.

### F · Knobs (P-15)

- **`slice_fanout`**: `on` (default) — o motor fatia · `off` — invocação única (comportamento anterior).
- **`test_scope`**: `impacted` (default) — os três níveis acima · `full` — suíte completa em todo nível
  (base sem seleção confiável, ou paranoia deliberada).

## Alternativas consideradas

- **Deixar a decomposição só na prosa da skill `/feature`** (status quo) — o caminho autônomo, que é o
  de maior volume e o que não tem humano observando, fica sem o isolamento que o método promete.
  Divergência silenciosa entre driver manual e motor; o motor ganha na prática. Rejeitada.
- **Fan-out sem escopo de teste** — cada slice paga a suíte completa; N× wall-clock. Pioraria o que se
  queria melhorar. Rejeitada (é o acoplamento que justifica um ADR só).
- **Escopo estreito também no Tier 2** — mais rápido e **errado**: o falso-negativo da seleção por
  impacto cairia exatamente no gate. Rejeitada.
- **Gate opus por slice ("verificar cedo")** — multiplica o piso caro do P-14 por N e julga fragmentos
  em vez do comportamento agregado. Rejeitada; a slice de integração é o alvo natural do painel.
- **Adotar uma ferramenta específica de seleção (`testmon`/cobertura) como obrigatória** — acopla o
  método a uma stack. Rejeitada: fica como **comando declarado no genoma**.
- **Manter o retorno do `task-decomposer` em prosa** — impede o roteamento por código; o script teria de
  reparsear texto de LLM para montar o DAG (frágil). Rejeitada: contrato estruturado.

## Consequências

- **Positivas:** o isolamento de contexto do ADR-0012 passa a valer no caminho **autônomo**, não só no
  manual (janela menor por invocação → menos alucinação); slices de footprint disjunto ganham
  paralelismo real intra-feature; o laço interno deixa de pagar a suíte completa a cada ciclo
  vermelho→verde; a decomposição vira **fato estruturado**, avaliável pela rubrica do ADR-0011.
- **Custos/limites:** mais hops de agente por feature (mitigado pelo prefixo fixo cacheado — o custo
  marginal é o rabo variável, não o bloco todo); o `task-decomposer` passa a ter um contrato de saída
  que precisa ser respeitado (um DAG com ciclo ou dependência inexistente **falha explicitamente**, não
  degrada em silêncio); a seleção de teste depende de um comando declarado no genoma — projeto que não
  o declara roda em modo degradado **e visível**.
- **Restrições futuras:** todo **gate de julgamento** roda sobre o diff **agregado e congelado**, uma
  vez por feature — fatiar autoria nunca fatia verificação; toda paralelização intra-feature respeita
  **footprint disjunto** (a regra de conflito é uma só, ADR-0007); toda otimização de escopo de teste
  vale **até** o gate e nunca dentro dele; migration/config/DI/fixture no diff força escopo `full`.

## Relacionados

Constituição `P-10` (árvore verde a cada slice), `P-11`/`P-13` (verificação independente — não relaxada
aqui), `P-14` (custo — piso opus não se multiplica por slice), `P-15` (knobs); ADR-0007 (footprint de
conflito — regra reusada intra-feature), ADR-0009 (grafo + política de loop), ADR-0010 (sub-workflow
contratado — é ele que ganha a fase), ADR-0011 (rubricas sobre contratos), ADR-0012 (higiene de contexto
— este ADR é o que a **executa** no motor), ADR-0013 (validação em dois tiers — este define o Tier 1),
ADR-0015 (duplo laço — o escopo estreito serve o laço interno); `agents/task-decomposer.md`,
`agents/tester.md`, `agents/backend-engineer.md`; genoma §7 (`test (escopo)`, `test_scope`) e §8
(`slice_fanout`); `templates/workflows/build-one-feature.mjs`.
