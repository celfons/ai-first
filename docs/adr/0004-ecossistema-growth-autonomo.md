# ADR-0004: Ecossistema de growth autônomo (estratégia sem gate humano, execução sob os mesmos gates)

> Status: Proposed · Data: 2026-07-16
> Feature/Issue: capacidade de growth autônomo · Princípios tocados: P-1, P-9, P-10, P-11, P-12, P-13, P-14, P-15 · Supersede: —

## Contexto

O organismo `ai-first` já sabe **evoluir o produto** (o `product-owner` propõe features por
benchmarking de mercado) e **fechar o loop com a realidade** (o `outcome-analyst` mede se a feature
moveu a métrica da spec; o `finops-steward` mede o custo). O que falta é uma disciplina explícita de
**crescimento/escala**: decidir *como* escalar o valor que já existe — funil de aquisição→ativação→
retenção→receita→referência (AARRR), experimentos com hipótese e variante, e a decisão de **escalar,
iterar ou matar** cada aposta por coorte/dado, não por opinião.

Hoje isso ou não acontece, ou acontece de forma implícita e enviesada: o `product-owner` foca em
**valor de produto para a persona** (novas capacidades), não em **alavancas de funil** (onde o produto
vaza usuários/receita). São dois trabalhos distintos que competem pelo mesmo board sem uma lente
própria de growth.

A pergunta que motiva esta decisão: **um time de subagentes pode definir estratégias de escala e
crescimento sem gate humano?** A resposta do método é **sim para a decisão estratégica, não para a
execução**. "Sem gate humano" precisa significar *o time decide o quê perseguir no funil sozinho* —
**nunca** *o código vai a produção sem verificação*. Sem essa distinção explícita, "growth autônomo"
vira um vetor de risco: um agente que muta preço, dispara e-mail em massa ou empurra 100% de um
experimento sem freio econômico/ético.

A força adicional: growth **toca o mundo externo** (canais, preço, comunicação, gasto de mídia) de um
jeito que uma feature interna não toca. O modelo de autonomia precisa refletir esse blast radius maior.

## Decisão

Adotar o **ecossistema de growth autônomo** como capacidade de primeira classe, **reusando o ciclo SDD
inteiro** (spec → build → gates → outcome) e **sem inventar um pipeline paralelo**. A estratégia é
autônoma; a execução passa pelos mesmos gates automáticos.

1. **Três subagentes novos** (`agents/`, só-leitura de docs, stack-agnósticos):
   - **`growth-strategist`** (irmão do `product-owner`, na fase de backlog) — lê a **North Star + o
     funil** (`growth_model`, default AARRR), o **sinal real** (`docs/evolution.md`) e o
     `docs/product/market-scan.md`, escolhe a **alavanca de maior ROI** e **cria issues de experimento
     de crescimento** (label `growth:<etapa-do-funil>`). Decide *como escalar*, não paridade de feature.
   - **`experiment-designer`** (na fase de spec) — converte a hipótese de growth num **experimento
     medível**: variante, **população/percentual de rollout**, **métrica-alvo** (que vira a **§8 da
     spec**), **métricas de guarda** (`guardrail_metrics`) e **critério de kill**. Garante que todo
     experimento nasce com oráculo de resultado e freio.
   - **`growth-analyst`** (irmão do `outcome-analyst`, na fase de resultado) — mede o experimento por
     **coorte/funil** (lift de ativação, retenção D7/D30, CAC/LTV com o `finops-steward`) e decide
     **escalar (subir %) · iterar · matar**. Só lê sinal; a decisão de escalar/matar vira issue no fluxo
     normal ou aciona o kill-switch.
2. **Duas skills novas** (`skills/`), espelhando o par `/daily-backlog` → `/daily-outcome`:
   - **`/daily-growth`** — o `growth-strategist` cria `growth_experiments_per_cycle` issues de
     experimento no board (as que o `/daily-build` implementa ~1h depois). Só cria; não implementa.
   - **`/growth-outcome`** — o `growth-analyst` + `finops-steward` medem os experimentos vivos, gravam
     em `docs/evolution.md` e decidem escalar/iterar/matar. Pode rodar dentro do `/daily-outcome`.
3. **Todo experimento é código atrás de flag + rollout percentual** (P-9), reusando o mecanismo
   strangler/flag do ADR-0002. Isso torna **todo experimento reversível** pelo `/rollback` e habilita
   ramp-up controlado (nada vai a 100% sem o veredito do `growth-analyst`).
4. **Autonomia de estratégia, gates de execução (P-10/P-11/P-13):** em `growth_autonomy_level:
   autônomo`, o time escolhe e prioriza experimentos **sem gate humano**. A execução **não** ganha
   isenção: CI verde, `adversarial-reviewer` (pode BLOQUEAR), `security-reviewer` (gate AppSec,
   opus/alto) e o tier de risco na promoção `develop → main` valem **iguais**. Quem escreve não aprova
   o risco (P-13).
5. **Guard-rails econômicos e de mundo-externo:** o `finops-steward` impõe um **teto de CAC/orçamento
   de experimento** (`cac_ceiling`/`experiment_budget`, P-14) — experimento que compra crescimento
   net-negativo é cortado. Experimento que toca **canal externo, preço ou comunicação em massa** sobe
   `needs-human-triage` **mesmo em modo autônomo** (blast radius maior que uma feature interna).
6. **Métricas de guarda são um freio automático (P-12):** o `growth-analyst` **mata** um experimento
   que sobe a alavanca-alvo mas **piora uma `guardrail_metric`** (ex.: ativação sobe, mas churn de
   receita também). Ganho local que causa dano global não escala.

## Alternativas consideradas

- **Não ter fase de growth (o `product-owner` cobre tudo)** — descartado: o PO otimiza *valor de
  produto para a persona*, não *alavancas de funil*. Sem uma lente própria, growth fica implícito e
  perde para features "brilhantes" que não movem aquisição/retenção. São trabalhos com oráculos
  diferentes (métrica de negócio da feature vs. lift de coorte do experimento).
- **Growth autônomo sem gate nenhum (estratégia E execução sem humano)** — descartado como perigoso:
  removeria os freios (CI/adversarial/security/CAC/guardrail) que são exatamente o que torna a
  autonomia segura. Contra P-10/P-11/P-13/P-14. "Sem gate humano" é da **decisão estratégica**, nunca
  do que vai a produção.
- **Pipeline de growth separado do SDD** — descartado: duplicaria spec/build/verify e perderia a
  verificação independente e o loop de custo. O experimento é uma feature atrás de flag; usa o
  **mesmo** fluxo, só a fase de entrada (estratégia) e a de medição (coorte) diferem.
- **Um único subagente de growth (estratégia + medição juntas)** — descartado como default: quem
  propõe o experimento não deve ser quem declara que ele venceu (mesma separação de papéis do
  `product-owner`/`outcome-analyst`). Separar `growth-strategist` de `growth-analyst` evita o autônomo
  se auto-declarar vitorioso. O `experiment-designer` existe para garantir que nenhum experimento nasça
  sem métrica-alvo, guarda e kill.
- **Big-bang (experimento a 100% direto)** — descartado: concentra o risco e impede ramp-up/kill
  seguros. Todo experimento entra atrás de flag com rollout percentual (P-9).

## Consequências

- **Positivas:** growth entra no método com o mesmo rigor do greenfield; a decisão de escala nasce de
  **funil + dado real**, não de palpite; todo experimento é reversível e economicamente contido; o
  autônomo pode operar a estratégia 24/7 sem que uma decisão ruim escape dos gates. Fecha o loop
  crescimento↔custo (ROI de growth via `finops-steward`).
- **Custos/limites:** exige instrumentação de funil/coorte (sem telemetria, o `growth-analyst` fica
  cego e **diz isso** — não inventa lift); introduz mais knobs no genoma; growth que toca canal externo
  ainda pede humano (por desenho). O ramp-up por flag adiciona flags temporárias a limpar quando o
  experimento vira permanente ou morre (o `docs-writer` fecha o critério de remoção).
- **Restrições futuras:** todo experimento de crescimento conduzido pelo método nasce com métrica-alvo,
  `guardrail_metrics` e critério de kill (o `experiment-designer` recusa hipótese sem oráculo); nenhum
  experimento vai a 100% sem veredito do `growth-analyst`; nenhuma mutação de preço/canal externo é
  autônoma; o teto de CAC (P-14) nunca é ignorado; a autonomia de estratégia jamais desliga os gates
  de execução (P-10/P-11/P-13).

## Relacionados

Constituição (P-1 spec-first; P-9 config/flag; P-10 gate por risco e autonomia progressiva; P-11
verificação independente; P-12 loop fechado com a realidade; P-13 separação de papéis e entrada
hostil; P-14 governança econômica; P-15 cadência variável),
[ADR-0001](0001-adotar-metodo-ai-first.md), [ADR-0002](0002-migracao-strangler-fig.md) (mecanismo de
flag/strangler reusado), [ADR-0003](0003-build-multi-feature-workflow.md) (teto de gasto),
[`agents/product-owner.md`](../../agents/product-owner.md),
[`agents/outcome-analyst.md`](../../agents/outcome-analyst.md),
[`agents/finops-steward.md`](../../agents/finops-steward.md),
`docs/sdd/features/002-ecossistema-growth-autonomo/spec.md`, [`docs/roster.md`](../roster.md).
