# 🧬 Evolução (linha do tempo de aprendizados)

O **diário do organismo**: em ordem cronológica, o que **mudou** e — mais importante — o que se
**aprendeu**. Cada feature promovida, cada resultado medido e cada rejeição deixam uma linha aqui.
É a narrativa legível que amarra os artefatos que já existem (ADRs, ledger de rejeições, métricas de
resultado) numa história única — para um humano (ou uma sessão futura) entender **como chegamos aqui**
sem reconstruir o passado lendo dez lugares.

> **Retenção (memória episódica — ver [`ai-first/memory.md`](ai-first/memory.md)):** ledger *append-only*
> que **consolida + poda** na cadência `/distill`. Conforme o knob `memory_retention` (genoma, default
> 90 dias / 50 entradas), entradas antigas são destiladas em padrões (`knowledge.md`) pelo
> `knowledge-curator` e **movidas** para `archive/AAAA-MM.md` — nunca apagadas (reversível via git;
> ponteiro de volta obrigatório).

> **Onde este doc se encaixa (não duplica, indexa):**
> - **`docs/adr/`** = *decisões arquiteturais duráveis* (contexto → decisão → consequências). Este doc
>   **linka** o ADR, não reconta a decisão.
> - **`docs/product/rejections.md`** = o *"não" do dono* (motivo + takeaway). Aqui entra só a **linha**
>   do aprendizado, apontando para o ledger.
> - **`outcome-analyst` / `/daily-outcome`** = a *medição por feature* (✅/〜/❌). Aqui vira a linha
>   cronológica consolidada.
> - Ou seja: ADRs/rejeições/outcome são as **fontes**; este é o **índice temporal** que os costura.

## Como usar (agentes e sessões)
1. Para entender a trajetória do produto (ou por que algo é como é), **leia de baixo para cima** (mais
   recente no topo) antes de propor grandes mudanças.
2. O `product-owner` lê para **dobrar no que funcionou** e não reabrir o que já se aprendeu que não
   move o ponteiro. O `architect` lê para não recontradizer um aprendizado durável.
3. **Não** re-litigue um aprendizado registrado sem um ângulo novo (mesma disciplina do ledger).

## Formato da entrada (mais recente no topo)
```
### AAAA-MM-DD · <mudança/feature curta> (#NNN)
- **Sinal:** ✅ moveu · 〜 cedo · ❌ não moveu · 🔧 ficou cego (sem instrumentação)
- **Aprendizado:** 1–2 linhas do que o real ensinou (o que fazer mais / parar de fazer).
- **Links:** ADR-000N · issue #NNN · rejeição (se houve) · métrica (§8 da spec).
```

## Linha do tempo

### 2026-08-07 · A régua de UI garantia *sóbrio*, mas não *específico* (meta)
- **Sinal:** 🔧 processo (maturidade da disciplina de design do próprio método).
- **Aprendizado:** a régua de 2026-07-11 (benchmark de elite + 5 lentes + "premium = sóbrio") resolveu
  o **excesso** e deixou passar o oposto: a tela **genérica**, que respeita todos os gates e ainda assim
  **poderia ser de qualquer produto**. Num pipeline em que 100% da UI é autorada por IA, esse é o modo
  de falha *default*, não a exceção — e nenhum dos dois agentes tinha defesa contra ele. Correção:
  nomear o cluster que a geração por IA produz por gravidade (creme+serifa+terracota, gradiente
  roxo→azul, Inter/Space Grotesk por default, emoji como marcador, `rounded-lg` em tudo) como
  **anti-padrão caçável** em `knowledge.md`, e criar o catálogo que faltava da disciplina
  (`design-principles.md` — design era o único ofício do roster sem o seu). Vieram junto os detalhes
  que separam "funciona" de "acabado": neutro com viés de matiz, `tabular-nums`/medida, estado
  codificado em **forma** e não só em número, copy na língua da persona, higiene de especificidade.
  **O que foi recusado importa tanto quanto o que entrou:** a *stance* editorial da fonte ("tome um
  risco estético real", "o cliente rejeitou o templado") **contradiz** a lei nº 1 do produto —
  consistência vence originalidade — e teria virado regressão; e as restrições de página
  auto-contida (CSP, fonte em data-URI, tema do viewer) não são deste meio. Importar catálogo de
  fora é **recorte**, nunca cópia.
- **Links:** `docs/design-principles.md` · `docs/knowledge.md` (§ régua de UI, 2ª rodada) ·
  `agents/ux-designer.md` · `agents/frontend-engineer.md` · origem: skill `artifact-design` (Claude Code).

### 2026-08-01 · O grafo sai do opt-in e vira o caminho default — e a rodada vira código (meta)
- **Sinal:** 🔧 processo (execução do que o método já tinha decidido E implementado).
- **Aprendizado:** a lição de 2026-07-31 ("prosa de skill não é execução") tinha um degrau abaixo dela:
  **motor que só liga sob frase mágica também não é execução**. O `build-one-feature.mjs` existia,
  correto e completo — mas `token-efficiency.md` §4 e `/feature` §2¾ o mantinham *"opcional, só com
  opt-in do humano"*. O efeito era o mesmo perverso de antes, invertido no eixo: o caminho **autônomo**
  (`/daily-build`, `/kickoff` — volume, sem observador) era o que **menos** rodava o grafo, porque não
  há ninguém lá para dizer "use um workflow". Ao reler a restrição real da ferramenta, o freio se
  revelou **autoimposto**: `Workflow` não pode disparar em silêncio, mas *invocar uma skill cujas
  instruções mandam chamá-lo* **já é** o consentimento. O opt-in extra não protegia nada — só desligava
  o motor. Segunda descoberta: a **Escala 2** (N features numa orquestração) estava em pseudocódigo há
  duas ADRs; sem workflow pai, o bundle compartilhado era derivado N× e a guarda de orçamento global
  não tinha onde morar. Virou `build-many-features.mjs`, compondo o filho por `workflow()` (1 nível —
  ADR-0010 §3) e checando o teto **antes de abrir cada frente**, não depois de queimar. O que **não**
  mudou é o ponto: gates humanos ficam **fora** do grafo (o grafo acelera o aprovado, não atropela
  aprovação), isolamento/piso opus/merge serializado intactos. E o freio novo é honesto: sem a
  ferramenta, **degrada e reporta** — nunca simula.
- **Links:** ADR-0018 · ADR-0009/0010/0003 (refinados) · `templates/workflows/build-many-features.mjs`
  · `token-efficiency.md` §4 · genoma §8 (`orchestration_mode`) · fitness F5 (agora cobre os dois grafos).

### 2026-07-31 · O motor passa a fatiar de verdade — e o teste passa a caber no laço (meta)
- **Sinal:** 🔧 processo (execução do que o método já prometia + wall-clock do laço interno).
- **Aprendizado:** duas descobertas acopladas. (1) **Prosa de skill não é execução.** A decomposição em
  micro-slices com contexto isolado estava escrita no `task-decomposer` e implementada na skill
  `/feature` §5 — mas o **subgrafo contratado** (`build-one-feature.mjs`), que é o que `/daily-build`,
  `/kickoff` e `/migrate` compõem, colapsava tudo numa invocação (`"Implemente as slices do tasks.md"`).
  Resultado perverso: o caminho **manual** (com humano olhando) ganhava o isolamento; o **autônomo**
  (volume, sem observador) não. Quando prosa e motor divergem, **o motor é o que roda** — e o obstáculo
  técnico era simples: o decompositor devolvia **prosa**, e script não roteia prosa. Corrigido com
  contrato estruturado (footprint + DAG + `doneTest`) e ondas de execução por footprint disjunto,
  reusando a regra de conflito do ADR-0007 **dentro** da feature. (2) **Fatiar sem escopo de teste seria
  uma regressão travestida de melhoria:** N slices × suíte completa é pior que a invocação monolítica.
  O "testes rápidos" do Tier 1 (ADR-0013) nunca tinha definição operacional — ganhou três níveis
  (relacionado no laço → footprint ao fechar a slice → **completa no gate, sempre**), com os freios que
  tornam o estreito honesto (migration/config/DI/fixture ⇒ full; invariante/segurança no escopo mínimo;
  sem comando de seleção, **degrada e reporta** em vez de simular). O que **não** se fatia: o gate de
  julgamento continua uma vez por feature sobre o diff agregado — fatiar autoria nunca é fatiar
  verificação (P-14).
- **Links:** ADR-0017 · ADR-0013 (refinado) · ADR-0012/0007/0010 · `templates/workflows/build-one-feature.mjs`
  · genoma §7 (`test (escopo)`, `test_scope`) e §8 (`slice_fanout`).

### 2026-07-31 · Stacked PRs avaliados e recusados (meta)
- **Sinal:** 🔧 processo (decisão de método — recusa registrada, sem métrica de produto).
- **Aprendizado:** um padrão de mercado só entra se o **gargalo que ele resolve existir aqui**. Stacked
  PRs compra revisão barata para o **revisor humano** — que este pipeline não tem (`autonomy_level:
  autônomo`); e os ganhos restantes já estavam cobertos pelo isolamento por slice (contexto), pela
  árvore verde por slice (feedback cedo) e pelo `tasks.md` como DAG (rastreabilidade). O que sobrava
  eram os custos: gate caro pago N vezes (opus/alto), N rodadas na fila de merge serializada, WIP/
  footprint mudando de unidade e rebase em cascata. A necessidade legítima por trás do pedido —
  **checkpoint auditável em feature 🔴** — já tinha mecanismo pronto: **sub-issues** sequenciadas pelo
  `wip_limit`. Recusar com o trade-off escrito vale mais que adotar "por via das dúvidas": um knob
  desligado custa quase o mesmo que o default, porque o caminho precisa existir para sempre.
- **Links:** ADR-0016 · `docs/knowledge.md` (anti-padrão "cadeia de PRs empilhados") · ADR-0003/0007/0008.

### 2026-07-26 · Duplo laço de teste — TDD entra como laço interno do BDD (meta)
- **Sinal:** 🔧 processo (sem métrica de produto — é fidelidade da implementação do próprio método).
- **Aprendizado:** o método tinha o **laço externo** (cenários de aceitação como oráculo) mas mantinha
  o **teste-depois** no miolo: `backend-engineer` implementava, `tester` cobria. No fluxo autônomo isso
  é o pior arranjo possível — **o mesmo cérebro escreve código e teste**, então o teste tende a
  descrever o que a implementação faz (mesmos ramos, mesmos mocks) e passa por *concordância*, não por
  prova. Faltava também qualquer evidência de que um teste **sabe falhar**: verde nunca visto vermelho
  pode ser asserção frouxa ou caminho não exercitado. Correção sem inflar o pipeline: **nenhum agente
  novo** (o ciclo vermelho→verde→refatorar roda **dentro** da invocação do implementador — um hop por
  ciclo custaria mais que o ganho), **`bdd-author` movido para antes do implement** (o laço externo tem
  de nascer vermelho), **prova do vermelho** como campo de retorno (torna a disciplina verificável em
  vez de declarada — teste de mutação a custo ~zero), o `tester` promovido a **auditor** do laço interno
  e o `adversarial-reviewer` ganhando a lente "**sabote o código: a suíte pega?**" com poder de bloqueio.
  Escalado ao contexto pelo knob `tdd_mode` (`estrito`/`pragmático`/`off`), com um piso que não se
  negocia em modo nenhum: **bug reproduz em vermelho antes da correção**.
- **Links:** ADR-0015 · corolários P-1/P-10 · `docs/engineering-principles.md` §11 · genoma §7 (`tdd_mode`).

### 2026-07-21 · Bordas que o caminho feliz esconde (meta) — pós-refactor do painel
- **Sinal:** 🔧 processo (uma solução construída pelo método precisou de 3 refactors de correção; as
  três dores eram a **mesma classe** de omissão).
- **Aprendizado:** o pipeline construiu com excelência o **caminho feliz da vitrine** e não interrogou
  **as bordas**. Três dores reais, um só fio: (1) **painel interno feio** — a régua premium foi aplicada
  à landing mas a tela logada ficou sem camada de tokens/dark mode (rascunho funcional); (2) **"gerar
  relatório" habilitado sem a conta conectada à Meta** → artefato que abre quebrado (ação sem
  pré-condição, sem barreira no servidor); (3) **lista de clientes sem paginação/busca** — "cheio" foi
  lido como "a lista com itens", não "cheio = MUITOS". Correção **sem gate novo**: cada dor virou uma
  **linha de anti-padrão** (que o `adversarial-reviewer` já lê como checklist de caça) + 3 passos de
  agente afiados. Novos anti-padrões em `knowledge.md`: "ação habilitada sem pré-condição satisfeita"
  (geral), "polir só a vitrine / tela logada rascunho" e "coleção sem paginação/busca" (UI). O
  `ux-designer`/`frontend-engineer` redefinem "cheio = em escala" e "pré-condição de ação = desabilitado
  com motivo + backend fail-closed"; o `adversarial-reviewer` ganhou a lente 6 (bordas de UX/escala); o
  `feature-spec`/`bdd-author` passam a exigir o **cenário negativo de pré-condição** e o de **escala**.
- **Links:** `docs/knowledge.md` (§ anti-padrões geral + UI) · `agents/ux-designer.md` ·
  `agents/frontend-engineer.md` · `agents/adversarial-reviewer.md` (lente 6) · `agents/feature-spec.md` ·
  `agents/bdd-author.md` · origem: `celfons/relatorio` PRs #102/#109 (painel + bloqueio Meta + paginação).

### 2026-07-18 · Régua premium estendida a TODO o roster (meta, 3ª rodada)
- **Sinal:** 🔧 processo (a régua de elite provou valor nos agentes de UI; faltava o resto da squad).
- **Aprendizado:** a régua de "time de elite" que elevou `ux-designer`/`frontend-engineer` (benchmark
  nomeado + justificativa por 5 lentes + sobriedade premium) é **domínio-agnóstica na forma**: o que
  fez a UI subir — um **padrão de excelência nomeado** e um **conjunto de lentes que força o "porquê"**
  em vez de só o "pronto" — vale para planejar, implementar, testar, revisar, priorizar e operar. Cada
  agente ganhou sua régua com o benchmark real do seu ofício (staff engineers para o `architect`, red
  team para o `adversarial-reviewer`, AppSec para o `security-reviewer`, PM de classe mundial para o
  `product-owner`, SRE para o `ops-investigator`, FinOps/AIOps para o `finops-steward`, strangler-fig
  para o `migration-analyst`, etc.) e 5 lentes do seu domínio. Premium continua sendo **sóbrio**: mais
  rigor/clareza/rastreabilidade, não mais volume. **Não afrouxa nenhuma invariante** (isolamento,
  revisão independente, gates opus/alto, best-effort, privacidade) — só sobe o teto. Virou padrão
  durável em `knowledge.md` (§ Régua de excelência por ofício).
- **Links:** `agents/*.md` (todos ganharam "A régua: … (nível de referência)") · `docs/knowledge.md`
  (§ Régua de excelência por ofício).

### 2026-07-18 · Arquitetura de informação nos agentes de UI (meta, 2ª rodada do mesmo dia)
- **Sinal:** ❌→régua (feedback real do dono sobre o resultado da 1ª rodada).
- **Aprendizado:** a régua "premium" da rodada anterior elevou o acabamento das TELAS, mas o dono
  apontou o que ela não cobria: **menu espalhado, portal desorganizado, navegação confusa** — um
  problema de **arquitetura de informação**, não de estética. Causa raiz observada no produto: nav
  global montada só na home (todas as outras telas com o header vazio), navegação de seções
  enterrada numa grade "Ir para" no corpo de uma página-hub (seção irmã exigia "voltar"), e nenhum
  sinal de "onde estou". Lição destilada: **navegação é sistema, não peça de tela** — o
  `ux-designer` agora checa 7 regras de IA (nav primária idêntica em todo o perfil, `aria-current`,
  irmãs a 1 clique, hub morre com nav persistente, máx. 2 níveis, mobile = mesma IA, rótulo único
  por destino) ANTES de decorar a tela, e o `frontend-engineer` implementa nav como componente
  único. Acabamento sem IA não segura a percepção de qualidade.
- **Links:** `agents/ux-designer.md` (§ Arquitetura de informação) · `agents/frontend-engineer.md` ·
  `docs/knowledge.md` (§ Qualidade visual premium, linhas de navegação).

### 2026-07-18 · Régua de qualidade premium nos agentes de UI (meta)
- **Sinal:** 🔧 processo (qualidade de entrega de UI — sem métrica de produto isolada).
- **Aprendizado:** um brief de "time de produto de elite" — **benchmark explícito**
  (Apple/Linear/Stripe/Vercel/Notion), **justificativa por 5 lentes** (usabilidade · hierarquia ·
  acessibilidade · performance · conversão) e **entregáveis de design system concretos** (tokens de
  cor, escala tipográfica, grid, biblioteca de componentes, guidelines de movimento 150–300ms, TODOS
  os estados: hover/foco/ativo/desabilitado + vazio/loading/erro/sucesso) — produziu resultado **muito
  acima da média** numa sessão real de redesenho. O ganho não era "mais efeito": era **sistema**
  (tokens, não valores mágicos), **cobrir os estados de borda** e **sobriedade premium**. Destilado em
  régua durável: elevei `ux-designer` (brief agora exige tokens + estados + movimento + as 5 lentes) e
  `frontend-engineer` (execução pixel-perfect: tokens-não-mágicos, todos os estados, micro-interações
  150–300ms com reduced-motion), e virou padrão/anti-padrão de UI em `knowledge.md`. Não afrouxa
  nenhuma invariante de front (escape/PII/best-effort/split) — só sobe o teto de qualidade.
- **Links:** `agents/ux-designer.md` · `agents/frontend-engineer.md` · `docs/knowledge.md`
  (§ Qualidade visual premium).

### 2026-07-17 · Arquitetura cognitiva de 2ª ordem (meta) — feature 003
- **Sinal:** 🔧 processo (sem métrica de produto — é maturidade cognitiva do próprio método).
- **Aprendizado:** o método já tinha uma **memória de fato** (knowledge/context-map/evolution/routing-
  policy/rejections/market-scan/growth-playbook), mas sem nomear as camadas ninguém cuidava de **higiene**
  (o episódico inchava) nem de **recuperação** (dependia da memória do orchestrator). Correção sem ferir o
  isolamento: nomear as **4 camadas** (`memory.md`), dar **retenção + consolidação/poda** ao episódico
  (`knowledge-curator` + `/distill`, esquece **movendo** para `archive/`, nunca apaga), promover o
  `context-map` a **índice por tag** (determinístico — vetorial adiado), e tornar a verificação
  **proporcional ao risco**: **painel** de N céticos onde o gate humano some, e **escalada por incerteza**
  (confiança baixa sobe ao humano, independentemente do tier). Tudo opt-in por knob; "fato datado, não
  raciocínio" preserva a troca token↔corretude.
- **Links:** ADR-0005 · `docs/sdd/features/003-arquitetura-cognitiva/` · `docs/ai-first/memory.md` ·
  `docs/token-efficiency.md` §7 · corolário P-10/P-11.

### 2026-07-14 · Política de eficiência de token do método (meta)
- **Sinal:** 🔧 processo (sem métrica de produto — é economia de custo do próprio método).
- **Aprendizado:** o custo alto por fatia vinha de **desperdício por descuido**, não do isolamento:
  releitura fria dos mesmos docs-base a cada subagente, modelo caro onde o barato serve, e relatório
  verboso que inflava o contexto do driver. Correção sem tocar na troca deliberada (token↔corretude):
  **bloco de contexto fixo** (prefixo estável → cache de prompt), **roteamento model/effort explícito
  no `Agent()`**, **retorno enxuto** (detalhe só quando o `adversarial-reviewer` bloqueia) e
  **`Workflow` opt-in** para paralelizar o independente + `budget.total`. Isolamento e revisão
  independente preservados.
- **Links:** `docs/token-efficiency.md` · `agents/sdd-orchestrator.md` · skills `/feature`, `/daily-build`.

> Entradas de produto nascem quando a primeira feature for medida (`/daily-outcome`) ou promovida
> (`docs-writer` no fim da feature). Exemplo do formato:

<!--
### 2026-01-15 · Lembrete 1 dia antes da consulta (#42)
- **Sinal:** ✅ moveu (no-show caiu de 18% → 11% na janela de 14 dias)
- **Aprendizado:** proatividade com opt-out claro converte; dobrar em lembretes contextuais.
- **Links:** ADR-0005 · #42 · métrica: taxa de no-show (spec §8).
-->

## Quem alimenta (retroalimentação)
- **`/daily-outcome`** (via `outcome-analyst`) — a cada rodada de medição, registra uma linha por
  feature avaliada (o sinal + o aprendizado). É a fonte principal.
- **`docs-writer`** — ao fechar uma feature durável, registra a mudança (mesmo antes da métrica
  maturar, com sinal 〜/🔧) e mantém os links coerentes.
- **`/reject-feature`** — toda reprovação deixa a linha do aprendizado aqui, além do ledger.
