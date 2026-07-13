# 🤖 Subagentes (Claude Code) — o roster do método `ai-first`

Estes são **subagentes do Claude Code** (`.claude/agents/*.md`): ferramentas de
**desenvolvimento** que executam o ciclo SDD. Cada subagente carrega, pré-compilado, o
subconjunto de convenções da sua fase — assim o thread principal delega com um **escopo curto**
em vez de reexplicar as invariantes a cada turno. Isso mantém o contexto principal enxuto
(menos token) e o processo coeso.

> **Adapte ao seu projeto.** Estes subagentes são **stack-agnósticos**: eles buscam as
> invariantes do *seu* projeto em `docs/sdd/constitution.md`, `CLAUDE.md` e
> `docs/context-map.md`. Preencha esses três arquivos e o roster passa a falar a língua do seu
> domínio sem editar os agentes. Onde um agente cita um exemplo concreto (banco, fila, provedor),
> troque pelo seu — o **papel** de cada agente é o que importa.

## Roster mapeado ao ciclo SDD

**Modelo e esforço são roteados por etapa, não fixos.** O `sdd-orchestrator` avalia, por
custo-benefício, **qual modelo** (`haiku` · `sonnet` · `opus` · `fable`) e **qual esforço** (`baixo`
=low · `médio`=medium · `alto`=high · `extra`=xhigh) cada subagente deve usar em cada etapa — o mais
barato que faz o trabalho bem, reservando opus/extra para julgamento, risco e segurança. Ele **aplica
a tag** (`model:*`/`effort:*`) na issue e o driver (skill) invoca cada subagente com o modelo+esforço
indicados. **O `sdd-orchestrator` é o ÚNICO subagente com modelo fixo (opus, esforço alto)** — ele
decide o barato/caro dos outros, então precisa ser o mais forte para não errar o roteamento. A
verificação independente (`adversarial-reviewer`) e etapas que tocam invariante/segurança **nunca**
descem abaixo de opus/alto, por mais que o custo-benefício empurre para baixo.

| Subagente | Fase SDD | Entrega |
|---|---|---|
| `product-owner` | (backlog) | propõe features de negócio e **cria issues** no board |
| `tech-auditor` | (saúde do código) | varre bugs críticos + débito técnico e **cria issues** (não corrige) |
| `ops-investigator` | (saúde de runtime) | investiga métricas/logs/DLQ e **cria issues** c/ sugestão (não corrige) |
| `sdd-orchestrator` | (entrada · **roteador**) | classifica tamanho; roteia **modelo+esforço** por etapa (custo-benefício); tag na issue. **Único de modelo fixo (opus/alto)** |
| `feature-spec` | 1 · SPECIFY | `docs/sdd/features/NNN-slug/spec.md` |
| `architect` | 2 · PLAN | `plan.md` + `tasks.md` (+ ADR se durável) |
| `ux-designer` | 3½ · DESIGN (UI) | brief de UI/UX — só em UI significativa |
| `backend-engineer` | 4 · IMPLEMENT | código na branch de feature |
| `frontend-engineer` | 4 · IMPLEMENT (UI) | implementa a UI — o brief do `ux-designer` ou tweaks diretos |
| `tester` | 5 · VERIFY | testes + evals; gate verde |
| `adversarial-reviewer` | 5½ · VERIFY (independente) | tenta QUEBRAR a mudança; dirige o runtime; veredito pode BLOQUEAR o merge |
| `docs-writer` | 6 · DOCS | `docs/*`, `CLAUDE.md`, spec final coerente |
| `outcome-analyst` | (resultado) | mede se a feature entregou a métrica de sucesso (§8) com uso real |

## Diagrama de fluxo e interação

```mermaid
flowchart TD
  CRONA["⏰ Cron 1<br/>skill /daily-backlog"]
  CRONB["⏰ Cron 2 (+1h)<br/>skill /daily-build"]
  HUMAN["👤 Humano (stakeholder)<br/>skill /feature #NNN"]

  CRONA --> PO["🧭 product-owner<br/>features_per_day · mercado + resultado"]
  PO -->|cria a issue do dia| BOARD[("📋 Board GitHub<br/>backlog priorizado")]
  CRONB -->|pega a issue do dia| BOARD
  BOARD --> ORCH
  HUMAN -->|escolhe um card| ORCH

  ORCH["🗂 sdd-orchestrator<br/>classifica tamanho + plano de delegação"]
  ORCH -->|grande / risco arquitetural| TRIAGE{{"🚧 needs-human-triage<br/>(não auto-implementa)"}}
  ORCH -->|trivial / média| SPEC

  SPEC["📐 feature-spec<br/>spec.md + gate constitucional"] -->|gate*| ARCH
  ARCH["🏗 architect<br/>plan.md + tasks.md + ADR"] -->|gate*| BE
  BE["⚙️ backend/frontend-engineer<br/>código (invariantes)"] --> TEST
  TEST["🧪 tester<br/>testes + evals"]
  TEST -->|bug de produção| BE
  TEST -->|verde| ADV["🛡 adversarial-reviewer<br/>tenta quebrar · dirige runtime"]
  ADV -->|BLOQUEIA| BE
  ADV -->|aprova| DOCS["📚 docs-writer<br/>docs + spec coerentes"]
  DOCS --> PRDEV["🔀 PR → develop · Closes #NNN"]

  PRDEV -->|CI verde + veredito ok| MERGEDEV(["✅ merge em develop"])
  MERGEDEV --> TIER{{"tier de risco<br/>+ autonomy_level"}}
  TIER -->|🟢 (nível permite)| PROD(["🏁 main / produção<br/>auto-promovida"])
  TIER -->|🟡/🔴| PROM["🚀 PR develop → main<br/>(abre/atualiza, não mergeia)"]
  PROM --> REVIEW{{"👤 Revisão do stakeholder<br/>gate por risco"}}
  REVIEW -->|aprova + merge| PROD
  REVIEW -->|reprova feature| REJECT["↩️ skill /reject-feature<br/>revert em develop · reabre issue"]
  PROD -.->|mede resultado| OUT["📈 outcome-analyst<br/>/daily-outcome"]
  OUT -.->|dado real| PO
  PROD -.->|incidente| ROLL["🚑 /rollback"]

  REJECT -.->|retrabalho| BOARD
  TRIAGE -.->|humano especifica depois| BOARD

  CRONC["⏰ Cron 3<br/>/daily-tech-scan"]
  CRONC --> TA["🔎 tech-auditor"]
  TA -->|issues needs-human-triage<br/>SEM po-suggested = fora do build| BOARD
  CROND["⏰ Cron 4<br/>/daily-ops-scan"]
  CROND --> OI["🩺 ops-investigator"]
  OI -->|issues needs-human-triage| BOARD
```

**gate\*** — no `/feature` **manual**, o fluxo PARA para aprovação humana após a `spec.md` e
após o `plan.md`. Na rotina `/daily-build` **autônoma**, esses gates são pulados; o gate humano é a
promoção `develop → main`, **por tier de risco** (P-10: no nível `conservador` o humano aprova tudo;
nos maiores, só 🟡/🔴 sobem — 🟢 auto-promove). Um subagente **não** invoca outro: quem encadeia é o
thread principal (a skill); o `sdd-orchestrator` **devolve o plano**.

## Fluxo típico (feature média)

```
sdd-orchestrator  → devolve o plano de delegação
  └─ feature-spec      (SPECIFY)   → spec.md
     └─ architect      (PLAN)      → plan.md + tasks.md (+ ADR se durável)
        └─ backend-engineer (IMPLEMENT) → código
           └─ tester    (VERIFY)   → testes + evals verdes
              └─ adversarial-reviewer (VERIFY independente) → tenta quebrar; BLOQUEIA ou aprova
                 └─ docs-writer (DOCS) → docs coerentes
```

> **Separação de papéis (P-13):** quem escreve (`backend-engineer`) **não** é quem aprova o risco. O
> `adversarial-reviewer` — que não escreveu o código — pode **bloquear o auto-merge**; e a promoção a
> produção é **por tier de risco** (P-10), não feature a feature.

- **Trivial** (1 arquivo, sem novo efeito/dado/proatividade): pule o SDD →
  `backend-engineer` → `tester`.
- **Grande / risco arquitetural** (novo módulo, nova porta, mudança de invariante):
  mesma cadeia, com **gate humano** após `feature-spec` e após `architect`.

## Retroalimentação — o que faz cada feature decidir à luz das anteriores

- **ADRs** ([`docs/adr/`](../../docs/adr/)) — cada decisão arquitetural durável (contexto →
  decisão → alternativas → consequências → status). O `architect` **lê o índice antes de
  decidir** e **escreve o ADR**; o `product-owner` consulta para não contradizer decisões
  vivas; o `docs-writer` mantém índice e status. O *porquê* das escolhas vira acervo cumulativo.
- **Ledger de rejeições** ([`docs/product/rejections.md`](../../docs/product/rejections.md)) — o
  par negativo dos ADRs: toda feature reprovada pelo dono deixa o **motivo** e o **takeaway** (via
  `/reject-feature`). O `product-owner` **lê antes de propor**, então não repropõe um "não".
- **Mapa de contexto** ([`docs/context-map.md`](../../docs/context-map.md)) — a versão *leve e
  determinística* de um context mesh: por domínio, aponta código ⇄ docs ⇄ ADRs ⇄ features ⇄
  testes. Cada subagente carrega **aquela** fatia em vez de reler a base.

## Vertical slice — na FEATURE, não no código

O código é organizado por **módulos/portas/adapters** (mapa em `CLAUDE.md`). O corte vertical
vive no nível da **feature**: cada `docs/sdd/features/NNN-slug/` é uma fatia rastreada
spec→plan→tasks→código→testes→docs **atravessando** os módulos necessários — uma issue, uma
branch, um `Closes #NNN`. Não reorganize o código por feature.

## Rotina diária autônoma (board → develop) — DOIS crons, ~1h de intervalo

```
Cron 1 · /daily-backlog
  └─ product-owner → BENCHMARKING de mercado + RESULTADO real → cria `features_per_day` issues
                     (a lacuna competitiva de maior valor; dedup + roadmap;
                     FALHA = alerta de retry push/e-mail)

        … ~1h de intervalo (as issues assentam no board) …

Cron 2 · /daily-build   ← start por CRON, não pelo stakeholder
  ├─ pega até `features_per_day` (po-suggested, trivial/média, sem needs-human-triage)
  ├─ implementa cada: /feature autônomo → PR contra develop
  ├─ VERIFICAÇÃO INDEPENDENTE: adversarial-reviewer tenta quebrar (pode BLOQUEAR)
  ├─ avalia IMPACTO + RISCO sobre o diff (/code-review): 🟢/🟡/🔴 → define o tier
  ├─ auto-merge em develop  (SÓ com CI verde + segurança + veredito não-bloqueante)
  ├─ promove develop → main POR TIER × autonomy_level (🟢 pode sozinha; 🟡/🔴 sobem)
  └─ resumo ao dono: o que foi ao ar, o que espera OK, perguntas em aberto
```

O gate humano é **por tier de risco** (não por feature): no nível `conservador` o humano aprova
tudo; nos maiores, 🟢 (e 🟡) auto-promovem e só o arriscado sobe. Mudança `grande`/arquitetural nunca
é auto-implementada — a rotina para e marca `needs-human-triage`. `[NEEDS CLARIFICATION]` bloqueante
vira pergunta assíncrona ao dono (`awaiting-human`), nunca chute.

### Cron 3 · /daily-tech-scan — saúde do código (só levanta, não corrige)

O `tech-auditor` varre o repositório em busca de **bugs críticos** e **débito técnico** e cria
issues — **sem implementar**. As issues levam `needs-human-triage` e **não** levam
`po-suggested`, então o `/daily-build` **nunca** as pega. **O humano dispara a correção** com
`/feature <n>` quando quiser.

### Cron 4 · /daily-ops-scan — saúde operacional/runtime (só levanta, não corrige)

Irmã do cron 3, mas olha o **runtime em produção** (métricas, logs, DLQ). O `ops-investigator`
cria issues com **evidência + sugestão de correção** — sem implementar, só leitura em produção.
Mesmo rótulo `needs-human-triage`, fora do fluxo autônomo.

### Cron 5 · /daily-outcome — fecha o loop com a realidade (mede, não corrige)

O `outcome-analyst` mede se as features **já promovidas** entregaram a **métrica de sucesso da spec
(§8)** com telemetria real (✅ moveu · 〜 cedo · ❌ não moveu). O que não moveu vira candidato a
iterar/remover e **alimenta o `product-owner`** com dado real — a retroalimentação mais valiosa.
Cadência menor (algumas vezes/semana — resultado leva dias para maturar).

### Espaçamento dos crons

Rode os crons **pesados** (agênticos) **espaçados** (várias horas) para não empilharem na mesma
janela de uso do modelo. O `backlog` é leve e fica ~1h antes do build de propósito (a issue
assenta no board antes do desenvolvimento começar).

### Resiliência — toda rotina avisa em falha (push + e-mail)

Cada rotina tem **contrato de falha/retry**: se não conseguir criar issue, auditar ou implementar
(erro de API, CI vermelha, merge bloqueado, backlog vazio, subagente falhou), **não termina em
silêncio** — encerra com um **alerta push/e-mail** dizendo o que falhou e a frase para
**re-disparar manualmente**. O `/daily-build` ainda serve de **checagem cruzada** do
`/daily-backlog` (backlog vazio → alerta).

## Como invocar

**Starter recomendado — a partir de uma issue do board:** `/feature <número-da-issue>` (skill
`.claude/skills/feature`). Roda no thread principal, lê a issue como requisito, cria a branch a
partir de `develop` e dirige a cadeia inteira até o PR contra `develop` (`Closes #NNN`), parando
nos gates após a spec e após o plan.

**Reprovar no gate:** `/reject-feature <issue#> [motivo]` — reverte de `develop` (revert commit,
sem reescrever histórico) uma feature reprovada no PR `develop → main`, reabre a issue e registra
o motivo no ledger.

**Manual:** chame um subagente pelo nome via a ferramenta Agent (ex.: `architect` com o escopo da
feature). O `sdd-orchestrator` não spawna os outros; ele **devolve o plano** e o thread principal
executa cada etapa. Para trabalho independente, dispare subagentes em paralelo.
