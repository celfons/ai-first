<div align="center">

# 🤖 ai-first

**Um método reutilizável para delegar o desenvolvimento de um produto a agentes de IA — com governança, verificação independente e autonomia ajustável.**

*SDD + context mesh + ADRs + roster de subagentes + skills que dirigem o fluxo do backlog à produção. Mais liberal que "vibe coding", mais seguro que soltar a IA no repositório: você define o contexto **uma vez** (a gênese) e depois o organismo cresce sozinho — o humano só decide, no fim do dia, **o que nasce em produção**.*

**É um plugin do Claude Code.** Instale, rode a gênese, ligue a autonomia. ↓

</div>

---

## 📚 Sumário

- [O que é (e o que não é)](#-o-que-é-e-o-que-não-é)
- [Instalação e uso (comece aqui)](#-instalação-e-uso-comece-aqui)
- [A vida em duas fases: gênese → organismo](#-a-vida-em-duas-fases-gênese--organismo)
- [A ideia central: autonomia progressiva por risco](#-a-ideia-central-autonomia-progressiva-por-risco)
- [Os sete pilares](#-os-sete-pilares)
- [O fluxo ponta a ponta](#-o-fluxo-ponta-a-ponta)
- [O ciclo SDD (por feature)](#-o-ciclo-sdd-por-feature)
- [O roster de subagentes](#-o-roster-de-subagentes)
- [As skills (o que dispara o quê)](#-as-skills-o-que-dispara-o-quê)
- [Governança e retroalimentação](#-governança-e-retroalimentação)
- [Os knobs ajustáveis (cadência, autonomia, orçamento)](#-os-knobs-ajustáveis-cadência-autonomia-orçamento)
- [As rotinas autônomas](#-as-rotinas-autônomas)
- [Estrutura do repositório](#-estrutura-do-repositório)
- [FAQ](#-faq)

---

## 🎯 O que é (e o que não é)

`ai-first` é um **método empacotado como plugin do Claude Code** — arquivos de processo (subagentes +
skills + governança), não uma biblioteca de código. Você **instala** o plugin (não copia) e ganha um
jeito **disciplinado e majoritariamente autônomo** de a IA evoluir o produto: do levantamento de
backlog ao código em produção, com rastreabilidade, invariantes garantidas, verificação independente e
gates automáticos.

|  | Vibe coding | **`ai-first`** | SDD manual |
|---|---|---|---|
| Especificação antes do código | ❌ | ✅ (rastreável) | ✅ |
| Invariantes garantidas | ❌ | ✅ (constituição + testes) | ✅ |
| Verificação independente do código | ❌ | ✅ (`adversarial-reviewer`) | 〜 |
| Loop fechado com resultado real | ❌ | ✅ (`outcome-analyst`) | ❌ |
| Velocidade de automação | ✅ | ✅ | ❌ (humano em todo passo) |
| Gate humano | nenhum | **por risco, ajustável** | vários |

Ele **não** é: um framework de aplicação, uma dependência de runtime, ou algo acoplado a uma stack,
cloud, arquitetura, infraestrutura ou contexto de produto. O framework nasce **agnóstico**: os
subagentes e skills não sabem nada do seu mundo até a **gênese** — a skill primária `/ai-first-init`
entrevista o humano e grava o contexto no **genoma** (`docs/ai-first/project.md`) e nos arquivos
canônicos. A partir daí, o roster passa a falar a língua do seu domínio sem que você edite um agente
sequer.

## 🚀 Instalação e uso (comece aqui)

O `ai-first` é um **plugin do Claude Code publicado num marketplace** — o jeito nativo de reusar
subagentes e skills **sem copiar arquivo** e com **atualização versionada** (`git pull`). O próprio
repositório é o plugin (`source: "./"` no `marketplace.json`).

### 1 · Instale o plugin
No repositório onde você quer usar o método, dentro do Claude Code:
```text
/plugin marketplace add celfons/ai-first
/plugin install ai-first@ai-first
```
As skills passam a existir com **namespace**: `/ai-first:ai-first-init`, `/ai-first:feature`,
`/ai-first:daily-build`, … e o roster de subagentes fica disponível para o fluxo.

### 2 · Rode a gênese (uma vez)
```text
/ai-first:ai-first-init
```
Ela faz **duas coisas**: **scaffolda** no seu repositório os arquivos de projeto (constituição, genoma,
templates SDD, `.github/`, `CLAUDE.md`) a partir do plugin, e **entrevista você** sobre stack, cloud,
arquitetura, infra, produto, invariantes, qualidade e os **knobs** (cadência, autonomia, orçamento,
`bdd_style`). É a **única fase densa com o humano** — depois dela o organismo roda sozinho.

### 3 · Arme o gate e a autonomia
- Crie a branch `develop`; marque `ci`, o gate de segurança e o `adversarial-reviewer` como
  **required checks** em `develop`/`main` (branch protection).
- Configure `.github/workflows/ai-first-cron.yml` (schedule + secret `ANTHROPIC_API_KEY`) — é o que
  faz as rotinas girarem sozinhas via `anthropics/claude-code-action`.
- **Comece conservador:** `features_per_day: 1`, `autonomy_level: conservador`. Suba os dois **com o
  histórico** — quanto menor a taxa de rejeição/rollback, mais autonomia o organismo merece.

### Duas camadas, dois papéis
- **Plugin = o cérebro** — subagentes (`agents/`) + skills (`skills/`). Instalado e atualizável, **nunca
  copiado**.
- **Gênese = o corpo** — `/ai-first:ai-first-init` materializa o esqueleto do método **no seu repo** e o
  preenche na entrevista. O plugin traz a inteligência; a gênese acopla ao seu projeto.

> **Prefere não usar plugin?** Dá para adotar por **cópia** (os `agents/`+`skills/` vão para o
> `.claude/` do seu repo; `docs/`+`.github/`+`CLAUDE.md` para a raiz) ou por **template repo**. Você
> ganha o método, mas **perde a atualização versionada** — por isso o plugin é o recomendado.

## 🧬 A vida em duas fases: gênese → organismo

```
FASE 0 — GÊNESE (uma vez, com o humano)          FASE 1 — ORGANISMO AUTÔNOMO (cresce sozinho)
──────────────────────────────────────          ─────────────────────────────────────────────────
/ai-first-init entrevista o humano:              backlog → build → verificação independente →
stack · cloud · arquitetura · infra ·     ──▶    develop → promoção POR RISCO; saúde e RESULTADO
produto · invariantes · qualidade ·              auditados. O humano decide, no fim do dia, o que
CADÊNCIA · AUTONOMIA · orçamento →                nasce em produção — e ajusta os knobs quando quiser.
grava o genoma e arma o organismo.               O processo é fixo; o ritmo e a autonomia são dele.
```

**Você define o contexto uma vez** e depois **só decide o que chega à produção**. Nada de conduzir
cada passo — o organismo cresce; o humano é o batimento cardíaco (aprova/reprova) e o dono dos knobs.

## 🔑 A ideia central: autonomia progressiva por risco

O objetivo é ser **mais liberal que o vibe code** sem abrir mão de controle. A automação: **descobre**
o que fazer (Product Owner com benchmarking de mercado **e** o resultado real das features passadas) →
**implementa** pelo ciclo SDD → **verifica de forma independente** (um agente que não escreveu o
código tenta quebrá-lo e dirige o runtime) → **auto-mergeia em `develop`** (só com CI verde + veredito
não-bloqueante) → **promove `develop → main` por tier de risco**.

O gate humano **não é fixo — é um dial** (`autonomy_level`, definido na gênese, ajustável a qualquer
momento):

- **Conservador (default):** o humano aprova **tudo** — o gate único diário clássico.
- **Progressivo:** 🟢 baixo impacto/risco promove sozinha; 🟡/🔴 sobem ao humano.
- **Amplo:** 🟢 e 🟡 promovem sozinhas (com amostragem de auditoria); 🔴 **sempre** sobe.

O humano nunca some — ele passa de "aprova cada uma" para "decide as arriscadas e audita as verdes". O
nível sobe **com o histórico** (baixa taxa de rejeição/rollback), nunca por pressa.

```mermaid
flowchart LR
  BOARD[("📋 Board")] -->|"features_per_day"| SDD["🔁 Ciclo SDD"]
  SDD --> ADV["🛡 verificação independente"]
  ADV -->|"bloqueia"| SDD
  ADV -->|"aprova · vira PR"| DEV[["develop"]]
  DEV -->|"auto-merge: CI verde + veredito ok"| DEV
  DEV --> TIER{{"tier de risco × autonomy_level"}}
  TIER -->|"🟢 se o nível permite"| MAIN[["main · produção"]]
  TIER -->|"🟡 / 🔴"| GATE{{"👤 gate humano"}}
  GATE -->|"aprova"| MAIN
  GATE -->|"reprova"| REJ["/reject-feature"]
  MAIN -.->|"mede"| OUT["📈 outcome-analyst"]
  OUT -.-> BOARD
  REJ -.-> BOARD
```

## 🧱 Os sete pilares

1. **SDD (Spec-Driven Development)** — toda mudança de comportamento começa por uma spec verificável
   e termina atualizando-a. `docs/sdd/`.
2. **Constituição** — princípios inegociáveis (P-1…P-15 universais + Parte B do projeto). Violar um é
   bug arquitetural, mesmo com testes verdes. `docs/sdd/constitution.md`.
3. **Context mesh leve** — um mapa determinístico (domínio → código+docs+ADRs+testes) que faz cada
   agente carregar **só** a fatia que a tarefa pede. `docs/context-map.md`.
4. **Verificação independente (P-11)** — quem escreve ≠ quem aprova: o `adversarial-reviewer` tenta
   **quebrar** cada feature e dirige o runtime real; veredito pode **bloquear o merge**. CI verde não
   basta.
5. **Loop fechado com a realidade (P-12)** — toda feature declara uma métrica de sucesso e é **medida
   pós-ship** (`outcome-analyst`); o que não moveu o ponteiro é iterado ou removido.
6. **Retroalimentação** — **ADRs** (o *porquê* das decisões duráveis) + **ledger de rejeições** (os
   "nãos" do dono) + **resultado real** fazem cada aposta decidir à luz das anteriores.
7. **Roster de subagentes + skills** — papéis especializados mapeados às fases, e skills que os
   orquestram (a gênese, uma feature, as rotinas). Empacotados como **plugin** (`agents/` + `skills/`).

## 🔄 O fluxo ponta a ponta

```mermaid
flowchart TD
  CRONA["⏰ /daily-backlog"] --> PO["🧭 product-owner<br/>mercado + resultado → N issues"]
  PO --> BOARD[("📋 Board")]
  CRONB["⏰ /daily-build · +1h"] --> PICK["pega até features_per_day"]
  HUMAN["👤 /feature manual"] --> PICK
  BOARD --> PICK
  PICK --> ORCH["🗂 sdd-orchestrator"]
  ORCH -->|"grande / arquitetural"| TRIAGE{{"🚧 needs-human-triage"}}
  ORCH -->|"trivial / média"| SPEC

  subgraph CHAIN["Ciclo SDD"]
    SPEC["📐 feature-spec"] --> ARCH["🏗 architect · ADR"] --> IMPL["⚙️ backend / frontend"] --> TEST["🧪 tester"] --> ADV["🛡 adversarial-reviewer"] --> DOCS["📚 docs-writer"]
  end

  ADV -->|"bloqueia"| IMPL
  DOCS --> PR["🔀 PR contra develop"]
  PR -->|"CI + segurança + veredito ok"| MERGE(["✅ auto-merge em develop"])
  MERGE --> TIER{{"tier × autonomy_level"}}
  TIER -->|"🟢 se o nível permite"| PROD(["🏁 main"])
  TIER -->|"🟡 / 🔴"| PROMO["🚀 PR develop → main"]
  PROMO --> REVIEW{{"👤 revisão do dono"}}
  REVIEW -->|"aprova"| PROD
  REVIEW -->|"reprova"| REJECT["↩️ /reject-feature"]
  REJECT -.-> BOARD

  PROD -.->|"incidente"| ROLL["🚑 /rollback"]
  CRONE["⏰ /daily-outcome"] --> OA["📈 outcome-analyst<br/>mede vs. métrica"]
  OA -.-> BOARD
  CRONC["⏰ /daily-tech-scan"] --> TA["🔎 tech-auditor · bugs + drift"]
  CROND["⏰ /daily-ops-scan"] --> OI["🩺 ops-investigator · runtime"]
  TA --> BOARD
  OI --> BOARD
```

## 📐 O ciclo SDD (por feature)

Cada feature é uma **fatia vertical** rastreada numa pasta `docs/sdd/features/NNN-slug/`,
atravessando os módulos necessários — sem reorganizar o código por feature.

| Fase | Artefato | Quem |
|---|---|---|
| 1 · **SPECIFY** | `spec.md` (o quê/porquê, RFs, aceite, **métrica de sucesso §8**, gate constitucional) | `feature-spec` |
| 2 · **PLAN** | `plan.md` (design, dados, idempotência, riscos) + `tasks.md` + ADR se durável | `architect` |
| 2½ · **DECOMPOSE** *(só se grande)* | quebra em **micro-slices** isoladas (contexto estreito, árvore verde) + slice de integração | `task-decomposer` |
| 4 · **IMPLEMENT** | código na branch `claude/<slug>` — **slice a slice, cada uma em contexto isolado** | `backend`/`frontend-engineer` |
| 4¾ · **ACCEPTANCE (BDD)** *(se `bdd_style ≠ off`)* | critérios de aceite → **cenários executáveis** (o oráculo) | `bdd-author` |
| 5 · **VERIFY** | liga os cenários ao runner + testes por slice + integração; gate verde | `tester` |
| 5½ · **VERIFY (independente)** | tenta quebrar + dirige runtime; **pode bloquear o merge** | `adversarial-reviewer` |
| 6 · **DOCS** | spec e docs refletem o **entregue** | `docs-writer` |
| ↻ · **OUTCOME** | mede pós-ship se a métrica de sucesso foi atingida | `outcome-analyst` |

> **Gate constitucional:** a spec não pode violar a constituição. Se precisar, a **primeira** mudança
> é um PR na própria constituição. Ver [`docs/sdd/README.md`](docs/sdd/README.md).

## 👥 O roster de subagentes

Papéis especializados em `agents/` — cada um carrega, pré-compilado, o subconjunto de
convenções da sua fase, para o thread principal delegar com **escopo curto**. Detalhes em
[`docs/roster.md`](docs/roster.md).

| Subagente | Papel |
|---|---|
| `product-owner` | Propõe features (mercado + resultado real) e cria issues |
| `tech-auditor` | Varre bugs, débito **e drift arquitetural** → issues (não corrige) |
| `ops-investigator` | Varre métricas/logs/DLQ → issues com sugestão (não corrige) |
| **`migration-analyst`** | **Brownfield** — lê a solução de origem (qualquer stack) e **captura o comportamento** como oráculo + mapa de migração (skill `/migrate`) |
| `sdd-orchestrator` | Classifica o tamanho e **roteia modelo+esforço por etapa** (custo-benefício); tag na issue. **Único de modelo fixo (opus/alto)** |
| `feature-spec` | Escreve a spec (o quê/porquê + métrica de sucesso) |
| `architect` | Desenha o plano técnico + tasks + ADR |
| **`task-decomposer`** | Quebra feature grande em **micro-slices** isoladas + integração (contexto estreito, árvore verde) |
| `ux-designer` | Brief de UI/UX (só em UI significativa) |
| `backend-engineer` | Implementa o código de produção |
| `frontend-engineer` | Implementa a interface |
| **`bdd-author`** | Converte os critérios de aceite em **cenários BDD executáveis** (o oráculo) — se `bdd_style ≠ off` |
| `tester` | Liga os cenários ao runner + testes/evals; deixa o gate verde |
| **`adversarial-reviewer`** | **Verificação independente** — tenta quebrar; dirige runtime; **bloqueia o merge** |
| `docs-writer` | Reflete o comportamento final nos docs |
| **`outcome-analyst`** | **Mede o resultado real** pós-ship vs. a métrica declarada |

> Um subagente **não** invoca outro — quem encadeia é o thread principal (a skill). **Separação de
> papéis (P-13):** quem escreve não é quem verifica nem quem aprova o risco.
>
> **Modelo e esforço são roteados, não fixos:** o `sdd-orchestrator` decide por custo-benefício qual
> modelo (`haiku`/`sonnet`/`opus`/`fable`) e esforço (`baixo`/`médio`/`alto`/`extra`) cada etapa usa,
> aplica a tag na issue, e é o **único** subagente pinado (opus/alto) — para não errar o roteamento.
> Segurança e invariantes nunca abaixo de opus/alto.

## 🛠 As skills (o que dispara o quê)

> Instaladas pelo plugin, ficam com namespace `/ai-first:<skill>` (abaixo, sem o prefixo por brevidade).

| Skill | O que faz | Disparo |
|---|---|---|
| **`/ai-first-init`** | **A gênese** — scaffolda o corpo do método no repo + entrevista (stack/cloud/arquitetura/infra/produto/knobs). Roda **uma vez** (revisa depois) | Humano (setup) |
| **`/feature-intake`** | **Porta de entrada do stakeholder** — formata uma ideia crua do humano no **padrão de issue do `product-owner`** e cria no board, pronta para o fluxo | Humano |
| `/feature <n>` | Leva **uma issue** ao PR pelo ciclo SDD (com gates após spec e plan) | Humano |
| **`/migrate <origem>`** | **Migração/reescrita (brownfield)** — traz uma solução que já existe de outra base/stack: caracteriza o comportamento da origem e faz o port por **equivalência**, fatia a fatia (strangler-fig) | Humano |
| `/reject-feature <n>` | Reverte de `develop` uma feature reprovada, reabre a issue, registra o motivo | Humano |
| `/rollback <n>` | **Incidente em produção** — kill-switch/revert em `main` com segurança | Humano/alerta |
| `/daily-backlog` | Cria `features_per_day` issues de negócio (PO + benchmarking + resultado) | Cron |
| `/daily-build` | Implementa até `features_per_day`, verifica, auto-mergeia, promove por risco | Cron (+1h) |
| `/daily-tech-scan` | Varre **código** (bugs/débito/drift) → issues fora do fluxo autônomo | Cron |
| `/daily-ops-scan` | Varre **runtime** (métricas/DLQ) → issues fora do fluxo autônomo | Cron |
| `/daily-outcome` | Mede se as features **entregaram resultado** → alimenta o PO | Cron (semanal) |
| `/new-extension` | Scaffold de um novo ponto de extensão pelo mecanismo do projeto | Sob demanda |

## 🏛 Governança e retroalimentação

O que faz cada feature decidir **à luz das anteriores**, em vez de do zero:

- **Constituição** ([`docs/sdd/constitution.md`](docs/sdd/constitution.md)) — princípios inegociáveis.
  Parte A universal P-1…P-15 (processo, verificação, autonomia, segurança, economia); Parte B do projeto.
- **ADRs** ([`docs/adr/`](docs/adr/)) — cada decisão arquitetural durável. O `architect` lê o índice
  antes de decidir e escreve o ADR; ninguém re-litiga uma decisão viva em silêncio.
- **Ledger de rejeições** ([`docs/product/rejections.md`](docs/product/rejections.md)) — todo "não" do
  dono vira aprendizado, para o `product-owner` não repropor a mesma coisa.
- **Resultado real** (`outcome-analyst`) — o uso mostra o que funcionou; o PO dobra no que deu certo e
  itera/para no que não deu. É a retroalimentação mais valiosa e a mais esquecida em automação.

## 🎛 Os knobs ajustáveis (cadência, autonomia, orçamento)

Definidos na gênese, gravados no genoma (`docs/ai-first/project.md §8`), **mudáveis a qualquer momento**
(P-15):

- **`features_per_day`** — quantas features o PO cria e o build implementa por rodada (comece em 1, suba
  com confiança). **É a variável que escala o organismo.**
- **`autonomy_level`** — `conservador` | `progressivo` | `amplo` (quem promove sozinho, por tier de risco).
- **`daily_budget`** — teto de gasto/esforço do loop por período (P-14).
- **Modelo fixado** — upgrade é decisão explícita, com re-baseline de evals (P-14).
- **`bdd_style`** — `native` | `gherkin` | `off` (formato dos cenários de aceitação).

Para mudar: edite o genoma ou rode `/ai-first-init` em modo revisão. Vale já no próximo ciclo.

## ⏰ As rotinas autônomas

```
/daily-backlog   → PO cria features_per_day issues (mercado + resultado real)
   … ~1h (assenta) …
/daily-build     → implementa → verifica (independente) → develop → promove por risco → resumo ao dono
/daily-tech-scan → tech-auditor: bugs + débito + drift arquitetural (needs-human-triage)
/daily-ops-scan  → ops-investigator: métricas/DLQ do runtime (needs-human-triage)
/daily-outcome   → outcome-analyst: as features moveram o ponteiro? (alimenta o PO)
```

Rodam via `.github/workflows/ai-first-cron.yml` (`anthropics/claude-code-action` em `schedule:`).

- **Espace os crons pesados** por várias horas para não competirem por orçamento na mesma janela.
- **Toda rotina avisa em falha** (push + e-mail): nunca termina em silêncio; sempre com a frase de retry.
- **`/daily-build` é checagem cruzada** do `/daily-backlog`: backlog vazio → alerta.

## 📁 Estrutura do repositório

```
ai-first/                          · o repo É o plugin (source "./" no marketplace)
├── .claude-plugin/
│   ├── plugin.json                · manifesto do plugin (name, version, …)
│   └── marketplace.json           · marketplace de plugin único (source "./")
├── agents/                        · o roster (16 subagentes) — descoberto pelo plugin
├── skills/                        · ai-first-init, feature-intake, feature, migrate, reject-feature, rollback, daily-*, new-extension
├── README.md                      · este arquivo
├── CLAUDE.md                      · índice-mãe (mapa de módulos + invariantes) — preenchido na gênese
├── docs/
│   ├── ai-first/project.md        · 🧬 o GENOMA — contexto + knobs do projeto (preenchido na gênese)
│   ├── sdd/
│   │   ├── constitution.md        · P-1…P-15 universais + Parte B do projeto
│   │   ├── README.md              · o ciclo SDD
│   │   ├── specification.md       · RFs vivos (esqueleto)
│   │   ├── technical-plan.md      · RNFs / arquitetura macro (esqueleto)
│   │   ├── tasks.md               · backlog vivo (esqueleto)
│   │   ├── templates/             · spec / plan / tasks
│   │   └── features/              · uma pasta NNN-slug por feature (com um exemplo)
│   ├── adr/                       · README (índice) + template + ADR-0001 (método) + ADR-0002 (migração)
│   ├── context-map.md             · o context mesh leve
│   ├── roster.md                  · visão geral dos 16 subagentes (fora de agents/ p/ não virar componente)
│   └── product/rejections.md      · ledger de rejeições
├── scripts/
│   └── validate-plugin.mjs        · TESTE do manifesto + inventário do plugin (zero-dep)
└── .github/
    ├── pull_request_template.md   · checklist + gate constitucional
    ├── ISSUE_TEMPLATE.md          · com as labels que o fluxo autônomo usa
    └── workflows/
        ├── ci.yml                 · required checks (qualidade + segurança)
        ├── plugin-validate.yml    · roda o teste do plugin no CI (gate)
        └── ai-first-cron.yml      · rotinas autônomas via claude-code-action (schedule)
```

> **Validação do plugin como teste:** `node scripts/validate-plugin.mjs` checa o manifesto
> (`plugin.json`/`marketplace.json`), garante que **todo `.md` em `agents/` é um subagente válido**
> (pega "componente-fantasma" — um doc sem frontmatter virando agente) e, se o CLI `claude` estiver
> presente, carrega o plugin de fato (`claude --plugin-dir . plugin details ai-first`). Roda no CI via
> `plugin-validate.yml`.

## ❓ FAQ

**Como uso isto no meu projeto?** Instale o plugin (`/plugin marketplace add celfons/ai-first` →
`/plugin install ai-first@ai-first`) e rode `/ai-first:ai-first-init`. Ver [Instalação e uso](#-instalação-e-uso-comece-aqui).

**Preciso copiar os arquivos?** Não — o jeito recomendado é **instalar como plugin** (atualização
versionada). Copiar/template repo funciona como fallback, mas você perde as atualizações.

**Isto substitui o programador?** Não. Substitui o *trabalho mecânico* de conduzir o ciclo. O humano
define o contexto, decide o que vai para produção e resolve o que a automação marca como
`needs-human-triage` (mudanças grandes/arquiteturais, que **nunca** são auto-implementadas).

**Como isso escala?** Pelo `features_per_day` (mais features/rodada) e pelo `autonomy_level` (menos
coisas passando pela sua mão). Ambos são dials que você sobe conforme a confiança — não um salto.

**E feature grande, que faz o modelo se perder?** O `task-decomposer` a quebra em **micro-slices**;
cada uma é implementada numa **sessão de contexto limpa** (só a fatia que toca) — janela menor, menos
alucinação, entrega mais rápida — e a **árvore fica verde a cada passo**. A **slice de integração**
final agrega tudo e prova a feature inteira de ponta a ponta. Feature pequena não é decomposta.

**Onde entra o BDD?** Os critérios de aceite da spec já são escritos em Dado/Quando/Então. O
`bdd-author` os transforma em **cenários executáveis** (Gherkin `.feature` ou cenários nativos — knob
`bdd_style`) que viram o **oráculo**: o `tester` os liga ao runner e o `adversarial-reviewer` os usa e
caça o cenário que faltou. Assim a spec e o teste falam a mesma língua e não divergem. Quem não quer a
camada BDD põe `bdd_style: off`.

**E se a IA fizer besteira?** Cinco redes: **CI verde** obrigatória; **gate de segurança**
(secret-scan/dep-review/SAST); **verificação independente** (`adversarial-reviewer` que tenta quebrar
e dirige o runtime); **avaliação de impacto/risco** que roteia o que sobe ao humano; e o **gate humano**
por risco. Depois do ship, o **`outcome-analyst`** pega o que não funcionou e o **`/rollback`** tira da
produção o que quebrou. Reprovou antes de `main`? `/reject-feature` reverte com segurança.

**Por que dois branches?** Para separar "pronto, testado e verificado" (autônomo) de "publicado"
(decisão humana por risco). `develop` acumula; `main` só recebe o que o tier/nível de autonomia liberou.

**Preciso usar as rotinas?** Não. O `/feature <n>` manual dá todo o valor do SDD com gates em cada
etapa. As rotinas são a camada de **autonomia** por cima — ligue quando confiar no fluxo.

---

<div align="center">
<sub>Método <b>ai-first</b> — desenvolvimento delegado a IA, com verificação independente e autonomia que você regula.</sub>
</div>
