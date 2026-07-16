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
jeito que uma feature interna não toca. O modelo de autonomia precisa refletir esse blast radius maior —
**a decisão do dono é dar autonomia total de experimentação também aqui**, então a contenção não pode
ser um gate humano (que anularia a autonomia); tem de ser um conjunto de **freios automáticos** que
mantêm o experimento pequeno, medido e reversível/parável, com uma ressalva honesta: envio externo já
disparado não se desfaz.

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
5. **Autonomia total inclui o mundo externo — mas contida como experimento, não solta (P-9/P-12/P-14):**
   em `growth_autonomy_level: autônomo`, experimentos que tocam **canal externo, preço ou comunicação em
   massa** também rodam **sem gate humano** — o dono optou por autonomia total de experimentação. O gate
   humano é substituído por **freios automáticos que mantêm o experimento contido e reversível**, não
   por ausência de freio:
   - **Canário obrigatório** — todo experimento de mundo-externo começa numa fração pequena
     (`canary_pct`) de coorte antes de qualquer ramp; nunca nasce a 100%.
   - **Teto de volume/gasto** — o `finops-steward` impõe `cac_ceiling`/`experiment_budget` e um **teto de
     volume** para ações irreversíveis (`external_action_cap`: nº de e-mails/impressões/gasto de mídia por
     ciclo). Estourou → para, não escala.
   - **Métricas de guarda + kill** — o `growth-analyst` mata na hora o experimento que piora uma
     `guardrail_metric` (receita, churn, reclamação/spam-rate); o `/rollback` desliga a flag.
   - **Honestidade sobre irreversibilidade:** e-mail/ad/push já **disparado** não se reverte (só se para
     o disparo futuro) — por isso a contenção do mundo-externo é **canário + teto de volume + guarda**, e
     não a reversibilidade da flag. O `security-reviewer` mantém o gate de conformidade (consentimento/
     opt-out/LGPD-CAN-SPAM) como *required check* — isso é execução, não estratégia, e **não** relaxa.
   - **Kill-switch de mundo-externo:** o `daily_budget`/`external_action_cap` e o `/rollback` são o freio
     de último recurso; o humano continua podendo pausar tudo a qualquer momento (P-15), só não é
     **exigido** por card.
6. **Métricas de guarda são um freio automático (P-12):** o `growth-analyst` **mata** um experimento
   que sobe a alavanca-alvo mas **piora uma `guardrail_metric`** (ex.: ativação sobe, mas churn de
   receita também). Ganho local que causa dano global não escala.
7. **A direção estratégica é escolhida por ROI, com memória que aprende (P-12/P-14):** o
   `growth-strategist` prioriza a alavanca de funil por **`argmax(ROI esperado)`** — `ROI = lift por
   coorte (growth-analyst) × custo/CAC (finops-steward)` — não por novidade. Reusa o ROI-por-feature que
   o `finops-steward` já fecha (`docs/token-efficiency.md` §5). O aprendizado é persistido numa **memória
   auto-evolutiva nova, `docs/product/growth-playbook.md`**, no mesmo molde do `routing-policy.md`: nasce
   vazia, o `growth-analyst`/`finops-steward` **gravam** (via a skill — subagente é só-leitura de docs)
   qual *alavanca × canal* moveu a North Star a que CAC (tabela vigente + histórico append-only), e o
   `growth-strategist` **lê antes de propor**. O sinal de resultado real continua fluindo por
   `docs/evolution.md`; o playbook é a destilação acionável "o que pagou".
8. **Governança de orçamento e paralelização, dentro da janela de uso (P-14/P-15):** o `/daily-growth`
   roda como `Workflow` sob um **teto de token por ciclo** (`growth_budget_per_cycle`, análogo a
   `daily_budget`/`budget_per_feature` do ADR-0003) usando o objeto `budget` do runtime
   (`budget.total`/`spent()`/`remaining()`, teto rígido). O **grau de fan-out é decidido pela sobra**:
   `fan = min(parallelism, max(1, floor(budget.remaining() / budget_per_experiment)))` — se o orçamento
   não paga mais de um, **serializa**; se paga, paraleliza até onde cobre. A **janela de uso ~5h do
   Claude** (distinta do TTL ~1h do prompt cache, que a alavanca 1 do `token-efficiency.md` já cobre) é
   respeitada por **contabilidade + espaçamento**, não por API: teto por ciclo × cadência do cron ≤ cota
   da janela. O `finops-steward` mede a **taxa de queima** real e realimenta `parallelism`/cadência/teto
   pelo mesmo loop AIOps (grava no `growth-playbook`/`routing-policy`) — se está queimando a janela rápido
   demais, baixa o fan-out ou adia para o próximo ciclo. **Honestidade de acesso:** a cota exata restante
   da janela não é legível de dentro do agente; o mecanismo é orçamento+pacing, e o `finops-steward`
   **diz** quando o número não é alcançável em vez de inventá-lo.

## Alternativas consideradas

- **Não ter fase de growth (o `product-owner` cobre tudo)** — descartado: o PO otimiza *valor de
  produto para a persona*, não *alavancas de funil*. Sem uma lente própria, growth fica implícito e
  perde para features "brilhantes" que não movem aquisição/retenção. São trabalhos com oráculos
  diferentes (métrica de negócio da feature vs. lift de coorte do experimento).
- **Growth autônomo sem freio nenhum (nem gate humano, nem freio automático)** — descartado como
  perigoso: removeria os freios (CI/adversarial/security/CAC/guardrail/canário) que são exatamente o
  que torna a autonomia segura. Contra P-10/P-11/P-13/P-14. Autonomia total de **decisão** (inclusive
  mundo-externo) é a escolha do dono; ela **substitui o gate humano por freios automáticos**, não os
  remove — o que vai a produção nunca perde CI/adversarial/segurança.
- **Manter gate humano para preço/canal externo** — descartado *a pedido do dono*: anularia a autonomia
  total de experimentação que ele escolheu. Trocado por **canário + teto de volume/gasto + guarda + kill**
  (contenção automática em vez de aprovação manual).
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
- **Priorizar growth por novidade/palpite (sem ROI nem memória)** — descartado: repetiria o viés que o
  método já combate no roteamento. A direção precisa de um árbitro (`argmax(ROI)`) e de memória que
  aprende (`growth-playbook.md`), senão o autônomo re-testa alavancas que já provaram não pagar.
- **Paralelismo fixo sem teto de token** — descartado: fan-out cego estoura `daily_budget` e a janela de
  uso ~5h. O grau de paralelização precisa ser **função da sobra de orçamento**, decidida a cada ciclo.
- **Tentar ler a cota exata da janela de 5h de dentro do agente** — descartado por não ser alcançável;
  adotamos **orçamento por ciclo + espaçamento por cron + feedback de taxa de queima do `finops`**, com
  honestidade de acesso quando o número não é medível.

## Consequências

- **Positivas:** growth entra no método com o mesmo rigor do greenfield; a decisão de escala nasce de
  **funil + dado real**, não de palpite; todo experimento é reversível e economicamente contido; o
  autônomo pode operar a estratégia 24/7 sem que uma decisão ruim escape dos gates. Fecha o loop
  crescimento↔custo (ROI de growth via `finops-steward`).
- **Custos/limites:** exige instrumentação de funil/coorte (sem telemetria, o `growth-analyst` fica
  cego e **diz isso** — não inventa lift); introduz mais knobs no genoma. Autonomia total de mundo-externo
  concentra o risco nos **freios automáticos** (canário, teto de volume, guarda, gate de conformidade do
  `security-reviewer`) — se um deles estiver mal calibrado, o dano externo (envio já disparado) não é
  reversível; por isso os tetos nascem conservadores e o `finops`/`growth-analyst` os ajustam com dado.
  O ramp-up por flag adiciona flags temporárias a limpar quando o experimento vira permanente ou morre
  (o `docs-writer` fecha o critério de remoção).
- **Restrições futuras:** todo experimento de crescimento conduzido pelo método nasce com métrica-alvo,
  `guardrail_metrics` e critério de kill (o `experiment-designer` recusa hipótese sem oráculo); nenhum
  experimento (interno ou de mundo-externo) vai a 100% sem passar pelo **canário** e pelo veredito do
  `growth-analyst`; mundo-externo é autônomo mas **sempre** contido por canário + `external_action_cap` +
  guarda + gate de conformidade do `security-reviewer`; o teto de CAC (P-14) nunca é ignorado; a
  autonomia (mesmo total) jamais desliga os gates de execução (P-10/P-11/P-13); a direção estratégica é
  sempre por ROI com leitura prévia do
  `growth-playbook.md`; o fan-out do `/daily-growth` é sempre limitado pela sobra de orçamento e a
  cadência respeita a janela de uso (nenhum ciclo ignora `growth_budget_per_cycle`).

- **Aprendizado composto:** além do custo de instrumentação já citado, o `growth-playbook.md` só ganha
  valor com o acúmulo de ciclos (as primeiras rodadas decidem mais pela heurística/mercado, como o
  `routing-policy.md` vazio); é dívida de maturação esperada, não defeito.

## Relacionados

Constituição (P-1 spec-first; P-9 config/flag; P-10 gate por risco e autonomia progressiva; P-11
verificação independente; P-12 loop fechado com a realidade; P-13 separação de papéis e entrada
hostil; P-14 governança econômica; P-15 cadência variável),
[ADR-0001](0001-adotar-metodo-ai-first.md), [ADR-0002](0002-migracao-strangler-fig.md) (mecanismo de
flag/strangler reusado), [ADR-0003](0003-build-multi-feature-workflow.md) (teto de gasto),
[`agents/product-owner.md`](../../agents/product-owner.md),
[`agents/outcome-analyst.md`](../../agents/outcome-analyst.md),
[`agents/finops-steward.md`](../../agents/finops-steward.md),
[`docs/ai-first/routing-policy.md`](../ai-first/routing-policy.md) (molde da memória auto-evolutiva
reusado no `growth-playbook.md`), [`docs/token-efficiency.md`](../token-efficiency.md) (§5 AIOps + o
objeto `budget` do `Workflow`), `docs/product/growth-playbook.md` (a criar),
`docs/sdd/features/002-ecossistema-growth-autonomo/spec.md`, [`docs/roster.md`](../roster.md).
