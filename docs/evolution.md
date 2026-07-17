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
