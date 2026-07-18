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
