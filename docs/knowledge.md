# 🧠 Conhecimento (padrões + anti-padrões)

Como **construir** neste projeto: os **idiomas** que funcionam (padrões — "faça assim") e as
**armadilhas** que já custaram caro (anti-padrões — "não faça / cuidado"). É o acervo de *saber-fazer*
que reduz alucinação: uma sessão ou subagente carrega **esta** curadoria antes de implementar, em vez
de redescobrir o jeito certo (ou repetir um erro já pago).

> **Onde este doc se encaixa (não confunda os papéis):**
> - **`docs/sdd/constitution.md`** = o que **nunca** pode quebrar (invariantes P-#, inegociáveis). Um
>   anti-padrão **não** é uma violação de princípio — é um cheiro/erro recorrente que a constituição
>   não cobre. Se um "padrão" aqui é na verdade uma invariante, ele mora **lá**, não aqui.
> - **`CLAUDE.md`** = o índice-mãe (mapa de módulos, pontos de extensão) e a **referência rápida** dos
>   padrões (uma linha cada). Este doc é a **versão profunda** dos padrões **+ os anti-padrões**.
> - **`docs/context-map.md`** = por domínio, onde está cada artefato. Ele **aponta** para as linhas
>   deste doc relevantes ao domínio.

## Como usar (agentes e sessões)
1. Antes de implementar/revisar, carregue os padrões e anti-padrões do **hot path** que vai tocar
   (use o `context-map` para achar os relevantes ao domínio).
2. Siga o padrão; **evite** o anti-padrão. Se precisar divergir de um padrão, diga por quê no PR.
3. O `adversarial-reviewer` usa os **anti-padrões** como checklist de caça; o `tech-auditor` os usa
   para reconhecer drift.

## Padrões — "faça assim" (idiomas do projeto)

> **Esqueleto** — a gênese (`/ai-first-init`, dimensão 7) semeia os padrões reais do **seu** hot path;
> aqui ficam exemplos de formato. Uma linha por padrão; ancore em módulo/teste real.

| Padrão | Quando aplicar | Por que | Referência (módulo · teste) |
|---|---|---|---|
| _(ex.: reserva de idempotência antes do efeito)_ | todo efeito externo | retry é at-least-once (P-3) | `services/…` · `redelivery*` |
| _(ex.: LLM com timeout+schema+fallback)_ | toda chamada de IA | IA nunca confiada (P-4) | `ai/…` · `providerFallback` |
| _(ex.: acesso a dado só pela porta)_ | toda query | fronteira rígida (P-5) | `repositories/…` · `dataBoundary` |
| _(ex.: batch de banco em laço de fila)_ | processamento em lote | custo/latência | `…` · `…` |

## Anti-padrões — "não faça / cuidado" (armadilhas já pagas)

> Cada anti-padrão nasce de uma dor real: um bug que o `adversarial-reviewer`/`tester` pegou, um drift
> que o `tech-auditor` achou, ou um resultado que o `outcome-analyst` mostrou que não colou. **Todo bug
> vira teste de regressão E uma linha aqui** — o corpus de "o que não fazer" só cresce.

| Anti-padrão (o erro) | Sintoma / como aparece | Por que dói | O certo em vez disso |
|---|---|---|---|
| _(ex.: persistir efeito antes de confirmar o envio)_ | registro "enviado" com envio que falhou | estado mente; retry morre | reserva → efeito → confirma (P-3) |
| _(ex.: usar saída de LLM sem validar schema)_ | crash/《lixo》 quando o modelo alucina | IA confiada cegamente | validar + fallback determinístico (P-4) |
| _(ex.: `SELECT` + `UPDATE` onde cabe atômico)_ | corrida sob concorrência | dado incoerente | operação atômica / lock otimista |
| _(ex.: novo caminho que contorna o ponto de extensão)_ | lógica duplicada divergente | decadência/drift (P-14) | encaixar no ponto de extensão |

## Como este acervo cresce (retroalimentação)
- **Gênese** (`/ai-first-init` dim. 7) — semeia os padrões/anti-padrões iniciais do projeto.
- **Fim de cada feature** (`docs-writer`) — idioma novo introduzido vira **padrão**; bug caçado pelo
  `adversarial-reviewer`/`tester` vira **regressão + anti-padrão** (com `arquivo:linha` de origem).
- **Auditoria** (`tech-auditor`) — drift recorrente vira anti-padrão (via `docs-writer`/humano).
- **Resultado** (`outcome-analyst`) — um padrão que o uso real desmentiu é rebaixado/anotado.
