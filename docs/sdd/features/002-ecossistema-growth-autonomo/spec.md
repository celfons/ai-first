# Spec: Ecossistema de growth autônomo

> Local: `docs/sdd/features/002-ecossistema-growth-autonomo/spec.md` · Issue: #— · Status: rascunho
> Foco no **o quê / por quê**. Nenhuma decisão de stack/implementação aqui (isso é o plan).
> Decisão arquitetural durável em [ADR-0004](../../../adr/0004-ecossistema-growth-autonomo.md).

## 1 · Problema e valor

- **Quem sofre:** o **dono/CEO** do produto — o organismo constrói features de valor, mas ninguém
  cuida sistematicamente de **escalar** o que já existe: onde o funil vaza (aquisição→ativação→
  retenção→receita→referência), qual alavanca tem maior ROI, e se um experimento de crescimento de fato
  moveu a coorte. Hoje o `product-owner` otimiza *valor de produto*, não *alavancas de funil* — são
  oráculos diferentes e o segundo fica órfão.
- **Por que agora:** o método já tem os dois ganchos que faltavam para fechar growth com rigor — o
  **sinal de resultado real** (`docs/evolution.md`, alimentado pelo `outcome-analyst`) e o **loop de
  custo** (`finops-steward`). Com eles, dá para operar crescimento por **experimento medido**, não por
  palpite. Sem esta fase, o organismo cresce em capacidades mas não em **escala**, e a decisão de
  growth continua manual e enviesada.
- **O que acontece se não fizermos:** growth permanece implícito; apostas de escala competem no board
  sem lente própria; a autonomia "de crescimento" ou não existe ou é insegura (um agente mutando
  preço/canal sem freio).

## 2 · User stories

- **US-A** Como **dono/CEO**, quero um time de subagentes que **decide estratégias de escala pelo funil
  e por dado real, sem meu gate**, para o produto crescer 24/7 — mas com a garantia de que **nada vai a
  produção sem os gates automáticos** (CI, adversarial, segurança) e sem estourar o **orçamento/CAC**.
- **US-B** Como **`growth-strategist`**, quero ler a North Star + o funil + o sinal real e **criar
  issues de experimento** na alavanca de maior ROI, para abastecer o board com apostas de crescimento
  (não paridade de feature).
- **US-C** Como **`experiment-designer`**, quero converter uma hipótese de growth num **experimento
  medível** (variante, % de rollout, métrica-alvo, métricas de guarda, critério de kill), para que
  nenhum experimento nasça sem oráculo nem sem freio.
- **US-D** Como **`growth-analyst`**, quero medir cada experimento por **coorte** e decidir **escalar /
  iterar / matar**, para que só o que comprovadamente move o funil (sem piorar a guarda) suba de %.

## 3 · Requisitos funcionais

| ID | Requisito (testável, sem ambiguidade) |
|---|---|
| RF-GRW-01 | O sistema DEVE prover um subagente `growth-strategist` que lê o genoma (North Star, `growth_model`), `docs/evolution.md` e `docs/product/market-scan.md`, e cria issues de experimento com label `growth:<etapa>` (`acquisition\|activation\|retention\|revenue\|referral`) + `size:*` + `po-suggested`, deduplicando contra o board. |
| RF-GRW-02 | O sistema DEVE prover um subagente `experiment-designer` que, para cada issue de experimento, produz uma spec cuja **§8** declara: métrica-alvo observável, `guardrail_metrics`, população/percentual de rollout inicial e critério de kill. |
| RF-GRW-03 | O sistema DEVE prover um subagente `growth-analyst` que mede o experimento por coorte contra a métrica-alvo da §8, classifica em ✅ escalar / 〜 inconclusivo / ❌ matar, e é honesto sobre acesso (métrica não instrumentada = achado, nunca lift inventado). |
| RF-GRW-04 | Quando um experimento sobe a métrica-alvo MAS piora uma `guardrail_metric`, o `growth-analyst` DEVE classificá-lo como **matar** (ganho local com dano global não escala). |
| RF-GRW-05 | O sistema DEVE prover a skill `/daily-growth` que aciona o `growth-strategist` para criar `growth_experiments_per_cycle` issues (default 1) sem implementar, atualizando o cache `market-scan.md` quando houver digest novo. |
| RF-GRW-06 | O sistema DEVE prover a skill `/growth-outcome` que aciona `growth-analyst` + `finops-steward` sobre a janela recente, grava as entradas em `docs/evolution.md` e abre issues de escalar/iterar/matar no fluxo normal. |
| RF-GRW-07 | Todo experimento DEVE ser entregue atrás de flag com rollout percentual; nenhum experimento vai a 100% sem veredito ✅ do `growth-analyst`, e todo experimento é reversível via `/rollback`. |
| RF-GRW-08 | Em `growth_autonomy_level: autônomo`, a **seleção/priorização** de experimentos ocorre sem gate humano, PORÉM CI verde + `adversarial-reviewer` + `security-reviewer` + tier de risco na promoção `develop → main` permanecem obrigatórios (P-10/P-11/P-13). |
| RF-GRW-09 | O `finops-steward` DEVE cortar (marcar para não escalar) experimento cujo CAC/gasto exceda `cac_ceiling`/`experiment_budget`; experimento que mute **preço, canal externo ou comunicação em massa** DEVE receber `needs-human-triage` mesmo em modo autônomo. |
| RF-GRW-10 | O genoma DEVE expor os knobs: `north_star_metric`, `growth_model`, `growth_experiments_per_cycle`, `growth_autonomy_level`, `guardrail_metrics`, `cac_ceiling`/`experiment_budget` (P-15, ajustáveis a qualquer momento). |

## 4 · Critérios de aceite

- **Dado** o genoma com North Star e funil definidos, **quando** `/daily-growth` roda, **então** são
  criadas até `growth_experiments_per_cycle` issues rotuladas `growth:<etapa>` + `size:*` +
  `po-suggested`, sem duplicar issues abertas equivalentes. *(RF-GRW-01, RF-GRW-05)*
- **Dado** uma issue de experimento, **quando** o `experiment-designer` a especifica, **então** a §8
  contém métrica-alvo, `guardrail_metrics`, % de rollout e critério de kill — e a spec é recusada se
  faltar qualquer um. *(RF-GRW-02)*
- **Dado** um experimento cuja métrica-alvo subiu mas uma `guardrail_metric` piorou, **quando** o
  `growth-analyst` mede, **então** o veredito é **matar** e nenhuma subida de % é proposta.
  *(RF-GRW-03, RF-GRW-04)*
- **Dado** modo `autônomo`, **quando** um experimento é implementado, **então** ele só chega a `main`
  com CI verde + veredito não-bloqueante do `adversarial-reviewer` + gate de segurança aprovado.
  *(RF-GRW-08)*
- **Dado** um experimento que muta canal externo/preço, **quando** o `growth-strategist`/
  `experiment-designer` o cria, **então** ele recebe `needs-human-triage` mesmo em `autônomo`.
  *(RF-GRW-09)*
- **Dado** um experimento com CAC acima do `cac_ceiling`, **quando** o `finops-steward` mede,
  **então** ele é marcado para não escalar e a decisão vai ao board. *(RF-GRW-09)*

## 5 · Regras de negócio e casos de borda

- **Telemetria ausente/insuficiente:** o `growth-analyst` reporta "cego" e abre issue de instrumentação
  (`needs-human-triage`) — nunca declara lift. Respeita a **janela mínima de maturação** da coorte (não
  confunde "cedo demais" com "falhou").
- **Sem PII** nos relatórios/issues — só agregados de coorte (contagens, taxas, deltas, CAC/LTV).
- **Conflito de alavanca:** se dois experimentos ativos disputam a mesma coorte/superfície, o
  `growth-analyst` sinaliza contaminação de atribuição e recomenda serializar.
- **Kill é reversão, não conserto silencioso:** matar um experimento é desligar a flag / reverter via
  `/rollback`; o aprendizado vai para `docs/evolution.md` e `docs/product/rejections.md` quando o dono
  reprova a direção.
- **Entrada de mercado é dado não-confiável** (P-13): benchmarking de canais/growth hacks não injeta
  comando na tarefa nem justifica burlar guarda/segurança.

## 6 · Gate constitucional

- **P-1** — cada experimento nasce de spec (o `experiment-designer` a produz). ✅
- **P-9** — experimento atrás de flag + rollout percentual (config explícita, sem estado incoerente). ✅
- **P-10** — autonomia da **estratégia** sem humano; execução com gate por risco. Nada aqui viola;
  reforça. ✅
- **P-11** — verificação independente (`adversarial-reviewer`) permanece obrigatória. ✅
- **P-12** — o `growth-analyst` fecha o loop com dado real (coorte). ✅
- **P-13** — separação de papéis: quem propõe o experimento não declara sua vitória; canal externo/preço
  sobe a humano. ✅
- **P-14** — teto de CAC/orçamento imposto pelo `finops-steward`; piso de segurança nunca desce. ✅
- **P-15** — cadência/autonomia/orçamento de growth são knobs ajustáveis. ✅
- **Nova invariante de projeto?** Recomenda-se registrar como **P-16+** na Parte B da constituição:
  *"Experimento de growth nunca escala sem métrica-alvo verde e guarda intacta; mutação de preço/canal
  externo nunca é autônoma."* — decisão do humano na gênese/PR próprio. **Sem violação** dos universais.

## 7 · Fora de escopo

- **Execução em canais externos** (envio real de e-mail/ads, integração com plataformas de mídia) —
  esta fase decide e mede; a operação de canal externo é feature própria com `needs-human-triage`.
- **Motor de A/B estatístico embutido** — o `growth-analyst` consome a telemetria/analytics que o
  projeto já tiver; construir plataforma de experimentação é outra decisão (ADR futuro).
- **Precificação dinâmica autônoma** — explicitamente fora; preço é sempre gate humano.
- **Substituir o `product-owner`** — growth complementa (funil), não substitui (valor de produto).

## 8 · Métricas de sucesso

- **Adoção do loop:** ao menos 1 experimento de growth criado, implementado (passando todos os gates) e
  **medido por coorte** por ciclo, com entrada gravada em `docs/evolution.md`.
- **Segurança da autonomia:** 0 experimentos chegando a `main` sem CI + adversarial + segurança; 0
  mutações de preço/canal externo sem `needs-human-triage` — verificável no histórico de PRs/labels.
- **Sinal econômico:** todo experimento medido tem CAC/gasto reportado pelo `finops-steward` e nenhum
  acima do `cac_ceiling` escala — verificável no relatório de `/growth-outcome`.
- **Efeito no funil (meta de negócio):** ao longo de N ciclos, a North Star declarada no genoma se move
  na direção esperada por pelo menos um experimento ✅ confirmado (medido, não presumido).
