# ADR-0012: Higiene de contexto working — limpeza por costura de slice/feature + entre re-runs de verificação

> Status: Accepted · Data: 2026-07-19
> Feature/Issue: método (economia de token) · Princípios tocados: P-14 (custo/token), P-11/P-13 (isolamento — a limpeza não pode cortar estado vivo de que um passo depende), P-15 (knobs) · Supersede: —

## Contexto

O `docs/token-efficiency.md` otimiza o gasto por vários ângulos, mas nenhum deles trata do **rabo
variável que cresce dentro de uma sessão longa** — a thread do *driver* (a skill) que acumula, ao longo
de uma feature, o retorno de cada etapa; e, dentro do loop de verificação (ADR-0009), o contexto da
tentativa que **falhou** e foi re-implementada. Esse acúmulo:

1. **Infla toda invocação seguinte** daquela sessão (custo que compõe), mesmo já sendo os retornos
   enxutos do §3 — a soma de N deles ainda pesa.
2. **Carrega raciocínio morto no re-run.** Quando o `adversarial-reviewer`/CI bloqueia e o `backend`
   re-implementa, arrastar o contexto inteiro da tentativa falha custa token **e** ancora o modelo na
   abordagem errada (viés de continuar o caminho que não deu certo).

A tentação óbvia — "limpar geral entre etapas" — é um **anti-padrão**: quebraria o **prompt cache** do
§1 (o prefixo fixo quente, ~1h TTL) e cortaria o estado que o próximo elo precisa. A limpeza tem de ser
**cirúrgica**: descartar só o que já está **durável** em outro lugar, preservar o prefixo cacheado.

Este é um alvo distinto do `/distill` (ADR-0005): aquele faz higiene da memória **episódica** (o
aprendizado de longo prazo); este faz higiene da memória **working** (o contexto de trabalho consumido).
Mesma lei ("consolidar/esquecer, não inchar", §7), camada diferente das 4 de `docs/ai-first/memory.md`.

## Decisão

Adotamos uma alavanca de **higiene de contexto working** (`docs/token-efficiency.md` §8), com limpeza
**por costura** como default e um **limiar dinâmico gated** como escape:

1. **Limpa o rabo variável; NUNCA o prefixo fixo cacheado.** A limpeza descarta retornos antigos e ruído
   de tool-calls já resolvidos — **preserva byte-a-byte** o BLOCO DE CONTEXTO FIXO (§1) para não perder o
   cache. É compactação que respeita a fronteira do cache, não reset.

2. **Segura porque o hand-off já é durável (§3).** Os retornos são **ponteiros** (commit/spec/PR), não
   cópias, e o contrato "p/ o próximo" carrega o que o elo seguinte precisa. Descartar o rabo **não perde
   nada** que um passo downstream vá usar — o estado vivo mínimo é re-passado como fato, não como
   histórico.

3. **Costuras de limpeza (o default `seam`):**
   - **Fim de slice** — depois que o `docs-writer` fecha a fatia (§1 já troca o bloco fixo aqui): o
     chatter da slice anterior é peso morto → limpa.
   - **Fim de feature** — antes da próxima feature no build paralelo (cada uma já é sub-pipeline isolado,
     ADR-0010): o driver não carrega o raciocínio da feature anterior.
   - **Entre re-runs de verificação (ADR-0009)** — o re-implement recebe **o veredito** (o que corrigir),
     **não** o contexto da tentativa falha. Ganho duplo: token + menos ancoragem no caminho errado.

4. **Limiar dinâmico (`context_clear_policy: dynamic`) é gated à costura.** Quando o contexto acumulado
   cruza `context_clear_threshold` (% da janela), a limpeza **não** dispara num ponto arbitrário — **espera
   o próximo hand-off durável** (a próxima costura). Escape valve para features gigantes, nunca faca cega
   mid-slice.

## Alternativas consideradas

- **Não limpar (status quo)** — o rabo variável infla o custo composto e o re-run arrasta raciocínio
  morto. Deixa dinheiro na mesa. Descartada.
- **Limpar "geral" entre toda etapa** — anti-padrão: evicta o prompt cache do §1 (paga a releitura do
  prefixo fixo) e arrisca cortar estado vivo. **Pior** que não limpar. Rejeitada explicitamente.
- **Só limiar dinâmico, sem gate** — disparar mid-slice num ponto arbitrário pode evictar cache e cortar
  o hand-off ainda não persistido. Por isso o dinâmico é **sempre gated à costura**.
- **Reusar o `/distill`** — camada errada: `/distill` é memória episódica (longo prazo); esta é working
  (contexto de trabalho). Juntar borraria as responsabilidades. Mantidos separados.

## Consequências

- **Positivas:** menos token composto ao longo de uma feature; re-runs mais baratos e **menos enviesados**
  (não ancoram na tentativa falha); alavanca alinhada ao cache (§1) e segura por construção (§3). Encaixa
  na camada working das 4 de memória (ADR-0005) sem novo paradigma.
- **Custos/limites:** exige que o driver marque as **costuras** e re-passe o **estado vivo mínimo** como
  fato ao limpar (disciplina de autoria); limpeza mal-feita (cortar o prefixo cacheado ou estado vivo)
  **perde** eficiência — por isso o default conservador é `seam` e o dinâmico é gated.
- **Restrições futuras:** toda limpeza DEVE (a) preservar o prefixo fixo cacheado; (b) só descartar o que
  já está durável (commit/spec/PR/contrato de hand-off); (c) no re-run, passar o **veredito**, não o
  contexto da tentativa falha; (d) no modo dinâmico, disparar **só na próxima costura**. O piso de
  isolamento/verificação (P-11/P-13) nunca é relaxado — limpar não é fundir contexto.

## Relacionados

Constituição `P-14` (custo/token), `P-11`/`P-13` (isolamento), `P-15` (knobs); `docs/token-efficiency.md`
§1 (prefixo fixo + cache — o que a limpeza preserva), §3 (retorno enxuto — o que a torna segura), §7
(higiene de memória — a mesma lei, camada episódica), §8 (esta alavanca); ADR-0009 (loop/re-runs),
ADR-0010 (sub-pipeline isolado por feature), ADR-0005 (as 4 camadas — working vs. episódica);
`docs/ai-first/memory.md`; genoma §8 (`context_clear_policy`, `context_clear_threshold`);
`templates/workflows/build-one-feature.mjs` (limpeza entre re-runs no esqueleto).
</content>
