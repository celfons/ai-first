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
  `/daily-build` e para o arranque imediato `/kickoff`.
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
- **Modelo fixado** (P-14 — upgrade é decisão explícita com re-baseline de evals): `[A DEFINIR]`
- **Crons (cadência + fuso, espaçados):**
  - `/daily-backlog`: `[A DEFINIR]`
  - `/daily-build`: `[A DEFINIR]` (~1h após o backlog)
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
