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

### 1 · Contexto de produto e personas
- O que o produto faz, para quem, qual o valor central. As **personas** (usuário final, dono,
  operador…). O que é sucesso para o negócio.
- **Grava em:** `docs/sdd/specification.md` (§1 visão, §2 personas) + `CLAUDE.md` (“O que é”).

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

### 7 · Pontos de extensão e qualidade
- **Pontos de extensão:** como comportamento novo entra sem tocar no núcleo (nova rota, novo
  provedor atrás de porta, novo efeito/handler, nova strategy, novo repositório).
- **Comandos de qualidade REAIS:** os comandos exatos de `typecheck`, `lint`, `test` e (se houver
  IA) `eval`. Se algum não existe ainda, registre como `[A DEFINIR]` e sinalize que o gate fica
  incompleto até existir.
- **Estilo BDD (`bdd_style`):** como o `bdd-author` grava os cenários de aceitação — `native`
  (default; cenários espelhando Dado/Quando/Então no framework de teste do projeto), `gherkin`
  (`.feature` + runner Cucumber-style, quando o time quer living-docs) ou `off` (sem camada BDD; o
  `tester` cobre os critérios direto — só para projetos muito pequenos). Confirme o framework de teste.
- **Sinais de observabilidade:** como o `ops-investigator` alcança métricas/logs/DLQ em produção
  (qual API/credencial) — ou "sem acesso ainda" (aí o cron reporta sinais cegos, não finge saúde).
- **Grava em:** `CLAUDE.md` (pontos de extensão + padrões), `.github/workflows/ci.yml` (comandos),
  `.claude/skills/new-extension` (ajuste ao mecanismo real), `.claude/agents/ops-investigator.md`
  (forma de acesso).

### 8 · Fluxo de git e autonomia (como o organismo cresce e quando chama o humano)
Estes são os **knobs ajustáveis** (P-15) — o humano pode mudá-los aqui e a qualquer momento depois.
- **Git:** branches (default `feature → develop → main`, trabalho `claude/<slug>`); confirmar
  `develop` e `main`, e que `ci` + o gate de segurança + o `adversarial-reviewer` são *required checks*.
- **`features_per_day`:** quantas features o `product-owner` cria e o `/daily-build` implementa por
  rodada (default **1**). É a **cadência de crescimento** — comece baixo, suba com confiança.
- **`autonomy_level` (P-10):** `conservador` (humano aprova **tudo** — o gate único clássico) ·
  `progressivo` (🟢 baixo risco promove sozinha) · `amplo` (🟢🟡 promovem sozinhas; 🔴 sempre sobe).
  **Default conservador** — explique que o nível **sobe com o histórico** (baixa taxa de rejeição),
  nunca por pressa. É o dial que troca "revisar cada uma" por "revisar só as arriscadas".
- **`daily_budget` (P-14):** teto de gasto/esforço do loop por período. E o **modelo fixado** (upgrade
  é decisão explícita, com re-baseline de evals).
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

## Regras
- **Não escreva código de produto** — esta skill define o **contexto**, não implementa features.
  A primeira feature vem depois, pelo `/feature` ou pelo `/daily-build`.
- **Não invente stack/arquitetura.** Só grava o que o humano confirmou ou o que foi detectado no
  repo e confirmado.
- **Preserve o método.** As Partes universais da constituição (P-1, P-2, P-5, P-6, P-8, P-10) e o
  fluxo SDD/roster/skills **não** são negociáveis na entrevista — o que se define é o *contexto*,
  não o *processo*. Se o humano quiser mudar o processo, isso é um PR na constituição, não aqui.
- **Idempotente:** rodar de novo revisa, não recria do zero. Mudança em invariante já definida passa
  por confirmação (é mexer na constituição).
- **Segurança:** nunca grave segredo/credencial em arquivo versionado — registre *qual* credencial o
  ambiente precisa (nome da env var), não o valor.

## Depois da gênese
O organismo está armado. A partir daqui:
- **Ciclo de produção autônomo:** `/daily-backlog` → `/daily-build` produzem `features_per_day`
  evoluções/rodada até `develop`, com **verificação independente** (`adversarial-reviewer`) antes de
  todo merge e **promoção por tier de risco** conforme o `autonomy_level`.
- **Ciclo de saúde e resultado:** `/daily-tech-scan` (código + drift), `/daily-ops-scan` (runtime) e
  **`/daily-outcome`** (mede se as features moveram o ponteiro) — fecham o loop com a realidade.
- **Contato humano:** o resumo do dia (o que foi publicado sozinho, o que espera OK, perguntas em
  aberto) chega ao dono, que **aprova** o que subiu por risco (`develop → main`) ou **reprova**
  (`/reject-feature`); incidente em produção sai por `/rollback`. Esse é o batimento cardíaco — o
  humano não conduz o crescimento, só decide o que nasce em produção e ajusta os knobs (P-15).
