# 🧬 Perfil do projeto (o genoma)

> **Fonte de verdade do CONTEXTO** deste projeto — stack, cloud, arquitetura, infra e produto.
> É o **primeiro arquivo** que qualquer sessão/subagente lê para saber "onde estou". Preenchido
> **uma vez** pela skill primária [`/ai-first-init`](../../skills/ai-first-init/SKILL.md) e
> revisado por ela quando algo estrutural muda.
>
> Enquanto os campos estiverem `[A DEFINIR]`, o organismo **não está armado**: rode `/ai-first-init`.
> O framework nasce agnóstico — este arquivo é o que o acopla ao seu mundo, sem tocar no método.

---

## 1 · Produto, estratégia e ponto de partida
- **Produto a ser criado:** `[A DEFINIR]` (a hipótese de produto — o que construir; em greenfield, é O
  produto que a gênese semeia)
- **Valor central:** `[A DEFINIR]`
- **Personas:** `[A DEFINIR]` (usuário final · dono/stakeholder · operador · …)
- **Estratégia:** `[A DEFINIR]` (como o produto ganha — posicionamento, diferencial/cunha, escopo do
  MVP, a aposta que guia o que construir primeiro)
- **Ponto de partida (primeiras fatias):** `[A DEFINIR]` (as capacidades iniciais que formam o MVP —
  **semeadas em `docs/sdd/tasks.md`** como candidatas; é daqui que o `product-owner`/`/kickoff` tira o
  backlog inicial para começar a aplicação)
- **Sucesso do negócio:** `[A DEFINIR]` (métrica/evento observável)

## 2 · Stack e linguagem
- **Linguagem/runtime:** `[A DEFINIR]`
- **Framework(s):** `[A DEFINIR]`
- **Gerenciador de pacotes:** `[A DEFINIR]`

## 3 · Cloud e hospedagem
- **Onde roda:** `[A DEFINIR]` (cloud/on-prem/serverless/container/edge)
- **Como faz deploy:** `[A DEFINIR]`

## 4 · Arquitetura e camadas
- **Estilo:** `[A DEFINIR]` (camadas / hexagonal / microserviços / monólito modular / …)
- **Direção das dependências:** `[A DEFINIR]`
- **Portas (dados / provedores externos):** `[A DEFINIR]`
- **Fluxo principal:** `[A DEFINIR]` (ex.: `requisição → validação → caso de uso → efeito → resposta`)

## 5 · Infraestrutura e dados
- **Banco(s):** `[A DEFINIR]`
- **Fila / cache / storage / busca:** `[A DEFINIR]`
- **Chave de escopo dos dados:** `[A DEFINIR]` (ex.: `tenant_id` · `org_id` · nenhuma)
- **Migrations/esquema:** `[A DEFINIR]` (como são aplicados)

## 6 · Invariantes e princípios condicionais
- **Invariantes do projeto (Parte B da constituição):** `[A DEFINIR]`
- **Aplicabilidade dos princípios condicionais** (marque):
  - P-3 idempotência (tem efeito colateral externo?) — `[sim/não]`
  - P-4 IA nunca confiada (usa LLM em runtime?) — `[sim/não]`
  - P-7 PII (lida com dado pessoal?) — `[sim/não]`
  - P-9 config explícita (mecanismo de flags) — `[qual]`

## 7 · Pontos de extensão, qualidade e observabilidade
- **Pontos de extensão:** `[A DEFINIR]` (nova rota · provedor atrás de porta · efeito/handler ·
  strategy · repositório)
- **Comandos de qualidade (reais):**
  - `typecheck`: `[A DEFINIR]`
  - `lint`: `[A DEFINIR]`
  - `test`: `[A DEFINIR]`
  - `eval` (se houver IA): `[A DEFINIR]`
- **`bdd_style`** (formato dos cenários de aceitação do `bdd-author`): `[gherkin | native | off]`
  (default **`native`** — cenários espelhando Dado/Quando/Então no framework de teste; `gherkin` =
  `.feature` + runner Cucumber-style; `off` = sem camada BDD, o `tester` cobre os critérios direto)
- **Acesso a sinais de produção** (para o `ops-investigator`): `[A DEFINIR]` (API/credencial —
  **nome da env var**, nunca o valor — ou "sem acesso ainda")

## 8 · Git e autonomia (os knobs ajustáveis — P-15)
- **Branches:** trabalho `claude/<slug>` · integração `develop` · produção `main`
- **`ci` + gate de segurança + `adversarial-reviewer` como required checks:** `[sim/não]`
- **`features_per_day`** (quantas o PO cria e o build implementa por rodada): `[A DEFINIR]` (default 1)
- **`parallelism`** (quantas features o build desenvolve **em paralelo** por rodada — contextos/worktrees
  isolados; o merge em `develop` é serializado): `[A DEFINIR]` (default **1** = sequencial). Vale para o
  `/daily-build` e para o arranque imediato `/kickoff`. É a **capacidade de fan-out**.
- **`wip_limit`** (teto de WIP — nº máximo de demandas **simultaneamente em andamento** no build,
  estilo Kanban; ADR-0007): `[A DEFINIR]` (default **= `parallelism`**). Distinto de `parallelism`:
  `wip_limit ≤ parallelism` permite **reduzir a rotatividade de merge** (menos rebase/conflito/janela
  inflada) sem baixar a capacidade de fan-out. O `/daily-build` roda em paralelo demandas de
  **footprints de arquivo disjuntos** (declarados pelo `architect` no `plan.md`) e **serializa as de
  footprint sobreposto**; o merge em `develop` é sempre serializado. Etapas de planejamento (spec/
  architect/decompose/bdd) escrevem só nos próprios docs → sempre paralelizáveis.
- **`ready_backlog_cap`** (contrapressão da fila — teto de issues `po-suggested` **prontas e ainda não
  iniciadas** que podem existir no board; ADR-0007): `[A DEFINIR]` (default **= `features_per_day`** =
  PO conservador: só promove o que a esteira consome numa rodada). O growth pode **propor** à vontade
  (`growth-proposed` é ilimitado), mas o PO só promove a `po-suggested` **até `ready_backlog_cap` menos
  o que já está pronto e parado** — assim a pilha de trabalho pronto nunca cresce além do que o
  `wip_limit`/`features_per_day` drenam. Suba este teto só se quiser um buffer maior de trabalho pronto.
- **`proposal_ttl`** (validade de uma proposta `growth-proposed` não priorizada, antes de ser podada;
  ADR-0007): `[A DEFINIR]` (default **= 3 ciclos**). O PO **fecha** (com motivo, para o ledger) as
  propostas que não ganharam vaga por `proposal_ttl` ciclos — o board de propostas não incha indefinidamente.
- **`fast_path`** (cerimônia escalada ao risco — ADR-0008): `[on | off]` (default **on**). Quando `on`,
  uma demanda **de baixo risco** pula as fases de **autoria** (spec/plan/ADR/decomposição/BDD) e vai
  direto a implementação → `tester` (com regressão) → gates. **Elegibilidade (TODAS):** `size:trivial`
  **e** risco 🟢 (só texto/UI/cópia/leitura; **não** toca dinheiro/PII/idempotência/efeito/invariante/
  proatividade/dependência nova) **e** sem `[NEEDS CLARIFICATION]`/confiança alta **e** sem comportamento
  normativo novo. Qualquer dúvida → pipeline completo (conservador). **Os gates NUNCA são pulados:** CI +
  `adversarial-reviewer` (single) + `security-reviewer` permanecem (P-11). `off` = todo trabalho passa
  pela cadeia completa. Quem classifica e marca `fast-path` é o `sdd-orchestrator`.
- **`initial_backlog`** (arranque: **quantas histórias/épicos criar de imediato** para começar o produto;
  a gênese pergunta na entrevista e encadeia o `/kickoff` com este número): `[A DEFINIR]` (default =
  `features_per_day`; `0` = não arrancar agora, esperar o cron).
- **`autonomy_level`** (P-10): `[conservador | progressivo | amplo | autônomo]` (default
  **conservador** = humano aprova tudo; suba conforme o histórico). **`autônomo` = 100% AI, sem gate
  humano** — todos os tiers (inclusive 🔴) promovem sozinhos; o produto é construído e publicado sem
  ação manual. Opt-in explícito e reversível; os gates automáticos (CI + `adversarial-reviewer` +
  segurança + orçamento) **permanecem**. Só a aprovação humana da promoção sai.
- **`daily_budget`** (teto de gasto/esforço do loop, P-14): `[A DEFINIR]` — **default quando não
  definido: `sem-teto`** (o loop respeita só `features_per_day`/`parallelism`; nenhuma parada por
  orçamento). Defina um número (tokens/moeda/features) para impor um teto rígido — ao atingi-lo, o
  `/daily-build` para de pegar novas features e o `finops-steward` alerta.
- **`budget_per_feature`** (teto de gasto de **cada** feature no build paralelo, P-14): `[A DEFINIR]` —
  **default = `daily_budget / features_per_day`** (ou `sem-teto` se `daily_budget` for `sem-teto`).
  É o teto que o `Workflow` multi-feature aplica por sub-pipeline (`docs/token-efficiency.md` §4 Escala
  2): a feature que **estoura o seu teto PARA** (marca `awaiting-human`/`needs-human-triage`, PR parcial
  atrás de flag), as vizinhas seguem — um runaway não queima o orçamento das outras nem derruba o lote.
- **`max_rerun_attempts`** (terminação de loop iterativo, ADR-0009 · P-3/P-14): `[A DEFINIR]` (default
  **2**). Teto de re-runs de um mesmo passo dentro de uma fatia (implement→verificação→re-implement quando
  o `adversarial-reviewer`/CI bloqueia). Atingido o teto **sem** verde, o loop **PARA** e escala
  (`awaiting-human`/`needs-human-triage`) em vez de queimar orçamento "até parecer bom". É o critério de
  terminação explícito que a política de loop exige — todo loop iterativo termina por **sucesso
  verificável, teto de re-run OU teto de orçamento** (`budget_per_feature`/`daily_budget`), o que vier
  primeiro; a escalada por incerteza (`uncertainty_escalation`) tem precedência sobre "ainda há orçamento".
- **Modelo fixado** (P-14 — upgrade é decisão explícita com re-baseline de evals): `[A DEFINIR]`

### Arquitetura cognitiva (ADR-0005 — knobs de memória e verificação)
> Ver [`docs/ai-first/memory.md`](memory.md). Todos ajustáveis a qualquer momento (P-15); defaults conservadores.
- **`memory_retention`** (higiene da memória episódica — limite dos ledgers antes de consolidar/podar):
  `[A DEFINIR]` (default **90 dias / 50 entradas** por ledger; poda **move** para `archive/`, nunca apaga).
- **`distill_cadence`** (cadência do cron `/distill` — consolida episódico→semantic + poda): `[A DEFINIR]`
  (default **semanal**, espaçado dos demais crons).
- **`verification_mode`** (P-11): `[single | panel]` (default **single**). **`panel`** roda o
  `adversarial-reviewer` como **N céticos de lentes distintas** (aciona automaticamente no tier 🔴 e em
  `autonomy_level: autônomo` — o ponto sem gate humano). Um `BLOQUEIA` isolado já barra; piso opus/alto
  por membro (P-14).
- **`adversarial_panel_size`** (nº de céticos quando `panel`): `[A DEFINIR]` (default **3**).
- **`uncertainty_escalation`** (P-10): `[on | off]` + limiar (default **on**, limiar `confidence: baixa`).
  Etapa de **baixa confiança** escala ao humano (`awaiting-human`) **independentemente do tier de risco** —
  a escalada é por **risco OU incerteza, o maior**. Barato e seguro; ligado por default mesmo no conservador.

### Growth autônomo (ADR-0004 — knobs do ecossistema de crescimento)
- **`north_star_metric`** (a métrica-mãe que os experimentos de growth movem): `[A DEFINIR]`
- **`growth_model`** (funil de referência): `[aarrr | pirate | custom]` (default **aarrr** =
  aquisição→ativação→retenção→receita→referência)
- **`growth_experiments_per_cycle`** (quantos experimentos o `/daily-growth` cria por ciclo): `[A DEFINIR]`
  (default **1**)
- **`growth_autonomy_level`** (P-10, específico de growth): `[conservador | progressivo | amplo | autônomo]`
  (default **conservador**). **`autônomo` = experimentação 100% AI, sem gate humano — inclusive preço,
  canal externo e comunicação em massa.** A contenção vem dos freios automáticos abaixo (canário, teto de
  volume, guardas, kill), não de aprovação manual; os gates de execução (CI + adversarial + segurança/
  conformidade + orçamento) **permanecem**.
- **`guardrail_metrics`** (o que um experimento NÃO pode piorar — receita, churn, spam-rate, latência…):
  `[A DEFINIR]` — guarda ferida = kill automático (P-12).
- **`cac_ceiling`** / **`experiment_budget`** (teto de CAC/gasto por experimento, P-14): `[A DEFINIR]` —
  experimento acima do teto não escala.
- **`canary_pct`** (fração de coorte inicial de todo experimento — nunca nasce a 100%): `[A DEFINIR]`
  (default **5%**). O ramp só sobe após veredito ✅ do `growth-analyst`.
- **`external_action_cap`** (teto de volume por ciclo para ação IRREVERSÍVEL — nº de e-mails/impressões/
  gasto de mídia): `[A DEFINIR]` — o freio primário do mundo-externo (envio disparado não se reverte).
- **`growth_budget_per_cycle`** / **`budget_per_experiment`** (teto de token do ciclo de growth e custo
  típico por experimento, P-14): `[A DEFINIR]` — governam o fan-out: `min(parallelism,
  floor(budget.remaining()/budget_per_experiment))`. Default `growth_budget_per_cycle` = `sem-teto`.

- **Crons (cadência + fuso, espaçados) — ORDEM (ADR-0007): `daily-growth` → `daily-backlog` → `daily-build`:**
  - `/daily-growth`: `[A DEFINIR]` (roda **ANTES** do backlog — cria as **propostas** de funil
    `growth-proposed`, ainda **não priorizadas**, para o PO arbitrar; lente de funil)
  - `/daily-backlog`: `[A DEFINIR]` (**momento do PO** — arbitra a **fila única** produto + propostas
    `growth-proposed`, aplica `po-suggested` só ao que ganha vaga no orçamento do dia)
  - `/daily-build`: `[A DEFINIR]` (~1h após o backlog — implementa respeitando `wip_limit` + footprint)
  - `/growth-outcome`: `[A DEFINIR]` (algumas vezes/semana — coorte matura em dias; espaçar do outcome)
  - `/daily-tech-scan`: `[A DEFINIR]` (opcional, espaçado)
  - `/daily-ops-scan`: `[A DEFINIR]` (opcional, espaçado)
  - `/daily-outcome`: `[A DEFINIR]` (algumas vezes/semana — métrica leva dias para maturar)
- **Dono/stakeholder que aprova:** `[A DEFINIR]`
- **Canal do resumo diário e da aprovação:** `[A DEFINIR]` (push / e-mail / chat)

> **Ajuste depois:** para mudar qualquer knob acima (ex.: subir `features_per_day` de 1 → 5, ou o
> `autonomy_level` de conservador → progressivo), edite este arquivo ou rode `/ai-first-init` em modo
> revisão. O organismo lê estes valores a cada rodada — a mudança vale já no próximo ciclo.

---

## Estado da gênese
- [ ] Todas as 8 dimensões preenchidas (sem `[A DEFINIR]` bloqueante)
- [ ] Constituição Parte B e aplicabilidade dos condicionais gravadas
- [ ] `CLAUDE.md`, `context-map.md`, `technical-plan.md`, `specification.md` alinhados a este perfil
- [ ] `ci.yml` com os comandos reais; `ci` marcado como required check
- [ ] `develop` criada; crons agendados; canal do dono configurado
- [ ] **Organismo armado** ✅
- [ ] (opcional) **Arranque imediato** disparado (`/kickoff`) — primeiras fatias do produto já em
      desenvolvimento, sem esperar o primeiro cron
