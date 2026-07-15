---
name: ai-first-init
description: SKILL PRIMÁRIA do método ai-first — roda UMA vez, no começo, para DEFINIR com o humano tudo que o framework precisa saber sobre o projeto (contexto de produto, stack, cloud, arquitetura, infraestrutura, invariantes, pontos de extensão, comandos de qualidade, fluxo de git e configuração de autonomia). É a "gênese": depois dela, o repositório vira um organismo autônomo que só precisa do humano no fim do dia para aprovar ou reprovar o crescimento (o PR develop → main). Invoque como `/ai-first-init`. Sem ela, o framework é só um esqueleto agnóstico.
---

# /ai-first-init — a gênese do organismo

Esta é a **única fase densa de interação humana** do método `ai-first`. O framework nasce
**agnóstico** — não sabe nada de stack, cloud, arquitetura, infra nem do produto. Esta skill
**entrevista o humano** e grava as respostas nos arquivos canônicos, transformando o esqueleto num
organismo que conhece o próprio corpo. **Depois desta skill, o humano só reaparece no fim do dia**
para aprovar/reprovar o PR `develop → main`.

> **Rode isto primeiro, uma vez.** Se já foi rodada (existe `docs/ai-first/project.md` preenchido),
> use-a em modo **revisão** (mostre o perfil atual e edite só o que o humano quiser mudar) — nunca
> zere o que já foi definido sem confirmação.

## Fase 0 · SCAFFOLD (materializa o "corpo" no repositório)
O plugin `ai-first` traz o **cérebro** (subagentes + skills), mas **não** despeja arquivos no seu
repositório. Esta fase escreve o **corpo** — a estrutura de docs/governança/CI que o método precisa —
no working tree do projeto que está adotando o framework, **só onde ainda não existir** (idempotente,
nunca sobrescreve o que você já tem sem confirmar).

1. **Descubra a fonte dos modelos.** Os arquivos-esqueleto vêm do próprio plugin. Se estiver instalado
   como plugin, use `${CLAUDE_PLUGIN_ROOT}` (a raiz do ai-first instalado); se você clonou/copiou o
   repo, use a cópia local. Leia de lá os **esqueletos** (não os exemplos).
2. **Copie para o repo-alvo (se ausente):**
   - `docs/sdd/` → `constitution.md` (Parte A universal + Parte B placeholder), `README.md`,
     `specification.md`, `technical-plan.md`, `tasks.md`, `templates/` (spec/plan/tasks).
   - `docs/adr/` → `README.md` (índice) + `template.md` (+ o `0001` de adoção, ajustado ao projeto).
   - `docs/context-map.md`, `docs/product/rejections.md`, `docs/knowledge.md` (padrões + anti-padrões),
     `docs/evolution.md` (linha do tempo de aprendizados — nasce vazia).
   - `docs/ai-first/project.md` (o **genoma** em branco — é o que você preenche na entrevista abaixo).
   - `.github/` → `pull_request_template.md`, `ISSUE_TEMPLATE.md`, `workflows/ci.yml`,
     `workflows/ai-first-cron.yml`.
   - `CLAUDE.md` (índice-mãe esqueleto) — **na raiz do repo-alvo**.
   - **NÃO** copie `docs/sdd/features/001-exemplo-*` (é demonstração), nem `agents/`, `skills/`,
     `.claude-plugin/` (esses vivem no plugin, não no repo-alvo).
3. **Se um arquivo já existe** (ex.: o projeto já tem `CLAUDE.md`), **não sobrescreva** — mostre o
   diff/decisão ao humano e mescle sob confirmação.
4. Confirme ao humano a lista do que foi criado antes de seguir para a entrevista.

> Se o framework foi adotado por **cópia** (sem plugin), esta fase é dispensável — os arquivos já
> estão no repo; vá direto à entrevista para preenchê-los.

## Princípios da entrevista
- **Uma pergunta de cada vez, com opções concretas.** Use a ferramenta de perguntas estruturadas
  (`AskUserQuestion`) sempre que houver escolhas discretas; deixe campo livre para o resto. Não
  despeje um questionário gigante — conduza como uma conversa curta e objetiva.
- **Proponha defaults sensatos** e deixe o humano confirmar/ajustar. O humano é o dono do produto,
  não necessariamente um engenheiro — traduza o técnico quando precisar.
- **Nada de chуте.** O que o humano não definir vira `[A DEFINIR]` no perfil (nunca uma suposição
  que a automação vá tratar como verdade).
- **Detecte antes de perguntar.** Leia o repositório (arquivos de manifesto de dependência, config
  de CI, estrutura de pastas) para **pré-preencher** as respostas e só confirmar — não pergunte o
  que dá para inferir.

## As 8 dimensões a definir (a entrevista)

Conduza nesta ordem. Cada bloco vira uma seção de `docs/ai-first/project.md` e alimenta os arquivos
canônicos indicados.

### 1 · Produto a criar, estratégia e ponto de partida
Esta é a dimensão que faz a gênese ser o **ponto de partida da criação da aplicação** — não só
contexto, mas a **semente do que construir primeiro**. Pergunte:
- **Produto a ser criado:** o que o produto faz, para quem, qual o valor central. Em **greenfield**
  (produto do zero), é aqui que o dono descreve o produto que quer que a AI construa.
- **Personas:** usuário final, dono/stakeholder, operador…
- **Estratégia:** *como* o produto ganha — posicionamento, diferencial/cunha competitiva, escopo do
  **MVP** (o mínimo que já entrega valor), a aposta que guia a **ordem** do que construir. É o que dá
  direção ao `product-owner` em vez de ele só reagir a benchmarking.
- **Ponto de partida (primeiras fatias):** com o dono, esboce as **capacidades iniciais** que formam o
  MVP — 3 a 8 fatias verticais de valor, cada uma tamanho de um PR. **Grave-as em `docs/sdd/tasks.md`**
  como candidatas de negócio priorizadas: é o backlog-semente de onde o `product-owner`/`/kickoff`
  tiram as primeiras issues para **começar a aplicação na hora** (ver Fase Final · Arranque). Não
  invente escopo — o que o dono não decidir vira `[A DEFINIR]`/`[NEEDS CLARIFICATION]`.
- **Sucesso do negócio:** a métrica/evento observável que diz que o produto está funcionando.
- **Grava em:** `docs/sdd/specification.md` (§1 visão + estratégia, §2 personas) + `docs/sdd/tasks.md`
  (fatias-semente do MVP) + `CLAUDE.md` (“O que é”).

### 2 · Stack e linguagem
- Linguagem/runtime, framework(s), gerenciador de pacotes. Bibliotecas centrais.
- **Grava em:** `docs/sdd/technical-plan.md` (§1) + `CLAUDE.md` (mapa de módulos, seed).

### 3 · Cloud e hospedagem
- Onde roda (provedor cloud / on-prem / serverless / container / edge). Como é feito o deploy.
- **Grava em:** `docs/ai-first/project.md` (§Cloud) + `technical-plan.md`.

### 4 · Arquitetura e camadas
- O estilo (camadas, hexagonal, microserviços, monólito modular…). A **direção das dependências** e
  onde ficam as **portas** (dados, provedores externos). O fluxo principal de uma requisição.
- **Grava em:** `technical-plan.md` (§2/§3) + `CLAUDE.md` (fronteiras).

### 5 · Infraestrutura e dados
- Banco(s), fila, cache, storage, índice/busca. A **chave de escopo** dos dados, se houver (ex.:
  `tenant_id`, `org_id`, ou nenhuma). Como migrations/esquema são aplicados.
- **Grava em:** `technical-plan.md` (§4) + `context-map.md` (linhas de domínio de dados).

### 6 · Invariantes específicas + aplicabilidade dos princípios condicionais
- Pergunte o que **nunca** pode ser quebrado neste projeto (as invariantes do domínio). Elas viram a
  **Parte B da constituição** (P-16+; P-1…P-15 são universais do método).
- **Confirme quais princípios condicionais universais se aplicam** (a constituição marca isto):
  - **P-3 idempotência** — o produto tem **efeitos colaterais externos** (cobrança, e-mail, escrita
    em terceiros)? Se não, marque P-3 como *não aplicável*.
  - **P-4 IA nunca confiada** — o produto **usa LLM/IA em runtime**? Se não, P-4 *não aplicável*.
  - **P-7 PII** — o produto lida com **dados pessoais**? Se não, P-7 *não aplicável*.
  - **P-9 config explícita** — sempre aplicável, mas confirme o mecanismo de flags.
- **Grava em:** `docs/sdd/constitution.md` (Parte B + tags de aplicabilidade) + `CLAUDE.md`
  (invariantes).

### 7 · Pontos de extensão, qualidade e saber-fazer
- **Pontos de extensão:** como comportamento novo entra sem tocar no núcleo (nova rota, novo
  provedor atrás de porta, novo efeito/handler, nova strategy, novo repositório).
- **Padrões e anti-padrões iniciais (`docs/knowledge.md`):** pergunte os **idiomas** do hot path (o
  jeito certo de fazer as coisas neste projeto) e as **armadilhas** já conhecidas (o que evitar). Semeie
  as primeiras linhas do `knowledge.md` — o acervo cresce depois (bug caçado vira anti-padrão). Se o
  dono não souber ainda, deixe o esqueleto; o `docs-writer` preenche ao longo das features.
- **Comandos de qualidade REAIS:** os comandos exatos de `typecheck`, `lint`, `test` e (se houver
  IA) `eval`. Se algum não existe ainda, registre como `[A DEFINIR]` e sinalize que o gate fica
  incompleto até existir.
- **Estilo BDD (`bdd_style`):** como o `bdd-author` grava os cenários de aceitação — `native`
  (default; cenários espelhando Dado/Quando/Então no framework de teste do projeto), `gherkin`
  (`.feature` + runner Cucumber-style, quando o time quer living-docs) ou `off` (sem camada BDD; o
  `tester` cobre os critérios direto — só para projetos muito pequenos). Confirme o framework de teste.
- **Sinais de observabilidade:** como o `ops-investigator` alcança métricas/logs/DLQ em produção
  (qual API/credencial) — ou "sem acesso ainda" (aí o cron reporta sinais cegos, não finge saúde).
- **Grava em:** `CLAUDE.md` (pontos de extensão + padrões one-liner), `docs/knowledge.md` (padrões +
  anti-padrões detalhados), `.github/workflows/ci.yml` (comandos), `skills/new-extension` (ajuste ao
  mecanismo real), `agents/ops-investigator.md` (forma de acesso).

### 8 · Fluxo de git e autonomia (como o organismo cresce e quando chama o humano)
Estes são os **knobs ajustáveis** (P-15) — o humano pode mudá-los aqui e a qualquer momento depois.
- **Git:** branches (default `feature → develop → main`, trabalho `claude/<slug>`); confirmar
  `develop` e `main`, e que `ci` + o gate de segurança + o `adversarial-reviewer` são *required checks*.
- **`features_per_day` (cadência):** quantas features o `product-owner` cria e o `/daily-build`
  implementa por rodada (default **1**). É a **cadência de crescimento** — comece baixo, suba com
  confiança.
- **`parallelism` (desenvolvimento paralelo):** quantas features o build desenvolve **ao mesmo tempo**
  em contextos/worktrees isolados (default **1** = sequencial). É o dial de **velocidade** — útil no
  arranque para formar a base do produto rápido. O merge em `develop` é sempre **serializado** (uma de
  cada vez), então subir o paralelismo acelera a implementação sem abrir mão dos gates. Pergunte junto
  da cadência: "quer desenvolver 1 por vez, ou várias em paralelo para o produto nascer mais rápido?"
- **`initial_backlog` (arranque inicial):** **quantas histórias/épicos criar de imediato** para começar
  o produto. **Pergunte aqui, na entrevista** (não depois): "Para começar, quantas histórias/épicos você
  quer que eu crie de imediato no board?" É o número que a **Fase Final** passa ao `/kickoff` sem
  re-perguntar. Default = `features_per_day`; pode ser bem maior nesta primeira vez (formar a base do
  MVP de uma vez). `0` = não arrancar agora (esperar o cron). Registre no genoma.
- **`autonomy_level` (P-10) — INCLUI a decisão de ter ou não gate humano:** é o dial que vai de
  "revisar cada uma" até "não revisar nenhuma". Quatro posições:
  - `conservador` (default) — humano aprova **tudo** (o gate único clássico);
  - `progressivo` — 🟢 baixo risco promove sozinha; 🟡/🔴 sobem ao humano;
  - `amplo` — 🟢🟡 promovem sozinhas; 🔴 sempre sobe;
  - **`autônomo` — 100% orientado a AI, SEM gate humano:** **todos** os tiers (inclusive 🔴) promovem
    sozinhos; **a AF constrói e publica o produto sem ação manual**.
  **Pergunte explicitamente** (`AskUserQuestion`): "Você quer aprovar o que vai para produção, ou quer
  que a AI publique sozinha, sem gate humano (100% AI)?" Se o dono escolher `autônomo`, **explique com
  clareza o trade-off**: os gates **automáticos** continuam (CI verde, verificação independente do
  `adversarial-reviewer` que pode BLOQUEAR, *required checks* de segurança, teto de orçamento) e há
  **kill-switch** (`/rollback`) — o que sai é só a **aprovação humana**, não a verificação. É
  **reversível** a qualquer momento (basta baixar o nível) e o dono segue **dono da constituição**.
  **Default conservador** — o nível **sobe com o histórico** (baixa taxa de rejeição/rollback), nunca
  por pressa; recomende começar conservador e chegar a `autônomo` só com track record.
- **`daily_budget` (P-14):** teto de gasto/esforço do loop por período. E **`budget_per_feature`** (teto
  de **cada** feature no build paralelo — default `daily_budget / features_per_day`; a que estoura para
  sozinha, as vizinhas seguem — ADR-0003). E o **modelo fixado** (upgrade é decisão explícita, com
  re-baseline de evals).
- **Crons (cadência + fuso, espaçados):** `daily-backlog` → ~1h → `daily-build`; e, espaçados,
  `daily-tech-scan`, `daily-ops-scan`, e `daily-outcome` (algumas vezes/semana — o resultado leva dias
  para maturar).
- **O gate humano:** quem é o **dono/stakeholder** que aprova, e **por onde** recebe o resumo do dia e
  responde (push/e-mail/chat). É o **único** contato diário — no nível conservador ele aprova tudo; nos
  níveis maiores, só o que sobe por risco.
- **Grava em:** `docs/ai-first/project.md` (§8) + `CLAUDE.md` (convenções).

## Entrega (o que a skill produz)
1. **`docs/ai-first/project.md`** — o **genoma**: o perfil completo do projeto, fonte de verdade das
   8 dimensões acima. É o primeiro arquivo que qualquer sessão/subagente lê.
2. **Arquivos canônicos preenchidos** conforme cada bloco (constitution Parte B, `CLAUDE.md`,
   `context-map.md`, `technical-plan.md`, `specification.md`, `ci.yml`).
3. **Um ADR** (`docs/adr/000N-...`) registrando as decisões arquiteturais estruturais que a
   entrevista fixou (stack/cloud/arquitetura), ligado a `ADR-0001` (adoção do método).
4. **Um resumo ao humano**: o que ficou definido, o que ficou `[A DEFINIR]`, e o **passo para armar
   a autonomia** — criar `develop`, marcar `ci` como required check, e agendar os crons. Ofereça
   fazer isso agora (com confirmação) ou deixar as instruções.
5. **O arranque automático** (Fase Final abaixo): se `initial_backlog > 0`, a gênese **chama o
   `/kickoff` sozinha** — sem re-perguntar — para o produto já começar a nascer.

## Fase Final · ARRANQUE AUTOMÁTICO (dispara o `/kickoff` com a quantidade da entrevista)
O fluxo pretendido é **contínuo**: `/ai-first-init` → você responde a entrevista (incluindo
`initial_backlog`, a quantidade de histórias/épicos a criar de imediato) → a gênese **encadeia o
`/kickoff` automaticamente**, que **garante o corpo montado (scaffold)**, faz o `product-owner`
**escrever o board** com essa quantidade e **puxa as tarefas do board** para implementar. Sem parada
manual entre a entrevista e a construção.

1. **Confirme os pré-requisitos** que a gênese acabou de armar: genoma sem `[A DEFINIR]` bloqueante,
   `develop` criada, `ci` como required check. Se algo falta, resolva antes (ou deixe claro o que
   impede o arranque).
2. **Se `initial_backlog > 0`** (o humano já respondeu a quantidade na dimensão 8): **invoque a skill
   `/kickoff <initial_backlog>` diretamente** — **não re-pergunte** a quantidade. O `/kickoff`, nesta
   ordem:
   - **garante o corpo montado** — o scaffold (Fase 0) é idempotente; se algo faltar, materializa/avisa;
   - **o `product-owner` escreve o board** — cria `initial_backlog` histórias/épicos a partir das
     **fatias-semente do MVP** (`docs/sdd/tasks.md`, dimensão 1), com os labels do fluxo;
   - **puxa as tarefas do board e implementa** — o motor do `/daily-build`, em paralelo (`parallelism`),
     com verificação independente e promoção por tier. **Se `autonomy_level = autônomo`**, vai de ponta
     a ponta até produção **sem gate humano**. A partir daí, os crons diários assumem o ritmo.
3. **Se `initial_backlog = 0`** (ou pré-requisito faltando), **não arranque** — registre no resumo que o
   organismo está armado e que o primeiro ciclo roda no próximo cron (ou que dá para disparar `/kickoff`
   quando quiser).

## Regras
- **Não escreva código de produto** — esta skill define o **contexto**, não implementa features. A
  gênese pode **disparar** o desenvolvimento (Fase Final · `/kickoff`), mas quem implementa é o motor do
  ciclo (`/feature`/`/daily-build`), não a própria entrevista. A primeira feature nasce ali.
- **Não invente stack/arquitetura.** Só grava o que o humano confirmou ou o que foi detectado no
  repo e confirmado.
- **Preserve o método.** As Partes universais da constituição (P-1, P-2, P-5, P-6, P-8, P-10) e o
  fluxo SDD/roster/skills **não** são negociáveis na entrevista — o que se define é o *contexto*,
  não o *processo*. Se o humano quiser mudar o processo, isso é um PR na constituição, não aqui.
  **Escolher o `autonomy_level` — inclusive `autônomo` (sem gate humano) — NÃO é mudar o processo:** é
  usar o **knob** que P-10/P-15 já oferecem. O que permanece inegociável mesmo em `autônomo` são os
  gates **automáticos** (CI + `adversarial-reviewer` que pode BLOQUEAR + *required checks* de segurança
  + orçamento) e o kill-switch — esses a entrevista não afrouxa.
- **Idempotente:** rodar de novo revisa, não recria do zero. Mudança em invariante já definida passa
  por confirmação (é mexer na constituição).
- **Segurança:** nunca grave segredo/credencial em arquivo versionado — registre *qual* credencial o
  ambiente precisa (nome da env var), não o valor.

## Depois da gênese
O organismo está armado. A partir daqui:
- **Arranque imediato (opcional):** `/kickoff` liga o desenvolvimento **na hora**, sem esperar o cron —
  semeia o backlog inicial e desenvolve as primeiras fatias em paralelo (`parallelism`). Ideal logo
  após a gênese, para o produto começar a nascer já.
- **Ciclo de produção autônomo:** `/daily-backlog` → `/daily-build` produzem `features_per_day`
  evoluções/rodada até `develop`, com **verificação independente** (`adversarial-reviewer`) antes de
  todo merge e **promoção por tier de risco** conforme o `autonomy_level`.
- **Ciclo de saúde e resultado:** `/daily-tech-scan` (código + drift), `/daily-ops-scan` (runtime) e
  **`/daily-outcome`** (mede se as features moveram o ponteiro) — fecham o loop com a realidade.
- **Contato humano:** o resumo do dia (o que foi publicado sozinho, o que espera OK, perguntas em
  aberto) chega ao dono, que **aprova** o que subiu por risco (`develop → main`) ou **reprova**
  (`/reject-feature`); incidente em produção sai por `/rollback`. Esse é o batimento cardíaco — o
  humano não conduz o crescimento, só decide o que nasce em produção e ajusta os knobs (P-15). **No
  nível `autônomo` não há aprovação a dar:** o resumo vira **relatório de auditoria** (o que a AI
  publicou sozinha, com o risco traduzido) e o contato humano se resume a auditar, ajustar knobs ou
  acionar o `/rollback` — o produto cresce e vai a produção 100% orientado a AI.
